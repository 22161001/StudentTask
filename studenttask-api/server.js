import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'studenttask_db';
const JWT_SECRET = process.env.JWT_SECRET || 'studenttask_clave_secreta';
const DEFAULT_SUBJECT_COLOR = '#2563eb';
const validPriorities = new Set(['baja', 'media', 'alta']);
const validStates = new Set(['pendiente', 'completada']);
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

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    credentials: true,
  }),
);
app.use(express.json());

const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

await db.query('SELECT 1');
console.log(`API StudentTask conectada a MySQL (${DB_NAME})`);

const sendOk = (res, message, data = {}, status = 200) =>
  res.status(status).json({
    ok: true,
    message,
    data,
  });

const sendError = (res, status, message, errors = undefined) =>
  res.status(status).json({
    ok: false,
    message,
    ...(errors ? { errors } : {}),
  });

const asyncRoute = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Error interno del servidor.');
  }
};

const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const normalizeRoleKey = (value) => {
  const role = normalizeText(value).toLowerCase();

  if (role === 'alumno' || role === 'estudiante' || role === 'student') return 'alumno';
  if (role === 'docente' || role === 'teacher' || role === 'profesor' || role === 'profesora') return 'docente';
  if (role === 'administrador' || role === 'admin') return 'administrador';

  return '';
};
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
const normalizeBoolean = (value) => value === true || value === 1 || value === '1' || String(value ?? '').toLowerCase() === 'true';
const normalizePriority = (value) => {
  const priority = normalizeText(value || 'media').toLowerCase();
  return validPriorities.has(priority) ? priority : '';
};
const normalizeState = (value) => {
  const state = normalizeText(value || 'pendiente').toLowerCase();
  return validStates.has(state) ? state : '';
};
const normalizeSubjectColor = (value) => {
  const color = normalizeText(value, DEFAULT_SUBJECT_COLOR);
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_SUBJECT_COLOR;
};
const normalizeDateForDb = (value) => {
  const rawValue = normalizeText(value);
  if (!rawValue) return null;

  const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (match) {
    return rawValue.includes('T') ? rawValue.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '') : rawValue;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeSemester = (value) => {
  const rawValue = normalizeText(value);
  const numberValue = Number(rawValue);

  if (Number.isInteger(numberValue) && numberValue > 0) {
    return numberValue;
  }

  const digitMatch = rawValue.match(/\d+/);
  const parsedValue = Number(digitMatch?.[0]);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const normalizeSettingsInput = (source = {}) => {
  const theme = normalizeText(source.tema ?? source.theme, 'claro').toLowerCase();
  const language = normalizeText(source.idioma ?? source.language, 'es').toLowerCase();
  const defaultView = normalizeText(source.vista_default ?? source.vistaDefault ?? source.default_view, 'dashboard').toLowerCase();

  return {
    tema: theme === 'oscuro' || theme === 'dark' ? 'oscuro' : 'claro',
    idioma: language === 'en' || language === 'english' ? 'en' : 'es',
    vista_default: validDefaultViews.has(defaultView) ? defaultView : 'dashboard',
    recordatorios_activos: normalizeBoolean(source.recordatorios_activos ?? source.recordatoriosActivos ?? source.recordatorios) ? 1 : 0,
  };
};

const authenticate = (req, res, next) => {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token) {
    return sendError(res, 401, 'No autorizado.');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return sendError(res, 401, 'Token inválido o expirado.');
  }
};

const getStudentByUserId = async (idUsuario) => {
  const [rows] = await db.query(
    `SELECT a.id_alumno, a.id_usuario, a.matricula, a.carrera, a.semestre, a.grupo
     FROM alumnos a
     WHERE a.id_usuario = ?`,
    [idUsuario],
  );

  return rows[0] ?? null;
};

const requireStudent = async (req, res) => {
  const student = await getStudentByUserId(req.user.id);
  if (!student) {
    sendError(res, 403, 'No tienes perfil de alumno.');
    return null;
  }

  return student;
};

const getTeacherByUserId = async (idUsuario) => {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.rol,
            d.id_docente, d.numero_empleado, d.especialidad
     FROM usuarios u
     INNER JOIN docentes d ON d.id_usuario = u.id_usuario
     WHERE u.id_usuario = ? AND u.activo = 1 AND u.rol = 'docente'`,
    [idUsuario],
  );

  return rows[0] ?? null;
};

const requireTeacher = async (req, res) => {
  if (normalizeRoleKey(req.user?.rol) !== 'docente') {
    sendError(res, 403, 'No tienes permiso para acceder a esta sección.');
    return null;
  }

  const teacher = await getTeacherByUserId(req.user.id);
  if (!teacher) {
    sendError(res, 403, 'No tienes perfil de docente.');
    return null;
  }

  return teacher;
};

const mapTeacherProfile = (teacher) => ({
  id_usuario: teacher.id_usuario,
  id_docente: teacher.id_docente,
  nombre: teacher.nombre,
  apellidos: teacher.apellidos,
  email: teacher.email,
  numero_empleado: teacher.numero_empleado,
  especialidad: teacher.especialidad,
  rol: teacher.rol,
});

const mapTeacherGroup = (group) => ({
  id: group.id_grupo,
  id_grupo: group.id_grupo,
  id_materia: group.id_materia,
  materiaId: group.id_materia,
  nombre_grupo: group.nombre_grupo,
  nombreGrupo: group.nombre_grupo,
  grupo: group.nombre_grupo,
  carrera: group.carrera,
  semestre: group.semestre,
  turno: group.turno,
  activo: Boolean(group.activo ?? true),
  materia: group.materia_nombre ?? group.materia,
  materiaNombre: group.materia_nombre ?? group.materia,
  materia_color: group.materia_color ?? DEFAULT_SUBJECT_COLOR,
  materiaColor: group.materia_color ?? DEFAULT_SUBJECT_COLOR,
  materiaDescripcion: group.materia_descripcion ?? '',
  periodo: group.periodo,
  total_alumnos: Number(group.total_alumnos ?? 0),
  totalAlumnos: Number(group.total_alumnos ?? 0),
  total_tareas_publicadas: Number(group.total_tareas_publicadas ?? 0),
  totalTareasPublicadas: Number(group.total_tareas_publicadas ?? 0),
});

const mapTeacherTask = (task) => ({
  id: task.id_tarea_asignada,
  id_tarea_asignada: task.id_tarea_asignada,
  id_grupo: task.id_grupo,
  idGrupo: task.id_grupo,
  id_materia: task.id_materia,
  idMateria: task.id_materia,
  titulo: task.titulo,
  descripcion: task.descripcion,
  instrucciones: task.instrucciones,
  enlace_apoyo: task.enlace_apoyo,
  enlaceApoyo: task.enlace_apoyo,
  materia: task.materia_nombre ?? task.materia,
  materiaNombre: task.materia_nombre ?? task.materia,
  materia_color: task.materia_color ?? DEFAULT_SUBJECT_COLOR,
  materiaColor: task.materia_color ?? DEFAULT_SUBJECT_COLOR,
  grupo: task.grupo_nombre ?? task.grupo,
  grupoNombre: task.grupo_nombre ?? task.grupo,
  carrera: task.carrera,
  semestre: task.semestre,
  fecha_publicacion: task.fecha_publicacion,
  fechaPublicacion: task.fecha_publicacion,
  fecha_limite: task.fecha_limite,
  fechaLimite: task.fecha_limite,
  prioridad: task.prioridad,
  activa: Boolean(task.activa),
  estado: Boolean(task.activa) ? 'Activa' : 'Inactiva',
  total_alumnos: Number(task.total_alumnos ?? 0),
  totalAlumnos: Number(task.total_alumnos ?? 0),
  total_entregas: Number(task.total_entregas ?? 0),
  totalEntregas: Number(task.total_entregas ?? 0),
  total_pendientes: Number(task.total_pendientes ?? 0),
  totalPendientes: Number(task.total_pendientes ?? 0),
  total_completadas: Number(task.total_completadas ?? 0),
  totalCompletadas: Number(task.total_completadas ?? 0),
  porcentaje_cumplimiento: Number(task.porcentaje_cumplimiento ?? 0),
  porcentajeCumplimiento: Number(task.porcentaje_cumplimiento ?? 0),
});

const emptyTeacherTrackingSummary = {
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

const toNumber = (value, fallback = 0) => Number(value ?? fallback) || fallback;
const calculatePercentage = (completed, total) => (Number(total) > 0 ? Math.round((Number(completed) / Number(total)) * 100) : 0);

const mapTeacherTrackingTask = (task) => ({
  ...mapTeacherTask(task),
  porcentaje_cumplimiento: toNumber(task.porcentaje_cumplimiento),
  porcentajeCumplimiento: toNumber(task.porcentaje_cumplimiento),
});

const mapTeacherTrackingGroup = (group) => ({
  idGrupo: group.id_grupo,
  id_grupo: group.id_grupo,
  grupoNombre: group.grupo_nombre,
  nombre_grupo: group.grupo_nombre,
  totalTareas: toNumber(group.total_tareas),
  total_tareas: toNumber(group.total_tareas),
  totalEntregas: toNumber(group.total_entregas),
  total_entregas: toNumber(group.total_entregas),
  totalPendientes: toNumber(group.total_pendientes),
  total_pendientes: toNumber(group.total_pendientes),
  totalCompletadas: toNumber(group.total_completadas),
  total_completadas: toNumber(group.total_completadas),
  porcentajeCumplimiento: toNumber(group.porcentaje_cumplimiento),
  porcentaje_cumplimiento: toNumber(group.porcentaje_cumplimiento),
});

const mapTeacherTrackingSubject = (subject) => ({
  idMateria: subject.id_materia,
  id_materia: subject.id_materia,
  materiaNombre: subject.materia_nombre,
  materia_nombre: subject.materia_nombre,
  materiaColor: subject.materia_color ?? DEFAULT_SUBJECT_COLOR,
  materia_color: subject.materia_color ?? DEFAULT_SUBJECT_COLOR,
  totalTareas: toNumber(subject.total_tareas),
  total_tareas: toNumber(subject.total_tareas),
  totalEntregas: toNumber(subject.total_entregas),
  total_entregas: toNumber(subject.total_entregas),
  totalPendientes: toNumber(subject.total_pendientes),
  total_pendientes: toNumber(subject.total_pendientes),
  totalCompletadas: toNumber(subject.total_completadas),
  total_completadas: toNumber(subject.total_completadas),
  porcentajeCumplimiento: toNumber(subject.porcentaje_cumplimiento),
  porcentaje_cumplimiento: toNumber(subject.porcentaje_cumplimiento),
});

const mapTeacherTrackingStudent = (student) => ({
  idAlumno: student.id_alumno,
  id_alumno: student.id_alumno,
  nombre: student.nombre,
  apellidos: student.apellidos,
  nombreCompleto: `${student.nombre ?? ''} ${student.apellidos ?? ''}`.trim(),
  email: student.email,
  matricula: student.matricula,
  totalPendientes: toNumber(student.total_pendientes),
  total_pendientes: toNumber(student.total_pendientes),
});

const mapTeacherDeliveryTracking = (delivery) => ({
  idEntrega: delivery.id_entrega,
  id_entrega: delivery.id_entrega,
  idAlumno: delivery.id_alumno,
  id_alumno: delivery.id_alumno,
  nombre: delivery.nombre,
  apellidos: delivery.apellidos,
  nombreCompleto: `${delivery.nombre ?? ''} ${delivery.apellidos ?? ''}`.trim(),
  email: delivery.email,
  matricula: delivery.matricula,
  estado: delivery.estado ?? 'pendiente',
  fechaEntrega: delivery.fecha_entrega,
  fecha_entrega: delivery.fecha_entrega,
  notaPersonal: delivery.nota_personal,
  nota_personal: delivery.nota_personal,
  observacion: delivery.observacion,
  tiempoRealHoras: delivery.tiempo_real_horas === null ? null : Number(delivery.tiempo_real_horas),
  tiempo_real_horas: delivery.tiempo_real_horas,
  revisada: Boolean(delivery.revisada),
  entregaATiempo: Boolean(delivery.entrega_a_tiempo),
  entrega_a_tiempo: Boolean(delivery.entrega_a_tiempo),
  entregaTarde: Boolean(delivery.entrega_tarde),
  entrega_tarde: Boolean(delivery.entrega_tarde),
});

const fetchTeacherGroups = async (idDocente) => {
  const [rows] = await db.query(
    `SELECT
       g.id_grupo,
       g.nombre_grupo,
       g.carrera,
       g.semestre,
       g.turno,
       g.activo,
       m.id_materia,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       m.descripcion AS materia_descripcion,
       dgm.periodo,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_publicadas
     FROM docente_grupo_materia dgm
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      AND ta.activa = 1
     WHERE dgm.id_docente = ? AND dgm.activo = 1
     GROUP BY g.id_grupo, g.nombre_grupo, g.carrera, g.semestre, g.turno, g.activo,
              m.id_materia, m.nombre, m.color, m.descripcion, dgm.periodo
     ORDER BY g.semestre ASC, g.nombre_grupo ASC, m.nombre ASC`,
    [idDocente],
  );

  return rows.map(mapTeacherGroup);
};

const fetchTeacherGroupAssignments = async (idDocente, idGrupo, options = {}) => {
  const conditions = ['dgm.id_docente = ?', 'dgm.id_grupo = ?', 'dgm.activo = 1'];
  const params = [idDocente, idGrupo];
  const materiaId = Number(options.materiaId ?? options.idMateria ?? 0);
  const periodo = normalizeText(options.periodo);

  if (materiaId) {
    conditions.push('dgm.id_materia = ?');
    params.push(materiaId);
  }

  if (periodo) {
    conditions.push('dgm.periodo = ?');
    params.push(periodo);
  }

  const [rows] = await db.query(
    `SELECT
       g.id_grupo,
       g.nombre_grupo,
       g.carrera,
       g.semestre,
       g.turno,
       g.activo,
       m.id_materia,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       m.descripcion AS materia_descripcion,
       dgm.periodo,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_publicadas
     FROM docente_grupo_materia dgm
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      AND ta.activa = 1
     WHERE ${conditions.join(' AND ')}
     GROUP BY g.id_grupo, g.nombre_grupo, g.carrera, g.semestre, g.turno, g.activo,
              m.id_materia, m.nombre, m.color, m.descripcion, dgm.periodo
     ORDER BY m.nombre ASC`,
    params,
  );

  return rows.map(mapTeacherGroup);
};

const fetchTeacherGroupUpcomingTasks = async (idDocente, idGrupo, options = {}) => {
  const conditions = ['ta.id_docente = ?', 'ta.id_grupo = ?', 'ta.activa = 1', 'ta.fecha_limite >= CURRENT_TIMESTAMP'];
  const params = [idDocente, idGrupo];
  const materiaId = Number(options.materiaId ?? options.idMateria ?? 0);
  const limit = Number(options.limit) || 5;

  if (materiaId) {
    conditions.push('ta.id_materia = ?');
    params.push(materiaId);
  }

  const [rows] = await db.query(
    `SELECT
       ta.id_tarea_asignada,
       ta.id_grupo,
       ta.id_materia,
       ta.titulo,
       ta.descripcion,
       ta.instrucciones,
       ta.enlace_apoyo,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       g.nombre_grupo AS grupo_nombre,
       g.carrera,
       g.semestre,
       ta.fecha_publicacion,
       ta.fecha_limite,
       ta.prioridad,
       ta.activa,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas
     FROM tareas_asignadas ta
     INNER JOIN docente_grupo_materia dgm
       ON dgm.id_docente = ta.id_docente
      AND dgm.id_grupo = ta.id_grupo
      AND dgm.id_materia = ta.id_materia
      AND dgm.activo = 1
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada
     WHERE ${conditions.join(' AND ')}
     GROUP BY ta.id_tarea_asignada, ta.id_grupo, ta.id_materia, ta.titulo, ta.descripcion, ta.instrucciones, ta.enlace_apoyo,
              m.nombre, m.color, g.nombre_grupo, g.carrera, g.semestre, ta.fecha_publicacion, ta.fecha_limite, ta.prioridad, ta.activa
     ORDER BY ta.fecha_limite ASC
     LIMIT ?`,
    [...params, limit],
  );

  return rows.map(mapTeacherTask);
};

const mapTeacherGroupDetail = (assignments, upcomingTasks = []) => {
  const first = assignments[0];
  const totalTareasPublicadas = assignments.reduce((total, item) => total + Number(item.totalTareasPublicadas ?? 0), 0);

  return {
    ...first,
    total_tareas_publicadas: totalTareasPublicadas,
    totalTareasPublicadas,
    alumnosActivos: Number(first.totalAlumnos ?? first.total_alumnos ?? 0),
    materias: assignments.map((item) => ({
      id: item.id_materia,
      id_materia: item.id_materia,
      nombre: item.materiaNombre,
      color: item.materiaColor,
      descripcion: item.materiaDescripcion,
      periodo: item.periodo,
      totalTareasPublicadas: item.totalTareasPublicadas,
    })),
    proximasTareas: upcomingTasks,
    proximas_tareas: upcomingTasks,
  };
};

const mapTeacherStudent = (student) => ({
  id: student.id_alumno,
  id_alumno: student.id_alumno,
  idAlumno: student.id_alumno,
  id_usuario: student.id_usuario,
  idUsuario: student.id_usuario,
  nombre: student.nombre,
  apellidos: student.apellidos,
  nombreCompleto: `${student.nombre ?? ''} ${student.apellidos ?? ''}`.trim(),
  email: student.email,
  matricula: student.matricula,
  carrera: student.carrera,
  semestre: student.semestre,
  grupo: student.grupo,
  activo: Boolean(student.activo),
});

const fetchTeacherGroupStudents = async (idGrupo) => {
  const [rows] = await db.query(
    `SELECT
       a.id_alumno,
       u.id_usuario,
       u.nombre,
       u.apellidos,
       u.email,
       a.matricula,
       a.carrera,
       a.semestre,
       a.grupo,
       ag.activo
     FROM alumno_grupo ag
     INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
     INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
     WHERE ag.id_grupo = ?
     ORDER BY u.apellidos ASC, u.nombre ASC`,
    [idGrupo],
  );

  return rows.map(mapTeacherStudent);
};

const fetchTeacherSubjects = async (idDocente) => {
  const [rows] = await db.query(
    `SELECT
       m.id_materia,
       m.nombre,
       m.color,
       m.descripcion,
       g.id_grupo,
       g.nombre_grupo,
       g.carrera,
       g.semestre,
       g.turno,
       dgm.periodo,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_publicadas
     FROM docente_grupo_materia dgm
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      AND ta.activa = 1
     WHERE dgm.id_docente = ? AND dgm.activo = 1
     GROUP BY m.id_materia, m.nombre, m.color, m.descripcion,
              g.id_grupo, g.nombre_grupo, g.carrera, g.semestre, g.turno, dgm.periodo
     ORDER BY m.nombre ASC, g.semestre ASC, g.nombre_grupo ASC`,
    [idDocente],
  );

  const subjectsById = new Map();

  rows.forEach((row) => {
    const subject = subjectsById.get(row.id_materia) ?? {
      id: row.id_materia,
      id_materia: row.id_materia,
      nombre: row.nombre,
      color: row.color ?? DEFAULT_SUBJECT_COLOR,
      descripcion: row.descripcion ?? '',
      totalGrupos: 0,
      total_grupos: 0,
      totalAlumnos: 0,
      total_alumnos: 0,
      totalTareasPublicadas: 0,
      total_tareas_publicadas: 0,
      grupos: [],
    };

    const totalAlumnos = Number(row.total_alumnos ?? 0);
    const totalTareasPublicadas = Number(row.total_tareas_publicadas ?? 0);

    subject.grupos.push({
      idGrupo: row.id_grupo,
      id_grupo: row.id_grupo,
      nombreGrupo: row.nombre_grupo,
      nombre_grupo: row.nombre_grupo,
      carrera: row.carrera,
      semestre: row.semestre,
      turno: row.turno,
      periodo: row.periodo,
      totalAlumnos,
      total_alumnos: totalAlumnos,
      totalTareasPublicadas,
      total_tareas_publicadas: totalTareasPublicadas,
    });
    subject.totalAlumnos += totalAlumnos;
    subject.total_alumnos = subject.totalAlumnos;
    subject.totalTareasPublicadas += totalTareasPublicadas;
    subject.total_tareas_publicadas = subject.totalTareasPublicadas;
    subject.totalGrupos = subject.grupos.length;
    subject.total_grupos = subject.totalGrupos;

    subjectsById.set(row.id_materia, subject);
  });

  return Array.from(subjectsById.values());
};

const fetchTeacherTasks = async (idDocente, options = {}) => {
  const conditions = ['ta.id_docente = ?'];
  const params = [idDocente];

  if (options.taskId) {
    conditions.push('ta.id_tarea_asignada = ?');
    params.push(Number(options.taskId));
  }

  if (options.onlyActive) {
    conditions.push('ta.activa = 1');
  }

  if (options.upcomingOnly) {
    conditions.push('ta.fecha_limite >= CURRENT_TIMESTAMP');
  }

  const limit = Number(options.limit) || 0;
  const [rows] = await db.query(
     `SELECT
       ta.id_tarea_asignada,
       ta.id_grupo,
       ta.id_materia,
       ta.titulo,
       ta.descripcion,
       ta.instrucciones,
       ta.enlace_apoyo,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       g.nombre_grupo AS grupo_nombre,
       g.carrera,
       g.semestre,
       ta.fecha_publicacion,
       ta.fecha_limite,
       ta.prioridad,
       ta.activa,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN COALESCE(ea.estado, 'pendiente') = 'pendiente' THEN ag.id_alumno END) AS total_pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ag.id_alumno END) AS total_completadas,
       CASE
         WHEN COUNT(DISTINCT ag.id_alumno) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ag.id_alumno END) / COUNT(DISTINCT ag.id_alumno)) * 100)
       END AS porcentaje_cumplimiento
     FROM tareas_asignadas ta
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada AND ea.id_alumno = ag.id_alumno
     WHERE ${conditions.join(' AND ')}
     GROUP BY ta.id_tarea_asignada, ta.id_grupo, ta.id_materia, ta.titulo, ta.descripcion, ta.instrucciones, ta.enlace_apoyo,
              m.nombre, m.color, g.nombre_grupo, g.carrera, g.semestre, ta.fecha_publicacion, ta.fecha_limite, ta.prioridad, ta.activa
     ORDER BY ${options.upcomingOnly ? 'ta.fecha_limite ASC' : 'ta.fecha_publicacion DESC, ta.id_tarea_asignada DESC'}
     ${limit ? 'LIMIT ?' : ''}`,
    limit ? [...params, limit] : params,
  );

  return rows.map(mapTeacherTask);
};

const fetchTeacherTaskById = async (idDocente, idTask) => {
  const tasks = await fetchTeacherTasks(idDocente, { taskId: idTask });
  return tasks[0] ?? null;
};

const fetchTeacherTaskStudents = async (idDocente, idTask) => {
  const [rows] = await db.query(
    `SELECT
       a.id_alumno,
       u.id_usuario,
       u.nombre,
       u.apellidos,
       u.email,
       a.matricula,
       a.carrera,
       a.semestre,
       a.grupo,
       ag.activo,
       COALESCE(ea.estado, 'pendiente') AS estado,
       ea.fecha_entrega,
       ea.nota_personal,
       ea.revisada
     FROM tareas_asignadas ta
     INNER JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
     INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada AND ea.id_alumno = a.id_alumno
     WHERE ta.id_tarea_asignada = ? AND ta.id_docente = ?
     ORDER BY u.apellidos ASC, u.nombre ASC`,
    [idTask, idDocente],
  );

  return rows.map((student) => ({
    ...mapTeacherStudent(student),
    estado: student.estado,
    fecha_entrega: student.fecha_entrega,
    fechaEntrega: student.fecha_entrega,
    nota_personal: student.nota_personal,
    notaPersonal: student.nota_personal,
    revisada: Boolean(student.revisada),
  }));
};

const fetchTeacherTrackingSummary = async (idDocente) => {
  const [statsRows] = await db.query(
    `SELECT
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_publicadas,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas_generadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS total_entregas_pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS total_entregas_completadas
     FROM tareas_asignadas ta
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada
     WHERE ta.id_docente = ?`,
    [idDocente],
  );

  const stats = statsRows[0] ?? {};
  const totalTareasPublicadas = toNumber(stats.total_tareas_publicadas);
  const totalEntregasGeneradas = toNumber(stats.total_entregas_generadas);
  const totalEntregasPendientes = toNumber(stats.total_entregas_pendientes);
  const totalEntregasCompletadas = toNumber(stats.total_entregas_completadas);
  const porcentajeCumplimientoGeneral = calculatePercentage(totalEntregasCompletadas, totalEntregasGeneradas);

  if (totalTareasPublicadas === 0) {
    return { ...emptyTeacherTrackingSummary };
  }

  const [lowTaskRows] = await db.query(
    `SELECT
       ta.id_tarea_asignada,
       ta.id_grupo,
       ta.id_materia,
       ta.titulo,
       ta.descripcion,
       ta.instrucciones,
       ta.enlace_apoyo,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       g.nombre_grupo AS grupo_nombre,
       g.carrera,
       g.semestre,
       ta.fecha_publicacion,
       ta.fecha_limite,
       ta.prioridad,
       ta.activa,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS total_pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS total_completadas,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento
     FROM tareas_asignadas ta
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada
     WHERE ta.id_docente = ? AND ta.activa = 1
     GROUP BY ta.id_tarea_asignada, ta.id_grupo, ta.id_materia, ta.titulo, ta.descripcion, ta.instrucciones, ta.enlace_apoyo,
              m.nombre, m.color, g.nombre_grupo, g.carrera, g.semestre, ta.fecha_publicacion, ta.fecha_limite, ta.prioridad, ta.activa
     HAVING total_entregas > 0 AND porcentaje_cumplimiento < 50
     ORDER BY porcentaje_cumplimiento ASC, ta.fecha_limite ASC
     LIMIT 6`,
    [idDocente],
  );

  const [pendingStudentRows] = await db.query(
    `SELECT
       a.id_alumno,
       u.nombre,
       u.apellidos,
       u.email,
       a.matricula,
       COUNT(DISTINCT ea.id_entrega) AS total_pendientes
     FROM entregas_alumno ea
     INNER JOIN tareas_asignadas ta ON ta.id_tarea_asignada = ea.id_tarea_asignada
     INNER JOIN alumnos a ON a.id_alumno = ea.id_alumno
     INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
     WHERE ta.id_docente = ? AND ea.estado = 'pendiente'
     GROUP BY a.id_alumno, u.nombre, u.apellidos, u.email, a.matricula
     ORDER BY total_pendientes DESC, u.apellidos ASC, u.nombre ASC
     LIMIT 6`,
    [idDocente],
  );

  const [groupRows] = await db.query(
    `SELECT
       g.id_grupo,
       g.nombre_grupo AS grupo_nombre,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS total_pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS total_completadas,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento
     FROM tareas_asignadas ta
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada
     WHERE ta.id_docente = ?
     GROUP BY g.id_grupo, g.nombre_grupo
     ORDER BY g.nombre_grupo ASC`,
    [idDocente],
  );

  const [subjectRows] = await db.query(
    `SELECT
       m.id_materia,
       m.nombre AS materia_nombre,
       m.color AS materia_color,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS total_pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS total_completadas,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento
     FROM tareas_asignadas ta
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada
     WHERE ta.id_docente = ?
     GROUP BY m.id_materia, m.nombre, m.color
     ORDER BY m.nombre ASC`,
    [idDocente],
  );

  const tareasRecientes = await fetchTeacherTasks(idDocente);

  return {
    totalTareasPublicadas,
    totalEntregasGeneradas,
    totalEntregasPendientes,
    totalEntregasCompletadas,
    porcentajeCumplimientoGeneral,
    tareasConBajoCumplimiento: lowTaskRows.map(mapTeacherTrackingTask),
    alumnosConMasPendientes: pendingStudentRows.map(mapTeacherTrackingStudent),
    resumenPorGrupo: groupRows.map(mapTeacherTrackingGroup),
    resumenPorMateria: subjectRows.map(mapTeacherTrackingSubject),
    tareasRecientes,
  };
};

const fetchTeacherTaskTracking = async (idDocente, idTask) => {
  const task = await fetchTeacherTaskById(idDocente, idTask);
  if (!task) {
    return null;
  }

  const [deliveryRows] = await db.query(
    `SELECT
       ea.id_entrega,
       a.id_alumno,
       u.nombre,
       u.apellidos,
       u.email,
       a.matricula,
       COALESCE(ea.estado, 'pendiente') AS estado,
       ea.fecha_entrega,
       ea.nota_personal,
       ea.observacion,
       ea.tiempo_real_horas,
       COALESCE(ea.revisada, 0) AS revisada,
       CASE WHEN ea.estado = 'completada' AND ea.fecha_entrega IS NOT NULL AND ea.fecha_entrega <= ta.fecha_limite THEN 1 ELSE 0 END AS entrega_a_tiempo,
       CASE WHEN ea.estado = 'completada' AND ea.fecha_entrega IS NOT NULL AND ea.fecha_entrega > ta.fecha_limite THEN 1 ELSE 0 END AS entrega_tarde
     FROM tareas_asignadas ta
     INNER JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
     INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada AND ea.id_alumno = a.id_alumno
     WHERE ta.id_tarea_asignada = ? AND ta.id_docente = ?
     ORDER BY u.apellidos ASC, u.nombre ASC`,
    [idTask, idDocente],
  );

  const entregas = deliveryRows.map(mapTeacherDeliveryTracking);
  const totalAlumnos = entregas.length;
  const totalCompletadas = entregas.filter((delivery) => delivery.estado === 'completada').length;
  const totalPendientes = Math.max(totalAlumnos - totalCompletadas, 0);
  const entregasATiempo = entregas.filter((delivery) => delivery.entregaATiempo).length;
  const entregasTarde = entregas.filter((delivery) => delivery.entregaTarde).length;
  const porcentajeCumplimiento = calculatePercentage(totalCompletadas, totalAlumnos);

  return {
    tarea: task,
    metricas: {
      totalAlumnos,
      totalPendientes,
      totalCompletadas,
      porcentajeCumplimiento,
      porcentajePendiente: totalAlumnos > 0 ? Math.max(100 - porcentajeCumplimiento, 0) : 0,
      entregasATiempo,
      entregasTarde,
    },
    entregas,
  };
};

const findTeacherDelivery = async (idDocente, idEntrega) => {
  const [rows] = await db.query(
    `SELECT ea.id_entrega
     FROM entregas_alumno ea
     INNER JOIN tareas_asignadas ta ON ta.id_tarea_asignada = ea.id_tarea_asignada
     WHERE ea.id_entrega = ? AND ta.id_docente = ?`,
    [idEntrega, idDocente],
  );

  return rows[0] ?? null;
};

const parseBooleanField = (value) => {
  if (value === undefined) {
    return { provided: false, valid: true, value: null };
  }

  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true') {
    return { provided: true, valid: true, value: 1 };
  }

  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'false') {
    return { provided: true, valid: true, value: 0 };
  }

  return { provided: true, valid: false, value: null };
};

const emptyTeacherReportSummary = {
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
  tareasConBajoCumplimiento: [],
  grupoMayorCumplimiento: null,
  grupoMenorCumplimiento: null,
  materiaMayorCarga: null,
  alumnoMasPendientes: null,
};

const normalizePositiveIntegerFilter = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : Number.NaN;
};

const normalizeReportDateFilter = (value, endOfDay = false) => {
  const rawValue = normalizeText(value);
  if (!rawValue) return null;

  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (!dateMatch) {
    return normalizeDateForDb(rawValue);
  }

  const [, yearValue, monthValue, dayValue] = dateMatch;
  const date = new Date(`${yearValue}-${monthValue}-${dayValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return `${yearValue}-${monthValue}-${dayValue} ${endOfDay ? '23:59:59' : '00:00:00'}`;
};

