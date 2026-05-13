import { extractApiMessage, request } from './apiClient';
import { extractCollection, normalizeTaskPriority, toBoolean, unwrapApiData } from './apiMappers';
import { normalizeDateKey } from '../utils/date';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const normalizeNumber = (value, fallback = 0) => Number(value ?? fallback) || fallback;
const clampPercentage = (value) => Math.max(0, Math.min(100, Math.round(normalizeNumber(value))));

const emptyReportSummary = {
  totalGrupos: 0,
  totalMaterias: 0,
  totalAlumnos: 0,
  totalTareasPublicadas: 0,
  totalEntregas: 0,
  entregasCompletadas: 0,
  entregasPendientes: 0,
  entregasRevisadas: 0,
  entregasSinRevisar: 0,
  porcentajeCumplimientoGeneral: 0,
  porcentajeRevisionGeneral: 0,
  grupoMayorCumplimiento: null,
  grupoMenorCumplimiento: null,
  materiaMayorCarga: null,
  alumnoMasPendientes: null,
  tareasConBajoCumplimiento: [],
};

const buildReportQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const normalized = normalizeText(value);
    if (normalized && normalized !== 'all') {
      params.set(key, normalized);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

const normalizeHighlightGroup = (group) => {
  if (!group || typeof group !== 'object') return null;

  return {
    idGrupo: normalizeNumber(pickFirstDefined(group.idGrupo, group.id_grupo, group.id)),
    nombreGrupo: normalizeText(pickFirstDefined(group.nombreGrupo, group.nombre_grupo, group.grupo), 'Sin grupo'),
    porcentaje: clampPercentage(group.porcentaje),
  };
};

const normalizeHighlightSubject = (subject) => {
  if (!subject || typeof subject !== 'object') return null;

  return {
    idMateria: normalizeNumber(pickFirstDefined(subject.idMateria, subject.id_materia, subject.id)),
    nombre: normalizeText(pickFirstDefined(subject.nombre, subject.materiaNombre, subject.materia_nombre), 'Sin materia'),
    totalTareas: normalizeNumber(pickFirstDefined(subject.totalTareas, subject.total_tareas)),
  };
};

const normalizeHighlightStudent = (student) => {
  if (!student || typeof student !== 'object') return null;

  return {
    idAlumno: normalizeNumber(pickFirstDefined(student.idAlumno, student.id_alumno, student.id)),
    nombreCompleto: normalizeText(pickFirstDefined(student.nombreCompleto, student.nombre_completo), 'Alumno'),
    totalPendientes: normalizeNumber(pickFirstDefined(student.totalPendientes, student.total_pendientes)),
  };
};

const normalizeReportTask = (task, index = 0) => ({
  id: normalizeNumber(pickFirstDefined(task.id, task.idTarea, task.id_tarea, task.id_tarea_asignada, index + 1), index + 1),
  idTarea: normalizeNumber(pickFirstDefined(task.idTarea, task.id_tarea, task.id_tarea_asignada, task.id, 0)),
  idGrupo: normalizeNumber(pickFirstDefined(task.idGrupo, task.id_grupo, 0)),
  idMateria: normalizeNumber(pickFirstDefined(task.idMateria, task.id_materia, 0)),
  titulo: normalizeText(task.titulo, 'Tarea sin título'),
  materia: normalizeText(pickFirstDefined(task.materia, task.materiaNombre, task.materia_nombre), 'Sin materia'),
  grupo: normalizeText(pickFirstDefined(task.grupo, task.grupoNombre, task.nombre_grupo), 'Sin grupo'),
  fechaPublicacion: normalizeDateKey(pickFirstDefined(task.fechaPublicacion, task.fecha_publicacion)),
  fechaLimite: normalizeDateKey(pickFirstDefined(task.fechaLimite, task.fecha_limite)),
  prioridad: normalizeTaskPriority(task.prioridad),
  activa: toBoolean(pickFirstDefined(task.activa, task.activo, true)),
  totalAlumnos: normalizeNumber(pickFirstDefined(task.totalAlumnos, task.total_alumnos)),
  totalEntregas: normalizeNumber(pickFirstDefined(task.totalEntregas, task.total_entregas)),
  completadas: normalizeNumber(task.completadas),
  pendientes: normalizeNumber(task.pendientes),
  revisadas: normalizeNumber(task.revisadas),
  sinRevisar: normalizeNumber(pickFirstDefined(task.sinRevisar, task.sin_revisar)),
  porcentajeCumplimiento: clampPercentage(pickFirstDefined(task.porcentajeCumplimiento, task.porcentaje_cumplimiento)),
  porcentajeRevision: clampPercentage(pickFirstDefined(task.porcentajeRevision, task.porcentaje_revision)),
  entregasATiempo: normalizeNumber(pickFirstDefined(task.entregasATiempo, task.entregas_a_tiempo)),
  entregasTarde: normalizeNumber(pickFirstDefined(task.entregasTarde, task.entregas_tarde)),
  estadoGeneral: normalizeText(pickFirstDefined(task.estadoGeneral, task.estado_general), 'sin entregas'),
});

const normalizeReportGroup = (group, index = 0) => ({
  id: normalizeNumber(pickFirstDefined(group.id, group.idGrupo, group.id_grupo, index + 1), index + 1),
  idGrupo: normalizeNumber(pickFirstDefined(group.idGrupo, group.id_grupo, group.id, 0)),
  nombreGrupo: normalizeText(pickFirstDefined(group.nombreGrupo, group.nombre_grupo, group.grupo), 'Sin grupo'),
  carrera: normalizeText(group.carrera, 'Sin carrera'),
  semestre: normalizeText(group.semestre),
  turno: normalizeText(group.turno),
  totalAlumnos: normalizeNumber(pickFirstDefined(group.totalAlumnos, group.total_alumnos)),
  totalTareas: normalizeNumber(pickFirstDefined(group.totalTareas, group.total_tareas)),
  totalEntregas: normalizeNumber(pickFirstDefined(group.totalEntregas, group.total_entregas)),
  completadas: normalizeNumber(group.completadas),
  pendientes: normalizeNumber(group.pendientes),
  revisadas: normalizeNumber(group.revisadas),
  sinRevisar: normalizeNumber(pickFirstDefined(group.sinRevisar, group.sin_revisar)),
  porcentajeCumplimiento: clampPercentage(pickFirstDefined(group.porcentajeCumplimiento, group.porcentaje_cumplimiento)),
  porcentajeRevision: clampPercentage(pickFirstDefined(group.porcentajeRevision, group.porcentaje_revision)),
  materias: Array.isArray(group.materias) ? group.materias : normalizeText(group.materias).split(',').map((item) => item.trim()).filter(Boolean),
  materiaPrincipal: normalizeText(pickFirstDefined(group.materiaPrincipal, group.materia_principal)),
});

const normalizeReportSubject = (subject, index = 0) => ({
  id: normalizeNumber(pickFirstDefined(subject.id, subject.idMateria, subject.id_materia, index + 1), index + 1),
  idMateria: normalizeNumber(pickFirstDefined(subject.idMateria, subject.id_materia, subject.id, 0)),
  nombre: normalizeText(pickFirstDefined(subject.nombre, subject.materiaNombre, subject.materia_nombre), 'Sin materia'),
  color: normalizeText(subject.color, '#2563eb') || '#2563eb',
  descripcion: normalizeText(subject.descripcion),
  totalGrupos: normalizeNumber(pickFirstDefined(subject.totalGrupos, subject.total_grupos)),
  totalAlumnos: normalizeNumber(pickFirstDefined(subject.totalAlumnos, subject.total_alumnos)),
  totalTareasPublicadas: normalizeNumber(pickFirstDefined(subject.totalTareasPublicadas, subject.total_tareas_publicadas)),
  totalEntregas: normalizeNumber(pickFirstDefined(subject.totalEntregas, subject.total_entregas)),
  completadas: normalizeNumber(subject.completadas),
  pendientes: normalizeNumber(subject.pendientes),
  porcentajeCumplimiento: clampPercentage(pickFirstDefined(subject.porcentajeCumplimiento, subject.porcentaje_cumplimiento)),
  tareasConBajoCumplimiento: normalizeNumber(
    pickFirstDefined(subject.tareasConBajoCumplimiento, subject.tareas_con_bajo_cumplimiento),
  ),
  cargaAcademica: normalizeText(pickFirstDefined(subject.cargaAcademica, subject.carga_academica), 'Baja'),
  grupos: Array.isArray(subject.grupos) ? subject.grupos : normalizeText(subject.grupos).split(',').map((item) => item.trim()).filter(Boolean),
});

const normalizeReportStudent = (student, index = 0) => {
  const nombre = normalizeText(student.nombre, 'Alumno');
  const apellidos = normalizeText(student.apellidos);

  return {
    id: normalizeNumber(pickFirstDefined(student.id, student.idAlumno, student.id_alumno, index + 1), index + 1),
    idAlumno: normalizeNumber(pickFirstDefined(student.idAlumno, student.id_alumno, student.id, 0)),
    nombre,
    apellidos,
    nombreCompleto: normalizeText(pickFirstDefined(student.nombreCompleto, student.nombre_completo), `${nombre} ${apellidos}`.trim()),
    matricula: normalizeText(student.matricula),
    email: normalizeText(student.email),
    grupo: normalizeText(student.grupo, 'Sin grupo'),
    carrera: normalizeText(student.carrera),
    totalTareasAsignadas: normalizeNumber(pickFirstDefined(student.totalTareasAsignadas, student.total_tareas_asignadas)),
    completadas: normalizeNumber(student.completadas),
    pendientes: normalizeNumber(student.pendientes),
    revisadas: normalizeNumber(student.revisadas),
    sinRevisar: normalizeNumber(pickFirstDefined(student.sinRevisar, student.sin_revisar)),
    porcentajeCumplimiento: clampPercentage(pickFirstDefined(student.porcentajeCumplimiento, student.porcentaje_cumplimiento)),
    tareasPendientesAltaPrioridad: normalizeNumber(
      pickFirstDefined(student.tareasPendientesAltaPrioridad, student.tareas_pendientes_alta_prioridad),
    ),
    ultimaEntrega: normalizeDateKey(pickFirstDefined(student.ultimaEntrega, student.ultima_entrega)),
  };
};

const normalizeReportSummary = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.resumen ?? data.summary ?? data;

  return {
    totalGrupos: normalizeNumber(pickFirstDefined(source.totalGrupos, source.total_grupos)),
    totalMaterias: normalizeNumber(pickFirstDefined(source.totalMaterias, source.total_materias)),
    totalAlumnos: normalizeNumber(pickFirstDefined(source.totalAlumnos, source.total_alumnos)),
    totalTareasPublicadas: normalizeNumber(pickFirstDefined(source.totalTareasPublicadas, source.total_tareas_publicadas)),
    totalEntregas: normalizeNumber(pickFirstDefined(source.totalEntregas, source.total_entregas)),
    entregasCompletadas: normalizeNumber(pickFirstDefined(source.entregasCompletadas, source.entregas_completadas)),
    entregasPendientes: normalizeNumber(pickFirstDefined(source.entregasPendientes, source.entregas_pendientes)),
    entregasRevisadas: normalizeNumber(pickFirstDefined(source.entregasRevisadas, source.entregas_revisadas)),
    entregasSinRevisar: normalizeNumber(pickFirstDefined(source.entregasSinRevisar, source.entregas_sin_revisar)),
    porcentajeCumplimientoGeneral: clampPercentage(
      pickFirstDefined(source.porcentajeCumplimientoGeneral, source.porcentaje_cumplimiento_general),
    ),
    porcentajeRevisionGeneral: clampPercentage(pickFirstDefined(source.porcentajeRevisionGeneral, source.porcentaje_revision_general)),
    grupoMayorCumplimiento: normalizeHighlightGroup(pickFirstDefined(source.grupoMayorCumplimiento, source.grupo_mayor_cumplimiento)),
    grupoMenorCumplimiento: normalizeHighlightGroup(pickFirstDefined(source.grupoMenorCumplimiento, source.grupo_menor_cumplimiento)),
    materiaMayorCarga: normalizeHighlightSubject(pickFirstDefined(source.materiaMayorCarga, source.materia_mayor_carga)),
    alumnoMasPendientes: normalizeHighlightStudent(pickFirstDefined(source.alumnoMasPendientes, source.alumno_mas_pendientes)),
    tareasConBajoCumplimiento: extractCollection({ data: source }, ['tareasConBajoCumplimiento', 'tareas_con_bajo_cumplimiento']).map(
      normalizeReportTask,
    ),
  };
};

