import { DEMO_PROFILE, DEMO_SETTINGS, validDefaultViews } from './storageService';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const normalizeEmail = (value, fallback = '') => normalizeText(value, fallback).toLowerCase();

const unwrapApiData = (payload) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
};

const extractCollection = (payload, keys = []) => {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }

    if (data[key] && typeof data[key] === 'object' && Array.isArray(data[key].data)) {
      return data[key].data;
    }
  }

  return [];
};

const toBoolean = (value) => value === true || value === 1 || value === '1' || String(value ?? '').trim().toLowerCase() === 'true';

const normalizeTaskPriority = (value) => {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === 'alta' || normalized === 'high') return 'alta';
  if (normalized === 'baja' || normalized === 'low') return 'baja';
  return 'media';
};

const encodeTaskPriority = (value) => {
  if (normalizeTaskPriority(value) === 'alta') return 'Alta';
  if (normalizeTaskPriority(value) === 'baja') return 'Baja';
  return 'Media';
};

const normalizeTaskState = (value) => {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === 'completada' || normalized === 'completed') return 'completada';
  if (normalized === 'en progreso' || normalized === 'in progress') return 'pendiente';
  return 'pendiente';
};

const encodeTaskState = (value) => (normalizeTaskState(value) === 'completada' ? 'Completada' : 'Pendiente');

const normalizeTheme = (value, fallback = DEMO_SETTINGS.tema) => {
  const normalized = normalizeText(value, fallback).toLowerCase();
  return normalized === 'oscuro' || normalized === 'dark' ? 'oscuro' : 'claro';
};

const normalizeLanguage = (value, fallback = DEMO_SETTINGS.idioma) => {
  const normalized = normalizeText(value, fallback).toLowerCase();
  return normalized === 'en' || normalized === 'english' ? 'en' : 'es';
};

const normalizeDefaultView = (value, fallback = DEMO_SETTINGS.vistaDefault) => {
  const normalized = normalizeText(value, fallback).toLowerCase();
  return validDefaultViews.has(normalized) ? normalized : fallback;
};

const extractUserRecord = (payload) => {
  const data = unwrapApiData(payload);

  if (!data || typeof data !== 'object') {
    return {};
  }

  return data.user ?? data.usuario ?? data.profile ?? data;
};

const extractStudentRecord = (userRecord, payload) => {
  const data = unwrapApiData(payload);

  return userRecord.alumno ?? userRecord.student ?? data?.alumno ?? data?.student ?? {};
};

const normalizeProfilePayload = (payload, fallback = DEMO_PROFILE) => {
  const userRecord = extractUserRecord(payload);
  const studentRecord = extractStudentRecord(userRecord, payload);

  return {
    id: Number(pickFirstDefined(userRecord.id, userRecord.id_usuario, fallback.id)) || fallback.id,
    nombre: normalizeText(pickFirstDefined(userRecord.nombre, studentRecord.nombre, fallback.nombre), fallback.nombre) || fallback.nombre,
    apellidos:
      normalizeText(pickFirstDefined(userRecord.apellidos, studentRecord.apellidos, fallback.apellidos), fallback.apellidos) || fallback.apellidos,
    email: normalizeEmail(pickFirstDefined(userRecord.email, studentRecord.email, fallback.email), fallback.email) || fallback.email,
    password: fallback.password,
    matricula:
      normalizeText(pickFirstDefined(studentRecord.matricula, userRecord.matricula, fallback.matricula), fallback.matricula) || fallback.matricula,
    carrera:
      normalizeText(pickFirstDefined(studentRecord.carrera, userRecord.carrera, fallback.carrera), fallback.carrera) || fallback.carrera,
    semestre:
      normalizeText(pickFirstDefined(studentRecord.semestre, userRecord.semestre, fallback.semestre), fallback.semestre) || fallback.semestre,
    grupo: normalizeText(pickFirstDefined(studentRecord.grupo, userRecord.grupo, fallback.grupo), fallback.grupo) || fallback.grupo,
    rol: normalizeText(pickFirstDefined(userRecord.rol, fallback.rol), fallback.rol) || 'Estudiante',
  };
};

const normalizeSettingsPayload = (payload, fallback = DEMO_SETTINGS) => {
  const data = unwrapApiData(payload);
  const source = data?.configuracion ?? data?.settings ?? data ?? {};

  return {
    tema: normalizeTheme(source.tema ?? source.theme, fallback.tema),
    idioma: normalizeLanguage(source.idioma ?? source.language, fallback.idioma),
    vistaDefault: normalizeDefaultView(source.vistaDefault ?? source.vista_default ?? source.default_view, fallback.vistaDefault),
    recordatoriosActivos: toBoolean(
      pickFirstDefined(source.recordatoriosActivos, source.recordatorios_activos, source.recordatorios, fallback.recordatoriosActivos),
    ),
  };
};