const normalizeReportFilters = (query = {}) => {
  const errors = {};
  const idGrupo = normalizePositiveIntegerFilter(query.idGrupo ?? query.id_grupo);
  const idMateria = normalizePositiveIntegerFilter(query.idMateria ?? query.id_materia ?? query.materiaId);
  const fechaInicioRaw = query.fechaInicio ?? query.fecha_inicio;
  const fechaFinRaw = query.fechaFin ?? query.fecha_fin;
  const fechaInicio = normalizeReportDateFilter(fechaInicioRaw, false);
  const fechaFin = normalizeReportDateFilter(fechaFinRaw, true);
  const periodo = normalizeText(query.periodo);
  const estadoRaw = normalizeText(query.estado).toLowerCase();
  const prioridadRaw = normalizeText(query.prioridad).toLowerCase();
  const prioridad = prioridadRaw ? normalizePriority(prioridadRaw) : '';
  const validReportStates = new Set(['pendiente', 'completada', 'revisada', 'sin-revisar', 'activa', 'inactiva']);
  const estado = estadoRaw && estadoRaw !== 'all' && estadoRaw !== 'todos' ? estadoRaw : '';

  if (Number.isNaN(idGrupo)) errors.idGrupo = 'El grupo solicitado no es válido.';
  if (Number.isNaN(idMateria)) errors.idMateria = 'La materia solicitada no es válida.';
  if (fechaInicioRaw && !fechaInicio) errors.fechaInicio = 'La fecha de inicio no es válida.';
  if (fechaFinRaw && !fechaFin) errors.fechaFin = 'La fecha de fin no es válida.';
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) errors.fechaFin = 'La fecha final debe ser posterior a la fecha inicial.';
  if (prioridadRaw && !prioridad) errors.prioridad = 'La prioridad debe ser baja, media o alta.';
  if (estado && !validReportStates.has(estado)) errors.estado = 'El estado solicitado no es válido.';

  return {
    errors,
    filters: {
      idGrupo: Number.isNaN(idGrupo) ? null : idGrupo,
      idMateria: Number.isNaN(idMateria) ? null : idMateria,
      periodo,
      fechaInicio,
      fechaFin,
      estado,
      prioridad,
    },
  };
};

