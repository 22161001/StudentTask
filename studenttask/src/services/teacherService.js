import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import { extractCollection, normalizeRole, normalizeTaskPriority, toBoolean, unwrapApiData } from './apiMappers';
import { getSession } from './authService';
import { normalizeDateKey } from '../utils/date';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();

const buildSessionTeacher = () => {
  const session = getSession();

  return {
    idUsuario: Number(session?.idUsuario ?? session?.id ?? 0) || 0,
    idDocente: 0,
    nombre: normalizeText(session?.nombre, 'Docente'),
    apellidos: normalizeText(session?.apellidos),
    nombreCompleto: normalizeText(session?.nombreCompleto, `${session?.nombre ?? ''} ${session?.apellidos ?? ''}`.trim() || 'Docente'),
    email: normalizeText(session?.email),
    numeroEmpleado: '',
    especialidad: '',
    rol: normalizeRole(session?.rol, 'Docente'),
  };
};

const normalizeTeacherProfile = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.perfil ?? data.docente ?? data.teacher ?? data.user ?? data.usuario ?? data;
  const fallback = buildSessionTeacher();
  const nombre = normalizeText(pickFirstDefined(source.nombre, fallback.nombre), fallback.nombre);
  const apellidos = normalizeText(pickFirstDefined(source.apellidos, fallback.apellidos), fallback.apellidos);

  return {
    idUsuario: Number(pickFirstDefined(source.idUsuario, source.id_usuario, source.id, fallback.idUsuario)) || fallback.idUsuario,
    idDocente: Number(pickFirstDefined(source.idDocente, source.id_docente, fallback.idDocente)) || fallback.idDocente,
    nombre,
    apellidos,
    nombreCompleto: normalizeText(`${nombre} ${apellidos}`) || fallback.nombreCompleto,
    email: normalizeText(pickFirstDefined(source.email, source.correo, fallback.email), fallback.email),
    numeroEmpleado: normalizeText(pickFirstDefined(source.numeroEmpleado, source.numero_empleado, fallback.numeroEmpleado)),
    especialidad: normalizeText(pickFirstDefined(source.especialidad, fallback.especialidad)),
    rol: normalizeRole(pickFirstDefined(source.rol, fallback.rol), 'Docente'),
  };
};

const normalizeTeacherGroup = (group, index = 0) => ({
  id: Number(pickFirstDefined(group.id, group.id_grupo, group.idGrupo, index + 1)) || index + 1,
  idGrupo: Number(pickFirstDefined(group.idGrupo, group.id_grupo, group.id, 0)) || 0,
  idMateria: Number(pickFirstDefined(group.idMateria, group.id_materia, group.materiaId, 0)) || 0,
  materiaId: Number(pickFirstDefined(group.materiaId, group.idMateria, group.id_materia, 0)) || 0,
  nombreGrupo: normalizeText(pickFirstDefined(group.nombreGrupo, group.nombre_grupo, group.grupoNombre, group.grupo), 'Grupo'),
  grupo: normalizeText(pickFirstDefined(group.grupo, group.nombreGrupo, group.nombre_grupo), 'Grupo'),
  carrera: normalizeText(group.carrera, 'Sin carrera asignada'),
  semestre: normalizeText(group.semestre, 'Sin semestre'),
  turno: normalizeText(group.turno),
  activo: toBoolean(pickFirstDefined(group.activo, true)),
  materia: normalizeText(pickFirstDefined(group.materia, group.materiaNombre, group.materia_nombre, group.nombre_materia), 'Sin materia'),
  materiaNombre: normalizeText(pickFirstDefined(group.materiaNombre, group.materia, group.materia_nombre, group.nombre_materia), 'Sin materia'),
  materiaColor: normalizeText(pickFirstDefined(group.materiaColor, group.materia_color, group.color), '#2563eb') || '#2563eb',
  materiaDescripcion: normalizeText(pickFirstDefined(group.materiaDescripcion, group.materia_descripcion, group.descripcion)),
  periodo: normalizeText(group.periodo),
  totalAlumnos: Number(pickFirstDefined(group.totalAlumnos, group.total_alumnos, group.numeroAlumnos, group.alumnos, 0)) || 0,
  alumnosActivos: Number(pickFirstDefined(group.alumnosActivos, group.alumnos_activos, group.totalAlumnos, group.total_alumnos, 0)) || 0,
  totalTareasPublicadas:
    Number(pickFirstDefined(group.totalTareasPublicadas, group.total_tareas_publicadas, group.totalTareas, group.total_tareas, 0)) || 0,
});

