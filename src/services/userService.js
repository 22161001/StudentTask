import {
  DEMO_LOGIN_EMAILS,
  DEMO_PROFILE,
  STORAGE_KEYS,
  createId,
  normalizeUsers,
  readStorage,
  writeStorage,
} from './storageService';

const normalizeEmailValue = (value) => String(value ?? '').trim().toLowerCase();
const normalizeTextValue = (value) => String(value ?? '').trim();
const normalizeMatricula = (value) => normalizeTextValue(value).toLowerCase();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getUsers = () => normalizeUsers(readStorage(STORAGE_KEYS.users, [DEMO_PROFILE]));

const persistUsers = (users) => {
  const normalizedUsers = normalizeUsers(users);
  writeStorage(STORAGE_KEYS.users, normalizedUsers);
  return normalizedUsers;
};

const findUserByEmail = (email) => {
  const normalizedEmail = normalizeEmailValue(email);
  const lookupEmail = DEMO_LOGIN_EMAILS.includes(normalizedEmail) ? normalizeEmailValue(DEMO_PROFILE.email) : normalizedEmail;

  return getUsers().find((user) => normalizeEmailValue(user.email) === lookupEmail) ?? null;
};

const findUserByMatricula = (matricula) => {
  const normalizedMatricula = normalizeMatricula(matricula);
  return getUsers().find((user) => normalizeMatricula(user.matricula) === normalizedMatricula) ?? null;
};

const validateRegistration = (data) => {
  const errors = {};
  const email = normalizeEmailValue(data.email);
  const password = String(data.password ?? '');
  const confirmPassword = String(data.confirmPassword ?? '');
  const matricula = normalizeTextValue(data.matricula);

  if (!normalizeTextValue(data.nombre)) errors.nombre = 'Ingresa tu nombre.';
  if (!normalizeTextValue(data.apellidos)) errors.apellidos = 'Ingresa tus apellidos.';
  if (!email) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  } else if (findUserByEmail(email)) {
    errors.email = 'Este correo ya está registrado.';
  }

  if (!matricula) {
    errors.matricula = 'Ingresa tu matrícula.';
  } else if (findUserByMatricula(matricula)) {
    errors.matricula = 'Esta matrícula ya está registrada.';
  }

  if (!normalizeTextValue(data.carrera)) errors.carrera = 'Ingresa tu carrera.';
  if (!normalizeTextValue(data.semestre)) errors.semestre = 'Ingresa tu semestre.';
  if (!normalizeTextValue(data.grupo)) errors.grupo = 'Ingresa tu grupo.';

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

const createUser = (data) => {
  const errors = validateRegistration(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Revisa los campos marcados.' };
  }

  const users = getUsers();
  const user = {
    id: createId(users),
    nombre: normalizeTextValue(data.nombre),
    apellidos: normalizeTextValue(data.apellidos),
    email: normalizeEmailValue(data.email),
    password: String(data.password),
    matricula: normalizeTextValue(data.matricula),
    carrera: normalizeTextValue(data.carrera),
    semestre: normalizeTextValue(data.semestre),
    grupo: normalizeTextValue(data.grupo),
    rol: 'Estudiante',
    createdAt: new Date().toISOString(),
  };

  persistUsers([...users, user]);
  return { ok: true, user };
};

const updateStoredUserProfile = (profile) => {
  const users = getUsers();
  const profileEmail = normalizeEmailValue(profile.email);
  const profileId = Number(profile.id);
  const nextUsers = users.map((user) => {
    const isSameUser = (profileId && Number(user.id) === profileId) || normalizeEmailValue(user.email) === profileEmail;

    return isSameUser
      ? {
          ...user,
          nombre: normalizeTextValue(profile.nombre),
          apellidos: normalizeTextValue(profile.apellidos),
          matricula: normalizeTextValue(profile.matricula),
          carrera: normalizeTextValue(profile.carrera),
          semestre: normalizeTextValue(profile.semestre),
          grupo: normalizeTextValue(profile.grupo),
          rol: 'Estudiante',
        }
      : user;
  });

  persistUsers(nextUsers);
};

export {
  createUser,
  findUserByEmail,
  findUserByMatricula,
  getUsers,
  persistUsers,
  updateStoredUserProfile,
  validateRegistration,
};
