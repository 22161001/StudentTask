# StudentTask

StudentTask es un sistema académico para estudiantes. La versión actual usa frontend React + Vite + Tailwind, backend Node.js + Express, autenticación JWT y persistencia principal en MySQL.

## Fase 1: Módulo Estudiante

La fase estudiante incluye:

- Login con MySQL y JWT.
- Registro conectado a MySQL.
- Perfil del estudiante conectado a MySQL.
- Cambio de contraseña con bcrypt.
- CRUD de materias.
- CRUD y progreso de tareas personales.
- Tareas asignadas por docentes, con nota personal y estado por alumno.
- Agenda con vista de día, semana y mes.
- Reportes calculados desde tareas reales.
- Seguimiento académico con indicadores, alertas e historial.
- Configuración persistida por usuario.
- API Node/Express y base de datos MySQL.

Reportes y seguimiento académico se calculan en el frontend con materias, tareas personales y tareas asignadas cargadas desde la API. No requieren endpoints dedicados todavía.

## Fase 2.1: Base del Módulo Docente

Esta subfase agrega la base funcional del rol docente sin implementar todavía el flujo completo de creación, edición o revisión de tareas.

Incluye:

- Acceso por rol después del login.
- Protección de rutas para alumno, docente y administrador.
- Dashboard docente básico.
- Consulta de grupos asignados.
- Consulta de tareas publicadas por el docente.
- Perfil docente en modo lectura.

## Subfase 2.2: Grupos y materias del docente

Esta subfase completa la consulta real de la carga académica del docente desde MySQL.

Ahora el docente puede:

- Iniciar sesión con rol docente y entrar a `/docente/dashboard`.
- Ver un dashboard docente con grupos, materias, alumnos atendidos y tareas publicadas.
- Consultar sus grupos asignados en `/docente/grupos`.
- Abrir el detalle de un grupo en `/docente/grupos/:id`.
- Consultar alumnos inscritos por grupo.
- Consultar materias asignadas en `/docente/materias`.

Rutas docentes:

```text
/docente/dashboard
/docente/grupos
/docente/grupos/:id
/docente/materias
/docente/tareas
/docente/tareas/nueva
/docente/tareas/:id
/docente/tareas/:id/editar
/docente/perfil
```

Credencial demo docente:

```text
docente@itoaxaca.edu.mx
12345678
```

Queda pendiente para subfases posteriores:

- Seguimiento de entregas.
- Reportes docentes.

## Subfase 2.3: Creación de tareas por docente

Esta subfase agrega la administración básica de tareas académicas creadas por docentes para grupos completos.

Ahora el docente puede:

- Publicar tareas para un grupo y materia asignados.
- Capturar título, descripción, instrucciones, enlace de apoyo, fecha límite y prioridad.
- Generar automáticamente entregas para los alumnos activos del grupo.
- Consultar tareas publicadas con filtros por búsqueda, grupo, materia, prioridad y estado.
- Ver el detalle básico de una tarea y sus alumnos con estado de entrega.
- Editar datos de una tarea sin cambiar grupo ni materia.
- Desactivar tareas con baja lógica.

El alumno puede visualizar las tareas publicadas por el docente desde `Tareas asignadas`.

Rutas docentes agregadas:

```text
/docente/tareas/nueva
/docente/tareas/:id
/docente/tareas/:id/editar
```

Endpoints docentes agregados o completados:

```text
GET    /api/docente/tareas
POST   /api/docente/tareas
GET    /api/docente/tareas/:id
PUT    /api/docente/tareas/:id
DELETE /api/docente/tareas/:id
```

Credenciales demo:

```text
Docente:
docente@itoaxaca.edu.mx
12345678

Alumno:
alumno@itoaxaca.edu.mx
12345678
```

Queda pendiente para la Subfase 2.4:

- Seguimiento detallado por tarea.
- Filtros avanzados de cumplimiento.
- Reportes docentes.

## Estructura Recomendada

```text
StudentTask/
  studenttask-api/   Backend Node.js + Express
  studenttask/       Frontend React + Vite
  README.md
```

En esta carpeta de frontend, el SQL vive en:

```text
database/studenttask_db.sql
```

La carpeta anidada `studenttask/studenttask/` es una copia duplicada y no se debe subir como código fuente del proyecto.

## Importar SQL

1. Abre MySQL Workbench.
2. Ejecuta `database/studenttask_db.sql`.
3. El script crea la base automáticamente:

```sql
CREATE DATABASE IF NOT EXISTS studenttask_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE studenttask_db;
```

Incluye usuarios demo, alumno demo, docente demo, materias demo, tareas personales demo, tarea asignada demo y configuración demo. Las contraseñas demo están en `usuarios.password_hash` con bcrypt.

## Configurar Backend

```powershell
cd C:\Users\wicho\Documents\Proyectos\studenttask-api
npm install
copy .env.example .env
npm run dev
```

Variables esperadas:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=studenttask_db
JWT_SECRET=studenttask_clave_secreta
PORT=3000
```

Health check:

```text
http://localhost:3000/api/health
```

## Configurar Frontend

```powershell
cd C:\Users\wicho\Documents\Proyectos\studenttask
npm install
copy .env.example .env
npm run dev
```

Variable esperada:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Frontend:

```text
http://localhost:5173
```

## Credenciales Demo

```text
alumno@itoaxaca.edu.mx
12345678

