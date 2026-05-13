import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiClock,
  FiFilter,
  FiRepeat,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';
import ActivityTimeline from '../components/analytics/ActivityTimeline';
import AlertList from '../components/analytics/AlertList';
import BarList from '../components/analytics/BarList';
import FeedbackBanner from '../components/FeedbackBanner';
import ProgressMetric from '../components/analytics/ProgressMetric';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import MainLayout from '../layout/MainLayout';
import { getActivityHistory } from '../services/activityService';
import { getAcademicTracking } from '../services/analyticsService';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import { formatMonthTitle, formatShortDate } from '../utils/date';

const sortOptions = [
  { value: 'relativeLoad', label: 'Carga relativa' },
  { value: 'advanceRate', label: 'Avance' },
  { value: 'punctualityRate', label: 'Puntualidad' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'pending', label: 'Pendientes' },
];

const sortDirections = {
  desc: 'Mayor a menor',
  asc: 'Menor a mayor',
};

export default function AcademicTracking() {
  const [tasks, setTasks] = useState(getTasks());
  const [subjects, setSubjects] = useState(getSubjects());
  const [subjectFilter, setSubjectFilter] = useState('todas');
  const [sortKey, setSortKey] = useState('relativeLoad');
  const [sortDirection, setSortDirection] = useState('desc');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [tasksResult, subjectsResult] = await Promise.all([syncTasks(), syncSubjects()]);

      if (!isMounted) {
        return;
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
        if (tasksResult.message) {
          setFeedback({ type: tasksResult.fallback ? 'info' : 'success', message: tasksResult.message });
        }
      } else {
        setFeedback({ type: 'error', message: tasksResult.message || 'No se pudieron cargar tus tareas.' });
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
        if (!tasksResult.message && subjectsResult.message) {
          setFeedback({ type: subjectsResult.fallback ? 'info' : 'success', message: subjectsResult.message });
        }
      } else {
        setFeedback({ type: 'error', message: subjectsResult.message || 'No se pudieron cargar las materias.' });
      }

      setLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const tracking = useMemo(() => getAcademicTracking(tasks, subjects), [subjects, tasks]);
  const activities = useMemo(() => getActivityHistory(tasks, subjects, 10), [subjects, tasks]);

  const visibleSubjects = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    return tracking.subjectMetrics
      .filter((subject) => (subjectFilter === 'todas' ? true : subject.id === Number(subjectFilter)))
      .sort((subjectA, subjectB) => {
        const valueA = subjectA[sortKey] ?? 0;
        const valueB = subjectB[sortKey] ?? 0;

        if (valueA === valueB) {
          return subjectA.nombre.localeCompare(subjectB.nombre);
        }

        return (valueA - valueB) * direction;
      });
  }, [sortDirection, sortKey, subjectFilter, tracking.subjectMetrics]);

  const metrics = tracking.overallMetrics;
  const maxWeeklyTotal = Math.max(...tracking.weeklyPerformance.map((week) => week.total), 1);
  const maxMonthlyTotal = Math.max(...tracking.monthlyEvolution.map((month) => month.total), 1);
  const discipline = tracking.discipline;

  return (
    <MainLayout
      title="Seguimiento académico"
      subtitle="Monitorea tu progreso, constancia y carga académica."
    >
      <PageHero
        eyebrow="Seguimiento académico"
        title="Observa tu desempeño como una evolución."
        description="Revisa cumplimiento, puntualidad, carga y constancia semanal."
        stats={[
          { label: 'Disciplina', value: `${discipline.score}%`, helper: 'Índice compuesto de hábitos académicos.', tone: 'primary', Icon: FiShield },
          {
            label: 'Racha',
            value: tracking.streak.days,
            helper: tracking.streak.isActiveToday
              ? 'Activa hoy'
              : tracking.streak.latestCompletionKey
                ? `Última: ${formatShortDate(tracking.streak.latestCompletionKey)}`
                : 'Sin completadas',
            Icon: FiRepeat,
          },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando seguimiento académico..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressMetric label="Índice de cumplimiento" value={metrics.completionRate} helper="Completadas sobre el total." tone="blue" />
        <ProgressMetric label="Índice de puntualidad" value={metrics.punctualityRate} helper="Entregas cerradas a tiempo." tone="emerald" />
        <ProgressMetric label="Índice de disciplina" value={discipline.score} helper="Constancia y cumplimiento combinados." tone="indigo" />
        <StatCard title="Tareas ignoradas" value={metrics.ignored} helper="Vencidas y todavia pendientes." tone="rose" Icon={FiAlertTriangle} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Alertas"
          title="Señales de seguimiento"
          description="Alertas basadas en retrasos, carga y actividad reciente."
          Icon={FiActivity}
        >
          <AlertList alerts={tracking.alerts} />
        </SectionCard>

        <SectionCard
          eyebrow="Carga acumulada"
          title="Lectura rápida de esfuerzo"
          description="Resumen global de tareas, horas estimadas y materia con mayor carga actual."
          Icon={FiBookOpen}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Tareas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{metrics.total}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Historial total.</p>
            </div>
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Horas estimadas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{metrics.estimatedHours}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Suma declarada en tareas.</p>
            </div>
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mayor carga</p>
              <p className="mt-3 text-xl font-black text-slate-900">{tracking.currentLoadSubject?.nombre ?? 'Sin datos'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {tracking.currentLoadSubject ? `${tracking.currentLoadSubject.activeLoad} pendiente(s).` : 'No hay pendientes actuales.'}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Disciplina"
          title="Cómo se calcula el índice"
          description="Componentes que influyen en tu disciplina académica."
          Icon={FiShield}
        >
          <BarList
            valueLabel="puntos"
            maxValue={100}
            items={[
              { key: 'cumplimiento', label: 'Cumplimiento general (40%)', total: discipline.components.cumplimiento },
              { key: 'puntualidad', label: 'Puntualidad (30%)', total: discipline.components.puntualidad },
              { key: 'sinIgnoradas', label: 'Tareas no ignoradas (20%)', total: discipline.components.sinIgnoradas },
              { key: 'constancia', label: 'Constancia semanal (10%)', total: discipline.components.constanciaSemanal },
            ]}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Racha"
          title="Cumplimiento reciente"
          description="Días consecutivos con al menos una tarea completada."
          Icon={FiRepeat}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Racha</p>
              <p className="mt-3 text-4xl font-black text-slate-900">{tracking.streak.days} día(s)</p>
            </div>
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Sin completar</p>
              <p className="mt-3 text-4xl font-black text-slate-900">
                {tracking.streak.daysSinceLastCompletion ?? 0}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Día(s) desde la última tarea completada.</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow="Por materia"
          title="Avance y carga académica"
          description="Filtra u ordena para detectar materias pesadas, atrasadas o con bajo avance."
          Icon={FiFilter}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-600">Materia</label>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="field-control">
                <option value="todas">Todas</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Ordenar por</label>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)} className="field-control">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Dirección</label>
              <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)} className="field-control">
                {Object.entries(sortDirections).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {visibleSubjects.map((subject) => (
              <article key={subject.id} className="content-card interactive-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Materia</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">{subject.nombre}</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{subject.relativeLoad}% carga</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{subject.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Completadas</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{subject.completed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Pendientes</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{subject.pending}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Vencidas</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{subject.overdue}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex justify-between text-sm text-slate-600">
                      <span>Avance</span>
                      <span>{subject.advanceRate}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500" style={{ width: `${subject.advanceRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm text-slate-600">
                      <span>Puntualidad</span>
                      <span>{subject.punctualityRate}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${subject.punctualityRate}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Semanal" title="Rendimiento semanal" description="Actividad, completadas y vencidas de las últimas semanas." Icon={FiBarChart2}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tracking.weeklyPerformance.map((week) => {
              const height = Math.max((week.total / maxWeeklyTotal) * 100, week.total > 0 ? 12 : 0);

              return (
                <div key={week.key} className="content-card p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{formatShortDate(week.start)}</p>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    <div className="w-8 rounded-t-2xl bg-gradient-to-t from-blue-600 to-sky-400" style={{ height: `${height}%` }} />
                    <div className="w-8 rounded-t-2xl bg-gradient-to-t from-emerald-500 to-teal-300" style={{ height: `${Math.max((week.completed / maxWeeklyTotal) * 100, week.completed > 0 ? 12 : 0)}%` }} />
                    <div className="w-8 rounded-t-2xl bg-gradient-to-t from-rose-500 to-orange-300" style={{ height: `${Math.max((week.overdue / maxWeeklyTotal) * 100, week.overdue > 0 ? 12 : 0)}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{week.total} act. | {week.completed} comp. | {week.overdue} venc.</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Mensual" title="Evolución mensual" description="Cumplimiento visible mes a mes." Icon={FiTrendingUp}>
          <div className="space-y-4">
            {tracking.monthlyEvolution.map((month) => (
              <div key={month.key}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span className="font-semibold capitalize">{formatMonthTitle(month.start)}</span>
                  <span>{month.completed}/{month.total} completadas | {month.completionRate}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500" style={{ width: `${Math.max((month.total / maxMonthlyTotal) * 100, month.total > 0 ? 8 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow="Historial"
          title="Actividad reciente"
          description="Eventos derivados de tareas creadas, recibidas, completadas, vencidas y actualizadas."
          Icon={FiClock}
        >
          <ActivityTimeline activities={activities} />
        </SectionCard>
      </section>
    </MainLayout>
  );
}
