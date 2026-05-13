import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiClipboard,
  FiEye,
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
import { emptyTrackingSummary, getTeacherTrackingSummary } from '../../services/teacherTrackingService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const emptyFilters = {
  search: '',
  group: 'all',
  subject: 'all',
  priority: 'all',
  compliance: 'all',
};

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const asPercent = (value) => Math.max(0, Math.min(100, Number(value ?? 0) || 0));

function ProgressBar({ value, tone = 'blue' }) {
  const percentage = asPercent(value);
  const color = percentage < 50 ? 'bg-rose-500' : percentage < 80 ? 'bg-amber-400' : 'bg-emerald-500';
  const fallbackColor = tone === 'muted' ? 'bg-slate-400' : color;

  return (
    <div className="min-w-[8rem]">
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${fallbackColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-1 text-xs font-bold text-slate-500">{percentage}% completado</p>
    </div>
  );
}

function TaskList({ tasks, emptyTitle, emptyDescription }) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} Icon={FiClipboard} />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <article key={task.id} className="content-card interactive-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700">{task.materiaNombre}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{task.nombreGrupo}</span>
                <span className={`rounded-full px-3 py-1 font-bold ${priorityClasses[task.prioridad]}`}>
                  {formatPriorityLabel(task.prioridad)}
                </span>
              </div>
              <h3 className="mt-3 text-base font-black tracking-tight text-slate-900">{task.titulo}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Límite: {formatShortDate(task.fechaLimite)}</p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 md:w-48">
              <ProgressBar value={task.porcentajeCumplimiento} />
              <Link to={`/docente/tareas/${task.id}/seguimiento`} className="secondary-btn justify-center text-sm">
                <FiEye className="text-base" />
                Ver seguimiento
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BucketList({ items, type }) {
  const nameKey = type === 'materia' ? 'materiaNombre' : 'grupoNombre';

  if (items.length === 0) {
    return <EmptyState title="Sin datos de cumplimiento" description="Aún no hay entregas para calcular esta sección." Icon={FiBarChart2} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${type}-${item.id}`} className="content-card px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-black text-slate-900">{item[nameKey]}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.totalCompletadas} completadas · {item.totalPendientes} pendientes · {item.totalTareas} tarea(s)
              </p>
            </div>
            <div className="sm:w-52">
              <ProgressBar value={item.porcentajeCumplimiento} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingStudents({ students }) {
  if (students.length === 0) {
    return <EmptyState title="Sin alumnos pendientes" description="No hay alumnos con pendientes acumulados." Icon={FiUsers} />;
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div key={student.idAlumno || student.id} className="content-card flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-black text-slate-900">{student.nombreCompleto}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {student.matricula || 'Sin matrícula'} · {student.email || 'Sin correo'}
            </p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{student.totalPendientes} pendiente(s)</span>
        </div>
      ))}
    </div>
  );
}

export default function TeacherTracking() {
  const [summary, setSummary] = useState(emptyTrackingSummary);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTracking = async () => {
      const result = await getTeacherTrackingSummary();

      if (!isMounted) return;

      setSummary(result.summary ?? emptyTrackingSummary);
      if (!result.ok) {
        setFeedback({
          type: 'error',
          message: result.status === 403 ? 'No tienes permiso para consultar el seguimiento docente.' : result.message,
        });
      }
      setLoading(false);
    };

    void loadTracking();

    return () => {
      isMounted = false;
    };
  }, []);

  const groupOptions = useMemo(() => {
    const groups = new Map();
    summary.tareasRecientes.forEach((task) => {
      if (task.idGrupo) groups.set(task.idGrupo, task.nombreGrupo);
    });
    return Array.from(groups.entries()).map(([id, name]) => ({ id, name }));
  }, [summary.tareasRecientes]);

  const subjectOptions = useMemo(() => {
    const subjects = new Map();
    summary.tareasRecientes.forEach((task) => {
      if (task.idMateria) subjects.set(task.idMateria, task.materiaNombre);
    });
    return Array.from(subjects.entries()).map(([id, name]) => ({ id, name }));
  }, [summary.tareasRecientes]);

  const filteredTasks = useMemo(
    () =>
      summary.tareasRecientes.filter((task) => {
        const matchesSearch = !filters.search || normalizeText(task.titulo).includes(normalizeText(filters.search));
        const matchesGroup = filters.group === 'all' || String(task.idGrupo) === filters.group;
        const matchesSubject = filters.subject === 'all' || String(task.idMateria) === filters.subject;
        const matchesPriority = filters.priority === 'all' || task.prioridad === filters.priority;
        const matchesCompliance =
          filters.compliance === 'all' ||
          (filters.compliance === 'bajo' && task.porcentajeCumplimiento < 50) ||
          (filters.compliance === 'medio' && task.porcentajeCumplimiento >= 50 && task.porcentajeCumplimiento < 80) ||
          (filters.compliance === 'alto' && task.porcentajeCumplimiento >= 80) ||
          (filters.compliance === 'sin-entregas' && task.totalEntregas === 0);

        return matchesSearch && matchesGroup && matchesSubject && matchesPriority && matchesCompliance;
      }),
    [filters, summary.tareasRecientes],
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <MainLayout title="Seguimiento académico" subtitle="Consulta el avance de las tareas publicadas y el cumplimiento de tus grupos.">
      <PageHero
        eyebrow="Seguimiento docente"
        title="Seguimiento académico"
        description="Consulta el avance de las tareas publicadas y el cumplimiento de tus grupos."
        actions={
          <Link to="/docente/tareas" className="secondary-btn">
            <FiClipboard className="text-base" />
            Tareas asignadas
          </Link>
        }
        stats={[
          {
            label: 'Cumplimiento',
            value: `${summary.porcentajeCumplimientoGeneral}%`,
            helper: 'Promedio general.',
            tone: 'primary',
            Icon: FiActivity,
          },
          { label: 'Pendientes', value: summary.totalEntregasPendientes, helper: 'Entregas por atender.', Icon: FiAlertTriangle },
          { label: 'Completadas', value: summary.totalEntregasCompletadas, helper: 'Marcadas por alumnos.', Icon: FiTrendingUp },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando seguimiento académico..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && summary.totalTareasPublicadas === 0 ? (
        <EmptyState
          title="Aún no hay tareas publicadas."
          description="Cuando publiques tareas para tus grupos aparecerán aquí los indicadores de cumplimiento."
          action={
            <Link to="/docente/tareas/nueva" className="primary-btn">
              <FiClipboard className="text-base" />
              Crear tarea
            </Link>
          }
          Icon={FiClipboard}
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Tareas publicadas" value={summary.totalTareasPublicadas} helper="Actividades creadas." tone="blue" Icon={FiClipboard} />
            <StatCard
              title="Entregas generadas"
              value={summary.totalEntregasGeneradas}
              helper="Registros por alumno."
              tone="sky"
              Icon={FiUsers}
            />
            <StatCard
              title="Completadas"
              value={summary.totalEntregasCompletadas}
              helper="Finalizadas por alumnos."
              tone="indigo"
              Icon={FiTrendingUp}
            />
            <StatCard
              title="Pendientes"
              value={summary.totalEntregasPendientes}
              helper="Sin completar."
              tone="rose"
              Icon={FiAlertTriangle}
            />
            <StatCard
              title="Cumplimiento"
              value={`${summary.porcentajeCumplimientoGeneral}%`}
              helper="Avance total."
              tone="blue"
              Icon={FiActivity}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow={`${summary.tareasConBajoCumplimiento.length} tarea(s)`}
              title="Tareas con bajo cumplimiento"
              description="Actividades activas con menos de 50% de avance."
              Icon={FiAlertTriangle}
            >
              <TaskList
                tasks={summary.tareasConBajoCumplimiento}
                emptyTitle="No hay tareas con bajo avance"
                emptyDescription="Las tareas activas superan el umbral mínimo de cumplimiento."
              />
            </SectionCard>

            <SectionCard
              eyebrow={`${summary.alumnosConMasPendientes.length} alumno(s)`}
              title="Alumnos con más pendientes"
              description="Alumnos con mayor cantidad de entregas pendientes."
              Icon={FiUsers}
            >
              <PendingStudents students={summary.alumnosConMasPendientes} />
            </SectionCard>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <SectionCard title="Cumplimiento por grupo" Icon={FiUsers}>
              <BucketList items={summary.resumenPorGrupo} type="grupo" />
            </SectionCard>

            <SectionCard title="Cumplimiento por materia" Icon={FiBookOpen}>
              <BucketList items={summary.resumenPorMateria} type="materia" />
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              eyebrow={`${filteredTasks.length} resultado(s)`}
              title="Tareas recientes"
              description="Filtra por grupo, materia, prioridad, cumplimiento o título."
              Icon={FiClipboard}
            >
              <div className="mb-5 grid gap-3 lg:grid-cols-[1.3fr_repeat(4,1fr)_auto]">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Búsqueda</span>
                  <div className="relative">
                    <FiSearch className="pointer-events-none absolute left-3 top-[calc(50%+0.25rem)] -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      className="field-control pl-10"
                      placeholder="Buscar por título"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Grupo</span>
                  <select name="group" value={filters.group} onChange={handleFilterChange} className="field-control">
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
                  <select name="subject" value={filters.subject} onChange={handleFilterChange} className="field-control">
                    <option value="all">Todas</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Prioridad</span>
                  <select name="priority" value={filters.priority} onChange={handleFilterChange} className="field-control">
                    <option value="all">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Cumplimiento</span>
                  <select name="compliance" value={filters.compliance} onChange={handleFilterChange} className="field-control">
                    <option value="all">Todos</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="sin-entregas">Sin entregas</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button type="button" onClick={() => setFilters(emptyFilters)} className="secondary-btn w-full">
                    Limpiar
                  </button>
                </div>
              </div>

              <TaskList
                tasks={filteredTasks}
                emptyTitle="No hay alumnos con ese filtro."
                emptyDescription="Ajusta los filtros para consultar otras tareas publicadas."
              />
            </SectionCard>
          </section>
        </>
      )}
    </MainLayout>
  );
}
