# StudentTask - avance de proyecto

Proyecto frontend en React + Vite + Tailwind para la materia de Programación Web.

## Cambios realizados
- Login con validación de credenciales demo.
- Protección de rutas privadas.
- Dashboard académico con métricas reales del caso de uso.
- CRUD de materias con almacenamiento local.
- CRUD de tareas con prioridad, estado y fecha de entrega.
- Módulo de configuración y perfil.
- Script SQL base para MariaDB.

## Actualizaciones
Implementación de la capa operativa del módulo estudiante

Se desarrolló la ampliación funcional del rol estudiante, incorporando la gestión completa de tareas personales, la recepción de tareas asignadas por docente, la vista de agenda académica, recordatorios visuales y mejoras generales del dashboard. También se actualizó el modelo de datos del estudiante para soportar estados, origen de tareas, tiempos estimados y seguimiento de entregas.

## Credenciales demo
- Correo: `alumno@itoaxaca.edu.mx`
- Contraseña: `12345678`

## Ejecutar proyecto
```bash
npm install
npm run dev
```

## Estructura clave
- `src/pages/Login.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Subjects.jsx`
- `src/pages/Tasks.jsx`
- `src/pages/Settings.jsx`
- `database/control_tareas_db.sql`
- `docs/roadmap-componentes.md`
