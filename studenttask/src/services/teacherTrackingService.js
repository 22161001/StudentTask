import { extractApiMessage, request } from './apiClient';
import { extractCollection, toBoolean, unwrapApiData } from './apiMappers';
import { normalizeTeacherTask } from './teacherTaskService';
import { normalizeDateKey } from '../utils/date';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const normalizeNumber = (value, fallback = 0) => Number(value ?? fallback) || fallback;
const clampPercentage = (value) => Math.max(0, Math.min(100, Math.round(normalizeNumber(value))));

const emptyTrackingSummary = {
  totalTareasPublicadas: 0,
  totalEntregasGeneradas: 0,
  totalEntregasPendientes: 0,
  totalEntregasCompletadas: 0,
  porcentajeCumplimientoGeneral: 0,
  tareasConBajoCumplimiento: [],
  alumnosConMasPendientes: [],
  resumenPorGrupo: [],
  resumenPorMateria: [],
  tareasRecientes: [],
};

const normalizeTrackingTask = (task = {}, index = 0) => {
  const normalized = normalizeTeacherTask(task, index);

  return {
    ...normalized,
    grupoNombre: normalized.nombreGrupo,
    porcentajeCumplimiento: clampPercentage(
      pickFirstDefined(task.porcentajeCumplimiento, task.porcentaje_cumplimiento, normalized.porcentajeCumplimiento),
    ),
  };
};

const normalizeTrackingBucket = (item, index = 0, type = 'grupo') => {
  const idKey = type === 'materia' ? 'idMateria' : 'idGrupo';
  const nameKey = type === 'materia' ? 'materiaNombre' : 'grupoNombre';
  const snakeIdKey = type === 'materia' ? 'id_materia' : 'id_grupo';
  const snakeNameKey = type === 'materia' ? 'materia_nombre' : 'nombre_grupo';

  return {
    id: normalizeNumber(pickFirstDefined(item.id, item[idKey], item[snakeIdKey], index + 1), index + 1),
    [idKey]: normalizeNumber(pickFirstDefined(item[idKey], item[snakeIdKey], item.id, 0)),
    [nameKey]: normalizeText(pickFirstDefined(item[nameKey], item[snakeNameKey], item.nombre, item.grupo, item.materia), 'Sin dato'),
    materiaColor: normalizeText(pickFirstDefined(item.materiaColor, item.materia_color), '#2563eb') || '#2563eb',
    totalTareas: normalizeNumber(pickFirstDefined(item.totalTareas, item.total_tareas)),
    totalEntregas: normalizeNumber(pickFirstDefined(item.totalEntregas, item.total_entregas)),
    totalPendientes: normalizeNumber(pickFirstDefined(item.totalPendientes, item.total_pendientes)),
    totalCompletadas: normalizeNumber(pickFirstDefined(item.totalCompletadas, item.total_completadas)),
    porcentajeCumplimiento: clampPercentage(pickFirstDefined(item.porcentajeCumplimiento, item.porcentaje_cumplimiento)),
  };
};

const normalizePendingStudent = (student, index = 0) => {
  const nombre = normalizeText(student.nombre, 'Alumno');
  const apellidos = normalizeText(student.apellidos);

  return {
    id: normalizeNumber(pickFirstDefined(student.id, student.idAlumno, student.id_alumno, index + 1), index + 1),
    idAlumno: normalizeNumber(pickFirstDefined(student.idAlumno, student.id_alumno, student.id, 0)),
    nombre,
    apellidos,
    nombreCompleto: normalizeText(pickFirstDefined(student.nombreCompleto, student.nombre_completo), `${nombre} ${apellidos}`.trim()),
    email: normalizeText(pickFirstDefined(student.email, student.correo)),
    matricula: normalizeText(student.matricula),
    totalPendientes: normalizeNumber(pickFirstDefined(student.totalPendientes, student.total_pendientes)),
  };
};

const normalizeDelivery = (delivery, index = 0) => {
  const nombre = normalizeText(delivery.nombre, 'Alumno');
  const apellidos = normalizeText(delivery.apellidos);

  return {
    id: normalizeNumber(pickFirstDefined(delivery.id, delivery.idEntrega, delivery.id_entrega, index + 1), index + 1),
    idEntrega: normalizeNumber(pickFirstDefined(delivery.idEntrega, delivery.id_entrega, delivery.id, 0)),
    idAlumno: normalizeNumber(pickFirstDefined(delivery.idAlumno, delivery.id_alumno, 0)),
    nombre,
    apellidos,
    nombreCompleto: normalizeText(pickFirstDefined(delivery.nombreCompleto, delivery.nombre_completo), `${nombre} ${apellidos}`.trim()),
    email: normalizeText(pickFirstDefined(delivery.email, delivery.correo)),
    matricula: normalizeText(delivery.matricula),
    estado: normalizeText(delivery.estado, 'pendiente').toLowerCase() === 'completada' ? 'completada' : 'pendiente',
    fechaEntrega: normalizeDateKey(pickFirstDefined(delivery.fechaEntrega, delivery.fecha_entrega)),
    notaPersonal: normalizeText(pickFirstDefined(delivery.notaPersonal, delivery.nota_personal)),
    observacion: normalizeText(delivery.observacion),
    tiempoRealHoras:
      pickFirstDefined(delivery.tiempoRealHoras, delivery.tiempo_real_horas) === null
        ? null
        : normalizeNumber(pickFirstDefined(delivery.tiempoRealHoras, delivery.tiempo_real_horas, 0)),
    revisada: toBoolean(pickFirstDefined(delivery.revisada, false)),
    entregaATiempo: toBoolean(pickFirstDefined(delivery.entregaATiempo, delivery.entrega_a_tiempo, false)),
    entregaTarde: toBoolean(pickFirstDefined(delivery.entregaTarde, delivery.entrega_tarde, false)),
  };
};

