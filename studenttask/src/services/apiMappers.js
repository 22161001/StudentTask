import { DEMO_PROFILE, DEMO_SETTINGS, validDefaultViews } from './storageService';
import { getTodayKey, normalizeDateKey } from '../utils/date';
import { normalizeRoleLabel } from '../utils/roles';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const normalizeEmail = (value, fallback = '') => normalizeText(value, fallback).toLowerCase();
const normalizeApiDate = (value, fallback = '') => normalizeDateKey(value) || normalizeDateKey(fallback);

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

const normalizeTaskType = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'asignada' || normalized === 'assigned' ? 'asignada' : 'personal';
};

const normalizeTaskOrigin = (value, taskType = 'personal') => {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === 'docente' || normalized === 'teacher') return 'docente';
  if (normalized === 'estudiante' || normalized === 'student') return 'estudiante';

  return taskType === 'asignada' ? 'docente' : 'estudiante';
};

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

const normalizeRole = (value, fallback = DEMO_PROFILE.rol) => normalizeRoleLabel(value, fallback) || fallback;

const extractUserRecord = (payload) => {
  const data = unwrapApiData(payload);

  if (!data || typeof data !== 'object') {
    return {};
  }

  return data.user ?? data.usuario ?? data.profile ?? data.perfil ?? data;
};

const extractStudentRecord = (userRecord, payload) => {
  const data = unwrapApiData(payload);

  return userRecord.alumno ?? userRecord.student ?? data?.alumno ?? data?.student ?? data?.perfil ?? {};
};

const normalizeProfilePayload = (payload, fallback = DEMO_PROFILE) => {
  const userRecord = extractUserRecord(payload);
  const studentRecord = extractStudentRecord(userRecord, payload);

  return {
    id: Number(pickFirstDefined(userRecord.id, userRecord.id_usuario, fallback.id)) || fallback.id,
    idUsuario: Number(pickFirstDefined(userRecord.idUsuario, userRecord.id_usuario, userRecord.id, fallback.id)) || fallback.id,
    idAlumno: Number(pickFirstDefined(studentRecord.idAlumno, studentRecord.id_alumno, userRecord.idAlumno, userRecord.id_alumno, 0)) || 0,
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
    rol: normalizeRole(pickFirstDefined(userRecord.rol, fallback.rol), fallback.rol),
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
  const source = unwrapApiData(payload) ?? {};
  const data = source.materia ?? source.subject ?? source;

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
  const source = unwrapApiData(payload) ?? {};
  const data = source.tarea ?? source.task ?? source;
  const createdAt = normalizeApiDate(pickFirstDefined(data.createdAt, data.created_at), getTodayKey()) || getTodayKey();
  const updatedAt = normalizeApiDate(pickFirstDefined(data.updatedAt, data.updated_at), createdAt) || createdAt;
  const taskType = normalizeTaskType(data.tipo ?? data.type);
  const state = normalizeTaskState(data.estado ?? data.state);
  const publishedDate =
    normalizeApiDate(
      pickFirstDefined(data.fechaPublicacion, data.fecha_publicacion, data.publishedAt, data.published_at, data.createdAt, data.created_at),
      createdAt,
    ) || createdAt;
  const dueDate = normalizeApiDate(pickFirstDefined(data.fechaEntrega, data.fecha_entrega, data.fecha_limite, data.dueDate, data.due_date));
  const completedDate = normalizeApiDate(
    pickFirstDefined(data.fechaCompletada, data.fecha_completada, data.completedAt, data.completed_at),
  );

  return {
    id: Number(pickFirstDefined(data.id, data.id_tarea, data.id_tarea_personal, data.id_tarea_asignada, index + 1)) || index + 1,
    entregaId: Number(pickFirstDefined(data.entregaId, data.id_entrega, 0)) || null,
    idUsuario: Number(pickFirstDefined(data.idUsuario, data.id_usuario, 0)) || 0,
    idAlumno: Number(pickFirstDefined(data.idAlumno, data.id_alumno, 0)) || 0,
    titulo: normalizeText(data.titulo),
    descripcion: normalizeText(data.descripcion),
    materiaId: Number(pickFirstDefined(data.materiaId, data.id_materia, 0)) || 0,
    materiaNombre: normalizeText(data.materiaNombre ?? data.materia_nombre),
    materiaColor: normalizeText(data.materiaColor ?? data.materia_color),
    fechaPublicacion: publishedDate,
    fechaEntrega: dueDate,
    prioridad: normalizeTaskPriority(data.prioridad),
    estado: state,
    tipo: taskType,
    origen: normalizeTaskOrigin(data.origen ?? data.origin, taskType),
    docenteNombre: normalizeText(data.docenteNombre ?? data.docente_nombre ?? data.teacherName ?? data.teacher_name),
    grupoNombre: normalizeText(data.grupoNombre ?? data.grupo_nombre ?? data.groupName ?? data.group_name),
    instrucciones: normalizeText(data.instrucciones ?? data.instructions),
    enlaceApoyo: normalizeText(data.enlaceApoyo ?? data.enlace_apoyo ?? data.supportLink ?? data.support_link),
    tiempoEstimadoHoras: Number(data.tiempoEstimadoHoras ?? data.tiempo_estimado_horas ?? data.estimatedHours ?? data.estimated_hours) || 0,
    recordatorio: toBoolean(data.recordatorio),
    notaPersonal: normalizeText(data.notaPersonal ?? data.nota_personal ?? data.personalNote ?? data.personal_note),
    fechaCompletada: state === 'completada' ? completedDate || updatedAt : null,
    createdAt,
    updatedAt,
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
  fecha_publicacion: normalizeApiDate(task.fechaPublicacion),
  fecha_entrega: normalizeApiDate(task.fechaEntrega),
  prioridad: encodeTaskPriority(task.prioridad),
  estado: encodeTaskState(task.estado),
  tipo: normalizeTaskType(task.tipo),
  origen: normalizeTaskOrigin(task.origen, normalizeTaskType(task.tipo)),
  docente_nombre: normalizeText(task.docenteNombre),
  grupo_nombre: normalizeText(task.grupoNombre),
  instrucciones: normalizeText(task.instrucciones),
  enlace_apoyo: normalizeText(task.enlaceApoyo),
  tiempo_estimado_horas: Number(task.tiempoEstimadoHoras) || 0,
  recordatorio: Boolean(task.recordatorio),
  nota_personal: normalizeText(task.notaPersonal),
  fecha_completada: normalizeApiDate(task.fechaCompletada),
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
    fecha_limite: 'fechaEntrega',
    id_materia: 'materiaId',
    vista_default: 'vistaDefault',
    recordatorios_activos: 'recordatoriosActivos',
    password_actual: 'passwordActual',
    nueva_password: 'nuevaPassword',
    confirmar_password: 'confirmarPassword',
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
  normalizeRole,
  normalizeSettingsPayload,
  normalizeSubjectPayload,
  normalizeSubjectsPayload,
  normalizeTaskPayload,
  normalizeTaskOrigin,
  normalizeTaskPriority,
  normalizeTaskState,
  normalizeTaskType,
  normalizeTasksPayload,
  normalizeTheme,
  serializeSettingsPayload,
  serializeTaskPayload,
  toBoolean,
  unwrapApiData,
};
