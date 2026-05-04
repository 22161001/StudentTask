import { DEMO_PROFILE, STORAGE_KEYS, readStorage, writeStorage } from './storageService';
import { updateStoredUserProfile } from './userService';

const getProfile = () => readStorage(STORAGE_KEYS.profile, DEMO_PROFILE);

const updateProfile = (changes) => {
  const currentProfile = getProfile();
  const nextProfile = {
    ...currentProfile,
    nombre: String(changes.nombre ?? currentProfile.nombre).trim(),
    apellidos: String(changes.apellidos ?? currentProfile.apellidos).trim(),
    matricula: String(changes.matricula ?? currentProfile.matricula).trim(),
    carrera: String(changes.carrera ?? currentProfile.carrera).trim(),
    semestre: String(changes.semestre ?? currentProfile.semestre).trim(),
    grupo: String(changes.grupo ?? currentProfile.grupo).trim(),
    email: currentProfile.email,
    password: currentProfile.password,
    rol: 'Estudiante',
  };

  writeStorage(STORAGE_KEYS.profile, nextProfile);
  updateStoredUserProfile(nextProfile);

  const currentSession = readStorage(STORAGE_KEYS.session, null);
  if (currentSession) {
    writeStorage(STORAGE_KEYS.session, {
      ...currentSession,
      nombre: nextProfile.nombre,
      apellidos: nextProfile.apellidos,
      nombreCompleto: `${nextProfile.nombre} ${nextProfile.apellidos}`.trim(),
      email: nextProfile.email,
      matricula: nextProfile.matricula,
      rol: nextProfile.rol,
    });
  }

  return { ok: true, profile: nextProfile };
};

export { getProfile, updateProfile };
