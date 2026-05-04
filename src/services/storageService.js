const STORAGE_KEYS = {
  authToken: 'studenttask_token',
  session: 'studenttask_session',
  profile: 'studenttask_profile',
  users: 'studenttask_users',
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
const validTaskTypes = new Set(['personal', 'asignada']);
const validTaskOrigins = new Set(['estudiante', 'docente']);
const validDefaultViews = new Set([
  'dashboard',
  'materias',
  'tareas',
  'agenda',
  'tareas-asignadas',
  'reportes',
  'seguimiento',
  'perfil',
  'configuracion',
]);

const cloneData = (value) => JSON.parse(JSON.stringify(value));
const getIsoNow = () => new Date().toISOString();
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();

const createDateInDays = (days) => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().split('T')[0];
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return value === true || value === 1 || value === '1' || String(value).trim().toLowerCase() === 'true';
};

const normalizePositiveNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const mapTaskPriority = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'alta' || normalized === 'high') return 'alta';
  if (normalized === 'baja' || normalized === 'low') return 'baja';
  return 'media';
};

const mapTaskState = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'completada' || normalized === 'completed') return 'completada';
  return 'pendiente';
};

const mapTaskType = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return validTaskTypes.has(normalized) ? normalized : 'personal';
};

const mapTaskOrigin = (value, taskType = 'personal') => {
  const normalized = normalizeText(value).toLowerCase();
  if (validTaskOrigins.has(normalized)) {
    return normalized;
  }

  return taskType === 'asignada' ? 'docente' : 'estudiante';
};

const mapLanguage = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'english' || normalized === 'en' ? 'en' : DEFAULT_LANGUAGE;
};

const mapTheme = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'oscuro' || normalized === 'dark' ? 'oscuro' : DEFAULT_THEME;
};

const mapDefaultView = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'dia' || normalized === 'semana' || normalized === 'mes') return DEFAULT_VIEW;
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
  apellidos: 'Velásquez Montes',
  email: 'alumno@itoaxaca.edu.mx',
  password: '12345678',
  matricula: 'UNI-2026-001',
  carrera: 'Ingeniería en Sistemas',
  semestre: '6.º semestre',
  grupo: 'A',
  rol: 'Estudiante',
};

const DEMO_SUBJECTS = [
  {
    id: 1,
    nombre: 'Programación Web',
    color: '#2563eb',
    descripcion: 'Interfaces, componentes y prácticas para aplicaciones web.',
  },
  {
    id: 2,
    nombre: 'Bases de Datos',
    color: '#0ea5e9',
    descripcion: 'Consultas SQL, modelos relacionales y ejercicios de laboratorio.',
  },
  {
    id: 3,
    nombre: 'Matemáticas Aplicadas',
    color: '#1d4ed8',
    descripcion: 'Problemas, guías y actividades de seguimiento académico.',
  },
  {
    id: 4,
    nombre: 'Ingeniería de Software',
    color: '#7c3aed',
    descripcion: 'Planificación, entregables y colaboración de proyectos.',
  },
];

