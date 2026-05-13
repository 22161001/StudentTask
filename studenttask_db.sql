-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: studenttask_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alumno_grupo`
--

DROP TABLE IF EXISTS `alumno_grupo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumno_grupo` (
  `id_alumno_grupo` int NOT NULL AUTO_INCREMENT,
  `id_alumno` int NOT NULL,
  `id_grupo` int NOT NULL,
  `fecha_asignacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_alumno_grupo`),
  UNIQUE KEY `id_alumno` (`id_alumno`,`id_grupo`),
  KEY `id_grupo` (`id_grupo`),
  CONSTRAINT `alumno_grupo_ibfk_1` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alumno_grupo_ibfk_2` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumno_grupo`
--

LOCK TABLES `alumno_grupo` WRITE;
/*!40000 ALTER TABLE `alumno_grupo` DISABLE KEYS */;
INSERT INTO `alumno_grupo` VALUES (1,1,1,'2026-05-04 15:27:38',1);
/*!40000 ALTER TABLE `alumno_grupo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumnos`
--

DROP TABLE IF EXISTS `alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumnos` (
  `id_alumno` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `matricula` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carrera` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semestre` int NOT NULL,
  `grupo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_alumno`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `matricula` (`matricula`),
  CONSTRAINT `alumnos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumnos`
--

LOCK TABLES `alumnos` WRITE;
/*!40000 ALTER TABLE `alumnos` DISABLE KEYS */;
INSERT INTO `alumnos` VALUES (1,1,'22161001','Ingeniería en Sistemas Computacionales',6,'A');
/*!40000 ALTER TABLE `alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuraciones`
--

DROP TABLE IF EXISTS `configuraciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuraciones` (
  `id_configuracion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `idioma` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'español',
  `tema` enum('claro','oscuro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claro',
  `vista_default` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dashboard',
  `recordatorios_activos` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_configuracion`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `configuraciones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuraciones`
--

LOCK TABLES `configuraciones` WRITE;
/*!40000 ALTER TABLE `configuraciones` DISABLE KEYS */;
INSERT INTO `configuraciones` VALUES (1,1,'español','claro','dashboard',1);
/*!40000 ALTER TABLE `configuraciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `docente_grupo_materia`
--

DROP TABLE IF EXISTS `docente_grupo_materia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `docente_grupo_materia` (
  `id_docente_grupo_materia` int NOT NULL AUTO_INCREMENT,
  `id_docente` int NOT NULL,
  `id_grupo` int NOT NULL,
  `id_materia` int NOT NULL,
  `periodo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '2026',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_docente_grupo_materia`),
  UNIQUE KEY `id_docente` (`id_docente`,`id_grupo`,`id_materia`,`periodo`),
  KEY `id_grupo` (`id_grupo`),
  KEY `id_materia` (`id_materia`),
  CONSTRAINT `docente_grupo_materia_ibfk_1` FOREIGN KEY (`id_docente`) REFERENCES `docentes` (`id_docente`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `docente_grupo_materia_ibfk_2` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `docente_grupo_materia_ibfk_3` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `docente_grupo_materia`
--

LOCK TABLES `docente_grupo_materia` WRITE;
/*!40000 ALTER TABLE `docente_grupo_materia` DISABLE KEYS */;
INSERT INTO `docente_grupo_materia` VALUES (1,1,1,1,'Enero-Junio 2026',1);
/*!40000 ALTER TABLE `docente_grupo_materia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `docentes`
--

DROP TABLE IF EXISTS `docentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `docentes` (
  `id_docente` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `numero_empleado` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidad` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_docente`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `numero_empleado` (`numero_empleado`),
  CONSTRAINT `docentes_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `docentes`
--

LOCK TABLES `docentes` WRITE;
/*!40000 ALTER TABLE `docentes` DISABLE KEYS */;
INSERT INTO `docentes` VALUES (1,2,'DOC001','Programación Web');
/*!40000 ALTER TABLE `docentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entregas_alumno`
--

DROP TABLE IF EXISTS `entregas_alumno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entregas_alumno` (
  `id_entrega` int NOT NULL AUTO_INCREMENT,
  `id_tarea_asignada` int NOT NULL,
  `id_alumno` int NOT NULL,
  `estado` enum('pendiente','completada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_entrega` datetime DEFAULT NULL,
  `nota_personal` text COLLATE utf8mb4_unicode_ci,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `tiempo_real_horas` decimal(5,2) DEFAULT NULL,
  `revisada` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_entrega`),
  UNIQUE KEY `id_tarea_asignada` (`id_tarea_asignada`,`id_alumno`),
  KEY `id_alumno` (`id_alumno`),
  CONSTRAINT `entregas_alumno_ibfk_1` FOREIGN KEY (`id_tarea_asignada`) REFERENCES `tareas_asignadas` (`id_tarea_asignada`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entregas_alumno_ibfk_2` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entregas_alumno`
--

LOCK TABLES `entregas_alumno` WRITE;
/*!40000 ALTER TABLE `entregas_alumno` DISABLE KEYS */;
INSERT INTO `entregas_alumno` VALUES (1,1,1,'pendiente',NULL,'Pendiente de terminar validaciones.',NULL,NULL,0,'2026-05-04 15:27:39',NULL);
/*!40000 ALTER TABLE `entregas_alumno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupos`
--

DROP TABLE IF EXISTS `grupos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupos` (
  `id_grupo` int NOT NULL AUTO_INCREMENT,
  `nombre_grupo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carrera` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semestre` int NOT NULL,
  `turno` enum('matutino','vespertino') COLLATE utf8mb4_unicode_ci DEFAULT 'matutino',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_grupo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupos`
--

LOCK TABLES `grupos` WRITE;
/*!40000 ALTER TABLE `grupos` DISABLE KEYS */;
INSERT INTO `grupos` VALUES (1,'6A','Ingeniería en Sistemas Computacionales',6,'matutino',1);
/*!40000 ALTER TABLE `grupos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materias`
--

DROP TABLE IF EXISTS `materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materias` (
  `id_materia` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#2563eb',
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_materia`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materias`
--

LOCK TABLES `materias` WRITE;
/*!40000 ALTER TABLE `materias` DISABLE KEYS */;
INSERT INTO `materias` VALUES (1,'Programación Web','#2563eb','Desarrollo de aplicaciones web con frontend y backend.',1),(2,'Base de Datos','#16a34a','Diseño, consulta y administración de bases de datos.',1),(3,'Redes de Computadoras','#dc2626','Fundamentos de redes, cableado y configuración.',1);
/*!40000 ALTER TABLE `materias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes_academicos`
--

DROP TABLE IF EXISTS `reportes_academicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes_academicos` (
  `id_reporte` int NOT NULL AUTO_INCREMENT,
  `id_alumno` int NOT NULL,
  `periodo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cumplimiento` decimal(5,2) DEFAULT '0.00',
  `puntualidad` decimal(5,2) DEFAULT '0.00',
  `disciplina` decimal(5,2) DEFAULT '0.00',
  `tareas_ignoradas` int DEFAULT '0',
  `materia_mayor_carga` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materia_mayor_retraso` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_reporte`),
  KEY `id_alumno` (`id_alumno`),
  CONSTRAINT `reportes_academicos_ibfk_1` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes_academicos`
--

LOCK TABLES `reportes_academicos` WRITE;
/*!40000 ALTER TABLE `reportes_academicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `reportes_academicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas_asignadas`
--

DROP TABLE IF EXISTS `tareas_asignadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas_asignadas` (
  `id_tarea_asignada` int NOT NULL AUTO_INCREMENT,
  `id_docente` int NOT NULL,
  `id_grupo` int NOT NULL,
  `id_materia` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `instrucciones` text COLLATE utf8mb4_unicode_ci,
  `enlace_apoyo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_publicacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_limite` datetime NOT NULL,
  `prioridad` enum('baja','media','alta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'media',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarea_asignada`),
  KEY `id_docente` (`id_docente`),
  KEY `id_grupo` (`id_grupo`),
  KEY `id_materia` (`id_materia`),
  CONSTRAINT `tareas_asignadas_ibfk_1` FOREIGN KEY (`id_docente`) REFERENCES `docentes` (`id_docente`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tareas_asignadas_ibfk_2` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tareas_asignadas_ibfk_3` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas_asignadas`
--

LOCK TABLES `tareas_asignadas` WRITE;
/*!40000 ALTER TABLE `tareas_asignadas` DISABLE KEYS */;
INSERT INTO `tareas_asignadas` VALUES (1,1,1,1,'CRUD completo del módulo estudiante','Desarrollar el CRUD del estudiante dentro del proyecto StudentTask.','Implementar altas, bajas, cambios, consultas, validaciones y persistencia.','https://react.dev/','2026-05-04 15:27:39','2026-05-15 23:59:00','alta',1,'2026-05-04 15:27:39',NULL);
/*!40000 ALTER TABLE `tareas_asignadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas_personales`
--

DROP TABLE IF EXISTS `tareas_personales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas_personales` (
  `id_tarea_personal` int NOT NULL AUTO_INCREMENT,
  `id_alumno` int NOT NULL,
  `id_materia` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fecha_publicacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_entrega` datetime NOT NULL,
  `prioridad` enum('baja','media','alta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'media',
  `estado` enum('pendiente','completada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `recordatorio` tinyint(1) NOT NULL DEFAULT '0',
  `tiempo_estimado_horas` decimal(5,2) DEFAULT NULL,
  `fecha_completada` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarea_personal`),
  KEY `id_alumno` (`id_alumno`),
  KEY `id_materia` (`id_materia`),
  CONSTRAINT `tareas_personales_ibfk_1` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tareas_personales_ibfk_2` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas_personales`
--

LOCK TABLES `tareas_personales` WRITE;
/*!40000 ALTER TABLE `tareas_personales` DISABLE KEYS */;
INSERT INTO `tareas_personales` VALUES (1,1,1,'Terminar dashboard en React','Ajustar interfaz principal del estudiante.','2026-05-04 15:27:39','2026-05-08 23:59:00','alta','pendiente',1,3.50,NULL,'2026-05-04 15:27:39',NULL),(2,1,2,'Diseñar modelo relacional','Completar tablas y relaciones principales.','2026-05-04 15:27:39','2026-05-10 23:59:00','media','pendiente',1,2.00,NULL,'2026-05-04 15:27:39',NULL),(3,1,3,'Reporte de práctica de cableado','Documentar evidencias y conclusiones.','2026-05-04 15:27:39','2026-05-12 23:59:00','baja','pendiente',0,1.50,NULL,'2026-05-04 15:27:39',NULL);
/*!40000 ALTER TABLE `tareas_personales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('alumno','docente','administrador') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Ignacio Luis','Velásquez Montes','alumno@itoaxaca.edu.mx','$2a$10$BlT3kG6LNH8ToOUci0cbVOSpWnOkokIgsYBdkxZUP1aHWuX4lTgWK','alumno',1,'2026-05-04 15:27:38',NULL),(2,'Maricarmen','Velázquez Hernández','docente@itoaxaca.edu.mx','$2a$10$BlT3kG6LNH8ToOUci0cbVOSpWnOkokIgsYBdkxZUP1aHWuX4lTgWK','docente',1,'2026-05-04 15:27:38',NULL),(3,'Administrador','General','admin@itoaxaca.edu.mx','$2a$10$BlT3kG6LNH8ToOUci0cbVOSpWnOkokIgsYBdkxZUP1aHWuX4lTgWK','administrador',1,'2026-05-04 15:27:38',NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'studenttask_db'
--

--
-- Dumping routines for database 'studenttask_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-04 15:34:51
