import { DEMO_PROFILE, STORAGE_KEYS, readStorage, writeStorage } from './storageService';
import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import { normalizeApiErrors, normalizeProfilePayload } from './apiMappers';
import { findUserByEmail, findUserByMatricula, updateStoredUserPassword, updateStoredUserProfile } from './userService';

const getProfile = () => readStorage(STORAGE_KEYS.profile, DEMO_PROFILE);

const updateSessionFromProfile = (profile) => {
  const currentSession = readStorage(STORAGE_KEYS.session, null);

  if (!currentSession) {
    return;
  }

  writeStorage(STORAGE_KEYS.session, {
    ...currentSession,
    id: profile.id,
    nombre: profile.nombre,
    apellidos: profile.apellidos,
    nombreCompleto: `${profile.nombre} ${profile.apellidos}`.trim(),
    email: profile.email,
    matricula: profile.matricula,
    rol: profile.rol,
  });
};

const persistProfile = (profileLike) => {
  const currentProfile = getProfile();
  const profile = normalizeProfilePayload(profileLike, currentProfile);

  writeStorage(STORAGE_KEYS.profile, {
    ...currentProfile,
    ...profile,
    password: currentProfile.password,
  });
  updateStoredUserProfile(profile);
  updateSessionFromProfile(profile);

  return readStorage(STORAGE_KEYS.profile, profile);
};

const validateProfile = (changes) => {
  const errors = {};

  if (!String(changes.nombre ?? '').trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!String(changes.apellidos ?? '').trim()) errors.apellidos = 'Los apellidos son obligatorios.';
  if (!String(changes.matricula ?? '').trim()) errors.matricula = 'La matrícula es obligatoria.';
  if (!String(changes.carrera ?? '').trim()) errors.carrera = 'La carrera o programa es obligatorio.';
  if (!String(changes.semestre ?? '').trim()) errors.semestre = 'El semestre o nivel es obligatorio.';
  if (!String(changes.grupo ?? '').trim()) errors.grupo = 'El grupo es obligatorio.';

  return errors;
};

const buildProfilePayload = (changes) => ({
  nombre: String(changes.nombre ?? '').trim(),
  apellidos: String(changes.apellidos ?? '').trim(),
  matricula: String(changes.matricula ?? '').trim(),
  carrera: String(changes.carrera ?? '').trim(),
  semestre: String(changes.semestre ?? '').trim(),
  grupo: String(changes.grupo ?? '').trim(),
});

const updateProfileLocal = (changes) => {
  const currentProfile = getProfile();
  const payload = buildProfilePayload(changes);
  const duplicateMatricula = findUserByMatricula(payload.matricula);
  const isSameUser =
    !duplicateMatricula ||
    Number(duplicateMatricula.id) === Number(currentProfile.id) ||
    String(duplicateMatricula.email ?? '').toLowerCase() === String(currentProfile.email ?? '').toLowerCase();

  if (!isSameUser) {
    return {
      ok: false,
      errors: { matricula: 'Esta matrícula ya está registrada por otro alumno.' },
      message: 'Esta matrícula ya está registrada por otro alumno.',
    };
  }

  const profile = persistProfile({
    ...currentProfile,
    ...payload,
    email: currentProfile.email,
    rol: currentProfile.rol || 'Estudiante',
  });

  return { ok: true, profile };
};

const syncProfile = async () => {
  try {
    const { data } = await request('/perfil');
    const profile = persistProfile(data);
    return { ok: true, profile };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return {
        ok: true,
        profile: getProfile(),
        fallback: true,
        message: 'No se pudo cargar el perfil desde el servidor. Se muestran datos locales de respaldo.',
      };
    }

    return {
      ok: false,
      profile: getProfile(),
      message: extractApiMessage(error.payload, 'No se pudo cargar el perfil.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateProfile = async (changes) => {
  const errors = validateProfile(changes);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Revisa los campos marcados.' };
  }

  try {
    const { data } = await request('/perfil', {
      method: 'PUT',
      body: buildProfilePayload(changes),
    });
    const profile = persistProfile(data);
    return { ok: true, profile, message: 'Perfil actualizado correctamente.' };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const localResult = updateProfileLocal(changes);
      if (!localResult.ok) {
        return localResult;
      }

      return {
        ...localResult,
        fallback: true,
        message: 'No se pudo conectar con el servidor. El perfil quedó guardado localmente.',
      };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo guardar el perfil.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const validatePasswordChange = ({ passwordActual, nuevaPassword, confirmarPassword }) => {
  const errors = {};
  const currentPassword = String(passwordActual ?? '');
  const nextPassword = String(nuevaPassword ?? '');
  const confirmation = String(confirmarPassword ?? '');

  if (!currentPassword) errors.passwordActual = 'Ingresa tu contraseña actual.';
  if (!nextPassword || nextPassword.length < 8) errors.nuevaPassword = 'La nueva contraseña debe tener al menos 8 caracteres.';
  if (!confirmation) {
    errors.confirmarPassword = 'Confirma la nueva contraseña.';
  } else if (nextPassword !== confirmation) {
    errors.confirmarPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
};

const updatePasswordLocal = ({ passwordActual, nuevaPassword }) => {
  const profile = getProfile();
  const user = findUserByEmail(profile.email);
  const currentPassword = String(passwordActual ?? '');

  if (!user || String(user.password ?? profile.password ?? '') !== currentPassword) {
    return {
      ok: false,
      errors: { passwordActual: 'La contraseña actual no es correcta.' },
      message: 'La contraseña actual no es correcta.',
    };
  }

  const nextProfile = {
    ...profile,
    password: String(nuevaPassword ?? ''),
  };
  writeStorage(STORAGE_KEYS.profile, nextProfile);
  updateStoredUserPassword(profile, nuevaPassword);

  return { ok: true };
};

const updatePassword = async (changes) => {
  const errors = validatePasswordChange(changes);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Revisa los campos marcados.' };
  }

  try {
    await request('/perfil/password', {
      method: 'PUT',
      body: {
        passwordActual: String(changes.passwordActual ?? ''),
        nuevaPassword: String(changes.nuevaPassword ?? ''),
        confirmarPassword: String(changes.confirmarPassword ?? ''),
      },
    });

    const profile = getProfile();
    writeStorage(STORAGE_KEYS.profile, {
      ...profile,
      password: String(changes.nuevaPassword ?? ''),
    });
    updateStoredUserPassword(profile, changes.nuevaPassword);
    return { ok: true, message: 'Contraseña actualizada correctamente.' };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const localResult = updatePasswordLocal(changes);
      if (!localResult.ok) {
        return localResult;
      }

      return {
        ok: true,
        fallback: true,
        message: 'No se pudo conectar con el servidor. La contraseña quedó actualizada solo localmente.',
      };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar la contraseña.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

export { getProfile, syncProfile, updatePassword, updateProfile };