const normalizeTeacherTask = (task, index = 0) => ({
  id: Number(pickFirstDefined(task.id, task.id_tarea_asignada, task.idTareaAsignada, index + 1)) || index + 1,
  idTareaAsignada: Number(pickFirstDefined(task.idTareaAsignada, task.id_tarea_asignada, task.id, 0)) || 0,
  titulo: normalizeText(task.titulo, 'Tarea sin título'),
  descripcion: normalizeText(task.descripcion),
  instrucciones: normalizeText(task.instrucciones),
  materia: normalizeText(pickFirstDefined(task.materia, task.materiaNombre, task.materia_nombre, task.nombre_materia), 'Sin materia'),
  grupo: normalizeText(pickFirstDefined(task.grupo, task.grupoNombre, task.grupo_nombre, task.nombre_grupo), 'Sin grupo'),
  carrera: normalizeText(task.carrera),
  semestre: normalizeText(task.semestre),
  fechaPublicacion: normalizeDateKey(pickFirstDefined(task.fechaPublicacion, task.fecha_publicacion, task.created_at)),
  fechaLimite: normalizeDateKey(pickFirstDefined(task.fechaLimite, task.fecha_limite, task.fechaEntrega, task.fecha_entrega)),
  prioridad: normalizeTaskPriority(task.prioridad),
  activa: toBoolean(pickFirstDefined(task.activa, task.activo, true)),
  estado: toBoolean(pickFirstDefined(task.activa, task.activo, true)) ? 'Activa' : 'Inactiva',
  totalAlumnos: Number(pickFirstDefined(task.totalAlumnos, task.total_alumnos, 0)) || 0,
  totalEntregas: Number(pickFirstDefined(task.totalEntregas, task.total_entregas, 0)) || 0,
});

const normalizeTeacherGroups = (payload) =>
  extractCollection(payload, ['grupos', 'groups', 'items']).map((group, index) => normalizeTeacherGroup(group, index));

const normalizeTeacherTasks = (payload) =>
  extractCollection(payload, ['tareas', 'tasks', 'proximasTareas', 'proximas_tareas', 'items']).map((task, index) =>
    normalizeTeacherTask(task, index),
  );

const normalizeTeacherStudent = (student, index = 0) => ({
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
  carrera: normalizeText(student.carrera, 'Sin carrera'),
  semestre: normalizeText(student.semestre, 'Sin semestre'),
  grupo: normalizeText(student.grupo, 'Sin grupo'),
  activo: toBoolean(pickFirstDefined(student.activo, true)),
});

const normalizeTeacherStudents = (payload) =>
  extractCollection(payload, ['alumnos', 'students', 'items']).map((student, index) => normalizeTeacherStudent(student, index));

const normalizeTeacherSubjectGroup = (group, index = 0) => ({
  idGrupo: Number(pickFirstDefined(group.idGrupo, group.id_grupo, group.id, index + 1)) || index + 1,
  nombreGrupo: normalizeText(pickFirstDefined(group.nombreGrupo, group.nombre_grupo, group.grupo), 'Grupo'),
  carrera: normalizeText(group.carrera),
  semestre: normalizeText(group.semestre),
  turno: normalizeText(group.turno),
  periodo: normalizeText(group.periodo),
  totalAlumnos: Number(pickFirstDefined(group.totalAlumnos, group.total_alumnos, 0)) || 0,
  totalTareasPublicadas: Number(pickFirstDefined(group.totalTareasPublicadas, group.total_tareas_publicadas, 0)) || 0,
});