const buildReportAssignmentWhere = (idDocente, filters = {}, groupAlias = 'g') => {
  const conditions = ['dgm.id_docente = ?', 'dgm.activo = 1'];
  const params = [idDocente];

  if (groupAlias) {
    conditions.push(`${groupAlias}.activo = 1`);
  }

  if (filters.idGrupo) {
    conditions.push('dgm.id_grupo = ?');
    params.push(filters.idGrupo);
  }

  if (filters.idMateria) {
    conditions.push('dgm.id_materia = ?');
    params.push(filters.idMateria);
  }

  if (filters.periodo) {
    conditions.push('dgm.periodo = ?');
    params.push(filters.periodo);
  }

  return { sql: conditions.join(' AND '), params };
};

const buildReportTaskJoinFilters = (filters = {}, alias = 'ta') => {
  const conditions = [];
  const params = [];

  if (filters.fechaInicio) {
    conditions.push(`${alias}.fecha_publicacion >= ?`);
    params.push(filters.fechaInicio);
  }

  if (filters.fechaFin) {
    conditions.push(`${alias}.fecha_publicacion <= ?`);
    params.push(filters.fechaFin);
  }

  if (filters.prioridad) {
    conditions.push(`${alias}.prioridad = ?`);
    params.push(filters.prioridad);
  }

  if (filters.estado === 'activa') {
    conditions.push(`${alias}.activa = 1`);
  }

  if (filters.estado === 'inactiva') {
    conditions.push(`${alias}.activa = 0`);
  }

  return {
    sql: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '',
    params,
  };
};

const buildReportDeliveryJoinFilters = (filters = {}, alias = 'ea') => {
  const conditions = [];

  if (filters.estado === 'pendiente' || filters.estado === 'completada') {
    conditions.push(`${alias}.estado = '${filters.estado}'`);
  }

  if (filters.estado === 'revisada') {
    conditions.push(`${alias}.revisada = 1`);
  }

  if (filters.estado === 'sin-revisar') {
    conditions.push(`COALESCE(${alias}.revisada, 0) = 0`);
  }

  return conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
};

const getTaskReportStatus = (totalEntregas, percentage) => {
  if (toNumber(totalEntregas) === 0) return 'sin entregas';
  if (toNumber(percentage) >= 80) return 'alto cumplimiento';
  if (toNumber(percentage) >= 50) return 'cumplimiento medio';
  return 'bajo cumplimiento';
};

const getAcademicLoad = (totalTasks, totalDeliveries, totalGroups) => {
  const score = toNumber(totalTasks) * 2 + toNumber(totalGroups) * 2 + Math.ceil(toNumber(totalDeliveries) / 30);
  if (score >= 12) return 'Alta';
  if (score >= 5) return 'Media';
  return 'Baja';
};

