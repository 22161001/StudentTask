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
});

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
    if (!normalizeEmail(email)) errors.email = 'Ingresa tu correo electrónico.';
    if (!normalizeText(password) || String(password).length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (!normalizeText(matricula)) errors.matricula = 'Ingresa tu matrícula.';
    if (!normalizeText(carrera)) errors.carrera = 'Ingresa tu carrera.';
    if (!normalizeText(semestre)) errors.semestre = 'Ingresa tu semestre.';
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
        [userResult.insertId, normalizeText(matricula), normalizeText(carrera), Number(semestre) || 1, normalizeText(grupo)],
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
              semestre: Number(semestre) || 1,
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
              a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
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
              a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
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