const normalizeTeacherSubject = (subject, index = 0) => ({
  id: Number(pickFirstDefined(subject.id, subject.id_materia, subject.idMateria, index + 1)) || index + 1,
  idMateria: Number(pickFirstDefined(subject.idMateria, subject.id_materia, subject.id, 0)) || 0,
  nombre: normalizeText(subject.nombre, 'Materia sin nombre'),
  color: normalizeText(subject.color, '#2563eb') || '#2563eb',
  descripcion: normalizeText(subject.descripcion),
  periodo: normalizeText(subject.periodo),
  totalGrupos: Number(pickFirstDefined(subject.totalGrupos, subject.total_grupos, subject.grupos?.length, 0)) || 0,
  totalAlumnos: Number(pickFirstDefined(subject.totalAlumnos, subject.total_alumnos, 0)) || 0,
  totalTareasPublicadas: Number(pickFirstDefined(subject.totalTareasPublicadas, subject.total_tareas_publicadas, 0)) || 0,
  grupos: Array.isArray(subject.grupos) ? subject.grupos.map((group, groupIndex) => normalizeTeacherSubjectGroup(group, groupIndex)) : [],
});

const normalizeTeacherSubjects = (payload) =>
  extractCollection(payload, ['materias', 'subjects', 'items']).map((subject, index) => normalizeTeacherSubject(subject, index));

const normalizeTeacherGroupDetail = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.grupo ?? data.group ?? data;
  const group = normalizeTeacherGroup(source);
  const materias = Array.isArray(source.materias)
    ? source.materias.map((subject, index) => normalizeTeacherSubject(subject, index))
    : [];
  const proximasTareas = normalizeTeacherTasks({
    data: {
      tareas: source.proximasTareas ?? source.proximas_tareas ?? [],
    },
  });

  return {
    ...group,
    materias,
    proximasTareas,
    totalTareasPublicadas:
      Number(pickFirstDefined(source.totalTareasPublicadas, source.total_tareas_publicadas, group.totalTareasPublicadas, 0)) || 0,
    alumnosActivos: Number(pickFirstDefined(source.alumnosActivos, source.alumnos_activos, group.totalAlumnos, 0)) || 0,
  };
};

const normalizeTeacherDashboard = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.dashboard ?? data;
  const proximasTareas = normalizeTeacherTasks({
    data: {
      tareas: source.proximasTareas ?? source.proximas_tareas ?? [],
    },
  });

  return {
    docente: normalizeTeacherProfile(source.docente ?? source.perfil ?? {}),
    totalGrupos: Number(pickFirstDefined(source.totalGrupos, source.total_grupos, 0)) || 0,
    totalMaterias: Number(pickFirstDefined(source.totalMaterias, source.total_materias, 0)) || 0,
    totalAlumnos: Number(pickFirstDefined(source.totalAlumnos, source.total_alumnos, 0)) || 0,
    totalTareas: Number(pickFirstDefined(source.totalTareas, source.total_tareas, source.totalTareasPublicadas, 0)) || 0,
    totalTareasPublicadas:
      Number(pickFirstDefined(source.totalTareasPublicadas, source.total_tareas_publicadas, source.totalTareas, source.total_tareas, 0)) || 0,
    proximasTareas,
  };
};

const buildFallbackResult = (dataKey, dataValue, message) => ({
  ok: true,
  fallback: true,
  message,
  [dataKey]: dataValue,
});

const handleTeacherError = (error, fallbackKey, fallbackValue, fallbackMessage) => {
  if (isApiFallbackError(error)) {
    return buildFallbackResult(fallbackKey, fallbackValue, fallbackMessage);
  }

  return {
    ok: false,
    message: extractApiMessage(error.payload, 'No se pudo cargar la información del docente.'),
    [fallbackKey]: fallbackValue,
  };
};