const mapTeacherReportGroup = (row) => ({
  idGrupo: row.id_grupo,
  id_grupo: row.id_grupo,
  nombreGrupo: row.nombre_grupo,
  nombre_grupo: row.nombre_grupo,
  carrera: row.carrera,
  semestre: row.semestre,
  turno: row.turno,
  totalAlumnos: toNumber(row.total_alumnos),
  total_alumnos: toNumber(row.total_alumnos),
  totalTareas: toNumber(row.total_tareas),
  total_tareas: toNumber(row.total_tareas),
  totalEntregas: toNumber(row.total_entregas),
  total_entregas: toNumber(row.total_entregas),
  completadas: toNumber(row.completadas),
  pendientes: toNumber(row.pendientes),
  revisadas: toNumber(row.revisadas),
  sinRevisar: toNumber(row.sin_revisar),
  sin_revisar: toNumber(row.sin_revisar),
  porcentajeCumplimiento: toNumber(row.porcentaje_cumplimiento),
  porcentaje_cumplimiento: toNumber(row.porcentaje_cumplimiento),
  porcentajeRevision: toNumber(row.porcentaje_revision),
  porcentaje_revision: toNumber(row.porcentaje_revision),
  materias: normalizeText(row.materias).split(', ').filter(Boolean),
  materiaPrincipal: normalizeText(row.materia_principal),
  materia_principal: normalizeText(row.materia_principal),
});

const mapTeacherReportSubject = (row) => {
  const totalTareasPublicadas = toNumber(row.total_tareas_publicadas);
  const totalEntregas = toNumber(row.total_entregas);
  const totalGrupos = toNumber(row.total_grupos);

  return {
    idMateria: row.id_materia,
    id_materia: row.id_materia,
    nombre: row.nombre,
    materiaNombre: row.nombre,
    materia_nombre: row.nombre,
    color: row.color ?? DEFAULT_SUBJECT_COLOR,
    descripcion: row.descripcion ?? '',
    totalGrupos,
    total_grupos: totalGrupos,
    totalAlumnos: toNumber(row.total_alumnos),
    total_alumnos: toNumber(row.total_alumnos),
    totalTareasPublicadas,
    total_tareas_publicadas: totalTareasPublicadas,
    totalEntregas,
    total_entregas: totalEntregas,
    completadas: toNumber(row.completadas),
    pendientes: toNumber(row.pendientes),
    porcentajeCumplimiento: toNumber(row.porcentaje_cumplimiento),
    porcentaje_cumplimiento: toNumber(row.porcentaje_cumplimiento),
    tareasConBajoCumplimiento: toNumber(row.tareas_con_bajo_cumplimiento),
    tareas_con_bajo_cumplimiento: toNumber(row.tareas_con_bajo_cumplimiento),
    cargaAcademica: getAcademicLoad(totalTareasPublicadas, totalEntregas, totalGrupos),
    carga_academica: getAcademicLoad(totalTareasPublicadas, totalEntregas, totalGrupos),
    grupos: normalizeText(row.grupos).split(', ').filter(Boolean),
  };
};

const mapTeacherReportStudent = (row) => ({
  idAlumno: row.id_alumno,
  id_alumno: row.id_alumno,
  nombre: row.nombre,
  apellidos: row.apellidos,
  nombreCompleto: `${row.nombre ?? ''} ${row.apellidos ?? ''}`.trim(),
  nombre_completo: `${row.nombre ?? ''} ${row.apellidos ?? ''}`.trim(),
  matricula: row.matricula,
  email: row.email,
  grupo: row.grupo,
  carrera: row.carrera,
  totalTareasAsignadas: toNumber(row.total_tareas_asignadas),
  total_tareas_asignadas: toNumber(row.total_tareas_asignadas),
  completadas: toNumber(row.completadas),
  pendientes: toNumber(row.pendientes),
  revisadas: toNumber(row.revisadas),
  sinRevisar: toNumber(row.sin_revisar),
  sin_revisar: toNumber(row.sin_revisar),
  porcentajeCumplimiento: toNumber(row.porcentaje_cumplimiento),
  porcentaje_cumplimiento: toNumber(row.porcentaje_cumplimiento),
  tareasPendientesAltaPrioridad: toNumber(row.tareas_pendientes_alta_prioridad),
  tareas_pendientes_alta_prioridad: toNumber(row.tareas_pendientes_alta_prioridad),
  ultimaEntrega: row.ultima_entrega,
  ultima_entrega: row.ultima_entrega,
});

const mapTeacherReportTask = (row) => {
  const totalEntregas = toNumber(row.total_entregas);
  const percentage = toNumber(row.porcentaje_cumplimiento);

  return {
    idTarea: row.id_tarea_asignada,
    id_tarea_asignada: row.id_tarea_asignada,
    idGrupo: row.id_grupo,
    id_grupo: row.id_grupo,
    idMateria: row.id_materia,
    id_materia: row.id_materia,
    titulo: row.titulo,
    materia: row.materia,
    grupo: row.grupo,
    fechaPublicacion: row.fecha_publicacion,
    fecha_publicacion: row.fecha_publicacion,
    fechaLimite: row.fecha_limite,
    fecha_limite: row.fecha_limite,
    prioridad: row.prioridad,
    activa: Boolean(row.activa),
    totalAlumnos: toNumber(row.total_alumnos),
    total_alumnos: toNumber(row.total_alumnos),
    totalEntregas,
    total_entregas: totalEntregas,
    completadas: toNumber(row.completadas),
    pendientes: toNumber(row.pendientes),
    revisadas: toNumber(row.revisadas),
    sinRevisar: toNumber(row.sin_revisar),
    sin_revisar: toNumber(row.sin_revisar),
    porcentajeCumplimiento: percentage,
    porcentaje_cumplimiento: percentage,
    porcentajeRevision: toNumber(row.porcentaje_revision),
    porcentaje_revision: toNumber(row.porcentaje_revision),
    entregasATiempo: toNumber(row.entregas_a_tiempo),
    entregas_a_tiempo: toNumber(row.entregas_a_tiempo),
    entregasTarde: toNumber(row.entregas_tarde),
    entregas_tarde: toNumber(row.entregas_tarde),
    estadoGeneral: getTaskReportStatus(totalEntregas, percentage),
    estado_general: getTaskReportStatus(totalEntregas, percentage),
  };
};

const fetchTeacherGroupReports = async (idDocente, filters = {}) => {
  const assignmentWhere = buildReportAssignmentWhere(idDocente, filters, 'g');
  const taskFilters = buildReportTaskJoinFilters(filters, 'ta');
  const deliveryFilters = buildReportDeliveryJoinFilters(filters, 'ea');

  const [rows] = await db.query(
    `SELECT
       g.id_grupo,
       g.nombre_grupo,
       g.carrera,
       g.semestre,
       g.turno,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS completadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.revisada = 1 THEN ea.id_entrega END) AS revisadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND COALESCE(ea.revisada, 0) = 0 THEN ea.id_entrega END) AS sin_revisar,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento,
       CASE
         WHEN COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.revisada = 1 THEN ea.id_entrega END) /
              COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END)) * 100)
       END AS porcentaje_revision,
       GROUP_CONCAT(DISTINCT m.nombre ORDER BY m.nombre SEPARATOR ', ') AS materias,
       MIN(m.nombre) AS materia_principal
     FROM docente_grupo_materia dgm
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      ${taskFilters.sql}
     LEFT JOIN entregas_alumno ea
       ON ea.id_tarea_asignada = ta.id_tarea_asignada
      AND ea.id_alumno = ag.id_alumno
      ${deliveryFilters}
     WHERE ${assignmentWhere.sql}
     GROUP BY g.id_grupo, g.nombre_grupo, g.carrera, g.semestre, g.turno
     ORDER BY porcentaje_cumplimiento ASC, pendientes DESC, g.nombre_grupo ASC`,
    [...taskFilters.params, ...assignmentWhere.params],
  );

  return rows.map(mapTeacherReportGroup);
};

const fetchTeacherSubjectReports = async (idDocente, filters = {}) => {
  const assignmentWhere = buildReportAssignmentWhere(idDocente, filters, 'g');
  const taskFilters = buildReportTaskJoinFilters(filters, 'ta');
  const deliveryFilters = buildReportDeliveryJoinFilters(filters, 'ea');

  const [rows] = await db.query(
    `SELECT
       m.id_materia,
       m.nombre,
       m.color,
       m.descripcion,
       COUNT(DISTINCT dgm.id_grupo) AS total_grupos,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_publicadas,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS completadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS pendientes,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento,
       COUNT(DISTINCT CASE
         WHEN ta.id_tarea_asignada IS NOT NULL
          AND (SELECT COUNT(*)
               FROM entregas_alumno ea_low
               WHERE ea_low.id_tarea_asignada = ta.id_tarea_asignada) > 0
          AND (SELECT ROUND((COUNT(CASE WHEN ea_low.estado = 'completada' THEN 1 END) / COUNT(*)) * 100)
               FROM entregas_alumno ea_low
               WHERE ea_low.id_tarea_asignada = ta.id_tarea_asignada) < 50
         THEN ta.id_tarea_asignada
       END) AS tareas_con_bajo_cumplimiento,
       GROUP_CONCAT(DISTINCT g.nombre_grupo ORDER BY g.nombre_grupo SEPARATOR ', ') AS grupos
     FROM docente_grupo_materia dgm
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      ${taskFilters.sql}
     LEFT JOIN entregas_alumno ea
       ON ea.id_tarea_asignada = ta.id_tarea_asignada
      AND ea.id_alumno = ag.id_alumno
      ${deliveryFilters}
     WHERE ${assignmentWhere.sql}
     GROUP BY m.id_materia, m.nombre, m.color, m.descripcion
     ORDER BY total_tareas_publicadas DESC, m.nombre ASC`,
    [...taskFilters.params, ...assignmentWhere.params],
  );

  return rows.map(mapTeacherReportSubject);
};

const fetchTeacherStudentReports = async (idDocente, filters = {}) => {
  const assignmentWhere = buildReportAssignmentWhere(idDocente, filters, 'g');
  const taskFilters = buildReportTaskJoinFilters(filters, 'ta');
  const deliveryFilters = buildReportDeliveryJoinFilters(filters, 'ea');

  const [rows] = await db.query(
    `SELECT
       a.id_alumno,
       u.nombre,
       u.apellidos,
       u.email,
       a.matricula,
       g.nombre_grupo AS grupo,
       a.carrera,
       COUNT(DISTINCT ta.id_tarea_asignada) AS total_tareas_asignadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS completadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.revisada = 1 THEN ea.id_entrega END) AS revisadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND COALESCE(ea.revisada, 0) = 0 THEN ea.id_entrega END) AS sin_revisar,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento,
       COUNT(DISTINCT CASE WHEN ta.prioridad = 'alta' AND ea.estado = 'pendiente' THEN ea.id_entrega END) AS tareas_pendientes_alta_prioridad,
       MAX(CASE WHEN ea.estado = 'completada' THEN ea.fecha_entrega ELSE NULL END) AS ultima_entrega
     FROM docente_grupo_materia dgm
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo
     INNER JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
     INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
     INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
     LEFT JOIN tareas_asignadas ta
       ON ta.id_docente = dgm.id_docente
      AND ta.id_grupo = dgm.id_grupo
      AND ta.id_materia = dgm.id_materia
      ${taskFilters.sql}
     LEFT JOIN entregas_alumno ea
       ON ea.id_tarea_asignada = ta.id_tarea_asignada
      AND ea.id_alumno = a.id_alumno
      ${deliveryFilters}
     WHERE ${assignmentWhere.sql}
     GROUP BY a.id_alumno, u.nombre, u.apellidos, u.email, a.matricula, g.nombre_grupo, a.carrera
     ORDER BY pendientes DESC, porcentaje_cumplimiento ASC, u.apellidos ASC, u.nombre ASC`,
    [...taskFilters.params, ...assignmentWhere.params],
  );

  return rows.map(mapTeacherReportStudent);
};

