const STORAGE_KEYS = {
  authToken: 'studenttask_token',
  session: 'studenttask_session',
  profile: 'studenttask_profile',
  subjects: 'studenttask_subjects',
  tasks: 'studenttask_tasks',
  settings: 'studenttask_settings',
};

const LEGACY_STORAGE_KEYS = {
  session: ['studenttask_auth'],
  profile: ['studenttask_user'],
  settings: ['studenttask_config'],
};

const DEFAULT_THEME = 'claro';
const DEFAULT_LANGUAGE = 'es';
const DEFAULT_VIEW = 'dashboard';
const DEFAULT_SUBJECT_COLOR = '#2563eb';
const LEGACY_EMAIL_ALIASES = ['estudiante@campus.edu'];

const validTaskPriorities = new Set(['baja', 'media', 'alta']);
const validTaskStates = new Set(['pendiente', 'completada']);
const validDefaultViews = new Set(['dashboard', 'materias', 'tareas', 'perfil', 'configuracion']);

const cloneData = (value) => JSON.parse(JSON.stringify(value));
const getIsoNow = () => new Date().toISOString();
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const createDateInDays = (days) => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().split('T')[0];
};

const mapTaskPriority = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'alta') return 'alta';
  if (normalized === 'baja') return 'baja';
  return 'media';
};

const mapTaskState = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'completada') return 'completada';
  if (normalized === 'en progreso') return 'pendiente';
  return 'pendiente';
};

const mapLanguage = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'english' || normalized === 'en' ? 'en' : DEFAULT_LANGUAGE;
};

const mapTheme = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'oscuro' ? 'oscuro' : DEFAULT_THEME;
};

const mapDefaultView = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dia') return DEFAULT_VIEW;
  if (normalized === 'semana') return DEFAULT_VIEW;
  if (normalized === 'mes') return DEFAULT_VIEW;
  return validDefaultViews.has(normalized) ? normalized : DEFAULT_VIEW;
};

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const readRawStorage = (key) => safeParse(localStorage.getItem(key), undefined);