const syncTeacherDashboard = async () => {
  const fallbackDashboard = {
    docente: buildSessionTeacher(),
    totalGrupos: 0,
    totalMaterias: 0,
    totalAlumnos: 0,
    totalTareas: 0,
    totalTareasPublicadas: 0,
    proximasTareas: [],
  };

  try {
    const { data } = await request('/docente/dashboard');
    return { ok: true, dashboard: normalizeTeacherDashboard(data) };
  } catch (error) {
    return handleTeacherError(
      error,
      'dashboard',
      fallbackDashboard,
      'No se pudo conectar con el servidor. Se muestran datos docentes de respaldo.',
    );
  }
};

const syncTeacherGroups = async () => {
  try {
    const { data } = await request('/docente/grupos');
    return { ok: true, groups: normalizeTeacherGroups(data) };
  } catch (error) {
    return handleTeacherError(error, 'groups', [], 'No se pudo cargar la lista de grupos asignados.');
  }
};

const buildGroupDetailPath = (id, options = {}) => {
  const params = new URLSearchParams();
  const materiaId = Number(options.materiaId ?? options.idMateria ?? 0);
  const periodo = normalizeText(options.periodo);

  if (materiaId) {
    params.set('materiaId', String(materiaId));
  }

  if (periodo) {
    params.set('periodo', periodo);
  }

  const query = params.toString();
  return `/docente/grupos/${id}${query ? `?${query}` : ''}`;
};

const syncTeacherGroupDetail = async (id, options = {}) => {
  try {
    const { data } = await request(buildGroupDetailPath(id, options));
    return { ok: true, group: normalizeTeacherGroupDetail(data) };
  } catch (error) {
    return handleTeacherError(error, 'group', null, 'No se pudo cargar el detalle del grupo.');
  }
};

const syncTeacherGroupStudents = async (id) => {
  try {
    const { data } = await request(`/docente/grupos/${id}/alumnos`);
    return { ok: true, students: normalizeTeacherStudents(data) };
  } catch (error) {
    return handleTeacherError(error, 'students', [], 'No se pudo cargar la lista de alumnos del grupo.');
  }
};

const syncTeacherSubjects = async () => {
  try {
    const { data } = await request('/docente/materias');
    return { ok: true, subjects: normalizeTeacherSubjects(data) };
  } catch (error) {
    return handleTeacherError(error, 'subjects', [], 'No se pudo cargar la lista de materias asignadas.');
  }
};

const syncTeacherTasks = async () => {
  try {
    const { data } = await request('/docente/tareas');
    return { ok: true, tasks: normalizeTeacherTasks(data) };
  } catch (error) {
    return handleTeacherError(error, 'tasks', [], 'No se pudo cargar la lista de tareas publicadas.');
  }
};

const syncTeacherProfile = async () => {
  try {
    const { data } = await request('/docente/perfil');
    return { ok: true, profile: normalizeTeacherProfile(data) };
  } catch (error) {
    return handleTeacherError(error, 'profile', buildSessionTeacher(), 'No se pudo cargar el perfil docente.');
  }
};

const getTeacherDashboard = syncTeacherDashboard;
const getTeacherGroups = syncTeacherGroups;
const getTeacherGroupDetail = syncTeacherGroupDetail;
const getTeacherGroupStudents = syncTeacherGroupStudents;
const getTeacherSubjects = syncTeacherSubjects;

export {
  getTeacherDashboard,
  getTeacherGroupDetail,
  getTeacherGroupStudents,
  getTeacherGroups,
  getTeacherSubjects,
  normalizeTeacherDashboard,
  normalizeTeacherGroup,
  normalizeTeacherGroupDetail,
  normalizeTeacherProfile,
  normalizeTeacherStudent,
  normalizeTeacherSubject,
  normalizeTeacherTask,
  syncTeacherDashboard,
  syncTeacherGroupDetail,
  syncTeacherGroupStudents,
  syncTeacherGroups,
  syncTeacherProfile,
  syncTeacherSubjects,
  syncTeacherTasks,
};