const fetchTeacherTaskReports = async (idDocente, filters = {}) => {
  const taskFilters = buildReportTaskJoinFilters(filters, 'ta');
  const deliveryFilters = buildReportDeliveryJoinFilters(filters, 'ea');
  const conditions = ['ta.id_docente = ?', 'dgm.activo = 1'];
  const params = [idDocente];

  if (filters.idGrupo) {
    conditions.push('ta.id_grupo = ?');
    params.push(filters.idGrupo);
  }

  if (filters.idMateria) {
    conditions.push('ta.id_materia = ?');
    params.push(filters.idMateria);
  }

  if (filters.periodo) {
    conditions.push('dgm.periodo = ?');
    params.push(filters.periodo);
  }

  const [rows] = await db.query(
    `SELECT
       ta.id_tarea_asignada,
       ta.id_grupo,
       ta.id_materia,
       ta.titulo,
       m.nombre AS materia,
       g.nombre_grupo AS grupo,
       ta.fecha_publicacion,
       ta.fecha_limite,
       ta.prioridad,
       ta.activa,
       COUNT(DISTINCT ag.id_alumno) AS total_alumnos,
       COUNT(DISTINCT ea.id_entrega) AS total_entregas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) AS completadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'pendiente' THEN ea.id_entrega END) AS pendientes,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.revisada = 1 THEN ea.id_entrega END) AS revisadas,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND COALESCE(ea.revisada, 0) = 0 THEN ea.id_entrega END) AS sin_revisar,
       CASE
         WHEN COUNT(DISTINCT ea.id_entrega) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) / COUNT(DISTINCT ea.id_entrega)) * 100)
       END AS porcentaje_cumplimiento,
       CASE
         WHEN COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END) = 0 THEN 0
         ELSE ROUND((COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.revisada = 1 THEN ea.id_entrega END) /
              COUNT(DISTINCT CASE WHEN ea.estado = 'completada' THEN ea.id_entrega END)) * 100)
       END AS porcentaje_revision,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.fecha_entrega <= ta.fecha_limite THEN ea.id_entrega END) AS entregas_a_tiempo,
       COUNT(DISTINCT CASE WHEN ea.estado = 'completada' AND ea.fecha_entrega > ta.fecha_limite THEN ea.id_entrega END) AS entregas_tarde
     FROM tareas_asignadas ta
     INNER JOIN docente_grupo_materia dgm
       ON dgm.id_docente = ta.id_docente
      AND dgm.id_grupo = ta.id_grupo
      AND dgm.id_materia = ta.id_materia
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     LEFT JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.activo = 1
     LEFT JOIN entregas_alumno ea
       ON ea.id_tarea_asignada = ta.id_tarea_asignada
      AND ea.id_alumno = ag.id_alumno
      ${deliveryFilters}
     WHERE ${conditions.join(' AND ')}${taskFilters.sql}
     GROUP BY ta.id_tarea_asignada, ta.id_grupo, ta.id_materia, ta.titulo, m.nombre, g.nombre_grupo,
              ta.fecha_publicacion, ta.fecha_limite, ta.prioridad, ta.activa
     ORDER BY porcentaje_cumplimiento ASC, pendientes DESC, ta.fecha_limite ASC`,
    [...params, ...taskFilters.params],
  );

  return rows.map(mapTeacherReportTask);
};

const buildTeacherReportSummary = async (idDocente, filters = {}) => {
  const [groups, subjects, students, tasks] = await Promise.all([
    fetchTeacherGroupReports(idDocente, filters),
    fetchTeacherSubjectReports(idDocente, filters),
    fetchTeacherStudentReports(idDocente, filters),
    fetchTeacherTaskReports(idDocente, filters),
  ]);

  if (groups.length === 0 && subjects.length === 0 && students.length === 0 && tasks.length === 0) {
    return { ...emptyTeacherReportSummary };
  }

  const totalEntregas = tasks.reduce((total, task) => total + task.totalEntregas, 0);
  const entregasCompletadas = tasks.reduce((total, task) => total + task.completadas, 0);
  const entregasPendientes = tasks.reduce((total, task) => total + task.pendientes, 0);
  const entregasRevisadas = tasks.reduce((total, task) => total + task.revisadas, 0);
  const entregasSinRevisar = tasks.reduce((total, task) => total + task.sinRevisar, 0);
  const groupsWithDeliveries = groups.filter((group) => group.totalEntregas > 0);
  const sortedGroupsByCompliance = [...groupsWithDeliveries].sort((a, b) => b.porcentajeCumplimiento - a.porcentajeCumplimiento);
  const sortedSubjectsByLoad = [...subjects].sort((a, b) => b.totalTareasPublicadas - a.totalTareasPublicadas);
  const sortedStudentsByPending = [...students].sort((a, b) => b.pendientes - a.pendientes);
  const lowTasks = tasks.filter((task) => task.estadoGeneral === 'bajo cumplimiento');

  const mapGroupHighlight = (group) =>
    group
      ? {
          idGrupo: group.idGrupo,
          nombreGrupo: group.nombreGrupo,
          porcentaje: group.porcentajeCumplimiento,
        }
      : null;

  const topSubject = sortedSubjectsByLoad[0] ?? null;
  const topStudent = sortedStudentsByPending[0] ?? null;

  return {
    totalGrupos: groups.length,
    totalMaterias: subjects.length,
    totalAlumnos: students.length,
    totalTareasPublicadas: tasks.length,
    totalEntregas,
    entregasCompletadas,
    entregasPendientes,
    entregasRevisadas,
    entregasSinRevisar,
    porcentajeCumplimientoGeneral: calculatePercentage(entregasCompletadas, totalEntregas),
    porcentajeRevisionGeneral: calculatePercentage(entregasRevisadas, entregasCompletadas),
    tareasConBajoCumplimiento: lowTasks.slice(0, 6),
    grupoMayorCumplimiento: mapGroupHighlight(sortedGroupsByCompliance[0]),
    grupoMenorCumplimiento: mapGroupHighlight(sortedGroupsByCompliance[sortedGroupsByCompliance.length - 1]),
    materiaMayorCarga: topSubject
      ? {
          idMateria: topSubject.idMateria,
          nombre: topSubject.nombre,
          totalTareas: topSubject.totalTareasPublicadas,
        }
      : null,
    alumnoMasPendientes: topStudent
      ? {
          idAlumno: topStudent.idAlumno,
          nombreCompleto: topStudent.nombreCompleto,
          totalPendientes: topStudent.pendientes,
        }
      : null,
  };
};

const findTeacherAssignment = async (idDocente, idGrupo, idMateria, runner = db) => {
  const [rows] = await runner.query(
    `SELECT dgm.id_docente_grupo_materia
     FROM docente_grupo_materia dgm
     INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
     INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
     WHERE dgm.id_docente = ?
       AND dgm.id_grupo = ?
       AND dgm.id_materia = ?
       AND dgm.activo = 1`,
    [idDocente, idGrupo, idMateria],
  );

  return rows[0] ?? null;
};

const isValidDbDateValue = (value) => {
  if (!value) return false;

  const normalized = String(value).trim();
  const dateValue = normalized.length === 10 ? `${normalized}T00:00:00` : normalized.replace(' ', 'T');
  return !Number.isNaN(new Date(dateValue).getTime());
};

const validateTeacherTaskInput = (body = {}, options = {}) => {
  const errors = {};
  const idGrupo = Number(body.id_grupo ?? body.idGrupo);
  const idMateria = Number(body.id_materia ?? body.idMateria ?? body.materiaId);
  const titulo = normalizeText(body.titulo);
  const descripcion = normalizeText(body.descripcion);
  const instrucciones = normalizeText(body.instrucciones);
  const enlaceApoyo = normalizeText(body.enlace_apoyo ?? body.enlaceApoyo);
  const fechaLimite = normalizeDateForDb(body.fecha_limite ?? body.fechaLimite);
  const prioridad = normalizePriority(body.prioridad);
  const hasActiveValue = body.activa !== undefined || body.activo !== undefined;
  const activeValue = hasActiveValue ? (normalizeBoolean(body.activa ?? body.activo) ? 1 : 0) : null;

  if (options.requireAssignment) {
    if (!Number.isInteger(idGrupo) || idGrupo <= 0) errors.id_grupo = 'Selecciona un grupo.';
    if (!Number.isInteger(idMateria) || idMateria <= 0) errors.id_materia = 'Selecciona una materia.';
  }

  if (!titulo) errors.titulo = 'El título de la tarea es obligatorio.';
  if (!fechaLimite || !isValidDbDateValue(fechaLimite)) errors.fecha_limite = 'Selecciona una fecha límite válida.';
  if (!prioridad) errors.prioridad = 'La prioridad debe ser baja, media o alta.';

  return {
    errors,
    task: {
      id_grupo: idGrupo,
      id_materia: idMateria,
      titulo,
      descripcion,
      instrucciones,
      enlace_apoyo: enlaceApoyo,
      fecha_limite: fechaLimite,
      prioridad,
      activa: activeValue,
    },
  };
};

const mapUserSession = (user) => ({
  id: user.id_usuario,
  id_usuario: user.id_usuario,
  nombre: user.nombre,
  apellidos: user.apellidos,
  email: user.email,
  rol: user.rol,
  alumno: user.id_alumno
    ? {
        id_alumno: user.id_alumno,
        matricula: user.matricula,
        carrera: user.carrera,
        semestre: user.semestre,
        grupo: user.grupo,
      }
    : null,
  docente: user.id_docente
    ? {
        id_docente: user.id_docente,
        numero_empleado: user.numero_empleado,
        especialidad: user.especialidad,
      }
    : null,
});

const mapProfileRow = (user) => ({
  id_usuario: user.id_usuario,
  id_alumno: user.id_alumno,
  nombre: user.nombre,
  apellidos: user.apellidos,
  email: user.email,
  matricula: user.matricula,
  carrera: user.carrera,
  semestre: user.semestre,
  grupo: user.grupo,
  rol: user.rol,
});

