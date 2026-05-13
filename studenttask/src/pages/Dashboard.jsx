import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiActivity,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiPlusCircle,
} from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import EmptyState from '../components/EmptyState';
import FeedbackBanner from '../components/FeedbackBanner';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { getSession } from '../services/authService';
import { getDashboardAnalytics } from '../services/analyticsService';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import {
  compareByDueDate,
  formatPriorityLabel,
  formatShortDate,
  getDateParts,
  getTodayKey,
  getUpcomingLimitKey,
  normalizeDateKey,
} from '../utils/date';
import {
  getReminderCards,
  getReminderInsights,
  getSubjectName,
  getTaskDeadlineMeta,
  getTaskPath,
  getWeeklySummary,
  priorityStyles,
  typeStyles,
} from '../utils/taskInsights';

const quickLinks = [
  { to: '/tareas', label: 'Agregar tarea', Icon: FiPlusCircle, primary: true },
  { to: '/materias', label: 'Agregar materia', Icon: FiBookOpen },
  { to: '/agenda', label: 'Ver agenda', Icon: FiCalendar },
  { to: '/tareas-asignadas', label: 'Tareas asignadas', Icon: FiClipboard },
  { to: '/reportes', label: 'Reportes', Icon: FiBarChart2 },
  { to: '/seguimiento', label: 'Seguimiento', Icon: FiActivity },
];

const getTaskDueKey = (task) => normalizeDateKey(task?.fechaEntrega);

