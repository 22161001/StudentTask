CREATE DATABASE IF NOT EXISTS control_tareas_db;
USE control_tareas_db;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('Administrador', 'Alumno') NOT NULL DEFAULT 'Alumno',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alumnos (
  id_alumno INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  matricula VARCHAR(30) NOT NULL UNIQUE,
  carrera VARCHAR(120) NOT NULL,
  semestre VARCHAR(20) NOT NULL,
  grupo VARCHAR(20) NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE materias (
  id_materia INT AUTO_INCREMENT PRIMARY KEY,
  id_alumno INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  color VARCHAR(15) DEFAULT '#2563eb',
  descripcion TEXT,
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
);

CREATE TABLE tareas (
  id_tarea INT AUTO_INCREMENT PRIMARY KEY,
  id_alumno INT NOT NULL,
  id_materia INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  fecha_entrega DATE NOT NULL,
  prioridad ENUM('Alta', 'Media', 'Baja') NOT NULL DEFAULT 'Media',
  estado ENUM('Pendiente', 'En progreso', 'Completada') NOT NULL DEFAULT 'Pendiente',
  recordatorio TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno),
  FOREIGN KEY (id_materia) REFERENCES materias(id_materia)
);

CREATE TABLE configuraciones (
  id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  idioma VARCHAR(30) NOT NULL DEFAULT 'Español',
  tema VARCHAR(30) NOT NULL DEFAULT 'Claro',
  vista_default VARCHAR(20) NOT NULL DEFAULT 'Semana',
  recordatorios_activos TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