const fetchProfileByUserId = async (idUsuario) => {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.rol,
            a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo
     FROM usuarios u
     INNER JOIN alumnos a ON a.id_usuario = u.id_usuario
     WHERE u.id_usuario = ? AND u.activo = 1`,
    [idUsuario],
  );

  return rows[0] ?? null;
};

const fetchPersonalTask = async (idTask, idAlumno) => {
  const [rows] = await db.query(
    `SELECT
       tp.id_tarea_personal,
       tp.id_tarea_personal AS id,
       tp.id_alumno,
       tp.id_materia,
       m.nombre AS materiaNombre,
       m.color AS materiaColor,
       tp.titulo,
       tp.descripcion,
       tp.fecha_publicacion,
       tp.fecha_entrega,
       tp.prioridad,
       tp.estado,
       tp.recordatorio,
       tp.tiempo_estimado_horas,
       tp.fecha_completada,
       tp.created_at,
       tp.updated_at,
       'personal' AS tipo,
       'estudiante' AS origen
     FROM tareas_personales tp
     LEFT JOIN materias m ON m.id_materia = tp.id_materia
     WHERE tp.id_tarea_personal = ? AND tp.id_alumno = ?`,
    [idTask, idAlumno],
  );

  return rows[0] ?? null;
};

const fetchAssignedTask = async (idTask, idAlumno) => {
  const [rows] = await db.query(
    `SELECT
       ta.id_tarea_asignada,
       ta.id_tarea_asignada AS id,
       ea.id_entrega,
       ? AS id_alumno,
       ta.id_materia,
       m.nombre AS materiaNombre,
       m.color AS materiaColor,
       ta.titulo,
       ta.descripcion,
       ta.instrucciones,
       ta.enlace_apoyo,
       CONCAT(u.nombre, ' ', u.apellidos) AS docenteNombre,
       g.nombre_grupo AS grupoNombre,
       ta.fecha_publicacion,
       ta.fecha_limite,
       COALESCE(ea.estado, 'pendiente') AS estado,
       ta.prioridad,
       ea.nota_personal,
       ea.fecha_entrega AS fecha_completada,
       ta.created_at,
       COALESCE(ea.updated_at, ta.updated_at) AS updated_at,
       'asignada' AS tipo,
       'docente' AS origen
     FROM tareas_asignadas ta
     INNER JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.id_alumno = ? AND ag.activo = 1
     LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada AND ea.id_alumno = ?
     LEFT JOIN materias m ON m.id_materia = ta.id_materia
     LEFT JOIN docentes d ON d.id_docente = ta.id_docente
     LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
     LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
     WHERE ta.id_tarea_asignada = ? AND ta.activa = 1`,
    [idAlumno, idAlumno, idAlumno, idTask],
  );

  return rows[0] ?? null;
};

const validateTaskInput = async (body, partial = false) => {
  const errors = {};
  const titulo = normalizeText(body.titulo);
  const idMateria = Number(body.id_materia ?? body.materiaId);
  const fechaEntrega = normalizeDateForDb(body.fecha_entrega ?? body.fechaEntrega ?? body.fecha_limite);
  const fechaPublicacion = normalizeDateForDb(body.fecha_publicacion ?? body.fechaPublicacion);
  const prioridad = normalizePriority(body.prioridad);
  const estado = normalizeState(body.estado);
  const tiempoEstimado = body.tiempo_estimado_horas ?? body.tiempoEstimadoHoras;

  if (!partial || 'titulo' in body) {
    if (!titulo) errors.titulo = 'El título es obligatorio.';
  }

  if (!partial || 'id_materia' in body || 'materiaId' in body) {
    if (!idMateria) {
      errors.id_materia = 'Selecciona una materia válida.';
    } else {
      const [subjectRows] = await db.query('SELECT id_materia FROM materias WHERE id_materia = ? AND activa = 1', [idMateria]);
      if (subjectRows.length === 0) {
        errors.id_materia = 'La materia seleccionada no existe o está inactiva.';
      }
    }
  }

  if (!partial || 'fecha_entrega' in body || 'fechaEntrega' in body || 'fecha_limite' in body) {
    if (!fechaEntrega) errors.fecha_entrega = 'La fecha de entrega es obligatoria.';
  }

  if (!prioridad) errors.prioridad = 'La prioridad debe ser baja, media o alta.';
  if (!estado) errors.estado = 'El estado debe ser pendiente o completada.';

  const estimatedHours = tiempoEstimado === undefined || tiempoEstimado === '' || tiempoEstimado === null ? null : Number(tiempoEstimado);
  if (estimatedHours !== null && (!Number.isFinite(estimatedHours) || estimatedHours < 0)) {
    errors.tiempo_estimado_horas = 'Captura un tiempo estimado válido.';
  }

  return {
    errors,
    task: {
      titulo,
      descripcion: normalizeText(body.descripcion),
      id_materia: idMateria,
      fecha_publicacion: fechaPublicacion,
      fecha_entrega: fechaEntrega,
      prioridad,
      estado,
      recordatorio: normalizeBoolean(body.recordatorio) ? 1 : 0,
      tiempo_estimado_horas: estimatedHours,
      fecha_completada: normalizeDateForDb(body.fecha_completada ?? body.fechaCompletada),
    },
  };
};

app.get(
  '/api/health',
  asyncRoute(async (req, res) => {
    await db.query('SELECT 1');
    sendOk(res, 'API StudentTask activa', {
      database: DB_NAME,
      timestamp: new Date().toISOString(),
    });
  }),
);

app.post(
  '/api/auth/register',
  asyncRoute(async (req, res) => {
    const { nombre, apellidos, email, password, matricula, carrera, semestre, grupo } = req.body;
    const errors = {};

    if (!normalizeText(nombre)) errors.nombre = 'Ingresa tu nombre.';
    if (!normalizeText(apellidos)) errors.apellidos = 'Ingresa tus apellidos.';
    if (!normalizeEmail(email)) {
      errors.email = 'Ingresa tu correo electrónico.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Ingresa un correo electrónico válido.';
    }
    if (!normalizeText(password) || String(password).length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (!normalizeText(matricula)) errors.matricula = 'Ingresa tu matrícula.';
    if (!normalizeText(carrera)) errors.carrera = 'Ingresa tu carrera.';
    const normalizedSemester = normalizeSemester(semestre);
    if (!normalizeText(semestre)) {
      errors.semestre = 'Ingresa tu semestre.';
    } else if (!normalizedSemester) {
      errors.semestre = 'Ingresa un semestre válido.';
    }
    if (!normalizeText(grupo)) errors.grupo = 'Ingresa tu grupo.';

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const normalizedEmail = normalizeEmail(email);
    const [existingUser] = await db.query('SELECT id_usuario FROM usuarios WHERE email = ?', [normalizedEmail]);
    if (existingUser.length > 0) {
      return sendError(res, 400, 'Este correo ya está registrado.', { email: 'Este correo ya está registrado.' });
    }

    const [existingStudent] = await db.query('SELECT id_alumno FROM alumnos WHERE matricula = ?', [normalizeText(matricula)]);
    if (existingStudent.length > 0) {
      return sendError(res, 400, 'Esta matrícula ya está registrada.', { matricula: 'Esta matrícula ya está registrada.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const passwordHash = await bcrypt.hash(String(password), 10);
      const [userResult] = await connection.query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
         VALUES (?, ?, ?, ?, 'alumno')`,
        [normalizeText(nombre), normalizeText(apellidos), normalizedEmail, passwordHash],
      );

      const [studentResult] = await connection.query(
        `INSERT INTO alumnos (id_usuario, matricula, carrera, semestre, grupo)
         VALUES (?, ?, ?, ?, ?)`,
        [userResult.insertId, normalizeText(matricula), normalizeText(carrera), normalizedSemester, normalizeText(grupo)],
      );

      await connection.query('INSERT INTO configuraciones (id_usuario) VALUES (?)', [userResult.insertId]);
      await connection.commit();

      sendOk(
        res,
        'Cuenta creada correctamente.',
        {
          user: {
            id: userResult.insertId,
            id_usuario: userResult.insertId,
            nombre: normalizeText(nombre),
            apellidos: normalizeText(apellidos),
            email: normalizedEmail,
            rol: 'alumno',
            alumno: {
              id_alumno: studentResult.insertId,
              matricula: normalizeText(matricula),
              carrera: normalizeText(carrera),
              semestre: normalizedSemester,
              grupo: normalizeText(grupo),
            },
          },
        },
        201,
      );
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? '');

    if (!email || !password) {
      return sendError(res, 400, 'Correo y contraseña son requeridos.');
    }

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.password_hash, u.rol,
              a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo,
              d.id_docente, d.numero_empleado, d.especialidad
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
       LEFT JOIN docentes d ON d.id_usuario = u.id_usuario
       WHERE u.email = ? AND u.activo = 1`,
      [email],
    );

    if (rows.length === 0) {
      return sendError(res, 401, 'El correo no está registrado.');
    }

    const user = rows[0];
    const passwordHash = String(user.password_hash ?? '');
    const passwordOk = passwordHash.startsWith('$2') ? await bcrypt.compare(password, passwordHash) : password === passwordHash;

    if (!passwordOk) {
      return sendError(res, 401, 'La contraseña es incorrecta.');
    }

    const token = jwt.sign(
      {
        id: user.id_usuario,
        idUsuario: user.id_usuario,
        id_alumno: user.id_alumno,
        id_docente: user.id_docente,
        email: user.email,
        rol: user.rol,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    sendOk(res, 'Inicio de sesión exitoso.', {
      token,
      user: mapUserSession(user),
    });
  }),
);

app.get(
  '/api/auth/me',
  authenticate,
  asyncRoute(async (req, res) => {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.rol,
              a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo,
              d.id_docente, d.numero_empleado, d.especialidad
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
       LEFT JOIN docentes d ON d.id_usuario = u.id_usuario
       WHERE u.id_usuario = ? AND u.activo = 1`,
      [req.user.id],
    );

    if (rows.length === 0) {
      return sendError(res, 404, 'Usuario no encontrado.');
    }

    sendOk(res, 'Usuario autenticado.', { user: mapUserSession(rows[0]) });
  }),
);

app.post('/api/auth/logout', authenticate, (req, res) => sendOk(res, 'Sesión cerrada.'));

app.get(
  '/api/perfil',
  authenticate,
  asyncRoute(async (req, res) => {
    const profile = await fetchProfileByUserId(req.user.id);

    if (!profile) {
      return sendError(res, 404, 'Perfil de estudiante no encontrado.');
    }

    sendOk(res, 'Perfil cargado correctamente.', { perfil: mapProfileRow(profile) });
  }),
);

app.put(
  '/api/perfil',
  authenticate,
  asyncRoute(async (req, res) => {
    const currentProfile = await fetchProfileByUserId(req.user.id);
    if (!currentProfile) {
      return sendError(res, 404, 'Perfil de estudiante no encontrado.');
    }

    const nombre = normalizeText(req.body.nombre);
    const apellidos = normalizeText(req.body.apellidos);
    const matricula = normalizeText(req.body.matricula);
    const carrera = normalizeText(req.body.carrera);
    const semestre = normalizeSemester(req.body.semestre);
    const grupo = normalizeText(req.body.grupo);
    const errors = {};

    if (!nombre) errors.nombre = 'El nombre es obligatorio.';
    if (!apellidos) errors.apellidos = 'Los apellidos son obligatorios.';
    if (!matricula) errors.matricula = 'La matrícula es obligatoria.';
    if (!carrera) errors.carrera = 'La carrera es obligatoria.';
    if (!normalizeText(req.body.semestre)) {
      errors.semestre = 'El semestre es obligatorio.';
    } else if (!semestre) {
      errors.semestre = 'Ingresa un semestre válido.';
    }
    if (!grupo) errors.grupo = 'El grupo es obligatorio.';

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const [existingStudent] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE matricula = ? AND id_alumno <> ?',
      [matricula, currentProfile.id_alumno],
    );
    if (existingStudent.length > 0) {
      return sendError(res, 400, 'Esta matrícula ya está registrada por otro alumno.', {
        matricula: 'Esta matrícula ya está registrada por otro alumno.',
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE usuarios SET nombre = ?, apellidos = ? WHERE id_usuario = ? AND activo = 1', [
        nombre,
        apellidos,
        req.user.id,
      ]);
      await connection.query(
        'UPDATE alumnos SET matricula = ?, carrera = ?, semestre = ?, grupo = ? WHERE id_usuario = ?',
        [matricula, carrera, semestre, grupo, req.user.id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const updatedProfile = await fetchProfileByUserId(req.user.id);
    sendOk(res, 'Perfil actualizado correctamente.', { perfil: mapProfileRow(updatedProfile) });
  }),
);

app.put(
  '/api/perfil/password',
  authenticate,
  asyncRoute(async (req, res) => {
    const passwordActual = String(req.body.passwordActual ?? req.body.password_actual ?? '');
    const nuevaPassword = String(req.body.nuevaPassword ?? req.body.nueva_password ?? '');
    const confirmarPassword = String(req.body.confirmarPassword ?? req.body.confirmar_password ?? '');
    const errors = {};

    if (!passwordActual) errors.passwordActual = 'Ingresa tu contraseña actual.';
    if (!nuevaPassword || nuevaPassword.length < 8) errors.nuevaPassword = 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (!confirmarPassword) {
      errors.confirmarPassword = 'Confirma la nueva contraseña.';
    } else if (nuevaPassword !== confirmarPassword) {
      errors.confirmarPassword = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id_usuario = ? AND activo = 1', [req.user.id]);
    if (rows.length === 0) {
      return sendError(res, 404, 'Usuario no encontrado.');
    }

    const passwordHash = String(rows[0].password_hash ?? '');
    const currentPasswordOk = passwordHash.startsWith('$2')
      ? await bcrypt.compare(passwordActual, passwordHash)
      : passwordActual === passwordHash;

    if (!currentPasswordOk) {
      return sendError(res, 400, 'La contraseña actual no es correcta.', {
        passwordActual: 'La contraseña actual no es correcta.',
      });
    }

    const nextPasswordHash = await bcrypt.hash(nuevaPassword, 10);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [nextPasswordHash, req.user.id]);

    sendOk(res, 'Contraseña actualizada correctamente.');
  }),
);

app.get(
  '/api/materias',
  authenticate,
  asyncRoute(async (req, res) => {
    const [rows] = await db.query(
      `SELECT id_materia, id_materia AS id, nombre, color, descripcion, activa
       FROM materias
       WHERE activa = 1
       ORDER BY nombre ASC`,
    );

    sendOk(res, 'Materias cargadas correctamente.', { materias: rows });
  }),
);

app.post(
  '/api/materias',
  authenticate,
  asyncRoute(async (req, res) => {
    const nombre = normalizeText(req.body.nombre);
    if (!nombre) {
      return sendError(res, 400, 'El nombre de la materia es obligatorio.', { nombre: 'El nombre de la materia es obligatorio.' });
    }

    const color = normalizeSubjectColor(req.body.color);
    const descripcion = normalizeText(req.body.descripcion);
    const [result] = await db.query(
      'INSERT INTO materias (nombre, color, descripcion, activa) VALUES (?, ?, ?, 1)',
      [nombre, color, descripcion || null],
    );
    const [rows] = await db.query('SELECT id_materia, id_materia AS id, nombre, color, descripcion, activa FROM materias WHERE id_materia = ?', [
      result.insertId,
    ]);

    sendOk(res, 'Materia registrada correctamente.', { materia: rows[0] }, 201);
  }),
);

app.put(
  '/api/materias/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const nombre = normalizeText(req.body.nombre);
    if (!nombre) {
      return sendError(res, 400, 'El nombre de la materia es obligatorio.', { nombre: 'El nombre de la materia es obligatorio.' });
    }

    const color = normalizeSubjectColor(req.body.color);
    const descripcion = normalizeText(req.body.descripcion);
    const [result] = await db.query(
      `UPDATE materias
       SET nombre = ?, color = ?, descripcion = ?
       WHERE id_materia = ? AND activa = 1`,
      [nombre, color, descripcion || null, req.params.id],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, 'Materia no encontrada.');
    }

    const [rows] = await db.query('SELECT id_materia, id_materia AS id, nombre, color, descripcion, activa FROM materias WHERE id_materia = ?', [
      req.params.id,
    ]);
    sendOk(res, 'Materia actualizada correctamente.', { materia: rows[0] });
  }),
);

