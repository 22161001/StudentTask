import { getDefaultPrivateRoute, syncSettings } from './settingsService';
import {
  DEMO_PROFILE,
  STORAGE_KEYS,
  readStorage,
  removeStorage,
  writeStorage,
} from './storageService';
import { clearAuthToken, extractApiMessage, isApiFallbackError, persistAuthToken, request } from './apiClient';
import { normalizeApiErrors, normalizeEmail, normalizeProfilePayload, unwrapApiData } from './apiMappers';
import { createUser, findUserByEmail } from './userService';
import { isKnownRole } from '../utils/roles';

const socialProviders = {
  google: 'Google',
  x: 'X',
  github: 'GitHub',
};

const buildSession = (profile, overrides = {}) => ({
  id: profile.id,
  nombre: profile.nombre,
  apellidos: profile.apellidos,
  nombreCompleto: `${profile.nombre} ${profile.apellidos}`.trim(),
  email: profile.email,
  rol: profile.rol,
  matricula: profile.matricula,
  loginAt: new Date().toISOString(),
  authMethod: 'credentials',
  authProvider: 'email',
  authProviderLabel: 'Correo y contraseña',
  ...overrides,
});

const getProfileSnapshot = () => readStorage(STORAGE_KEYS.profile, DEMO_PROFILE);

const persistLocalUserSession = (profile, overrides = {}) => {
  const normalizedProfile = {
    ...DEMO_PROFILE,
    ...profile,
    rol: 'Estudiante',
  };
  const session = buildSession(normalizedProfile, overrides);

  clearAuthToken();
  writeStorage(STORAGE_KEYS.profile, normalizedProfile);
  writeStorage(STORAGE_KEYS.session, session);

  return session;
};

const persistAuthState = (payload, overrides = {}) => {
  const responseData = unwrapApiData(payload);
  const fallbackProfile = getProfileSnapshot();
  const profile = normalizeProfilePayload(responseData, fallbackProfile);
  const token =
    responseData?.token ??
    responseData?.access_token ??
    responseData?.accessToken ??
    responseData?.authToken ??
    responseData?.bearerToken;

  if (token) {
    persistAuthToken(token);
  }

  writeStorage(STORAGE_KEYS.profile, {
    ...fallbackProfile,
    ...profile,
    password: fallbackProfile.password,
  });

  const session = buildSession(profile, overrides);
  writeStorage(STORAGE_KEYS.session, session);
  return session;
};

const getSession = () => readStorage(STORAGE_KEYS.session, null);
const isAuthenticated = () => {
  const session = getSession();
  return Boolean(session) && isKnownRole(session?.rol);
};

