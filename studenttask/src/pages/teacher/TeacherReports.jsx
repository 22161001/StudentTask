import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiClipboard,
  FiDownload,
  FiEye,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import {
  emptyReportSummary,
  getTeacherGroupReports,
  getTeacherReportSummary,
  getTeacherStudentReports,
  getTeacherSubjectReports,
  getTeacherTaskReports,
} from '../../services/teacherReportService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const reportTabs = [
  { key: 'resumen', label: 'Resumen', to: '/docente/reportes', Icon: FiBarChart2 },
  { key: 'grupos', label: 'Grupos', to: '/docente/reportes/grupos', Icon: FiUsers },
  { key: 'materias', label: 'Materias', to: '/docente/reportes/materias', Icon: FiBookOpen },
  { key: 'alumnos', label: 'Alumnos', to: '/docente/reportes/alumnos', Icon: FiUsers },
  { key: 'tareas', label: 'Tareas', to: '/docente/reportes/tareas', Icon: FiClipboard },
];

const emptyApiFilters = {
  idGrupo: 'all',
  idMateria: 'all',
  periodo: '',
  fechaInicio: '',
  fechaFin: '',
  prioridad: 'all',
  estado: 'all',
};

const emptyLocalFilters = {
  groupSearch: '',
  groupCareer: 'all',
  groupSemester: 'all',
  groupSubject: 'all',
  subjectSearch: '',
  subjectGroup: 'all',
  subjectLoad: 'all',
  studentSearch: '',
  studentGroup: 'all',
  studentCompliance: 'all',
  taskSearch: '',
  taskPriority: 'all',
  taskStatus: 'all',
  taskActive: 'all',
};

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const statusClasses = {
  'alto cumplimiento': 'bg-emerald-50 text-emerald-700',
  'cumplimiento medio': 'bg-sky-50 text-sky-700',
  'bajo cumplimiento': 'bg-rose-50 text-rose-700',
  'sin entregas': 'bg-slate-100 text-slate-600',
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const percentage = (value) => Math.max(0, Math.min(100, Number(value ?? 0) || 0));

function ProgressBar({ value, label = 'cumplimiento' }) {
  const normalized = percentage(value);
  const color = normalized < 50 ? 'bg-rose-500' : normalized < 80 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="min-w-[8rem]">
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${normalized}%` }} />
      </div>
      <p className="mt-1 text-xs font-bold text-slate-500">
        {normalized}% {label}
      </p>
    </div>
  );
}

const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (filename, headers, rows) => {
  const lines = [headers.map(csvValue).join(','), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function TabNav({ activeTab }) {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Reportes docentes">
      {reportTabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          className={`inline-flex min-h-[2.6rem] shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${
            activeTab === tab.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-blue-700'
          }`}
        >
          <tab.Icon className="text-base" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function HighlightCard({ label, value, helper, Icon = FiFileText, tone = 'blue' }) {
  const toneClass = tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';

  return (
    <div className="content-card flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{value}</p>
        {helper ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{helper}</p> : null}
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="text-lg" />
      </span>
    </div>
  );
}

export default function TeacherReports() {
  const location = useLocation();
  const activeTab = reportTabs.find((tab) => location.pathname === tab.to)?.key ?? 'resumen';
  const [summary, setSummary] = useState(emptyReportSummary);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [apiFilters, setApiFilters] = useState(emptyApiFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyApiFilters);
  const [localFilters, setLocalFilters] = useState(emptyLocalFilters);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const loadReports = async (filters = appliedFilters) => {
    setLoading(true);
    setFeedback(null);

    const [summaryResult, groupResult, subjectResult, studentResult, taskResult] = await Promise.all([
      getTeacherReportSummary(filters),
      getTeacherGroupReports(filters),
      getTeacherSubjectReports(filters),
      getTeacherStudentReports(filters),
      getTeacherTaskReports(filters),
    ]);

    setSummary(summaryResult.summary ?? emptyReportSummary);
    setGroups(groupResult.groups ?? []);
    setSubjects(subjectResult.subjects ?? []);
    setStudents(studentResult.students ?? []);
    setTasks(taskResult.tasks ?? []);

    const failed = [summaryResult, groupResult, subjectResult, studentResult, taskResult].find((result) => !result.ok);
    if (failed) {
      setFeedback({
        type: 'error',
        message: failed.status === 403 ? 'No tienes permiso para consultar estos reportes.' : failed.message || 'No se pudieron cargar los reportes.',
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadReports(emptyApiFilters);
  }, []);

  const groupOptions = useMemo(
    () => groups.map((group) => ({ id: group.idGrupo, name: group.nombreGrupo })).filter((group) => group.id),
    [groups],
  );
  const subjectOptions = useMemo(
    () => subjects.map((subject) => ({ id: subject.idMateria, name: subject.nombre })).filter((subject) => subject.id),
    [subjects],
  );
  const careerOptions = useMemo(() => Array.from(new Set(groups.map((group) => group.carrera).filter(Boolean))).sort(), [groups]);
  const semesterOptions = useMemo(() => Array.from(new Set(groups.map((group) => group.semestre).filter(Boolean))).sort(), [groups]);
  const subjectGroupOptions = useMemo(
    () => Array.from(new Set(subjects.flatMap((subject) => subject.grupos ?? []).filter(Boolean))).sort(),
    [subjects],
  );

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) => {
        const matchesSearch = !localFilters.groupSearch || normalizeText(group.nombreGrupo).includes(normalizeText(localFilters.groupSearch));
        const matchesCareer = localFilters.groupCareer === 'all' || group.carrera === localFilters.groupCareer;
        const matchesSemester = localFilters.groupSemester === 'all' || String(group.semestre) === localFilters.groupSemester;
        const matchesSubject = localFilters.groupSubject === 'all' || group.materias.includes(localFilters.groupSubject);
        return matchesSearch && matchesCareer && matchesSemester && matchesSubject;
      }),
    [groups, localFilters],
  );

  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) => {
        const matchesSearch = !localFilters.subjectSearch || normalizeText(subject.nombre).includes(normalizeText(localFilters.subjectSearch));
        const matchesGroup = localFilters.subjectGroup === 'all' || subject.grupos.includes(localFilters.subjectGroup);
        const matchesLoad = localFilters.subjectLoad === 'all' || subject.cargaAcademica.toLowerCase() === localFilters.subjectLoad;
        return matchesSearch && matchesGroup && matchesLoad;
      }),
    [subjects, localFilters],
  );

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const searchTarget = `${student.nombreCompleto} ${student.matricula} ${student.email}`;
        const matchesSearch = !localFilters.studentSearch || normalizeText(searchTarget).includes(normalizeText(localFilters.studentSearch));
        const matchesGroup = localFilters.studentGroup === 'all' || student.grupo === localFilters.studentGroup;
        const matchesCompliance =
          localFilters.studentCompliance === 'all' ||
          (localFilters.studentCompliance === 'bajo' && student.porcentajeCumplimiento < 50) ||
          (localFilters.studentCompliance === 'medio' && student.porcentajeCumplimiento >= 50 && student.porcentajeCumplimiento < 80) ||
          (localFilters.studentCompliance === 'alto' && student.porcentajeCumplimiento >= 80);
        return matchesSearch && matchesGroup && matchesCompliance;
      }),
    [students, localFilters],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesSearch = !localFilters.taskSearch || normalizeText(task.titulo).includes(normalizeText(localFilters.taskSearch));
        const matchesPriority = localFilters.taskPriority === 'all' || task.prioridad === localFilters.taskPriority;
        const matchesStatus = localFilters.taskStatus === 'all' || task.estadoGeneral === localFilters.taskStatus;
        const matchesActive =
          localFilters.taskActive === 'all' ||
          (localFilters.taskActive === 'activa' && task.activa) ||
          (localFilters.taskActive === 'inactiva' && !task.activa);
        return matchesSearch && matchesPriority && matchesStatus && matchesActive;
      }),
    [tasks, localFilters],
  );

  const hasData = summary.totalTareasPublicadas > 0 || summary.totalAlumnos > 0 || groups.length > 0 || subjects.length > 0;

  const handleApiFilterChange = (event) => {
    const { name, value } = event.target;
    setApiFilters((current) => ({ ...current, [name]: value }));
  };

  const handleLocalFilterChange = (event) => {
    const { name, value } = event.target;
    setLocalFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(apiFilters);
    void loadReports(apiFilters);
  };

  const clearFilters = () => {
    setApiFilters(emptyApiFilters);
    setAppliedFilters(emptyApiFilters);
    setLocalFilters(emptyLocalFilters);
    void loadReports(emptyApiFilters);
  };

  const handleExportStudents = () => {
    if (filteredStudents.length === 0) {
      setFeedback({ type: 'error', message: 'No hay resultados con los filtros seleccionados.' });
      return;
    }

    downloadCsv(
      'reporte-alumnos.csv',
      ['nombreCompleto', 'matricula', 'grupo', 'email', 'totalTareasAsignadas', 'completadas', 'pendientes', 'porcentajeCumplimiento', 'ultimaEntrega'],
      filteredStudents,
    );
    setFeedback({ type: 'success', message: 'Reporte exportado correctamente.' });
  };

  const handleExportTasks = () => {
    if (filteredTasks.length === 0) {
      setFeedback({ type: 'error', message: 'No hay resultados con los filtros seleccionados.' });
      return;
    }

    downloadCsv(
      'reporte-tareas.csv',
      ['titulo', 'materia', 'grupo', 'prioridad', 'fechaLimite', 'completadas', 'pendientes', 'revisadas', 'porcentajeCumplimiento', 'estadoGeneral'],
      filteredTasks,
    );
    setFeedback({ type: 'success', message: 'Reporte exportado correctamente.' });
  };

  return (
    <MainLayout title="Reportes docentes" subtitle="Analiza el cumplimiento de tus grupos, materias y tareas publicadas.">
      <PageHero
        eyebrow="Analítica docente"
        title="Reportes docentes"
        description="Analiza el cumplimiento de tus grupos, materias y tareas publicadas."
        actions={[
          <button key="print" type="button" onClick={() => window.print()} className="secondary-btn">
            <FiPrinter className="text-base" />
            Imprimir reporte
          </button>,
          <Link key="seguimiento" to="/docente/seguimiento" className="primary-btn">
            <FiTrendingUp className="text-base" />
            Seguimiento
          </Link>,
        ]}
        stats={[
          { label: 'Cumplimiento', value: `${summary.porcentajeCumplimientoGeneral}%`, helper: 'Promedio general.', tone: 'primary', Icon: FiBarChart2 },
          { label: 'Pendientes', value: summary.entregasPendientes, helper: 'Entregas sin completar.', Icon: FiAlertTriangle },
          { label: 'Revisión', value: `${summary.porcentajeRevisionGeneral}%`, helper: 'Completadas revisadas.', Icon: FiFileText },
        ]}
      />

      <TabNav activeTab={activeTab} />

      <SectionCard eyebrow="Filtros" title="Parámetros del reporte" Icon={FiRefreshCw} className="mb-6">
        <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Grupo</span>
            <select name="idGrupo" value={apiFilters.idGrupo} onChange={handleApiFilterChange} className="field-control">
              <option value="all">Todos</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Materia</span>
            <select name="idMateria" value={apiFilters.idMateria} onChange={handleApiFilterChange} className="field-control">
              <option value="all">Todas</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Periodo</span>
            <input name="periodo" value={apiFilters.periodo} onChange={handleApiFilterChange} className="field-control" placeholder="Enero-Junio 2026" />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Inicio</span>
            <input type="date" name="fechaInicio" value={apiFilters.fechaInicio} onChange={handleApiFilterChange} className="field-control" />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Fin</span>
            <input type="date" name="fechaFin" value={apiFilters.fechaFin} onChange={handleApiFilterChange} className="field-control" />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Prioridad</span>
            <select name="prioridad" value={apiFilters.prioridad} onChange={handleApiFilterChange} className="field-control">
              <option value="all">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Estado</span>
            <select name="estado" value={apiFilters.estado} onChange={handleApiFilterChange} className="field-control">
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="revisada">Revisada</option>
              <option value="sin-revisar">Sin revisar</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={applyFilters} className="primary-btn">
            <FiRefreshCw className="text-base" />
            Aplicar filtros
          </button>
          <button type="button" onClick={clearFilters} className="secondary-btn">
            Limpiar filtros
          </button>
        </div>
      </SectionCard>

      {loading ? (
        <FeedbackBanner type="info" message="Cargando reportes docentes..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !hasData ? (
        <EmptyState
          title="Aún no hay información suficiente para generar reportes."
          description="Cuando existan tareas y entregas de tus grupos aparecerán métricas académicas."
          Icon={FiBarChart2}
        />
      ) : null}

      {!loading && hasData && activeTab === 'resumen' ? (
        <ReportSummary summary={summary} groups={groups} subjects={subjects} tasks={tasks} />
      ) : null}

      {!loading && hasData && activeTab === 'grupos' ? (
        <GroupReport
          groups={filteredGroups}
          localFilters={localFilters}
          careerOptions={careerOptions}
          semesterOptions={semesterOptions}
          subjectOptions={subjects.map((subject) => subject.nombre)}
          onFilterChange={handleLocalFilterChange}
        />
      ) : null}

      {!loading && hasData && activeTab === 'materias' ? (
        <SubjectReport
          subjects={filteredSubjects}
          localFilters={localFilters}
          groupOptions={subjectGroupOptions}
          onFilterChange={handleLocalFilterChange}
        />
      ) : null}

      {!loading && hasData && activeTab === 'alumnos' ? (
        <StudentReport
          students={filteredStudents}
          localFilters={localFilters}
          groupOptions={groupOptions.map((group) => group.name)}
          onFilterChange={handleLocalFilterChange}
          onExport={handleExportStudents}
        />
      ) : null}

      {!loading && hasData && activeTab === 'tareas' ? (
        <TaskReport
          tasks={filteredTasks}
          localFilters={localFilters}
          onFilterChange={handleLocalFilterChange}
          onExport={handleExportTasks}
        />
      ) : null}
    </MainLayout>
  );
}

function ReportSummary({ summary, groups, subjects, tasks }) {
  const lowTasks = summary.tareasConBajoCumplimiento.length > 0 ? summary.tareasConBajoCumplimiento : tasks.filter((task) => task.estadoGeneral === 'bajo cumplimiento').slice(0, 6);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Grupos" value={summary.totalGrupos} helper="Grupos analizados." tone="blue" Icon={FiUsers} />
        <StatCard title="Materias" value={summary.totalMaterias} helper="Materias asignadas." tone="sky" Icon={FiBookOpen} />
        <StatCard title="Alumnos" value={summary.totalAlumnos} helper="Alumnos atendidos." tone="indigo" Icon={FiUsers} />
        <StatCard title="Tareas publicadas" value={summary.totalTareasPublicadas} helper="Actividades creadas." tone="rose" Icon={FiClipboard} />
        <StatCard title="Cumplimiento" value={`${summary.porcentajeCumplimientoGeneral}%`} helper="Entregas completadas." tone="blue" Icon={FiTrendingUp} />
        <StatCard title="Pendientes" value={summary.entregasPendientes} helper="Entregas pendientes." tone="rose" Icon={FiAlertTriangle} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Panel de alertas" Icon={FiAlertTriangle}>
          <div className="grid gap-3 md:grid-cols-2">
            <HighlightCard
              label="Grupo menor cumplimiento"
              value={summary.grupoMenorCumplimiento?.nombreGrupo ?? 'Sin datos'}
              helper={summary.grupoMenorCumplimiento ? `${summary.grupoMenorCumplimiento.porcentaje}% de cumplimiento` : 'No hay entregas suficientes.'}
              Icon={FiUsers}
              tone="rose"
            />
            <HighlightCard
              label="Materia mayor carga"
              value={summary.materiaMayorCarga?.nombre ?? 'Sin datos'}
              helper={summary.materiaMayorCarga ? `${summary.materiaMayorCarga.totalTareas} tarea(s)` : 'No hay tareas publicadas.'}
              Icon={FiBookOpen}
            />
            <HighlightCard
              label="Alumno con más pendientes"
              value={summary.alumnoMasPendientes?.nombreCompleto ?? 'Sin datos'}
              helper={summary.alumnoMasPendientes ? `${summary.alumnoMasPendientes.totalPendientes} pendiente(s)` : 'Sin pendientes destacados.'}
              Icon={FiUsers}
              tone="rose"
            />
            <HighlightCard
              label="Tareas con bajo avance"
              value={lowTasks.length}
              helper="Actividades por debajo de 50%."
              Icon={FiClipboard}
              tone="rose"
            />
          </div>
        </SectionCard>

        <SectionCard title="Accesos rápidos" Icon={FiFileText}>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportTabs.slice(1).map((tab) => (
              <Link key={tab.key} to={tab.to} className="content-card interactive-card flex items-center justify-between gap-4 p-4">
                <span>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Reporte</span>
                  <span className="mt-2 block text-lg font-black tracking-tight text-slate-900">Por {tab.label.toLowerCase()}</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <tab.Icon className="text-lg" />
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <MiniProgressList title="Cumplimiento por grupo" items={groups} labelKey="nombreGrupo" />
        <MiniProgressList title="Cumplimiento por materia" items={subjects} labelKey="nombre" />
        <SectionCard title="Tareas con bajo avance" Icon={FiClipboard}>
          {lowTasks.length === 0 ? (
            <EmptyState title="Sin tareas críticas" description="No hay tareas por debajo del umbral de bajo cumplimiento." Icon={FiClipboard} />
          ) : (
            <div className="space-y-3">
              {lowTasks.map((task) => (
                <Link key={task.idTarea || task.id} to={`/docente/tareas/${task.idTarea || task.id}/seguimiento`} className="content-card interactive-card block px-4 py-3">
                  <p className="font-black text-slate-900">{task.titulo}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {task.grupo} · {task.materia}
                  </p>
                  <div className="mt-3">
                    <ProgressBar value={task.porcentajeCumplimiento} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </>
  );
}

function MiniProgressList({ title, items, labelKey }) {
  return (
    <SectionCard title={title} Icon={FiBarChart2}>
      {items.length === 0 ? (
        <EmptyState title="Sin datos" description="No hay información suficiente para esta métrica." Icon={FiBarChart2} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((item) => (
            <div key={`${title}-${item.id}`} className="content-card px-4 py-3">
              <p className="font-black text-slate-900">{item[labelKey]}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.completadas} completadas · {item.pendientes} pendientes
              </p>
              <div className="mt-3">
                <ProgressBar value={item.porcentajeCumplimiento} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function GroupReport({ groups, localFilters, careerOptions, semesterOptions, subjectOptions, onFilterChange }) {
  return (
    <SectionCard eyebrow={`${groups.length} grupo(s)`} title="Reporte por grupos" Icon={FiUsers}>
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <SearchInput name="groupSearch" value={localFilters.groupSearch} onChange={onFilterChange} placeholder="Buscar grupo" />
        <SelectInput label="Carrera" name="groupCareer" value={localFilters.groupCareer} onChange={onFilterChange} options={careerOptions} />
        <SelectInput label="Semestre" name="groupSemester" value={localFilters.groupSemester} onChange={onFilterChange} options={semesterOptions} />
        <SelectInput label="Materia" name="groupSubject" value={localFilters.groupSubject} onChange={onFilterChange} options={subjectOptions} />
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No hay resultados con los filtros seleccionados." description="Ajusta búsqueda, carrera, semestre o materia." Icon={FiUsers} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <article key={group.idGrupo || group.id} className="content-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black tracking-tight text-slate-900">{group.nombreGrupo}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {group.carrera} · {group.semestre || 'Sin semestre'} · {group.turno || 'Sin turno'}
                  </p>
                </div>
                <Link to={`/docente/grupos/${group.idGrupo}`} className="secondary-btn shrink-0 text-sm">
                  <FiEye className="text-base" />
                  Ver grupo
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricPill label="Alumnos" value={group.totalAlumnos} />
                <MetricPill label="Tareas" value={group.totalTareas} />
                <MetricPill label="Pendientes" value={group.pendientes} tone="rose" />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ProgressBar value={group.porcentajeCumplimiento} />
                <ProgressBar value={group.porcentajeRevision} label="revisión" />
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SubjectReport({ subjects, localFilters, groupOptions, onFilterChange }) {
  return (
    <SectionCard eyebrow={`${subjects.length} materia(s)`} title="Reporte por materias" Icon={FiBookOpen}>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <SearchInput name="subjectSearch" value={localFilters.subjectSearch} onChange={onFilterChange} placeholder="Buscar materia" />
        <SelectInput label="Grupo" name="subjectGroup" value={localFilters.subjectGroup} onChange={onFilterChange} options={groupOptions} />
        <SelectInput label="Carga" name="subjectLoad" value={localFilters.subjectLoad} onChange={onFilterChange} options={['alta', 'media', 'baja']} />
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="No hay resultados con los filtros seleccionados." description="Ajusta materia, grupo o carga académica." Icon={FiBookOpen} />
      ) : (
        <div className="table-shell">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-black">Materia</th>
                <th className="px-4 py-3 font-black">Grupos</th>
                <th className="px-4 py-3 font-black">Alumnos</th>
                <th className="px-4 py-3 font-black">Tareas</th>
                <th className="px-4 py-3 font-black">Completadas</th>
                <th className="px-4 py-3 font-black">Pendientes</th>
                <th className="px-4 py-3 font-black">Cumplimiento</th>
                <th className="px-4 py-3 font-black">Carga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {subjects.map((subject) => (
                <tr key={subject.idMateria || subject.id} className="align-top">
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 font-black text-slate-900">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{subject.totalGrupos}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{subject.totalAlumnos}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{subject.totalTareasPublicadas}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{subject.completadas}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{subject.pendientes}</td>
                  <td className="px-4 py-4">
                    <ProgressBar value={subject.porcentajeCumplimiento} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{subject.cargaAcademica}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function StudentReport({ students, localFilters, groupOptions, onFilterChange, onExport }) {
  return (
    <SectionCard
      eyebrow={`${students.length} alumno(s)`}
      title="Reporte por alumnos"
      action={
        <button type="button" onClick={onExport} className="secondary-btn">
          <FiDownload className="text-base" />
          Exportar CSV
        </button>
      }
    >
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <SearchInput name="studentSearch" value={localFilters.studentSearch} onChange={onFilterChange} placeholder="Nombre o matrícula" />
        <SelectInput label="Grupo" name="studentGroup" value={localFilters.studentGroup} onChange={onFilterChange} options={groupOptions} />
        <SelectInput label="Cumplimiento" name="studentCompliance" value={localFilters.studentCompliance} onChange={onFilterChange} options={['bajo', 'medio', 'alto']} />
      </div>

      {students.length === 0 ? (
        <EmptyState title="No hay resultados con los filtros seleccionados." description="Ajusta grupo, materia o búsqueda." Icon={FiUsers} />
      ) : (
        <div className="table-shell">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-black">Alumno</th>
                <th className="px-4 py-3 font-black">Grupo</th>
                <th className="px-4 py-3 font-black">Correo</th>
                <th className="px-4 py-3 font-black">Asignadas</th>
                <th className="px-4 py-3 font-black">Completadas</th>
                <th className="px-4 py-3 font-black">Pendientes</th>
                <th className="px-4 py-3 font-black">Alta prioridad</th>
                <th className="px-4 py-3 font-black">Última entrega</th>
                <th className="px-4 py-3 font-black">Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {students.map((student) => (
                <tr key={`${student.idAlumno}-${student.grupo}`} className={student.porcentajeCumplimiento < 50 ? 'bg-rose-50/35' : ''}>
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-900">{student.nombreCompleto}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{student.matricula || 'Sin matrícula'}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{student.grupo}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{student.email}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{student.totalTareasAsignadas}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{student.completadas}</td>
                  <td className="px-4 py-4 font-semibold text-rose-700">{student.pendientes}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{student.tareasPendientesAltaPrioridad}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{formatShortDate(student.ultimaEntrega)}</td>
                  <td className="px-4 py-4">
                    <ProgressBar value={student.porcentajeCumplimiento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function TaskReport({ tasks, localFilters, onFilterChange, onExport }) {
  return (
    <SectionCard
      eyebrow={`${tasks.length} tarea(s)`}
      title="Reporte por tareas"
      action={
        <button type="button" onClick={onExport} className="secondary-btn">
          <FiDownload className="text-base" />
          Exportar CSV
        </button>
      }
    >
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <SearchInput name="taskSearch" value={localFilters.taskSearch} onChange={onFilterChange} placeholder="Buscar tarea" />
        <SelectInput label="Prioridad" name="taskPriority" value={localFilters.taskPriority} onChange={onFilterChange} options={['alta', 'media', 'baja']} />
        <SelectInput
          label="Estado general"
          name="taskStatus"
          value={localFilters.taskStatus}
          onChange={onFilterChange}
          options={['alto cumplimiento', 'cumplimiento medio', 'bajo cumplimiento', 'sin entregas']}
        />
        <SelectInput label="Publicación" name="taskActive" value={localFilters.taskActive} onChange={onFilterChange} options={['activa', 'inactiva']} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No hay resultados con los filtros seleccionados." description="Ajusta grupo, materia, prioridad o estado." Icon={FiClipboard} />
      ) : (
        <div className="table-shell">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-black">Tarea</th>
                <th className="px-4 py-3 font-black">Grupo</th>
                <th className="px-4 py-3 font-black">Materia</th>
                <th className="px-4 py-3 font-black">Prioridad</th>
                <th className="px-4 py-3 font-black">Límite</th>
                <th className="px-4 py-3 font-black">Completadas</th>
                <th className="px-4 py-3 font-black">Pendientes</th>
                <th className="px-4 py-3 font-black">Revisadas</th>
                <th className="px-4 py-3 font-black">Estado</th>
                <th className="px-4 py-3 font-black">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {tasks.map((task) => (
                <tr key={task.idTarea || task.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-900">{task.titulo}</p>
                    <ProgressBar value={task.porcentajeCumplimiento} />
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{task.grupo}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{task.materia}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[task.prioridad]}`}>
                      {formatPriorityLabel(task.prioridad)}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{formatShortDate(task.fechaLimite)}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{task.completadas}</td>
                  <td className="px-4 py-4 font-semibold text-rose-700">{task.pendientes}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{task.revisadas}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[task.estadoGeneral] ?? statusClasses['sin entregas']}`}>
                      {task.estadoGeneral}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/docente/tareas/${task.idTarea}/seguimiento`} className="secondary-btn text-sm">
                        Seguimiento
                      </Link>
                      <Link to={`/docente/tareas/${task.idTarea}`} className="secondary-btn text-sm">
                        Detalle
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function SearchInput({ name, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">Búsqueda</span>
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-[calc(50%+0.25rem)] -translate-y-1/2 text-slate-400" />
        <input type="search" name={name} value={value} onChange={onChange} className="field-control pl-10" placeholder={placeholder} />
      </div>
    </label>
  );
}

function SelectInput({ label, name, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select name={name} value={value} onChange={onChange} className="field-control">
        <option value="all">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricPill({ label, value, tone = 'blue' }) {
  const toneClass = tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700';

  return (
    <span className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <span className="block text-xs font-black uppercase tracking-[0.16em]">{label}</span>
      <span className="mt-1 block text-lg font-black">{value}</span>
    </span>
  );
}