const readFirstAvailable = (keys) => {
  for (const key of keys) {
    const value = readRawStorage(key);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const removeStorage = (key) => {
  localStorage.removeItem(key);
};

const DEMO_PROFILE = {
  id: 1,
  nombre: 'Ignacio Luis',
  apellidos: 'Velasquez Montes',
  email: 'alumno@itoaxaca.edu.mx',
  password: '12345678',
  matricula: 'UNI-2026-001',
  carrera: 'Ingenieria en Sistemas',
  semestre: '6 semestre',
  grupo: 'A',
  rol: 'Estudiante',
};

const DEMO_SUBJECTS = [
  {
    id: 1,
    nombre: 'Programacion Web',
    color: '#2563eb',
    descripcion: 'Interfaces, componentes y practicas para aplicaciones web.',
  },
  {
    id: 2,
    nombre: 'Bases de Datos',
    color: '#0ea5e9',
    descripcion: 'Consultas SQL, modelos relacionales y ejercicios de laboratorio.',
  },
  {
    id: 3,
    nombre: 'Matematicas Aplicadas',
    color: '#1d4ed8',
    descripcion: 'Problemas, guias y actividades de seguimiento academico.',
  },
];

const createDemoTasks = () => {
  const createdAt = getIsoNow();
  return [
    {
      id: 1,
      titulo: 'Preparar exposicion de programacion',
      descripcion: 'Ordena las diapositivas y ensaya los puntos clave de la presentacion.',
      materiaId: 1,
      fechaEntrega: createDateInDays(1),
      prioridad: 'alta',
      estado: 'pendiente',
      recordatorio: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 2,
      titulo: 'Entregar practica de base de datos',
      descripcion: 'Revisa consultas, capturas y conclusiones antes de subir la evidencia.',
      materiaId: 2,
      fechaEntrega: createDateInDays(3),
      prioridad: 'media',
      estado: 'pendiente',
      recordatorio: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 3,
      titulo: 'Resolver ejercicios de integracion',
      descripcion: 'Completa la guia y marca los temas que necesitas repasar.',
      materiaId: 3,
      fechaEntrega: createDateInDays(0),
      prioridad: 'media',
      estado: 'pendiente',
      recordatorio: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 4,
      titulo: 'Corregir reporte de laboratorio',
      descripcion: 'Ajusta observaciones y vuelve a exportar el PDF final.',
      materiaId: 2,
      fechaEntrega: createDateInDays(-2),
      prioridad: 'alta',
      estado: 'pendiente',
      recordatorio: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 5,
      titulo: 'Repasar apuntes para evaluacion',
      descripcion: 'Resume formulas y conceptos antes del siguiente bloque de clase.',
      materiaId: 3,
      fechaEntrega: createDateInDays(5),
      prioridad: 'baja',
      estado: 'completada',
      recordatorio: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
};

const DEMO_SETTINGS = {
  tema: DEFAULT_THEME,
  idioma: DEFAULT_LANGUAGE,
  vistaDefault: DEFAULT_VIEW,
  recordatoriosActivos: true,
};

const DEMO_LOGIN_EMAILS = Array.from(new Set([DEMO_PROFILE.email, ...LEGACY_EMAIL_ALIASES].map(normalizeEmail)));

const canonicalizeProfileEmail = (value) => {
  const normalizedEmail = normalizeEmail(value);

  if (!normalizedEmail) {
    return DEMO_PROFILE.email;
  }

  return DEMO_LOGIN_EMAILS.includes(normalizedEmail) ? DEMO_PROFILE.email : normalizedEmail;
};

const normalizeProfile = (profile) => {
  const source = profile && typeof profile === 'object' ? profile : {};

  return {
    id: Number(source.id) || DEMO_PROFILE.id,
    nombre: String(source.nombre ?? DEMO_PROFILE.nombre).trim() || DEMO_PROFILE.nombre,
    apellidos: String(source.apellidos ?? DEMO_PROFILE.apellidos).trim() || DEMO_PROFILE.apellidos,
    email: canonicalizeProfileEmail(source.email ?? DEMO_PROFILE.email),
    password: String(source.password ?? DEMO_PROFILE.password),
    matricula: String(source.matricula ?? DEMO_PROFILE.matricula).trim() || DEMO_PROFILE.matricula,
    carrera: String(source.carrera ?? DEMO_PROFILE.carrera).trim() || DEMO_PROFILE.carrera,
    semestre: String(source.semestre ?? DEMO_PROFILE.semestre).trim() || DEMO_PROFILE.semestre,
    grupo: String(source.grupo ?? DEMO_PROFILE.grupo).trim() || DEMO_PROFILE.grupo,
    rol: 'Estudiante',
  };
};

const normalizeSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return cloneData(DEMO_SUBJECTS);
  }

  return subjects.map((subject, index) => ({
    id: Number(subject?.id) || index + 1,
    nombre: String(subject?.nombre ?? '').trim(),
    color: String(subject?.color ?? DEFAULT_SUBJECT_COLOR).trim() || DEFAULT_SUBJECT_COLOR,
    descripcion: String(subject?.descripcion ?? '').trim(),
  }));
};

const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) {
    return createDemoTasks();
  }

  return tasks.map((task, index) => {
    const createdAt = task?.createdAt ?? getIsoNow();
    return {
      id: Number(task?.id) || index + 1,
      titulo: String(task?.titulo ?? '').trim(),
      descripcion: String(task?.descripcion ?? '').trim(),
      materiaId: Number(task?.materiaId) || 0,
      fechaEntrega: String(task?.fechaEntrega ?? '').trim(),
      prioridad: mapTaskPriority(task?.prioridad),
      estado: mapTaskState(task?.estado),
      recordatorio: Boolean(task?.recordatorio),
      createdAt,
      updatedAt: task?.updatedAt ?? createdAt,
    };
  });
};

const normalizeSettings = (settings) => {
  const source = settings && typeof settings === 'object' ? settings : {};

  return {
    tema: mapTheme(source.tema),
    idioma: mapLanguage(source.idioma),
    vistaDefault: mapDefaultView(source.vistaDefault),
    recordatoriosActivos: Boolean(source.recordatoriosActivos),
  };
};