const clearSession = () => {
  clearAuthToken();
  removeStorage(STORAGE_KEYS.session);
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegistrationInput = (data) => {
  const errors = {};
  const email = normalizeEmail(data.email);
  const password = String(data.password ?? '');
  const confirmPassword = String(data.confirmPassword ?? '');

  if (!String(data.nombre ?? '').trim()) errors.nombre = 'Ingresa tu nombre.';
  if (!String(data.apellidos ?? '').trim()) errors.apellidos = 'Ingresa tus apellidos.';

  if (!email) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (!String(data.matricula ?? '').trim()) errors.matricula = 'Ingresa tu matrícula.';
  if (!String(data.carrera ?? '').trim()) errors.carrera = 'Ingresa tu carrera.';
  if (!String(data.semestre ?? '').trim()) errors.semestre = 'Ingresa tu semestre.';
  if (!String(data.grupo ?? '').trim()) errors.grupo = 'Ingresa tu grupo.';

  if (!password) {
    errors.password = 'Crea una contraseña.';
  } else if (password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
};

const buildRegistrationPayload = (data) => ({
  nombre: String(data.nombre ?? '').trim(),
  apellidos: String(data.apellidos ?? '').trim(),
  email: normalizeEmail(data.email),
  password: String(data.password ?? ''),
  matricula: String(data.matricula ?? '').trim(),
  carrera: String(data.carrera ?? '').trim(),
  semestre: String(data.semestre ?? '').trim(),
  grupo: String(data.grupo ?? '').trim(),
});

const loginWithLocalCredentials = ({ email, password }) => {
  const inputEmail = normalizeEmail(email);
  const user = findUserByEmail(inputEmail);

  if (!user) {
    return { ok: false, message: 'El correo no está registrado.' };
  }

  if (String(password ?? '') !== user.password) {
    return { ok: false, message: 'La contraseña es incorrecta.' };
  }

  const session = persistLocalUserSession(user);
  return { ok: true, session, redirectTo: getDefaultPrivateRoute(session.rol) };
};

const loginUser = async ({ email, password }) => {
  try {
    const { data } = await request('/auth/login', {
      method: 'POST',
      body: {
        email: normalizeEmail(email),
        password: String(password ?? ''),
      },
    });

    let session = persistAuthState(data);
    const meResult = await syncCurrentUser();
    if (meResult.ok && meResult.session) {
      session = meResult.session;
    }

    if (!isKnownRole(session?.rol)) {
      clearSession();
      return {
        ok: false,
        message: 'Tu cuenta no tiene un rol válido para acceder a StudentTask.',
      };
    }

    await syncSettings().catch(() => null);

    return { ok: true, session, redirectTo: getDefaultPrivateRoute(session.rol) };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return loginWithLocalCredentials({ email, password });
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo iniciar sesión.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const registerUser = async (data) => {
  const errors = validateRegistrationInput(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Revisa los campos marcados.' };
  }

  try {
    const { data: responseData } = await request('/auth/register', {
      method: 'POST',
      body: buildRegistrationPayload(data),
    });
    const profile = normalizeProfilePayload(responseData, {
      ...DEMO_PROFILE,
      ...buildRegistrationPayload(data),
      password: String(data.password ?? ''),
      rol: 'Estudiante',
    });
    createUser(data);

    return {
      ok: true,
      user: profile,
      message: 'Tu cuenta se creó correctamente.',
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const localResult = createUser(data);
      if (!localResult.ok) {
        return localResult;
      }

      return {
        ok: true,
        user: localResult.user,
        fallback: true,
        message: 'No se pudo conectar con el servidor. El registro quedó guardado localmente.',
      };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo crear la cuenta.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const loginWithProvider = async (provider) => {
  const providerLabel = socialProviders[provider];

  if (!providerLabel) {
    return { ok: false, message: 'El proveedor seleccionado no está disponible.' };
  }

  const profile = getProfileSnapshot();
  const session = buildSession(profile, {
    authMethod: 'social',
    authProvider: provider,
    authProviderLabel: providerLabel,
  });

  clearAuthToken();
  writeStorage(STORAGE_KEYS.session, session);
  return { ok: true, session, redirectTo: getDefaultPrivateRoute(session.rol) };
};

const syncCurrentUser = async () => {
  try {
    const { data } = await request('/auth/me');
    const session = persistAuthState(data);
    return {
      ok: true,
      session,
      profile: readStorage(STORAGE_KEYS.profile, DEMO_PROFILE),
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const session = getSession();
      return { ok: Boolean(session), session, profile: getProfileSnapshot() };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo recuperar la sesión actual.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const logoutUser = async () => {
  let errorMessage = '';

  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (error) {
    if (!isApiFallbackError(error) && error?.status !== 401) {
      errorMessage = extractApiMessage(error.payload, 'No se pudo cerrar la sesión.');
    }
  }

  clearSession();
  return errorMessage ? { ok: false, message: errorMessage } : { ok: true };
};

export {
  clearSession,
  getSession,
  isAuthenticated,
  loginUser,
  loginWithProvider,
  logoutUser,
  registerUser,
  syncCurrentUser,
};
