import { extractApiMessage, request } from './apiClient';
import { extractCollection, normalizeApiErrors, normalizeTaskPriority, toBoolean, unwrapApiData } from './apiMappers';
import { normalizeDateKey } from '../utils/date';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();

const normalizeTeacherTaskStudent = (student, index = 0) => ({
  id: Number(pickFirstDefined(student.id, student.idAlumno, student.id_alumno, index + 1)) || index + 1,
  idAlumno: Number(pickFirstDefined(student.idAlumno, student.id_alumno, student.id, 0)) || 0,
  idUsuario: Number(pickFirstDefined(student.idUsuario, student.id_usuario, 0)) || 0,
  nombre: normalizeText(student.nombre, 'Alumno'),
  apellidos: normalizeText(student.apellidos),
  nombreCompleto:
    normalizeText(pickFirstDefined(student.nombreCompleto, student.nombre_completo)) ||
    normalizeText(`${student.nombre ?? ''} ${student.apellidos ?? ''}`) ||
    'Alumno',
  email: normalizeText(pickFirstDefined(student.email, student.correo)),
  matricula: normalizeText(student.matricula),
  carrera: normalizeText(student.carrera),
  semestre: normalizeText(student.semestre),
  grupo: normalizeText(student.grupo),
  activo: toBoolean(pickFirstDefined(student.activo, true)),
  estado: normalizeText(student.estado, 'pendiente').toLowerCase(),
  fechaEntrega: normalizeDateKey(pickFirstDefined(student.fechaEntrega, student.fecha_entrega)),
  notaPersonal: normalizeText(pickFirstDefined(student.notaPersonal, student.nota_personal)),
  revisada: toBoolean(student.revisada),
});

const normalizeTeacherTask = (task, index = 0) => ({
  id: Number(pickFirstDefined(task.id, task.id_tarea_asignada, task.idTareaAsignada, index + 1)) || index + 1,
  idGrupo: Number(pickFirstDefined(task.idGrupo, task.id_grupo, 0)) || 0,
  nombreGrupo: normalizeText(pickFirstDefined(task.nombreGrupo, task.grupoNombre, task.grupo_nombre, task.grupo), 'Sin grupo'),
  idMateria: Number(pickFirstDefined(task.idMateria, task.id_materia, task.materiaId, 0)) || 0,
  materiaNombre: normalizeText(pickFirstDefined(task.materiaNombre, task.materia, task.materia_nombre, task.nombre_materia), 'Sin materia'),
  materiaColor: normalizeText(pickFirstDefined(task.materiaColor, task.materia_color), '#2563eb') || '#2563eb',
  titulo: normalizeText(task.titulo, 'Tarea sin título'),
  descripcion: normalizeText(task.descripcion),
  instrucciones: normalizeText(task.instrucciones),
  enlaceApoyo: normalizeText(pickFirstDefined(task.enlaceApoyo, task.enlace_apoyo)),
  fechaPublicacion: normalizeDateKey(pickFirstDefined(task.fechaPublicacion, task.fecha_publicacion, task.created_at)),
  fechaLimite: normalizeDateKey(pickFirstDefined(task.fechaLimite, task.fecha_limite, task.fechaEntrega, task.fecha_entrega)),
  prioridad: normalizeTaskPriority(task.prioridad),
  activa: toBoolean(pickFirstDefined(task.activa, task.activo, true)),
  estado: toBoolean(pickFirstDefined(task.activa, task.activo, true)) ? 'Activa' : 'Inactiva',
  totalAlumnos: Number(pickFirstDefined(task.totalAlumnos, task.total_alumnos, 0)) || 0,
  totalEntregas: Number(pickFirstDefined(task.totalEntregas, task.total_entregas, 0)) || 0,
  totalPendientes: Number(pickFirstDefined(task.totalPendientes, task.total_pendientes, 0)) || 0,
  totalCompletadas: Number(pickFirstDefined(task.totalCompletadas, task.total_completadas, 0)) || 0,
  porcentajeCumplimiento: Number(pickFirstDefined(task.porcentajeCumplimiento, task.porcentaje_cumplimiento, 0)) || 0,
  alumnos: Array.isArray(task.alumnos) ? task.alumnos.map((student, studentIndex) => normalizeTeacherTaskStudent(student, studentIndex)) : [],
});

const normalizeTeacherTasks = (payload) =>
  extractCollection(payload, ['tareas', 'tasks', 'items']).map((task, index) => normalizeTeacherTask(task, index));