const createDemoPersonalTasks = (startId = 1) => {
  const createdAt = getIsoNow();
  return [
    {
      id: startId,
      titulo: 'Preparar exposición de programación',
      descripcion: 'Ordena las diapositivas y ensaya los puntos clave de la presentación.',
      materiaId: 1,
      fechaPublicacion: createDateInDays(-3),
      fechaEntrega: createDateInDays(1),
      prioridad: 'alta',
      estado: 'pendiente',
      tipo: 'personal',
      origen: 'estudiante',
      docenteNombre: '',
      grupoNombre: '',
      instrucciones: '',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 2,
      recordatorio: true,
      notaPersonal: 'Repasar ejemplos de componentes y rutas.',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 1,
      titulo: 'Entregar práctica de base de datos',
      descripcion: 'Revisa consultas, capturas y conclusiones antes de subir la evidencia.',
      materiaId: 2,
      fechaPublicacion: createDateInDays(-4),
      fechaEntrega: createDateInDays(3),
      prioridad: 'media',
      estado: 'pendiente',
      tipo: 'personal',
      origen: 'estudiante',
      docenteNombre: '',
      grupoNombre: '',
      instrucciones: '',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 3,
      recordatorio: true,
      notaPersonal: '',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 2,
      titulo: 'Resolver ejercicios de integración',
      descripcion: 'Completa la guía y marca los temas que necesitas repasar.',
      materiaId: 3,
      fechaPublicacion: createDateInDays(-2),
      fechaEntrega: createDateInDays(0),
      prioridad: 'media',
      estado: 'pendiente',
      tipo: 'personal',
      origen: 'estudiante',
      docenteNombre: '',
      grupoNombre: '',
      instrucciones: '',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 1.5,
      recordatorio: false,
      notaPersonal: '',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 3,
      titulo: 'Corregir reporte de laboratorio',
      descripcion: 'Ajusta observaciones y vuelve a exportar el PDF final.',
      materiaId: 2,
      fechaPublicacion: createDateInDays(-8),
      fechaEntrega: createDateInDays(-2),
      prioridad: 'alta',
      estado: 'pendiente',
      tipo: 'personal',
      origen: 'estudiante',
      docenteNombre: '',
      grupoNombre: '',
      instrucciones: '',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 2,
      recordatorio: true,
      notaPersonal: '',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 4,
      titulo: 'Repasar apuntes para evaluación',
      descripcion: 'Resume fórmulas y conceptos antes del siguiente bloque de clase.',
      materiaId: 3,
      fechaPublicacion: createDateInDays(-5),
      fechaEntrega: createDateInDays(5),
      prioridad: 'baja',
      estado: 'completada',
      tipo: 'personal',
      origen: 'estudiante',
      docenteNombre: '',
      grupoNombre: '',
      instrucciones: '',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 1,
      recordatorio: false,
      notaPersonal: 'Listo para repasar antes de clase.',
      fechaCompletada: createDateInDays(-1),
      createdAt,
      updatedAt: createdAt,
    },
  ];
};

const createDemoAssignedTasks = (startId = 100) => {
  const createdAt = getIsoNow();
  return [
    {
      id: startId,
      titulo: 'Construir formulario con validaciones',
      descripcion: 'Actividad asignada desde la materia Programación Web.',
      materiaId: 1,
      fechaPublicacion: createDateInDays(-1),
      fechaEntrega: createDateInDays(2),
      prioridad: 'alta',
      estado: 'pendiente',
      tipo: 'asignada',
      origen: 'docente',
      docenteNombre: 'Mtra. Laura Herrera',
      grupoNombre: 'Sistemas 6A',
      instrucciones: 'Implementa un formulario responsivo con validación de campos obligatorios y mensajes claros para el usuario.',
      enlaceApoyo: 'https://developer.mozilla.org/es/docs/Learn/Forms/Form_validation',
      tiempoEstimadoHoras: 4,
      recordatorio: true,
      notaPersonal: '',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 1,
      titulo: 'Normalizar base de datos escolar',
      descripcion: 'Entrega de modelo relacional hasta tercera forma normal.',
      materiaId: 2,
      fechaPublicacion: createDateInDays(-5),
      fechaEntrega: createDateInDays(6),
      prioridad: 'media',
      estado: 'pendiente',
      tipo: 'asignada',
      origen: 'docente',
      docenteNombre: 'Dr. Mateo Ruiz',
      grupoNombre: 'Sistemas 6A',
      instrucciones: 'Presenta entidades, relaciones, claves primarias y justificación de normalización en un documento breve.',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 3,
      recordatorio: true,
      notaPersonal: 'Revisar dependencias transitivas.',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 2,
      titulo: 'Resolver caso de estimación de proyecto',
      descripcion: 'Trabajo de planeación para Ingeniería de Software.',
      materiaId: 4,
      fechaPublicacion: createDateInDays(-7),
      fechaEntrega: createDateInDays(-1),
      prioridad: 'alta',
      estado: 'pendiente',
      tipo: 'asignada',
      origen: 'docente',
      docenteNombre: 'Mtra. Laura Herrera',
      grupoNombre: 'Proyecto Integrador 6B',
      instrucciones: 'Calcula esfuerzo, riesgos principales y entregables del primer sprint usando el caso proporcionado en clase.',
      enlaceApoyo: '',
      tiempoEstimadoHoras: 2.5,
      recordatorio: true,
      notaPersonal: '',
      fechaCompletada: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: startId + 3,
      titulo: 'Cuestionario de funciones y derivadas',
      descripcion: 'Actividad corta de Matemáticas Aplicadas.',
      materiaId: 3,
      fechaPublicacion: createDateInDays(-9),
      fechaEntrega: createDateInDays(4),
      prioridad: 'baja',
      estado: 'completada',
      tipo: 'asignada',
      origen: 'docente',
      docenteNombre: 'Ing. Paula Jiménez',
      grupoNombre: 'Matemáticas 6C',
      instrucciones: 'Contesta el cuestionario y guarda evidencia del procedimiento de al menos cinco reactivos.',
      enlaceApoyo: 'https://es.khanacademy.org/math/differential-calculus',
      tiempoEstimadoHoras: 1,
      recordatorio: false,
      notaPersonal: 'Entregado antes de la siguiente clase.',
      fechaCompletada: createDateInDays(-2),
      createdAt,
      updatedAt: createdAt,
    },
  ];
};