const normalizeSubjectPayload = (payload, index = 0) => {
  const data = unwrapApiData(payload) ?? {};

  return {
    id: Number(pickFirstDefined(data.id, data.id_materia, index + 1)) || index + 1,
    nombre: normalizeText(data.nombre),
    color: normalizeText(data.color, '#2563eb') || '#2563eb',
    descripcion: normalizeText(data.descripcion),
  };
};

const normalizeSubjectsPayload = (payload) => {
  const list = extractCollection(payload, ['materias', 'subjects', 'items']);

  if (list.length > 0) {
    return list.map((item, index) => normalizeSubjectPayload(item, index));
  }

  const source = unwrapApiData(payload);
  if (source && typeof source === 'object' && source.nombre) {
    return [normalizeSubjectPayload(source)];
  }

  return [];
};

const normalizeTaskPayload = (payload, index = 0) => {
  const data = unwrapApiData(payload) ?? {};
  const createdAt = data.createdAt ?? data.created_at ?? new Date().toISOString();

  return {
    id: Number(pickFirstDefined(data.id, data.id_tarea, index + 1)) || index + 1,
    titulo: normalizeText(data.titulo),
    descripcion: normalizeText(data.descripcion),
    materiaId: Number(pickFirstDefined(data.materiaId, data.id_materia, 0)) || 0,
    fechaEntrega: normalizeText(data.fechaEntrega ?? data.fecha_entrega),
    prioridad: normalizeTaskPriority(data.prioridad),
    estado: normalizeTaskState(data.estado),
    recordatorio: toBoolean(data.recordatorio),
    createdAt,
    updatedAt: data.updatedAt ?? data.updated_at ?? createdAt,
  };
};

const normalizeTasksPayload = (payload) => {
  const list = extractCollection(payload, ['tareas', 'tasks', 'items']);

  if (list.length > 0) {
    return list.map((item, index) => normalizeTaskPayload(item, index));
  }

  const source = unwrapApiData(payload);
  if (source && typeof source === 'object' && source.titulo) {
    return [normalizeTaskPayload(source)];
  }

  return [];
};

const serializeTaskPayload = (task) => ({
  titulo: normalizeText(task.titulo),
  descripcion: normalizeText(task.descripcion),
  id_materia: Number(task.materiaId),
  fecha_entrega: normalizeText(task.fechaEntrega),
  prioridad: encodeTaskPriority(task.prioridad),
  estado: encodeTaskState(task.estado),
  recordatorio: Boolean(task.recordatorio),
});

const serializeSettingsPayload = (settings) => ({
  tema: normalizeTheme(settings.tema),
  idioma: normalizeLanguage(settings.idioma),
  vista_default: normalizeDefaultView(settings.vistaDefault),
  recordatorios_activos: Boolean(settings.recordatoriosActivos),
});

const normalizeApiErrors = (payload) => {
  const data = unwrapApiData(payload);
  const source = payload?.errors ?? data?.errors;

  if (!source || typeof source !== 'object') {
    return {};
  }

  const keyMap = {
    fecha_entrega: 'fechaEntrega',
    id_materia: 'materiaId',
    vista_default: 'vistaDefault',
    recordatorios_activos: 'recordatoriosActivos',
  };

  return Object.entries(source).reduce((errors, [key, value]) => {
    const normalizedKey = keyMap[key] ?? key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const message = Array.isArray(value) ? value[0] : value;

    if (typeof message === 'string' && message.trim()) {
      errors[normalizedKey] = message.trim();
    }

    return errors;
  }, {});
};

export {
  encodeTaskPriority,
  encodeTaskState,
  extractCollection,
  normalizeApiErrors,
  normalizeDefaultView,
  normalizeEmail,
  normalizeLanguage,
  normalizeProfilePayload,
  normalizeSettingsPayload,
  normalizeSubjectPayload,
  normalizeSubjectsPayload,
  normalizeTaskPayload,
  normalizeTaskPriority,
  normalizeTaskState,
  normalizeTasksPayload,
  normalizeTheme,
  serializeSettingsPayload,
  serializeTaskPayload,
  toBoolean,
  unwrapApiData,
};