export default function Dashboard() {
  const [session] = useState(getSession());
  const [subjects, setSubjects] = useState(getSubjects());
  const [tasks, setTasks] = useState(getTasks());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [subjectsResult, tasksResult] = await Promise.all([syncSubjects(), syncTasks()]);

      if (!isMounted) {
        return;
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
      } else {
        setFeedback({ type: 'error', message: subjectsResult.message || 'No se pudieron cargar las materias.' });
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
        if (tasksResult.message) {
          setFeedback({ type: tasksResult.fallback ? 'info' : 'success', message: tasksResult.message });
        }
      } else {
        setFeedback({ type: 'error', message: tasksResult.message || 'No se pudieron cargar tus tareas.' });
      }

      setLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const todayKey = getTodayKey();
  const nextWeekKey = getUpcomingLimitKey(7);

  const pendingTasks = tasks.filter((task) => task.estado === 'pendiente');
  const completedTasks = tasks.filter((task) => task.estado === 'completada');
  const personalTasks = tasks.filter((task) => task.tipo === 'personal');
  const assignedTasks = tasks.filter((task) => task.tipo === 'asignada');
  const pendingPersonal = personalTasks.filter((task) => task.estado === 'pendiente');
  const pendingAssigned = assignedTasks.filter((task) => task.estado === 'pendiente');
  const pendingTasksWithDueDate = pendingTasks.filter((task) => getTaskDueKey(task));
  const pendingTasksWithoutDueDate = pendingTasks.filter((task) => !getTaskDueKey(task));

  const upcomingTasks = pendingTasksWithDueDate
    .filter((task) => getTaskDueKey(task) >= todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 6);
  const overdueTasks = pendingTasksWithDueDate
    .filter((task) => getTaskDueKey(task) < todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 5);
  const nextDeliveries = pendingTasksWithDueDate.filter((task) => {
    const dueKey = getTaskDueKey(task);
    return dueKey >= todayKey && dueKey <= nextWeekKey;
  });
  const reminderCards = getReminderCards(tasks);
  const reminders = getReminderInsights(tasks);
  const weeklySummary = getWeeklySummary(tasks);
  const dashboardAnalytics = useMemo(() => getDashboardAnalytics(tasks, subjects), [subjects, tasks]);
  const welcomeName = session?.nombre ?? 'Estudiante';

  const prioritySummary = ['alta', 'media', 'baja'].map((priority) => ({
    priority,
    total: pendingTasks.filter((task) => task.prioridad === priority).length,
  }));

  return (
    <MainLayout
      title="Inicio"
      subtitle="Organiza tus actividades y mantén al día tus entregas."
    >
      <PageHero
        eyebrow="Bienvenida académica"
        title={`${welcomeName}, tienes ${pendingTasks.length} pendientes por atender.`}
        description="Revisa próximas entregas, prioridades y avances desde un solo lugar."
        actions={quickLinks.map(({ to, label, Icon, primary }) => (
          <Link key={to} to={to} className={primary ? 'primary-btn' : 'secondary-btn'}>
            <Icon className="text-base" />
            {label}
          </Link>
        ))}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Personales', value: pendingPersonal.length, helper: 'Pendientes propias' },
            { label: 'Asignadas', value: pendingAssigned.length, helper: 'Asignadas por docentes' },
            { label: 'Cumplimiento', value: `${dashboardAnalytics.overallMetrics.completionRate}%`, helper: `${completedTasks.length} completadas` },
            { label: 'Puntualidad', value: `${dashboardAnalytics.overallMetrics.punctualityRate}%`, helper: `${nextDeliveries.length} próximas` },
          ].map((metric, index) => (
            <div key={metric.label} className={`hero-metric ${index === 0 ? 'hero-metric--featured' : ''}`}>
              <p className={`text-xs font-black uppercase tracking-[0.18em] ${index === 0 ? 'text-white/50' : 'text-slate-400'}`}>
                {metric.label}
              </p>
              <p className={`mt-2.5 text-3xl font-black tracking-tight ${index === 0 ? 'text-white' : 'text-slate-900'}`}>{metric.value}</p>
              <p className={`mt-1.5 text-sm ${index === 0 ? 'text-white/70' : 'text-slate-600'}`}>{metric.helper}</p>
            </div>
          ))}
        </div>

        {dashboardAnalytics.mainAlert ? (
          <Link
            to={dashboardAnalytics.mainAlert.to ?? '/seguimiento'}
            className="hero-metric mt-3 block border-blue-100 bg-blue-50/80 transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Alerta principal</p>
            <p className="mt-2 text-sm font-black text-slate-900">{dashboardAnalytics.mainAlert.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{dashboardAnalytics.mainAlert.description}</p>
          </Link>
        ) : null}
      </PageHero>

      {loading ? (
        <FeedbackBanner type="info" message="Cargando datos del dashboard..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tareas pendientes"
          value={pendingTasks.length}
          helper="Personales y asignadas por resolver."
          tone="blue"
          Icon={FiClock}
        />
        <StatCard
          title="Tareas completadas"
          value={completedTasks.length}
          helper="Entregas marcadas como resueltas."
          tone="sky"
          Icon={FiCheckCircle}
        />
        <StatCard
          title="Materias registradas"
          value={subjects.length}
          helper="Asignaturas activas en tu espacio."
          tone="indigo"
          Icon={FiBookOpen}
        />
        <StatCard
          title="Entregas próximas"
          value={nextDeliveries.length}
          helper="Pendientes de los próximos 7 días."
          tone="rose"
          Icon={FiCalendar}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          eyebrow="Hoy y próximas"
          title="Próximas entregas"
          description="Pendientes ordenados por fecha de entrega."
          Icon={FiCalendar}
        >
          {upcomingTasks.length === 0 ? (
            <>
              <EmptyState
                title="No tienes entregas pendientes por ahora"
                description="Crea una nueva actividad para comenzar."
                action={
                  <Link to="/tareas" className="primary-btn">
                    Crear tarea
                  </Link>
                }
              />
              {pendingTasksWithoutDueDate.length > 0 ? (
                <Link to="/tareas" className="content-card mt-4 block border-amber-100 bg-amber-50/70 px-4 py-4 text-sm font-semibold text-amber-800">
                  {pendingTasksWithoutDueDate.length} pendiente(s) sin fecha de entrega.
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-4">
                {upcomingTasks.map((task) => {
                  const dateParts = getDateParts(task.fechaEntrega);
                  const deadlineMeta = getTaskDeadlineMeta(task);

                  return (
                    <article
                      key={`${task.tipo}-${task.id}`}
                      className="content-card interactive-card p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full px-3 py-1.5 font-semibold ${deadlineMeta.className}`}>
                              {deadlineMeta.label}
                            </span>
                            <span className={`rounded-full px-3 py-1.5 font-semibold ${priorityStyles[task.prioridad]}`}>
                              Prioridad: {formatPriorityLabel(task.prioridad)}
                            </span>
                            <span className={`rounded-full px-3 py-1.5 font-semibold ${typeStyles[task.tipo]}`}>
                              {task.tipo === 'asignada' ? 'Asignada' : 'Personal'}
                            </span>
                          </div>

                          <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{task.titulo}</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">{getSubjectName(subjectMap, task)}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || task.instrucciones || 'Sin descripción.'}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
                            <span>Entrega: {formatShortDate(task.fechaEntrega)}</span>
                            {task.tipo === 'asignada' ? <span>Docente: {task.docenteNombre || 'Sin docente'}</span> : null}
                            <Link to={getTaskPath(task)} className="text-blue-700 hover:text-blue-900">
                              Abrir
                            </Link>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                          <p className="text-3xl font-black leading-none">{dateParts.day}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/[0.52]">{dateParts.month}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {pendingTasksWithoutDueDate.length > 0 ? (
                <Link to="/tareas" className="content-card mt-4 block border-amber-100 bg-amber-50/70 px-4 py-4 text-sm font-semibold text-amber-800">
                  {pendingTasksWithoutDueDate.length} pendiente(s) sin fecha de entrega.
                </Link>
              ) : null}
            </>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Recordatorios"
            title="Alertas internas"
            description="Señales útiles para priorizar tu semana."
            Icon={FiBell}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {reminderCards.map((item) => (
                <div
                  key={item.key}
                  className="content-card interactive-card px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{item.value}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.helper}</p>
                </div>
              ))}
            </div>

            {reminders.highPriorityUpcoming.length > 0 ? (
              <div className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50/70 px-4 py-4">
                <p className="text-sm font-bold text-blue-800">Alta prioridad próxima</p>
                <p className="mt-2 text-sm leading-6 text-blue-700">
                  {reminders.highPriorityUpcoming[0].titulo} vence {formatShortDate(reminders.highPriorityUpcoming[0].fechaEntrega)}.
                </p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            eyebrow="Atrasadas"
            title="Tareas vencidas"
            description="Pendientes que conviene resolver primero."
            Icon={FiAlertCircle}
          >
            {overdueTasks.length === 0 ? (
              <EmptyState
                title="No hay tareas atrasadas"
                description="Tus entregas pendientes siguen dentro de tiempo."
                Icon={FiCheckCircle}
              />
            ) : (
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <Link
                    key={`${task.tipo}-${task.id}`}
                    to={getTaskPath(task)}
                    className="block rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-4 shadow-[0_12px_28px_rgba(244,63,94,0.06)] transition hover:-translate-y-0.5"
                  >
                    <p className="font-semibold text-slate-900">{task.titulo}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {getSubjectName(subjectMap, task)} | {formatShortDate(task.fechaEntrega)} | {task.tipo === 'asignada' ? 'Asignada' : 'Personal'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          eyebrow="Resumen"
          title="Tareas personales vs asignadas"
          description="Distingue lo que creaste de lo asignado por docentes."
          Icon={FiClipboard}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Personales</p>
              <p className="mt-3 text-4xl font-black text-slate-900">{personalTasks.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pendingPersonal.length} pendientes propias.</p>
            </div>
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Asignadas</p>
              <p className="mt-3 text-4xl font-black text-slate-900">{assignedTasks.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pendingAssigned.length} pendientes asignadas.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Semana"
          title="Mini resumen semanal"
          description="Carga pendiente para los próximos siete días."
          Icon={FiClock}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weeklySummary.map((day) => (
              <div key={day.key} className="content-card p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{day.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{day.total}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {day.highPriority} alta | {day.assigned} asign.
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow="Prioridades"
          title="Distribución de pendientes"
          description="Prioridades para decidir tu siguiente bloque de estudio."
          Icon={FiClock}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {prioritySummary.map((item) => (
              <div key={item.priority}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{formatPriorityLabel(item.priority)}</span>
                  <span>{item.total}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      item.priority === 'alta'
                        ? 'bg-gradient-to-r from-blue-600 to-sky-500'
                        : item.priority === 'media'
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                          : 'bg-gradient-to-r from-slate-400 to-slate-300'
                    }`}
                    style={{ width: `${pendingTasks.length ? (item.total / pendingTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </MainLayout>
  );
}