const createDemoTasks = () => [...createDemoPersonalTasks(1), ...createDemoAssignedTasks(6)];

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
    nombre: normalizeText(source.nombre, DEMO_PROFILE.nombre) || DEMO_PROFILE.nombre,
    apellidos: normalizeText(source.apellidos, DEMO_PROFILE.apellidos) || DEMO_PROFILE.apellidos,
    email: canonicalizeProfileEmail(source.email ?? DEMO_PROFILE.email),
    password: String(source.password ?? DEMO_PROFILE.password),
    matricula: normalizeText(source.matricula, DEMO_PROFILE.matricula) || DEMO_PROFILE.matricula,
    carrera: normalizeText(source.carrera, DEMO_PROFILE.carrera) || DEMO_PROFILE.carrera,
    semestre: normalizeText(source.semestre, DEMO_PROFILE.semestre) || DEMO_PROFILE.semestre,
    grupo: normalizeText(source.grupo, DEMO_PROFILE.grupo) || DEMO_PROFILE.grupo,
    rol: 'Estudiante',
  };
};

const normalizeUsers = (users) => {
  const source = Array.isArray(users) ? users : [];
  const normalizedUsers = source
    .map((user, index) => ({
      ...normalizeProfile(user),
      id: Number(user?.id) || index + 1,
      email: normalizeEmail(user?.email),
      password: String(user?.password ?? ''),
      createdAt: user?.createdAt ?? getIsoNow(),
    }))
    .filter((user) => user.email && user.password);

  return normalizedUsers.reduce((uniqueUsers, user) => {
    const alreadyExists = uniqueUsers.some(
      (item) =>
        normalizeEmail(item.email) === normalizeEmail(user.email) ||
        normalizeText(item.matricula).toLowerCase() === normalizeText(user.matricula).toLowerCase(),
    );

    return alreadyExists ? uniqueUsers : [...uniqueUsers, user];
  }, []);
};

const ensureDemoUsers = (users, profile) => {
  const normalizedProfile = normalizeProfile(profile);
  const baseUsers = normalizeUsers(users);
  const withDemo = baseUsers.some((user) => DEMO_LOGIN_EMAILS.includes(normalizeEmail(user.email)))
    ? baseUsers
    : normalizeUsers([DEMO_PROFILE, ...baseUsers]);
  const hasProfileUser = withDemo.some(
    (user) =>
      normalizeEmail(user.email) === normalizeEmail(normalizedProfile.email) ||
      normalizeText(user.matricula).toLowerCase() === normalizeText(normalizedProfile.matricula).toLowerCase(),
  );

  return hasProfileUser ? withDemo : normalizeUsers([...withDemo, normalizedProfile]);
};

const normalizeSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return cloneData(DEMO_SUBJECTS);
  }

  return subjects
    .map((subject, index) => ({
      id: Number(subject?.id) || index + 1,
      nombre: normalizeText(subject?.nombre),
      color: normalizeText(subject?.color, DEFAULT_SUBJECT_COLOR) || DEFAULT_SUBJECT_COLOR,
      descripcion: normalizeText(subject?.descripcion),
    }))
    .filter((subject) => subject.nombre);
};