const normalizeSession = (session, profile) => {
  if (!session || typeof session !== 'object') {
    return null;
  }

  const activeProfile = normalizeProfile(profile);
  return {
    id: Number(session.id) || activeProfile.id,
    nombre: activeProfile.nombre,
    apellidos: activeProfile.apellidos,
    nombreCompleto: `${activeProfile.nombre} ${activeProfile.apellidos}`.trim(),
    email: activeProfile.email,
    rol: 'Estudiante',
    matricula: activeProfile.matricula,
    authMethod: session.authMethod ?? 'credentials',
    authProvider: session.authProvider ?? 'email',
    authProviderLabel: session.authProviderLabel ?? 'Correo y contrasena',
    loginAt: session.loginAt ?? getIsoNow(),
  };
};

const hasMissingStorage = (key) => localStorage.getItem(key) === null;

const migrateLegacyStorage = () => {
  const profileFromStorage = readRawStorage(STORAGE_KEYS.profile);
  const legacyProfile = readFirstAvailable(LEGACY_STORAGE_KEYS.profile);
  const normalizedProfile = normalizeProfile(profileFromStorage ?? legacyProfile ?? DEMO_PROFILE);
  writeStorage(STORAGE_KEYS.profile, normalizedProfile);

  const settingsFromStorage = readRawStorage(STORAGE_KEYS.settings);
  const legacySettings = readFirstAvailable(LEGACY_STORAGE_KEYS.settings);
  const normalizedSettings = normalizeSettings(settingsFromStorage ?? legacySettings ?? DEMO_SETTINGS);
  writeStorage(STORAGE_KEYS.settings, normalizedSettings);

  const subjectsFromStorage = readRawStorage(STORAGE_KEYS.subjects);
  if (subjectsFromStorage !== undefined) {
    writeStorage(STORAGE_KEYS.subjects, normalizeSubjects(subjectsFromStorage));
  }

  const tasksFromStorage = readRawStorage(STORAGE_KEYS.tasks);
  if (tasksFromStorage !== undefined) {
    writeStorage(STORAGE_KEYS.tasks, normalizeTasks(tasksFromStorage));
  }

  const sessionFromStorage = readRawStorage(STORAGE_KEYS.session);
  const legacySession = readFirstAvailable(LEGACY_STORAGE_KEYS.session);
  const normalizedSession = normalizeSession(sessionFromStorage ?? legacySession, normalizedProfile);
  if (normalizedSession) {
    writeStorage(STORAGE_KEYS.session, normalizedSession);
  }

  Object.values(LEGACY_STORAGE_KEYS).flat().forEach(removeStorage);
};

const seedStorageIfMissing = () => {
  if (hasMissingStorage(STORAGE_KEYS.profile)) {
    writeStorage(STORAGE_KEYS.profile, cloneData(DEMO_PROFILE));
  }

  if (hasMissingStorage(STORAGE_KEYS.subjects)) {
    writeStorage(STORAGE_KEYS.subjects, cloneData(DEMO_SUBJECTS));
  }

  if (hasMissingStorage(STORAGE_KEYS.tasks)) {
    writeStorage(STORAGE_KEYS.tasks, createDemoTasks());
  }

  if (hasMissingStorage(STORAGE_KEYS.settings)) {
    writeStorage(STORAGE_KEYS.settings, cloneData(DEMO_SETTINGS));
  }
};

const bootstrapAppData = () => {
  migrateLegacyStorage();
  seedStorageIfMissing();
  migrateLegacyStorage();
};

const readStorage = (key, fallback) => {
  const value = readRawStorage(key);
  return value === undefined ? fallback : value;
};

const createId = (items) => {
  const ids = Array.isArray(items) ? items.map((item) => Number(item?.id) || 0) : [];
  return ids.length ? Math.max(...ids) + 1 : 1;
};

const resetAppData = () => {
  Object.values(STORAGE_KEYS).forEach(removeStorage);
  Object.values(LEGACY_STORAGE_KEYS).flat().forEach(removeStorage);
  bootstrapAppData();
};

export {
  DEMO_LOGIN_EMAILS,
  DEMO_PROFILE,
  DEMO_SETTINGS,
  DEMO_SUBJECTS,
  STORAGE_KEYS,
  bootstrapAppData,
  createId,
  createDemoTasks,
  readStorage,
  removeStorage,
  resetAppData,
  validDefaultViews,
  validTaskPriorities,
  validTaskStates,
  writeStorage,
};