app.delete(
  '/api/materias/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const subjectId = Number(req.params.id);
    const [linkedRows] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM tareas_personales WHERE id_materia = ?) AS tareas_personales,
         (SELECT COUNT(*) FROM tareas_asignadas WHERE id_materia = ? AND activa = 1) AS tareas_asignadas`,
      [subjectId, subjectId],
    );
    const linkedTasks = Number(linkedRows[0]?.tareas_personales ?? 0) + Number(linkedRows[0]?.tareas_asignadas ?? 0);

    if (linkedTasks > 0) {
      return sendError(res, 400, 'No puedes eliminar esta materia porque tiene tareas asociadas.');
    }

    const [result] = await db.query('UPDATE materias SET activa = 0 WHERE id_materia = ? AND activa = 1', [req.params.id]);
    if (result.affectedRows === 0) {
      return sendError(res, 404, 'Materia no encontrada.');
    }

    sendOk(res, 'Materia desactivada correctamente.', { id: Number(req.params.id) });
  }),
);

app.get(
  '/api/tareas',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const [rows] = await db.query(
      `SELECT
         tp.id_tarea_personal,
         tp.id_tarea_personal AS id,
         tp.id_alumno,
         tp.id_materia,
         m.nombre AS materiaNombre,
         m.color AS materiaColor,
         tp.titulo,
         tp.descripcion,
         tp.fecha_publicacion,
         tp.fecha_entrega,
         tp.prioridad,
         tp.estado,
         tp.recordatorio,
         tp.tiempo_estimado_horas,
         tp.fecha_completada,
         tp.created_at,
         tp.updated_at,
         'personal' AS tipo,
         'estudiante' AS origen
       FROM tareas_personales tp
       LEFT JOIN materias m ON m.id_materia = tp.id_materia
       WHERE tp.id_alumno = ?
       ORDER BY tp.fecha_entrega ASC`,
      [student.id_alumno],
    );

    sendOk(res, 'Tareas cargadas correctamente.', { tareas: rows });
  }),
);

app.post(
  '/api/tareas',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const { errors, task } = await validateTaskInput(req.body);
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const completedDate = task.estado === 'completada' ? task.fecha_completada || new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    const [result] = await db.query(
      `INSERT INTO tareas_personales
        (id_alumno, id_materia, titulo, descripcion, fecha_publicacion, fecha_entrega, prioridad, estado, recordatorio, tiempo_estimado_horas, fecha_completada)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?)`,
      [
        student.id_alumno,
        task.id_materia,
        task.titulo,
        task.descripcion || null,
        task.fecha_publicacion,
        task.fecha_entrega,
        task.prioridad,
        task.estado,
        task.recordatorio,
        task.tiempo_estimado_horas,
        completedDate,
      ],
    );

    const createdTask = await fetchPersonalTask(result.insertId, student.id_alumno);
    sendOk(res, 'Tarea registrada correctamente.', { tarea: createdTask }, 201);
  }),
);

app.put(
  '/api/tareas/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const existingTask = await fetchPersonalTask(req.params.id, student.id_alumno);
    if (!existingTask) {
      return sendError(res, 404, 'La tarea no existe o no pertenece a tu cuenta.');
    }

    const { errors, task } = await validateTaskInput(req.body);
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const completedDate =
      task.estado === 'completada'
        ? task.fecha_completada || existingTask.fecha_completada || new Date().toISOString().slice(0, 19).replace('T', ' ')
        : null;

    await db.query(
      `UPDATE tareas_personales
       SET titulo = ?, descripcion = ?, id_materia = ?, fecha_publicacion = COALESCE(?, fecha_publicacion),
           fecha_entrega = ?, prioridad = ?, estado = ?, recordatorio = ?,
           tiempo_estimado_horas = ?, fecha_completada = ?
       WHERE id_tarea_personal = ? AND id_alumno = ?`,
      [
        task.titulo,
        task.descripcion || null,
        task.id_materia,
        task.fecha_publicacion,
        task.fecha_entrega,
        task.prioridad,
        task.estado,
        task.recordatorio,
        task.tiempo_estimado_horas,
        completedDate,
        req.params.id,
        student.id_alumno,
      ],
    );

    const updatedTask = await fetchPersonalTask(req.params.id, student.id_alumno);
    sendOk(res, 'Tarea actualizada correctamente.', { tarea: updatedTask });
  }),
);

app.delete(
  '/api/tareas/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const [result] = await db.query('DELETE FROM tareas_personales WHERE id_tarea_personal = ? AND id_alumno = ?', [
      req.params.id,
      student.id_alumno,
    ]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, 'La tarea no existe o no pertenece a tu cuenta.');
    }

    sendOk(res, 'Tarea eliminada correctamente.', { id: Number(req.params.id) });
  }),
);

app.patch(
  '/api/tareas/:id/progreso',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const existingTask = await fetchPersonalTask(req.params.id, student.id_alumno);
    if (!existingTask) {
      return sendError(res, 404, 'La tarea no existe o no pertenece a tu cuenta.');
    }

    const state = normalizeState(req.body.estado);
    if (!state) {
      return sendError(res, 400, 'El estado debe ser pendiente o completada.', { estado: 'Estado inválido.' });
    }

    const completedDate =
      state === 'completada'
        ? normalizeDateForDb(req.body.fecha_completada ?? req.body.fechaCompletada) || new Date().toISOString().slice(0, 19).replace('T', ' ')
        : null;

    await db.query(
      `UPDATE tareas_personales
       SET estado = ?, fecha_completada = ?
       WHERE id_tarea_personal = ? AND id_alumno = ?`,
      [state, completedDate, req.params.id, student.id_alumno],
    );

    const updatedTask = await fetchPersonalTask(req.params.id, student.id_alumno);
    sendOk(res, 'Progreso actualizado correctamente.', { tarea: updatedTask });
  }),
);

app.get(
  '/api/tareas-asignadas',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const [rows] = await db.query(
      `SELECT
         ta.id_tarea_asignada,
         ta.id_tarea_asignada AS id,
         ea.id_entrega,
         ag.id_alumno,
         ta.id_materia,
         m.nombre AS materiaNombre,
         m.color AS materiaColor,
         ta.titulo,
         ta.descripcion,
         ta.instrucciones,
         ta.enlace_apoyo,
         CONCAT(u.nombre, ' ', u.apellidos) AS docenteNombre,
         g.nombre_grupo AS grupoNombre,
         ta.fecha_publicacion,
         ta.fecha_limite,
         COALESCE(ea.estado, 'pendiente') AS estado,
         ta.prioridad,
         ea.nota_personal,
         ea.fecha_entrega AS fecha_completada,
         ta.created_at,
         COALESCE(ea.updated_at, ta.updated_at) AS updated_at,
         'asignada' AS tipo,
         'docente' AS origen
       FROM tareas_asignadas ta
       INNER JOIN alumno_grupo ag ON ag.id_grupo = ta.id_grupo AND ag.id_alumno = ? AND ag.activo = 1
       LEFT JOIN entregas_alumno ea ON ea.id_tarea_asignada = ta.id_tarea_asignada AND ea.id_alumno = ag.id_alumno
       LEFT JOIN materias m ON m.id_materia = ta.id_materia
       LEFT JOIN docentes d ON d.id_docente = ta.id_docente
       LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
       LEFT JOIN grupos g ON g.id_grupo = ta.id_grupo
       WHERE ta.activa = 1
       ORDER BY ta.fecha_limite ASC`,
      [student.id_alumno],
    );

    sendOk(res, 'Tareas asignadas cargadas correctamente.', { tareas: rows });
  }),
);

app.patch(
  '/api/tareas-asignadas/:id/progreso',
  authenticate,
  asyncRoute(async (req, res) => {
    const student = await requireStudent(req, res);
    if (!student) return;

    const assignedTask = await fetchAssignedTask(req.params.id, student.id_alumno);
    if (!assignedTask) {
      return sendError(res, 404, 'La tarea asignada no existe o no pertenece a tu grupo.');
    }

    const state = normalizeState(req.body.estado);
    if (!state) {
      return sendError(res, 400, 'El estado debe ser pendiente o completada.', { estado: 'Estado inválido.' });
    }

    const submittedAt =
      state === 'completada'
        ? normalizeDateForDb(req.body.fecha_entrega ?? req.body.fecha_completada ?? req.body.fechaCompletada) ||
          new Date().toISOString().slice(0, 19).replace('T', ' ')
        : null;
    const personalNote = normalizeText(req.body.nota_personal ?? req.body.notaPersonal);

    await db.query(
      `INSERT INTO entregas_alumno (id_tarea_asignada, id_alumno, estado, fecha_entrega, nota_personal)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         estado = VALUES(estado),
         fecha_entrega = VALUES(fecha_entrega),
         nota_personal = VALUES(nota_personal),
         updated_at = CURRENT_TIMESTAMP`,
      [req.params.id, student.id_alumno, state, submittedAt, personalNote || null],
    );

    const updatedTask = await fetchAssignedTask(req.params.id, student.id_alumno);
    sendOk(res, 'Progreso de tarea asignada actualizado correctamente.', { tarea: updatedTask });
  }),
);

app.get(
  '/api/docente/dashboard',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const [statsRows] = await db.query(
      `SELECT
         (SELECT COUNT(DISTINCT dgm.id_grupo)
          FROM docente_grupo_materia dgm
          INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
          WHERE dgm.id_docente = ? AND dgm.activo = 1) AS total_grupos,
         (SELECT COUNT(DISTINCT dgm.id_materia)
         FROM docente_grupo_materia dgm
         INNER JOIN materias m ON m.id_materia = dgm.id_materia AND m.activa = 1
         WHERE dgm.id_docente = ? AND dgm.activo = 1) AS total_materias,
         (SELECT COUNT(DISTINCT ag.id_alumno)
          FROM docente_grupo_materia dgm
          INNER JOIN grupos g ON g.id_grupo = dgm.id_grupo AND g.activo = 1
          INNER JOIN alumno_grupo ag ON ag.id_grupo = g.id_grupo AND ag.activo = 1
          WHERE dgm.id_docente = ? AND dgm.activo = 1) AS total_alumnos,
         (SELECT COUNT(*)
          FROM tareas_asignadas ta
          WHERE ta.id_docente = ? AND ta.activa = 1) AS total_tareas`,
      [teacher.id_docente, teacher.id_docente, teacher.id_docente, teacher.id_docente],
    );

    const proximasTareas = await fetchTeacherTasks(teacher.id_docente, {
      onlyActive: true,
      upcomingOnly: true,
      limit: 5,
    });

    sendOk(res, 'Dashboard docente cargado correctamente.', {
      docente: mapTeacherProfile(teacher),
      totalGrupos: Number(statsRows[0]?.total_grupos ?? 0),
      totalMaterias: Number(statsRows[0]?.total_materias ?? 0),
      totalAlumnos: Number(statsRows[0]?.total_alumnos ?? 0),
      totalTareas: Number(statsRows[0]?.total_tareas ?? 0),
      totalTareasPublicadas: Number(statsRows[0]?.total_tareas ?? 0),
      proximasTareas,
    });
  }),
);

app.get(
  '/api/docente/grupos',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const grupos = await fetchTeacherGroups(teacher.id_docente);
    sendOk(res, 'Grupos del docente cargados correctamente.', {
      docente: mapTeacherProfile(teacher),
      grupos,
    });
  }),
);

app.get(
  '/api/docente/grupos/:id/alumnos',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return sendError(res, 400, 'El grupo solicitado no es válido.');
    }

    const assignments = await fetchTeacherGroupAssignments(teacher.id_docente, groupId);
    if (assignments.length === 0) {
      return sendError(res, 403, 'No tienes permiso para consultar este grupo.');
    }

    const alumnos = await fetchTeacherGroupStudents(groupId);
    sendOk(res, 'Alumnos del grupo cargados correctamente.', { alumnos });
  }),
);

app.get(
  '/api/docente/grupos/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return sendError(res, 400, 'El grupo solicitado no es válido.');
    }

    const assignments = await fetchTeacherGroupAssignments(teacher.id_docente, groupId, {
      materiaId: req.query.materiaId ?? req.query.idMateria,
      periodo: req.query.periodo,
    });

    if (assignments.length === 0) {
      return sendError(res, 403, 'No tienes permiso para consultar este grupo.');
    }

    const proximasTareas = await fetchTeacherGroupUpcomingTasks(teacher.id_docente, groupId, {
      materiaId: req.query.materiaId ?? req.query.idMateria,
      limit: 5,
    });

    sendOk(res, 'Detalle del grupo cargado correctamente.', {
      grupo: mapTeacherGroupDetail(assignments, proximasTareas),
    });
  }),
);

app.get(
  '/api/docente/materias',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const materias = await fetchTeacherSubjects(teacher.id_docente);
    sendOk(res, 'Materias del docente cargadas correctamente.', { materias });
  }),
);

app.get(
  '/api/docente/tareas',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const tareas = await fetchTeacherTasks(teacher.id_docente);
    sendOk(res, 'Tareas del docente cargadas correctamente.', { tareas });
  }),
);

app.get(
  '/api/docente/seguimiento',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const summary = await fetchTeacherTrackingSummary(teacher.id_docente);
    sendOk(res, 'Seguimiento docente cargado correctamente.', summary);
  }),
);

const sendTeacherReport = (handler, successMessage) =>
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const { errors, filters } = normalizeReportFilters(req.query);
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los filtros del reporte.', errors);
    }

    const data = await handler(teacher.id_docente, filters);
    sendOk(res, successMessage, data);
  });

app.get('/api/docente/reportes/resumen', authenticate, sendTeacherReport(buildTeacherReportSummary, 'Resumen de reportes docentes cargado correctamente.'));
app.get('/api/docente/reportes/grupos', authenticate, sendTeacherReport(fetchTeacherGroupReports, 'Reporte por grupos cargado correctamente.'));
app.get('/api/docente/reportes/materias', authenticate, sendTeacherReport(fetchTeacherSubjectReports, 'Reporte por materias cargado correctamente.'));
app.get('/api/docente/reportes/alumnos', authenticate, sendTeacherReport(fetchTeacherStudentReports, 'Reporte por alumnos cargado correctamente.'));
app.get('/api/docente/reportes/tareas', authenticate, sendTeacherReport(fetchTeacherTaskReports, 'Reporte por tareas cargado correctamente.'));

app.get(
  '/api/docente/tareas/:id/seguimiento',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return sendError(res, 400, 'La tarea solicitada no es válida.');
    }

    const tracking = await fetchTeacherTaskTracking(teacher.id_docente, taskId);
    if (!tracking) {
      return sendError(res, 403, 'No tienes permiso para consultar esta tarea.');
    }

    sendOk(res, 'Seguimiento de tarea cargado correctamente.', tracking);
  }),
);

app.patch(
  '/api/docente/entregas/:id/revisar',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const deliveryId = Number(req.params.id);
    if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
      return sendError(res, 400, 'La entrega solicitada no es válida.');
    }

    const existingDelivery = await findTeacherDelivery(teacher.id_docente, deliveryId);
    if (!existingDelivery) {
      return sendError(res, 403, 'No tienes permiso para revisar esta entrega.');
    }

    const reviewInput = parseBooleanField(req.body.revisada);
    const hasObservation = req.body.observacion !== undefined;
    const observation = normalizeText(req.body.observacion);

    if (!reviewInput.valid) {
      return sendError(res, 400, 'El campo revisada debe ser booleano.', { revisada: 'Debe ser verdadero o falso.' });
    }

    if (!reviewInput.provided && !hasObservation) {
      return sendError(res, 400, 'Envía revisada u observacion para actualizar la entrega.');
    }

    const fields = [];
    const params = [];

    if (reviewInput.provided) {
      fields.push('revisada = ?');
      params.push(reviewInput.value);
    }

    if (hasObservation) {
      fields.push('observacion = ?');
      params.push(observation || null);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    await db.query(`UPDATE entregas_alumno SET ${fields.join(', ')} WHERE id_entrega = ?`, [...params, deliveryId]);

    sendOk(res, 'Entrega actualizada correctamente.');
  }),
);

app.post(
  '/api/docente/tareas',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const { errors, task } = validateTeacherTaskInput(req.body, { requireAssignment: true });
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', errors);
    }

    const assignment = await findTeacherAssignment(teacher.id_docente, task.id_grupo, task.id_materia);
    if (!assignment) {
      return sendError(res, 403, 'No puedes publicar tareas para este grupo y materia.');
    }

    const connection = await db.getConnection();
    let taskId = 0;
    let totalEntregasGeneradas = 0;

    try {
      await connection.beginTransaction();

      const lockedAssignment = await findTeacherAssignment(teacher.id_docente, task.id_grupo, task.id_materia, connection);
      if (!lockedAssignment) {
        await connection.rollback();
        return sendError(res, 403, 'No puedes publicar tareas para este grupo y materia.');
      }

      const [studentRows] = await connection.query(
        `SELECT ag.id_alumno
         FROM alumno_grupo ag
         INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
         INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
         WHERE ag.id_grupo = ? AND ag.activo = 1`,
        [task.id_grupo],
      );

      if (studentRows.length === 0) {
        await connection.rollback();
        return sendError(res, 400, 'No hay alumnos activos en este grupo para generar entregas.');
      }

      const [taskResult] = await connection.query(
        `INSERT INTO tareas_asignadas
          (id_docente, id_grupo, id_materia, titulo, descripcion, instrucciones, enlace_apoyo, fecha_limite, prioridad, activa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          teacher.id_docente,
          task.id_grupo,
          task.id_materia,
          task.titulo,
          task.descripcion || null,
          task.instrucciones || null,
          task.enlace_apoyo || null,
          task.fecha_limite,
          task.prioridad,
        ],
      );
      taskId = taskResult.insertId;

      await connection.query(
        `INSERT INTO entregas_alumno (id_tarea_asignada, id_alumno, estado, revisada)
         SELECT ?, ag.id_alumno, 'pendiente', 0
         FROM alumno_grupo ag
         INNER JOIN alumnos a ON a.id_alumno = ag.id_alumno
         INNER JOIN usuarios u ON u.id_usuario = a.id_usuario AND u.activo = 1
         WHERE ag.id_grupo = ? AND ag.activo = 1`,
        [taskId, task.id_grupo],
      );

      const [deliveryRows] = await connection.query(
        'SELECT COUNT(*) AS total FROM entregas_alumno WHERE id_tarea_asignada = ?',
        [taskId],
      );
      totalEntregasGeneradas = Number(deliveryRows[0]?.total ?? 0);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const createdTask = await fetchTeacherTaskById(teacher.id_docente, taskId);
    sendOk(
      res,
      'Tarea publicada correctamente.',
      {
        id: taskId,
        tarea: createdTask,
        totalEntregasGeneradas,
      },
      201,
    );
  }),
);

