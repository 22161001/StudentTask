import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiPlusCircle } from 'react-icons/fi';
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

const priorityStyles = {
  alta: 'bg-blue-50 text-blue-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

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

  const todayKey = getTodayKey();
  const nextWeekKey = getUpcomingLimitKey(7);
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  const pendingTasks = tasks.filter((task) => task.estado === 'pendiente');
  const completedTasks = tasks.filter((task) => task.estado === 'completada');
  const upcomingTasks = pendingTasks
    .filter((task) => task.fechaEntrega >= todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 5);
  const overdueTasks = pendingTasks
    .filter((task) => task.fechaEntrega < todayKey)
    .sort((taskA, taskB) => compareByDueDate(taskA, taskB))
    .slice(0, 5);
  const nextDeliveries = pendingTasks.filter((task) => task.fechaEntrega >= todayKey && task.fechaEntrega <= nextWeekKey);
  const welcomeName = session?.nombre ?? 'Estudiante';

  const prioritySummary = ['alta', 'media', 'baja'].map((priority) => ({
    priority,
    total: pendingTasks.filter((task) => task.prioridad === priority).length,
  }));

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Tu panel personal de seguimiento academico con acceso directo a materias, tareas y entregas proximas."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div>
            <span className="soft-chip soft-chip--cool">Bienvenida academica</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 lg:text-[2.35rem]">
              {welcomeName}, este es tu avance real del periodo.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Revisa tareas pendientes, entregas cercanas y la carga actual de tus materias sin entrar a modulos que no te corresponden.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tareas" className="primary-btn inline-flex items-center gap-2">
                <FiPlusCircle className="text-base" />
                Agregar tarea
              </Link>
              <Link to="/materias" className="secondary-btn inline-flex items-center gap-2">
                <FiBookOpen className="text-base" />
                Agregar materia
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 p-5 text-white shadow-[0_20px_48px_rgba(37,99,235,0.24)]">
            <p className="text-xs uppercase tracking-[0.28em] text-white/[0.45]">Resumen rapido</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Pendientes</p>
                <p className="mt-2 text-3xl font-black">{pendingTasks.length}</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Completadas</p>
                <p className="mt-2 text-3xl font-black">{completedTasks.length}</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Materias</p>
                <p className="mt-2 text-3xl font-black">{subjects.length}</p>
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
          helper="Pendientes por atender en tu panel personal."
          tone="blue"
          Icon={FiClock}
        />
        <StatCard
          title="Tareas completadas"
          value={completedTasks.length}
          helper="Entregas marcadas como resueltas en este periodo."
          tone="sky"
          Icon={FiCheckCircle}
        />
        <StatCard
          title="Materias registradas"
          value={subjects.length}
          helper="Asignaturas activas guardadas en tu espacio."
          tone="indigo"
          Icon={FiBookOpen}
        />
        <StatCard
          title="Entregas proximas"
          value={nextDeliveries.length}
          helper="Tareas con fecha dentro de los proximos 7 dias."
          tone="rose"
          Icon={FiCalendar}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          eyebrow="Hoy y proximas"
          title="Tus siguientes entregas"
          description="Lista priorizada con las tareas que siguen en tu calendario academico."
          Icon={FiCalendar}
        >
          {upcomingTasks.length === 0 ? (
            <EmptyState
              title="No tienes entregas pendientes por ahora"
              description="Cuando registres nuevas tareas apareceran aqui con prioridad por fecha."
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

                return (
                  <article
                    key={task.id}
                    className="rounded-[24px] border border-white/70 bg-white/[0.76] p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`rounded-full px-3 py-1.5 font-semibold ${priorityStyles[task.prioridad]}`}>
                            Prioridad: {formatPriorityLabel(task.prioridad)}
                          </span>
                          {task.recordatorio ? (
                            <span className="rounded-full bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700">
                              Recordatorio
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{task.titulo}</h3>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          {subjectMap.get(task.materiaId)?.nombre ?? 'Sin materia'}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || 'Sin descripcion todavia.'}</p>
                        <p className="mt-4 text-sm font-semibold text-slate-500">Entrega: {formatShortDate(task.fechaEntrega)}</p>
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
            eyebrow="Atrasadas"
            title="Tareas vencidas"
            description="Lo que conviene resolver primero para recuperar ritmo academico."
            Icon={FiAlertCircle}
          >
            {overdueTasks.length === 0 ? (
              <EmptyState
                title="No hay tareas atrasadas"
                description="Vas bien. Tus entregas pendientes siguen dentro de tiempo."
                Icon={FiCheckCircle}
              />
            ) : (
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-4 shadow-[0_12px_28px_rgba(244,63,94,0.06)]"
                  >
                    <p className="font-semibold text-slate-900">{task.titulo}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {subjectMap.get(task.materiaId)?.nombre ?? 'Sin materia'} | {formatShortDate(task.fechaEntrega)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Prioridades"
            title="Resumen por prioridad"
            description="Distribucion de tareas pendientes para decidir donde concentrarte."
            Icon={FiClock}
          >
            <div className="space-y-4">
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
        </div>
      </section>
    </MainLayout>
  );
}
