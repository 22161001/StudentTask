import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiFilter } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import EmptyState from '../components/EmptyState';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import {
  compareByDueDate,
  formatLongDate,
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
  formatTaskTypeLabel,
  formatWeekday,
  getMonthGridDays,
  getPeriodLabel,
  getTodayKey,
  getWeekDays,
  moveDateByPeriod,
  normalizeDateKey,
} from '../utils/date';
import {
  getReminderInsights,
  getSubjectName,
  getTaskDeadlineMeta,
  getTaskPath,
  priorityStyles,
  statusStyles,
  typeStyles,
} from '../utils/taskInsights';

const initialFilters = {
  materiaId: 'todas',
  tipo: 'todos',
  estado: 'todos',
  prioridad: 'todas',
};

const viewModes = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
];

const groupTasksByDate = (tasks) =>
  tasks.reduce((groups, task) => {
    const dateKey = normalizeDateKey(task.fechaEntrega);
    if (!dateKey) {
      return groups;
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }

    groups.get(dateKey).push(task);
    return groups;
  }, new Map());

function AgendaTaskCard({ task, subjectsById, compact = false }) {
  const deadlineMeta = getTaskDeadlineMeta(task);

  return (
    <article
      className={`content-card interactive-card p-4 ${
        deadlineMeta.key === 'vencida' ? '!border-rose-100 ring-1 ring-rose-100' : ''
      }`}
    >
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 font-semibold ${deadlineMeta.className}`}>{deadlineMeta.label}</span>
        <span className={`rounded-full px-3 py-1 font-semibold ${typeStyles[task.tipo]}`}>{formatTaskTypeLabel(task.tipo)}</span>
        {!compact ? (
          <>
            <span className={`rounded-full px-3 py-1 font-semibold ${priorityStyles[task.prioridad]}`}>
              {formatPriorityLabel(task.prioridad)}
            </span>
            <span className={`rounded-full px-3 py-1 font-semibold ${statusStyles[task.estado]}`}>
              {formatStateLabel(task.estado)}
            </span>
          </>
        ) : null}
      </div>

      <h3 className={`${compact ? 'mt-3 text-sm' : 'mt-4 text-lg'} font-bold leading-snug text-slate-900`}>{task.titulo}</h3>
      <p className="mt-2 text-sm font-medium text-slate-500">{getSubjectName(subjectsById, task)}</p>
      {!compact ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || task.instrucciones || 'Sin descripción.'}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
        <span>{formatShortDate(task.fechaEntrega)}</span>
        {task.tipo === 'asignada' ? <span>{task.docenteNombre || 'Docente pendiente'}</span> : null}
        <Link to={getTaskPath(task)} className="text-blue-700 hover:text-blue-900">
          Abrir
        </Link>
      </div>
    </article>
  );
}

export default function Agenda() {
  const [tasks, setTasks] = useState(getTasks());
  const [subjects, setSubjects] = useState(getSubjects());
  const [mode, setMode] = useState('semana');
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [tasksResult, subjectsResult] = await Promise.all([syncTasks(), syncSubjects()]);

      if (!isMounted) {
        return;
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => (filters.materiaId === 'todas' ? true : task.materiaId === Number(filters.materiaId)))
        .filter((task) => (filters.tipo === 'todos' ? true : task.tipo === filters.tipo))
        .filter((task) => (filters.estado === 'todos' ? true : task.estado === filters.estado))
        .filter((task) => (filters.prioridad === 'todas' ? true : task.prioridad === filters.prioridad))
        .sort((taskA, taskB) => compareByDueDate(taskA, taskB)),
    [filters, tasks],
  );

  const visibleDays = useMemo(() => {
    if (mode === 'mes') {
      return getMonthGridDays(selectedDate);
    }

    if (mode === 'semana') {
      return getWeekDays(selectedDate);
    }

    return [
      {
        key: selectedDate,
        day: selectedDate.split('-')[2],
        weekday: formatWeekday(selectedDate),
        isToday: selectedDate === getTodayKey(),
        isCurrentMonth: true,
      },
    ];
  }, [mode, selectedDate]);

  const tasksByDate = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);
  const visibleDateKeys = new Set(visibleDays.map((day) => day.key));
  const periodTasks = filteredTasks.filter((task) => visibleDateKeys.has(normalizeDateKey(task.fechaEntrega)));
  const reminders = getReminderInsights(filteredTasks);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const movePeriod = (direction) => {
    setSelectedDate((currentDate) => moveDateByPeriod(currentDate, mode, direction));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <MainLayout
      title="Agenda"
      subtitle="Revisa tus entregas por día, semana o mes."
    >
      <PageHero
        eyebrow="Agenda académica"
        title="Visualiza tus entregas y planea mejor tu semana."
        description="Alterna entre vistas para encontrar lo que toca resolver."
        stats={[
          { label: 'Periodo', value: getPeriodLabel(selectedDate, mode), helper: `Vista activa: ${viewModes.find((viewMode) => viewMode.value === mode)?.label ?? mode}.`, tone: 'primary', Icon: FiCalendar },
          { label: 'En vista', value: periodTasks.length, helper: 'Tareas dentro del periodo actual.', Icon: FiClock },
          { label: 'Vencidas', value: reminders.overdue.length, helper: 'Pendientes fuera de fecha.', tone: reminders.overdue.length ? 'danger' : 'neutral', Icon: FiAlertCircle },
        ]}
      />

      <SectionCard
        eyebrow="Controles"
        title="Vista y filtros de agenda"
        description="Muévete entre periodos y filtra por materia, tipo, estado o prioridad."
        Icon={FiFilter}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {viewModes.map((viewMode) => (
              <button
                key={viewMode.value}
                type="button"
                onClick={() => setMode(viewMode.value)}
                className={`rounded-[13px] px-3.5 py-2 text-sm font-bold transition ${
                  mode === viewMode.value
                    ? 'bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)]'
                    : 'border border-white/70 bg-white/80 text-slate-600 hover:bg-white'
                }`}
              >
                {viewMode.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => movePeriod(-1)} className="secondary-btn text-sm">
              <FiChevronLeft className="text-base" />
              Anterior
            </button>
            <button type="button" onClick={() => setSelectedDate(getTodayKey())} className="secondary-btn text-sm">
              Hoy
            </button>
            <button type="button" onClick={() => movePeriod(1)} className="secondary-btn text-sm">
              Siguiente
              <FiChevronRight className="text-base" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="text-sm font-medium text-slate-600">Materia</label>
            <select name="materiaId" value={filters.materiaId} onChange={handleFilterChange} className="field-control">
              <option value="todas">Todas</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Tipo</label>
            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todos</option>
              <option value="personal">Personal</option>
              <option value="asignada">Asignada</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Estado</label>
            <select name="estado" value={filters.estado} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Prioridad</label>
            <select name="prioridad" value={filters.prioridad} onChange={handleFilterChange} className="field-control">
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="flex items-end">
            <button type="button" onClick={resetFilters} className="secondary-btn w-full">
              Limpiar filtros
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard
          eyebrow={viewModes.find((viewMode) => viewMode.value === mode)?.label ?? mode}
          title={getPeriodLabel(selectedDate, mode)}
          description="Tareas agrupadas por fecha de entrega."
          Icon={FiCalendar}
        >
          {mode === 'dia' ? (
            <div>
              <div className="content-card mb-5 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">{formatWeekday(selectedDate)}</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">{formatLongDate(selectedDate)}</h3>
              </div>

              {(tasksByDate.get(selectedDate) ?? []).length === 0 ? (
                <EmptyState
                  title="No hay tareas en este día"
                  description="Cambia de fecha o ajusta los filtros."
                  Icon={FiCalendar}
                />
              ) : (
                <div className="space-y-4">
                  {(tasksByDate.get(selectedDate) ?? []).map((task) => (
                    <AgendaTaskCard key={`${task.tipo}-${task.id}`} task={task} subjectsById={subjectMap} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={`grid gap-3 ${mode === 'semana' ? 'md:grid-cols-2 xl:grid-cols-7' : 'sm:grid-cols-2 xl:grid-cols-7'}`}>
              {visibleDays.map((day) => {
                const dayTasks = (tasksByDate.get(day.key) ?? []).sort((taskA, taskB) => compareByDueDate(taskA, taskB));

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.key)}
                    className={`min-h-[190px] rounded-[22px] border p-3 text-left transition hover:-translate-y-0.5 ${
                      day.key === selectedDate
                        ? 'border-blue-200 bg-blue-50/80 ring-2 ring-blue-100'
                        : 'border-slate-200/70 bg-white/[0.85]'
                    } ${day.isCurrentMonth === false ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{day.weekday}</p>
                        <p className={`mt-1 text-2xl font-black ${day.isToday ? 'text-blue-700' : 'text-slate-900'}`}>{day.day}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{dayTasks.length}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {dayTasks.slice(0, mode === 'mes' ? 3 : 4).map((task) => {
                        const deadlineMeta = getTaskDeadlineMeta(task);
                        return (
                          <div
                            key={`${task.tipo}-${task.id}`}
                            className={`rounded-[14px] border px-3 py-2 text-xs font-semibold ${
                              deadlineMeta.key === 'vencida'
                                ? 'border-rose-100 bg-rose-50 text-rose-700'
                                : task.tipo === 'asignada'
                                  ? 'border-cyan-100 bg-cyan-50 text-cyan-700'
                                  : 'border-indigo-100 bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            <p className="line-clamp-2">{task.titulo}</p>
                          </div>
                        );
                      })}
                      {dayTasks.length > (mode === 'mes' ? 3 : 4) ? (
                        <p className="text-xs font-semibold text-slate-500">+{dayTasks.length - (mode === 'mes' ? 3 : 4)} más</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Fecha activa"
            title={formatLongDate(selectedDate)}
            description="Tareas del día seleccionado."
            Icon={FiClock}
          >
            {(tasksByDate.get(selectedDate) ?? []).length === 0 ? (
              <EmptyState title="Día sin tareas" description="Selecciona otra fecha para ver entregas." Icon={FiCalendar} />
            ) : (
              <div className="space-y-3">
                {(tasksByDate.get(selectedDate) ?? []).map((task) => (
                  <AgendaTaskCard key={`${task.tipo}-${task.id}`} task={task} subjectsById={subjectMap} compact />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Recordatorios"
            title="Señales de agenda"
            description="Vencimientos próximos según tus filtros."
            Icon={FiAlertCircle}
          >
            <div className="space-y-3">
              {[
                { label: 'Vencen hoy', total: reminders.dueToday.length },
                { label: 'Vencen mañana', total: reminders.dueTomorrow.length },
                { label: 'Vencidas', total: reminders.overdue.length },
                { label: 'Alta prioridad próxima', total: reminders.highPriorityUpcoming.length },
                { label: 'Asignadas sin revisar', total: reminders.assignedUnreviewed.length },
              ].map((item) => (
                <div key={item.label} className="content-card flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">{item.total}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      {periodTasks.length > 0 ? (
        <section className="mt-6">
          <SectionCard
            eyebrow={`${periodTasks.length} tarea(s)`}
            title="Listado del periodo"
            description="Acceso rápido a las tareas de este periodo."
            Icon={FiCalendar}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {periodTasks.map((task) => (
                <AgendaTaskCard key={`${task.tipo}-${task.id}`} task={task} subjectsById={subjectMap} compact />
              ))}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </MainLayout>
  );
}