app.get(
  '/api/docente/tareas/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return sendError(res, 400, 'La tarea solicitada no es válida.');
    }

    const task = await fetchTeacherTaskById(teacher.id_docente, taskId);
    if (!task) {
      return sendError(res, 403, 'No tienes permiso para consultar esta tarea.');
    }

    const alumnos = await fetchTeacherTaskStudents(teacher.id_docente, taskId);
    sendOk(res, 'Detalle de tarea cargado correctamente.', { tarea: task, alumnos });
  }),
);

app.put(
  '/api/docente/tareas/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return sendError(res, 400, 'La tarea solicitada no es válida.');
    }

    const existingTask = await fetchTeacherTaskById(teacher.id_docente, taskId);
    if (!existingTask) {
      return sendError(res, 403, 'No tienes permiso para editar esta tarea.');
    }

    const groupInput = req.body.id_grupo ?? req.body.idGrupo;
    const subjectInput = req.body.id_materia ?? req.body.idMateria ?? req.body.materiaId;
    const immutableErrors = {};

    if (groupInput !== undefined && Number(groupInput) !== Number(existingTask.idGrupo)) {
      immutableErrors.id_grupo = 'No se puede cambiar el grupo de una tarea publicada.';
    }

    if (subjectInput !== undefined && Number(subjectInput) !== Number(existingTask.idMateria)) {
      immutableErrors.id_materia = 'No se puede cambiar la materia de una tarea publicada.';
    }

    const { errors, task } = validateTeacherTaskInput(req.body);
    const allErrors = { ...errors, ...immutableErrors };
    if (Object.keys(allErrors).length > 0) {
      return sendError(res, 400, 'Revisa los campos marcados.', allErrors);
    }

    const nextActive = task.activa === null ? (existingTask.activa ? 1 : 0) : task.activa;
    await db.query(
      `UPDATE tareas_asignadas
       SET titulo = ?,
           descripcion = ?,
           instrucciones = ?,
           enlace_apoyo = ?,
           fecha_limite = ?,
           prioridad = ?,
           activa = ?
       WHERE id_tarea_asignada = ? AND id_docente = ?`,
      [
        task.titulo,
        task.descripcion || null,
        task.instrucciones || null,
        task.enlace_apoyo || null,
        task.fecha_limite,
        task.prioridad,
        nextActive,
        taskId,
        teacher.id_docente,
      ],
    );

    const updatedTask = await fetchTeacherTaskById(teacher.id_docente, taskId);
    sendOk(res, 'Tarea actualizada correctamente.', { tarea: updatedTask });
  }),
);

app.delete(
  '/api/docente/tareas/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return sendError(res, 400, 'La tarea solicitada no es válida.');
    }

    const [result] = await db.query(
      `UPDATE tareas_asignadas
       SET activa = 0
       WHERE id_tarea_asignada = ? AND id_docente = ?`,
      [taskId, teacher.id_docente],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 403, 'No tienes permiso para desactivar esta tarea.');
    }

    sendOk(res, 'Tarea desactivada correctamente.', { id: taskId });
  }),
);

app.get(
  '/api/docente/perfil',
  authenticate,
  asyncRoute(async (req, res) => {
    const teacher = await requireTeacher(req, res);
    if (!teacher) return;

    sendOk(res, 'Perfil docente cargado correctamente.', { perfil: mapTeacherProfile(teacher) });
  }),
);
const getConfiguration = async (req, res) => {
  const [rows] = await db.query('SELECT idioma, tema, vista_default, recordatorios_activos FROM configuraciones WHERE id_usuario = ?', [req.user.id]);
  const configuration = rows[0] ?? {
    idioma: 'es',
    tema: 'claro',
    vista_default: 'dashboard',
    recordatorios_activos: 1,
  };

  sendOk(res, 'Configuración cargada correctamente.', { configuracion: configuration });
};

const updateConfiguration = async (req, res) => {
  const settings = normalizeSettingsInput(req.body);
  await db.query(
    `INSERT INTO configuraciones (id_usuario, tema, idioma, vista_default, recordatorios_activos)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tema = VALUES(tema),
       idioma = VALUES(idioma),
       vista_default = VALUES(vista_default),
       recordatorios_activos = VALUES(recordatorios_activos)`,
    [req.user.id, settings.tema, settings.idioma, settings.vista_default, settings.recordatorios_activos],
  );

  sendOk(res, 'Configuración actualizada correctamente.', { configuracion: settings });
};

app.get('/api/configuracion', authenticate, asyncRoute(getConfiguration));
app.put('/api/configuracion', authenticate, asyncRoute(updateConfiguration));
app.get('/api/settings', authenticate, asyncRoute(getConfiguration));
app.put('/api/settings', authenticate, asyncRoute(updateConfiguration));

app.use((req, res) => {
  sendError(res, 404, 'Ruta no encontrada.');
});

app.listen(PORT, () => {
  console.log(`Servidor StudentTask activo en http://localhost:${PORT}`);
});
