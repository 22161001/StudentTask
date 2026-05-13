import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Puerto de Vite
  credentials: true,
}));
app.use(express.json());

// ─── CONEXIÓN A MYSQL ────────────────────────────────────────────────────────
const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'studenttask_db',
  waitForConnections: true,
  connectionLimit: 10,
});

console.log('Conectado a MySQL correctamente');

// ─── MIDDLEWARE: verificar token JWT ─────────────────────────────────────────
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'No autorizado.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};


app.post('/api/auth/register', async (req, res) => {
  const { nombre, apellidos, email, password, matricula, carrera, semestre, grupo } = req.body;

  if (!nombre || !apellidos || !email || !password || !matricula || !carrera || !semestre || !grupo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    // Verificar si el email ya existe
    const [existing] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        message: 'Este correo ya está registrado.',
        errors: { email: 'Este correo ya está registrado.' },
      });
    }

    // Verificar si la matrícula ya existe
    const [existingMatricula] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE matricula = ?', [matricula]
    );
    if (existingMatricula.length > 0) {
      return res.status(400).json({
        message: 'Esta matrícula ya está registrada.',
        errors: { matricula: 'Esta matrícula ya está registrada.' },
      });
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Insertar en usuarios
    const [userResult] = await db.query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES (?, ?, ?, ?, 'alumno')`,
      [nombre.trim(), apellidos.trim(), email.toLowerCase().trim(), password_hash]
    );

    const id_usuario = userResult.insertId;

    // Insertar en alumnos
    const [alumnoResult] = await db.query(
      `INSERT INTO alumnos (id_usuario, matricula, carrera, semestre, grupo)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, matricula.trim(), carrera.trim(), parseInt(semestre) || 1, grupo.trim()]
    );

    // Insertar configuración por defecto
    await db.query(
      `INSERT INTO configuraciones (id_usuario) VALUES (?)`,
      [id_usuario]
    );

    return res.status(201).json({
      message: 'Cuenta creada correctamente.',
      data: {
        user: {
          id: id_usuario,
          nombre,
          apellidos,
          email,
          rol: 'alumno',
          alumno: {
            id_alumno: alumnoResult.insertId,
            matricula,
            carrera,
            semestre,
            grupo,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error en /register:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.*, a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
       WHERE u.email = ? AND u.activo = 1`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'El correo no está registrado.' });
    }

    const user = rows[0];

    // Comparar contraseña (soporta bcrypt y texto plano para datos de prueba)
    let passwordOk = false;
    if (user.password_hash.startsWith('$2')) {
      passwordOk = await bcrypt.compare(password, user.password_hash);
    } else {
      passwordOk = password === user.password_hash;
    }

    if (!passwordOk) {
      return res.status(401).json({ message: 'La contraseña es incorrecta.' });
    }

    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Inicio de sesión exitoso.',
      data: {
        token,
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          apellidos: user.apellidos,
          email: user.email,
          rol: user.rol,
          alumno: user.id_alumno ? {
            matricula: user.matricula,
            carrera: user.carrera,
            semestre: user.semestre,
            grupo: user.grupo,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.rol,
              a.id_alumno, a.matricula, a.carrera, a.semestre, a.grupo
       FROM usuarios u
       LEFT JOIN alumnos a ON a.id_usuario = u.id_usuario
       WHERE u.id_usuario = ? AND u.activo = 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const u = rows[0];
    return res.json({
      data: {
        user: {
          id: u.id_usuario,
          nombre: u.nombre,
          apellidos: u.apellidos,
          email: u.email,
          rol: u.rol,
          alumno: u.id_alumno ? {
            matricula: u.matricula,
            carrera: u.carrera,
            semestre: u.semestre,
            grupo: u.grupo,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Error en /me:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  return res.json({ message: 'Sesión cerrada.' });
});


// GET /api/materias
app.get('/api/materias', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id_materia as id, nombre, color, descripcion FROM materias WHERE activa = 1'
    );
    return res.json({ data: { materias: rows } });
  } catch (error) {
    console.error('Error en /materias:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


app.get('/api/tareas', authenticate, async (req, res) => {
  try {
    const [alumno] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE id_usuario = ?', [req.user.id]
    );
    if (alumno.length === 0) return res.json({ data: { tareas: [] } });

    const id_alumno = alumno[0].id_alumno;
    const [rows] = await db.query(
      `SELECT tp.id_tarea_personal as id, tp.titulo, tp.descripcion,
              tp.id_materia, tp.fecha_publicacion, tp.fecha_entrega,
              tp.prioridad, tp.estado, tp.recordatorio,
              tp.tiempo_estimado_horas as tiempoEstimadoHoras,
              tp.fecha_completada, tp.created_at, tp.updated_at,
              'personal' as tipo, 'estudiante' as origen
       FROM tareas_personales tp
       WHERE tp.id_alumno = ?
       ORDER BY tp.fecha_entrega ASC`,
      [id_alumno]
    );
    return res.json({ data: { tareas: rows } });
  } catch (error) {
    console.error('Error en GET /tareas:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// POST /api/tareas
app.post('/api/tareas', authenticate, async (req, res) => {
  try {
    const [alumno] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE id_usuario = ?', [req.user.id]
    );
    if (alumno.length === 0) return res.status(403).json({ message: 'No tienes perfil de alumno.' });

    const id_alumno = alumno[0].id_alumno;
    const { titulo, descripcion, id_materia, fecha_entrega, prioridad, estado, recordatorio, tiempo_estimado_horas } = req.body;

    const [result] = await db.query(
      `INSERT INTO tareas_personales
        (id_alumno, id_materia, titulo, descripcion, fecha_entrega, prioridad, estado, recordatorio, tiempo_estimado_horas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_alumno, id_materia, titulo, descripcion || null, fecha_entrega, prioridad || 'media', estado || 'pendiente', recordatorio ? 1 : 0, tiempo_estimado_horas || null]
    );

    return res.status(201).json({ message: 'Tarea creada.', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error en POST /tareas:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// PUT /api/tareas/:id
app.put('/api/tareas/:id', authenticate, async (req, res) => {
  try {
    const [alumno] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE id_usuario = ?', [req.user.id]
    );
    if (alumno.length === 0) return res.status(403).json({ message: 'No tienes perfil de alumno.' });

    const id_alumno = alumno[0].id_alumno;
    const { titulo, descripcion, id_materia, fecha_entrega, prioridad, estado, recordatorio, tiempo_estimado_horas, fecha_completada } = req.body;

    await db.query(
      `UPDATE tareas_personales SET
        titulo = ?, descripcion = ?, id_materia = ?, fecha_entrega = ?,
        prioridad = ?, estado = ?, recordatorio = ?, tiempo_estimado_horas = ?, fecha_completada = ?
       WHERE id_tarea_personal = ? AND id_alumno = ?`,
      [titulo, descripcion || null, id_materia, fecha_entrega, prioridad, estado, recordatorio ? 1 : 0, tiempo_estimado_horas || null, fecha_completada || null, req.params.id, id_alumno]
    );

    return res.json({ message: 'Tarea actualizada.' });
  } catch (error) {
    console.error('Error en PUT /tareas/:id:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// DELETE /api/tareas/:id
app.delete('/api/tareas/:id', authenticate, async (req, res) => {
  try {
    const [alumno] = await db.query(
      'SELECT id_alumno FROM alumnos WHERE id_usuario = ?', [req.user.id]
    );
    if (alumno.length === 0) return res.status(403).json({ message: 'No tienes perfil de alumno.' });

    const id_alumno = alumno[0].id_alumno;
    await db.query(
      'DELETE FROM tareas_personales WHERE id_tarea_personal = ? AND id_alumno = ?',
      [req.params.id, id_alumno]
    );

    return res.json({ message: 'Tarea eliminada.' });
  } catch (error) {
    console.error('Error en DELETE /tareas/:id:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


// GET /api/settings
app.get('/api/settings', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT idioma, tema, vista_default, recordatorios_activos FROM configuraciones WHERE id_usuario = ?',
      [req.user.id]
    );
    return res.json({ data: { configuracion: rows[0] ?? {} } });
  } catch (error) {
    console.error('Error en GET /settings:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// PUT /api/settings
app.put('/api/settings', authenticate, async (req, res) => {
  try {
    const { tema, idioma, vista_default, recordatorios_activos } = req.body;
    await db.query(
      `INSERT INTO configuraciones (id_usuario, tema, idioma, vista_default, recordatorios_activos)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tema = VALUES(tema), idioma = VALUES(idioma),
         vista_default = VALUES(vista_default), recordatorios_activos = VALUES(recordatorios_activos)`,
      [req.user.id, tema || 'claro', idioma || 'español', vista_default || 'dashboard', recordatorios_activos ? 1 : 0]
    );
    return res.json({ message: 'Configuración actualizada.' });
  } catch (error) {
    console.error('Error en PUT /settings:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// ─── INICIAR SERVIDOR ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