const normalizeTeacherTaskDetail = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const task = normalizeTeacherTask(data.tarea ?? data.task ?? data);
  const alumnos = Array.isArray(data.alumnos)
    ? data.alumnos.map((student, index) => normalizeTeacherTaskStudent(student, index))
    : task.alumnos;

  return { ...task, alumnos };
};

const normalizeTeacherTaskErrors = (payload) => {
  const errors = normalizeApiErrors(payload);
  const normalized = { ...errors };

  if (errors.fechaEntrega && !normalized.fechaLimite) normalized.fechaLimite = errors.fechaEntrega;
  if (errors.materiaId && !normalized.idMateria) normalized.idMateria = errors.materiaId;

  return normalized;
};

const serializeTeacherTaskPayload = (task, { includeAssignment = false } = {}) => {
  const payload = {
    titulo: normalizeText(task.titulo),
    descripcion: normalizeText(task.descripcion),
    instrucciones: normalizeText(task.instrucciones),
    enlace_apoyo: normalizeText(task.enlaceApoyo),
    fecha_limite: normalizeDateKey(task.fechaLimite),
    prioridad: normalizeTaskPriority(task.prioridad),
  };

  if (includeAssignment) {
    payload.id_grupo = Number(task.idGrupo);
    payload.id_materia = Number(task.idMateria);
  }

  if ('activa' in task) {
    payload.activa = Boolean(task.activa);
  }

  return payload;
};

const handleTeacherTaskError = (error, fallbackKey, fallbackValue, fallbackMessage) => ({
  ok: false,
  message: extractApiMessage(error.payload, fallbackMessage),
  errors: normalizeTeacherTaskErrors(error.payload),
  [fallbackKey]: fallbackValue,
});

const getTeacherTasks = async () => {
  try {
    const { data } = await request('/docente/tareas');
    return { ok: true, tasks: normalizeTeacherTasks(data) };
  } catch (error) {
    return handleTeacherTaskError(error, 'tasks', [], 'No se pudieron cargar las tareas.');
  }
};

const getTeacherTaskById = async (id) => {
  try {
    const { data } = await request(`/docente/tareas/${id}`);
    return { ok: true, task: normalizeTeacherTaskDetail(data) };
  } catch (error) {
    return handleTeacherTaskError(error, 'task', null, 'No tienes permiso para consultar esta tarea.');
  }
};

const createTeacherTask = async (task) => {
  try {
    const { data } = await request('/docente/tareas', {
      method: 'POST',
      body: serializeTeacherTaskPayload(task, { includeAssignment: true }),
    });
    const source = unwrapApiData(data) ?? {};

    return {
      ok: true,
      message: data?.message ?? 'La tarea fue publicada correctamente.',
      id: Number(source.id ?? source.tarea?.id ?? 0) || 0,
      task: source.tarea ? normalizeTeacherTask(source.tarea) : null,
      totalEntregasGeneradas: Number(source.totalEntregasGeneradas ?? source.total_entregas_generadas ?? 0) || 0,
    };
  } catch (error) {
    return handleTeacherTaskError(error, 'task', null, 'No se pudo publicar la tarea.');
  }
};

const updateTeacherTask = async (id, task) => {
  try {
    const { data } = await request(`/docente/tareas/${id}`, {
      method: 'PUT',
      body: serializeTeacherTaskPayload(task),
    });
    const source = unwrapApiData(data) ?? {};

    return {
      ok: true,
      message: data?.message ?? 'Tarea actualizada correctamente.',
      task: normalizeTeacherTask(source.tarea ?? source),
    };
  } catch (error) {
    return handleTeacherTaskError(error, 'task', null, 'No se pudo actualizar la tarea.');
  }
};

const deleteTeacherTask = async (id) => {
  try {
    const { data } = await request(`/docente/tareas/${id}`, { method: 'DELETE' });
    return { ok: true, message: data?.message ?? 'Tarea desactivada correctamente.' };
  } catch (error) {
    return handleTeacherTaskError(error, 'task', null, 'No se pudo desactivar la tarea.');
  }
};

export {
  createTeacherTask,
  deleteTeacherTask,
  getTeacherTaskById,
  getTeacherTasks,
  normalizeTeacherTask,
  normalizeTeacherTaskDetail,
  normalizeTeacherTasks,
  updateTeacherTask,
};