const handleReportError = (error, fallbackKey, fallbackValue, fallbackMessage) => ({
  ok: false,
  status: error?.status,
  message: extractApiMessage(error?.payload, fallbackMessage),
  [fallbackKey]: fallbackValue,
});

const getTeacherReportSummary = async (filters = {}) => {
  try {
    const { data } = await request(`/docente/reportes/resumen${buildReportQuery(filters)}`);
    return { ok: true, summary: normalizeReportSummary(data) };
  } catch (error) {
    return handleReportError(error, 'summary', { ...emptyReportSummary }, 'No se pudieron cargar los reportes.');
  }
};

const getTeacherGroupReports = async (filters = {}) => {
  try {
    const { data } = await request(`/docente/reportes/grupos${buildReportQuery(filters)}`);
    return { ok: true, groups: extractCollection(data).map(normalizeReportGroup) };
  } catch (error) {
    return handleReportError(error, 'groups', [], 'No se pudo cargar el reporte por grupos.');
  }
};

const getTeacherSubjectReports = async (filters = {}) => {
  try {
    const { data } = await request(`/docente/reportes/materias${buildReportQuery(filters)}`);
    return { ok: true, subjects: extractCollection(data).map(normalizeReportSubject) };
  } catch (error) {
    return handleReportError(error, 'subjects', [], 'No se pudo cargar el reporte por materias.');
  }
};

const getTeacherStudentReports = async (filters = {}) => {
  try {
    const { data } = await request(`/docente/reportes/alumnos${buildReportQuery(filters)}`);
    return { ok: true, students: extractCollection(data).map(normalizeReportStudent) };
  } catch (error) {
    return handleReportError(error, 'students', [], 'No se pudo cargar el reporte por alumnos.');
  }
};

const getTeacherTaskReports = async (filters = {}) => {
  try {
    const { data } = await request(`/docente/reportes/tareas${buildReportQuery(filters)}`);
    return { ok: true, tasks: extractCollection(data).map(normalizeReportTask) };
  } catch (error) {
    return handleReportError(error, 'tasks', [], 'No se pudo cargar el reporte por tareas.');
  }
};

export {
  emptyReportSummary,
  getTeacherGroupReports,
  getTeacherReportSummary,
  getTeacherStudentReports,
  getTeacherSubjectReports,
  getTeacherTaskReports,
  normalizeReportGroup,
  normalizeReportStudent,
  normalizeReportSubject,
  normalizeReportSummary,
  normalizeReportTask,
};