const normalizeTrackingMetrics = (metrics = {}) => ({
  totalAlumnos: normalizeNumber(pickFirstDefined(metrics.totalAlumnos, metrics.total_alumnos)),
  totalPendientes: normalizeNumber(pickFirstDefined(metrics.totalPendientes, metrics.total_pendientes)),
  totalCompletadas: normalizeNumber(pickFirstDefined(metrics.totalCompletadas, metrics.total_completadas)),
  porcentajeCumplimiento: clampPercentage(pickFirstDefined(metrics.porcentajeCumplimiento, metrics.porcentaje_cumplimiento)),
  porcentajePendiente: clampPercentage(pickFirstDefined(metrics.porcentajePendiente, metrics.porcentaje_pendiente)),
  entregasATiempo: normalizeNumber(pickFirstDefined(metrics.entregasATiempo, metrics.entregas_a_tiempo)),
  entregasTarde: normalizeNumber(pickFirstDefined(metrics.entregasTarde, metrics.entregas_tarde)),
});

const normalizeTrackingSummary = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.seguimiento ?? data.summary ?? data;

  return {
    totalTareasPublicadas: normalizeNumber(pickFirstDefined(source.totalTareasPublicadas, source.total_tareas_publicadas)),
    totalEntregasGeneradas: normalizeNumber(pickFirstDefined(source.totalEntregasGeneradas, source.total_entregas_generadas)),
    totalEntregasPendientes: normalizeNumber(pickFirstDefined(source.totalEntregasPendientes, source.total_entregas_pendientes)),
    totalEntregasCompletadas: normalizeNumber(pickFirstDefined(source.totalEntregasCompletadas, source.total_entregas_completadas)),
    porcentajeCumplimientoGeneral: clampPercentage(
      pickFirstDefined(source.porcentajeCumplimientoGeneral, source.porcentaje_cumplimiento_general),
    ),
    tareasConBajoCumplimiento: extractCollection({ data: source }, ['tareasConBajoCumplimiento', 'tareas_con_bajo_cumplimiento']).map(
      normalizeTrackingTask,
    ),
    alumnosConMasPendientes: extractCollection({ data: source }, ['alumnosConMasPendientes', 'alumnos_con_mas_pendientes']).map(
      normalizePendingStudent,
    ),
    resumenPorGrupo: extractCollection({ data: source }, ['resumenPorGrupo', 'resumen_por_grupo']).map((item, index) =>
      normalizeTrackingBucket(item, index, 'grupo'),
    ),
    resumenPorMateria: extractCollection({ data: source }, ['resumenPorMateria', 'resumen_por_materia']).map((item, index) =>
      normalizeTrackingBucket(item, index, 'materia'),
    ),
    tareasRecientes: extractCollection({ data: source }, ['tareasRecientes', 'tareas_recientes', 'tareas']).map(normalizeTrackingTask),
  };
};

const normalizeTaskTracking = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.seguimiento ?? data.tracking ?? data;
  const task = normalizeTrackingTask(source.tarea ?? source.task ?? {});
  const metricas = normalizeTrackingMetrics(source.metricas ?? source.metrics ?? {});
  const entregas = extractCollection({ data: source }, ['entregas', 'deliveries', 'items']).map(normalizeDelivery);

  return { tarea: task, metricas, entregas };
};

const handleTrackingError = (error, fallbackKey, fallbackValue, fallbackMessage) => ({
  ok: false,
  status: error?.status,
  message: extractApiMessage(error?.payload, fallbackMessage),
  [fallbackKey]: fallbackValue,
});

const getTeacherTrackingSummary = async () => {
  try {
    const { data } = await request('/docente/seguimiento');
    return { ok: true, summary: normalizeTrackingSummary(data) };
  } catch (error) {
    return handleTrackingError(error, 'summary', { ...emptyTrackingSummary }, 'No se pudo cargar el seguimiento.');
  }
};

const getTeacherTaskTracking = async (taskId) => {
  try {
    const { data } = await request(`/docente/tareas/${taskId}/seguimiento`);
    return { ok: true, tracking: normalizeTaskTracking(data) };
  } catch (error) {
    return handleTrackingError(error, 'tracking', null, 'No tienes permiso para consultar esta tarea.');
  }
};

const updateDeliveryReview = async (deliveryId, reviewData = {}) => {
  const body = {};

  if ('revisada' in reviewData) {
    body.revisada = Boolean(reviewData.revisada);
  }

  if ('observacion' in reviewData) {
    body.observacion = normalizeText(reviewData.observacion);
  }

  try {
    const { data } = await request(`/docente/entregas/${deliveryId}/revisar`, {
      method: 'PATCH',
      body,
    });

    return { ok: true, message: data?.message ?? 'Entrega actualizada correctamente.' };
  } catch (error) {
    return {
      ok: false,
      status: error?.status,
      message: extractApiMessage(error?.payload, 'No se pudo actualizar la entrega.'),
    };
  }
};

export {
  emptyTrackingSummary,
  getTeacherTaskTracking,
  getTeacherTrackingSummary,
  normalizeDelivery,
  normalizeTaskTracking,
  normalizeTrackingSummary,
  updateDeliveryReview,
};