docente@itoaxaca.edu.mx
12345678

admin@itoaxaca.edu.mx
12345678
```

El docente ya puede acceder al panel base de la Fase 2.1. El administrador solo tiene una ruta protegida preparada para fases futuras.

## API Principal

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/perfil`
- `PUT /api/perfil`
- `PUT /api/perfil/password`
- `GET /api/materias`
- `POST /api/materias`
- `PUT /api/materias/:id`
- `DELETE /api/materias/:id`
- `GET /api/tareas`
- `POST /api/tareas`
- `PUT /api/tareas/:id`
- `DELETE /api/tareas/:id`
- `PATCH /api/tareas/:id/progreso`
- `GET /api/tareas-asignadas`
- `PATCH /api/tareas-asignadas/:id/progreso`
- `GET /api/docente/dashboard`
- `GET /api/docente/grupos`
- `GET /api/docente/grupos/:id`
- `GET /api/docente/grupos/:id/alumnos`
- `GET /api/docente/materias`
- `GET /api/docente/tareas`
- `POST /api/docente/tareas`
- `GET /api/docente/tareas/:id`
- `PUT /api/docente/tareas/:id`
- `DELETE /api/docente/tareas/:id`
- `GET /api/docente/perfil`
- `GET /api/configuracion`
- `PUT /api/configuracion`

Las rutas privadas usan:

```http
Authorization: Bearer <token>
```

## Fallback Local

`localStorage` se conserva para sesión/token y respaldo temporal si el backend está apagado. Cuando la API está disponible, login, registro, perfil, materias, tareas personales, tareas asignadas y configuración usan MySQL como fuente principal.

## Pruebas Manuales

1. Backend: `cd studenttask-api`, `npm install`, `npm run dev`.
2. Health: abre `http://localhost:3000/api/health`.
3. Frontend: `cd studenttask`, `npm install`, `npm run dev`.
4. Login demo con `alumno@itoaxaca.edu.mx` y `12345678`.
5. Registro: crea usuario, confirma en `usuarios` y `alumnos`, inicia sesión.
6. Perfil: edita datos, guarda, recarga y confirma en MySQL.
7. Contraseña: cambia contraseña, cierra sesión y prueba login anterior/nuevo.
8. Materias: crea, edita, intenta eliminar con tareas asociadas y elimina una sin tareas.
9. Tareas: crea, edita, elimina, completa, reabre y confirma en MySQL.
10. Tareas asignadas: revisa instrucciones/docente/grupo/enlace, guarda nota y marca estado.
11. Agenda: revisa vistas día, semana y mes.
12. Reportes: valida métricas con tareas reales.
13. Seguimiento: revisa indicadores, alertas e historial.
14. Configuración: modifica valores, recarga y confirma persistencia.
15. Login docente con `docente@itoaxaca.edu.mx` y `12345678`; debe abrir `/docente/dashboard`.
16. Como alumno, intenta abrir `/docente/dashboard`; debe redirigir o bloquear el acceso.
17. Como docente, intenta abrir `/dashboard`; debe redirigir o bloquear el acceso.
18. Revisa `/docente/dashboard`; debe mostrar grupos, materias, alumnos y tareas desde MySQL.
19. Revisa `/docente/grupos`; debe mostrar los grupos asignados y el botón `Ver grupo`.
20. Abre `/docente/grupos/:id`; debe mostrar detalle del grupo y alumnos.
21. Revisa `/docente/materias`; debe mostrar materias asignadas, grupos, alumnos y tareas.
22. Revisa `/docente/tareas`; debe mostrar tareas publicadas, filtros y acciones.
23. Abre `/docente/tareas/nueva`, selecciona grupo, materia, título, fecha límite y prioridad.
24. Publica la tarea y confirma que regresa a `/docente/tareas`.
25. Abre `/docente/tareas/:id`; debe mostrar detalle, métricas y alumnos con estado.
26. Abre `/docente/tareas/:id/editar`; modifica texto, fecha, prioridad o estado.
27. Desactiva una tarea desde lista o detalle.
28. En MySQL revisa `SELECT * FROM tareas_asignadas;` y `SELECT * FROM entregas_alumno;`.
29. Cierra sesión, entra como `alumno@itoaxaca.edu.mx` y revisa `Tareas asignadas`.
30. Confirma que el alumno puede marcar como completada la tarea publicada si está activa.

## Siguientes Fases

Fase docente 2.4: seguimiento detallado de entregas, filtros avanzados de cumplimiento y reportes docentes.

Fase administrador: administración de usuarios, catálogos, roles, grupos globales, respaldos y reportes institucionales.

## Subir a GitHub

Sube manualmente:

- `src/`
- `database/studenttask_db.sql`
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `.env.example`
- `.gitignore`
- `README.md`
- En backend: `server.js`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`

No subas:

- `.env`
- `node_modules/`
- `dist/`
- `*.log`
- `.chrome-dashboard-check/`
- `studenttask/studenttask/` si aparece como copia duplicada.