const normalizeTask = (task, index = 0) => {
  const createdAt = task?.createdAt ?? task?.created_at ?? getIsoNow();
  const taskType = mapTaskType(task?.tipo ?? task?.type);
  const state = mapTaskState(task?.estado ?? task?.state);
  const fechaCompletada = normalizeText(task?.fechaCompletada ?? task?.fecha_completada ?? task?.completedAt);

  return {
    id: Number(task?.id ?? task?.id_tarea) || index + 1,
    titulo: normalizeText(task?.titulo ?? task?.title),
    descripcion: normalizeText(task?.descripcion ?? task?.description),
    materiaId: Number(task?.materiaId ?? task?.id_materia) || 0,
    fechaPublicacion:
      normalizeText(task?.fechaPublicacion ?? task?.fecha_publicacion ?? task?.publishedAt) || String(createdAt).split('T')[0] || createDateInDays(0),
    fechaEntrega: normalizeText(task?.fechaEntrega ?? task?.fecha_entrega ?? task?.dueDate) || createDateInDays(index + 1),
    prioridad: mapTaskPriority(task?.prioridad ?? task?.priority),
    estado: state,
    tipo: taskType,
    origen: mapTaskOrigin(task?.origen ?? task?.origin, taskType),
    docenteNombre: normalizeText(task?.docenteNombre ?? task?.docente_nombre ?? task?.teacherName),
    grupoNombre: normalizeText(task?.grupoNombre ?? task?.grupo_nombre ?? task?.groupName),
    instrucciones: normalizeText(task?.instrucciones ?? task?.instructions),
    enlaceApoyo: normalizeText(task?.enlaceApoyo ?? task?.enlace_apoyo ?? task?.supportLink),
    tiempoEstimadoHoras: normalizePositiveNumber(task?.tiempoEstimadoHoras ?? task?.tiempo_estimado_horas ?? task?.estimatedHours),
    recordatorio: normalizeBoolean(task?.recordatorio ?? task?.reminder, false),
    notaPersonal: normalizeText(task?.notaPersonal ?? task?.nota_personal ?? task?.personalNote),
    fechaCompletada: state === 'completada' ? fechaCompletada || String(task?.updatedAt ?? task?.updated_at ?? createdAt).split('T')[0] : null,
    createdAt,
    updatedAt: task?.updatedAt ?? task?.updated_at ?? createdAt,
  };
};

const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) {
    return createDemoTasks();
  }

  const hadTaskType = tasks.some((task) => task && typeof task === 'object' && ('tipo' in task || 'type' in task));
  const normalizedTasks = tasks.map((task, index) => normalizeTask(task, index)).filter((task) => task.titulo);

  if (!hadTaskType && normalizedTasks.length > 0 && !normalizedTasks.some((task) => task.tipo === 'asignada')) {
    const nextId = Math.max(...normalizedTasks.map((task) => task.id), 0) + 1;
    return [...normalizedTasks, ...createDemoAssignedTasks(nextId)];
  }

  return normalizedTasks;
};

const normalizeSettings = (settings) => {
  const source = settings && typeof settings === 'object' ? settings : {};

  return {
    tema: mapTheme(source.tema ?? source.theme),
    idioma: mapLanguage(source.idioma ?? source.language),
    vistaDefault: mapDefaultView(source.vistaDefault ?? source.vista_default ?? source.default_view),
    recordatoriosActivos: normalizeBoolean(
      source.recordatoriosActivos ?? source.recordatorios_activos ?? source.recordatorios,
      DEMO_SETTINGS.recordatoriosActivos,
    ),
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
    authProviderLabel: session.authProviderLabel ?? 'Correo y contraseña',
    loginAt: session.loginAt ?? getIsoNow(),
  };
};

const hasMissingStorage = (key) => localStorage.getItem(key) === null;

const migrateLegacyStorage = () => {
  const profileFromStorage = readRawStorage(STORAGE_KEYS.profile);
  const legacyProfile = readFirstAvailable(LEGACY_STORAGE_KEYS.profile);
  const normalizedProfile = normalizeProfile(profileFromStorage ?? legacyProfile ?? DEMO_PROFILE);
  writeStorage(STORAGE_KEYS.profile, normalizedProfile);

  const usersFromStorage = readRawStorage(STORAGE_KEYS.users);
  writeStorage(STORAGE_KEYS.users, ensureDemoUsers(usersFromStorage, normalizedProfile));

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

  if (hasMissingStorage(STORAGE_KEYS.users)) {
    writeStorage(STORAGE_KEYS.users, normalizeUsers([DEMO_PROFILE]));
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
  Object.entries(STORAGE_KEYS)
    .filter(([key]) => key !== 'users')
    .map(([, value]) => value)
    .forEach(removeStorage);
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
  createDateInDays,
  createDemoAssignedTasks,
  createDemoTasks,
  readStorage,
  removeStorage,
  resetAppData,
  normalizeUsers,
  validDefaultViews,
  validTaskOrigins,
  validTaskPriorities,
  validTaskStates,
  validTaskTypes,
  writeStorage,
};
