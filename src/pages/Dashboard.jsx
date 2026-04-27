import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
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
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { getSession } from '../services/authService';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import {
  compareByDueDate,
  formatPriorityLabel,
  formatShortDate,
  getDateParts,
  getTodayKey,
  getUpcomingLimitKey,
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
];

export default function Dashboard() {
  const [session] = useState(getSession());
  const [subjects, setSubjects] = useState(getSubjects());
  const [tasks, setTasks] = useState(getTasks());

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [subjectsResult, tasksResult] = await Promise.all([syncSubjects(), syncTasks()]);

      if (!isMounted) {
        return;
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
      }
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

  const upcomingTasks = pendingTasks
    .filter((task) => task.fechaEntrega >= todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 6);
  const overdueTasks = pendingTasks
    .filter((task) => task.fechaEntrega < todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 5);
  const nextDeliveries = pendingTasks.filter((task) => task.fechaEntrega >= todayKey && task.fechaEntrega <= nextWeekKey);
  const reminderCards = getReminderCards(tasks);
  const reminders = getReminderInsights(tasks);
  const weeklySummary = getWeeklySummary(tasks);
  const welcomeName = session?.nombre ?? 'Estudiante';

  const prioritySummary = ['alta', 'media', 'baja'].map((priority) => ({
    priority,
    total: pendingTasks.filter((task) => task.prioridad === priority).length,
  }));

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Tu panel operativo de tareas personales, actividades asignadas, recordatorios y agenda inmediata."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <span className="soft-chip soft-chip--cool">Bienvenida academica</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 lg:text-[2.35rem]">
              {welcomeName}, tienes {pendingTasks.length} tarea(s) pendiente(s) para organizar.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Revisa entregas propias y asignadas por docentes, con recordatorios internos para decidir que atender primero.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {quickLinks.map(({ to, label, Icon, primary }) => (
                <Link key={to} to={to} className={`${primary ? 'primary-btn' : 'secondary-btn'} inline-flex items-center gap-2`}>
                  <Icon className="text-base" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 p-5 text-white shadow-[0_20px_48px_rgba(37,99,235,0.24)]">
            <p className="text-xs uppercase tracking-[0.28em] text-white/[0.45]">Resumen rapido</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Personales</p>
                <p className="mt-2 text-3xl font-black">{pendingPersonal.length}</p>
                <p className="mt-1 text-xs text-white/60">Pendientes propias</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Asignadas</p>
                <p className="mt-2 text-3xl font-black">{pendingAssigned.length}</p>
                <p className="mt-1 text-xs text-white/60">Pendientes docentes</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Completadas</p>
                <p className="mt-2 text-3xl font-black">{completedTasks.length}</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Proximas 7 dias</p>
                <p className="mt-2 text-3xl font-black">{nextDeliveries.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tareas pendientes"
          value={pendingTasks.length}
          helper="Personales y asignadas que aun requieren accion."
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
          title="Entregas proximas"
          value={nextDeliveries.length}
          helper="Pendientes con fecha dentro de 7 dias."
          tone="rose"
          Icon={FiCalendar}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          eyebrow="Hoy y proximas"
          title="Proximas entregas"
          description="Lista mezclada de tareas personales y asignadas, ordenada por fecha limite."
          Icon={FiCalendar}
        >
          {upcomingTasks.length === 0 ? (
            <EmptyState
              title="No tienes entregas pendientes por ahora"
              description="Cuando registres o recibas nuevas tareas apareceran aqui con prioridad por fecha."
              action={
                <Link to="/tareas" className="primary-btn">
                  Crear tarea
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {upcomingTasks.map((task) => {
                const dateParts = getDateParts(task.fechaEntrega);
                const deadlineMeta = getTaskDeadlineMeta(task);

                return (
                  <article
                    key={task.id}
                    className="rounded-[24px] border border-white/70 bg-white/[0.76] p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
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
                        <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || task.instrucciones || 'Sin descripcion todavia.'}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
                          <span>Entrega: {formatShortDate(task.fechaEntrega)}</span>
                          {task.tipo === 'asignada' ? <span>Docente: {task.docenteNombre || 'Sin docente'}</span> : null}
                          <Link to={getTaskPath(task)} className="text-blue-700 hover:text-blue-900">
                            Abrir modulo
                          </Link>
                        </div>
                      </div>

                      <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-center text-white shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                        <p className="text-3xl font-black leading-none">{dateParts.day}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/[0.52]">{dateParts.month}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Recordatorios"
            title="Alertas internas"
            description="Senales operativas dentro del sistema, sin notificaciones externas."
            Icon={FiBell}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {reminderCards.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[22px] border border-white/70 bg-white/[0.76] px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{item.value}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.helper}</p>
                </div>
              ))}
            </div>

            {reminders.highPriorityUpcoming.length > 0 ? (
              <div className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50/70 px-4 py-4">
                <p className="text-sm font-bold text-blue-800">Alta prioridad proxima</p>
                <p className="mt-2 text-sm leading-6 text-blue-700">
                  {reminders.highPriorityUpcoming[0].titulo} vence {formatShortDate(reminders.highPriorityUpcoming[0].fechaEntrega)}.
                </p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            eyebrow="Atrasadas"
            title="Tareas vencidas"
            description="Lo que conviene resolver primero para recuperar ritmo academico."
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
                    key={task.id}
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
          description="Separacion operativa para saber que puedes editar y que viene desde docentes."
          Icon={FiClipboard}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/70 bg-white/[0.78] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Personales</p>
              <p className="mt-3 text-4xl font-black text-slate-900">{personalTasks.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pendingPersonal.length} pendientes con CRUD completo.</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/[0.78] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Asignadas</p>
              <p className="mt-3 text-4xl font-black text-slate-900">{assignedTasks.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pendingAssigned.length} pendientes con estado y nota personal.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Semana"
          title="Mini resumen semanal"
          description="Carga pendiente para los siguientes siete dias."
          Icon={FiClock}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weeklySummary.map((day) => (
              <div key={day.key} className="rounded-[20px] border border-white/70 bg-white/[0.78] p-4">
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
          title="Distribucion de pendientes"
          description="Lectura rapida de prioridad para decidir el siguiente bloque de trabajo."
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
