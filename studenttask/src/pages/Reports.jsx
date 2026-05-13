import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiClock, FiDownload, FiFilter, FiPieChart, FiPrinter, FiTarget, FiTrendingUp } from 'react-icons/fi';
import EmptyState from '../components/EmptyState';
import FeedbackBanner from '../components/FeedbackBanner';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import BarList from '../components/analytics/BarList';
import ProgressMetric from '../components/analytics/ProgressMetric';
import MainLayout from '../layout/MainLayout';
import { REPORT_PERIODS, getReportAnalytics } from '../services/analyticsService';
import { buildReportCsv, buildReportJson } from '../services/reportService';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import { formatShortDate } from '../utils/date';

const initialFilters = {
  period: 'last30',
  subjectId: 'todas',
  type: 'todos',
};

const downloadFile = (fileName, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const formatRange = (range) => {
  if (!range.start || !range.end) {
    return 'Todo el historial';
  }

  return `${formatShortDate(range.start)} - ${formatShortDate(range.end)}`;
};

export default function Reports() {
  const [tasks, setTasks] = useState(getTasks());
  const [subjects, setSubjects] = useState(getSubjects());
  const [filters, setFilters] = useState(initialFilters);
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

  const report = useMemo(
    () =>
      getReportAnalytics({
        tasks,
        subjects,
        period: filters.period,
        subjectId: filters.subjectId,
        type: filters.type,
      }),
    [filters, subjects, tasks],
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleExportCsv = () => {
    downloadFile(`studenttask-reportes-${filters.period}.csv`, buildReportCsv(report), 'text/csv;charset=utf-8');
  };

  const handleExportJson = () => {
    downloadFile(`studenttask-reportes-${filters.period}.json`, buildReportJson(report), 'application/json;charset=utf-8');
  };

  const metrics = report.metrics;

  return (
    <MainLayout
      title="Reportes"
      subtitle="Analiza tu avance, carga de trabajo y puntualidad."
    >
      <PageHero
        eyebrow="Analítica académica"
        title="Métricas claras para tomar mejores decisiones."
        description="Filtra por periodo, materia o tipo de tarea para revisar tu desempeño."
        actions={
          <>
            <button type="button" onClick={handleExportCsv} className="primary-btn">
              <FiDownload className="text-base" />
              Exportar CSV
            </button>
            <button type="button" onClick={handleExportJson} className="secondary-btn">
              <FiDownload className="text-base" />
              Exportar JSON
            </button>
            <button type="button" onClick={() => window.print()} className="secondary-btn">
              <FiPrinter className="text-base" />
              Imprimir
            </button>
          </>
        }
        stats={[
          {
            label: 'Cumplimiento',
            value: `${metrics.completionRate}%`,
            helper: `${metrics.completed} de ${metrics.total} tarea(s).`,
            tone: 'primary',
            Icon: FiTarget,
          },
          {
            label: 'Periodo',
            value: report.period.label,
            helper: formatRange(report.range),
            Icon: FiClock,
          },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando reportes..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Filtros"
        title="Parámetros del reporte"
        description="Ajusta periodo, materia y tipo de tarea."
        Icon={FiFilter}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-600">Periodo</label>
            <select name="period" value={filters.period} onChange={handleFilterChange} className="field-control">
              {REPORT_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Materia</label>
            <select name="subjectId" value={filters.subjectId} onChange={handleFilterChange} className="field-control">
              <option value="todas">Todas</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Tipo de tarea</label>
            <select name="type" value={filters.type} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todas</option>
              <option value="personal">Personal</option>
              <option value="asignada">Asignada</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de tareas" value={metrics.total} helper="Actividades del periodo seleccionado." tone="blue" Icon={FiBarChart2} />
        <StatCard title="Completadas" value={metrics.completed} helper={`${metrics.onTime} a tiempo y ${metrics.late} tarde.`} tone="sky" Icon={FiTarget} />
        <StatCard title="Pendientes" value={metrics.pending} helper="Aún requieren atención." tone="indigo" Icon={FiClock} />
        <StatCard title="Ignoradas" value={metrics.ignored} helper="Vencidas que siguen pendientes." tone="rose" Icon={FiTrendingUp} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <ProgressMetric label="Cumplimiento general" value={metrics.completionRate} helper="Completadas entre el total del periodo." tone="blue" />
          <ProgressMetric label="Puntualidad" value={metrics.punctualityRate} helper="Completadas en o antes de la fecha límite." tone="emerald" />
          <div className="content-card p-5">
            <p className="text-sm font-medium text-slate-500">Promedio completadas por semana</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{metrics.averageCompletedPerWeek}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Promedio calculado sobre la extension del periodo.</p>
          </div>
          <div className="content-card p-5">
            <p className="text-sm font-medium text-slate-500">Tiempo promedio de resolucion</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{metrics.averageResolutionDays} días</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Tiempo promedio para cerrar tareas.</p>
          </div>
        </div>

        <SectionCard
          eyebrow="Materias clave"
          title="Carga y retraso detectados"
          description="Materias con mayor actividad en el periodo."
          Icon={FiPieChart}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="content-card p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Mayor carga</p>
              <p className="mt-3 text-2xl font-black text-slate-900">{report.topLoadSubject?.nombre ?? 'Sin datos'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {report.topLoadSubject ? `${report.topLoadSubject.total} tarea(s) registradas.` : 'Aún no hay tareas para calcular carga.'}
              </p>
            </div>
            <div className="content-card !border-rose-100 bg-rose-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Mayor retraso</p>
              <p className="mt-3 text-2xl font-black text-slate-900">{report.topDelaySubject?.nombre ?? 'Sin datos'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {report.topDelaySubject ? `${report.topDelaySubject.overdue} tarea(s) vencidas.` : 'No hay retrasos en el filtro actual.'}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Prioridad" title="Distribución por prioridad" description="Tareas del periodo por nivel de prioridad." Icon={FiBarChart2}>
          <BarList items={report.priorityDistribution} />
        </SectionCard>
        <SectionCard eyebrow="Origen" title="Tipo de tarea" description="Personales y asignadas por docentes." Icon={FiPieChart}>
          <BarList items={report.typeDistribution} />
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow={`${report.subjectMetrics.length} materia(s)`}
          title="Resumen por materia"
          description="Avance, puntualidad, retrasos y carga por asignatura."
          Icon={FiTarget}
        >
          {report.subjectMetrics.length === 0 ? (
            <EmptyState title="No hay datos para el filtro actual" description="Cambia el periodo, materia o tipo de tarea." Icon={FiBarChart2} />
          ) : (
            <div className="table-shell">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50/90 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="rounded-l-2xl px-4 py-3">Materia</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Completadas</th>
                    <th className="px-4 py-3">Pendientes</th>
                    <th className="px-4 py-3">Vencidas</th>
                    <th className="px-4 py-3">Avance</th>
                    <th className="px-4 py-3">Puntualidad</th>
                    <th className="rounded-r-2xl px-4 py-3">Carga</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:hover]:bg-blue-50/[0.55]">
                  {report.subjectMetrics.map((subject) => (
                    <tr key={subject.id} className="bg-white/80 text-sm text-slate-600 transition">
                      <td className="border-t border-slate-100 px-4 py-4 font-bold text-slate-900">{subject.nombre}</td>
                      <td className="px-4 py-4">{subject.total}</td>
                      <td className="px-4 py-4">{subject.completed}</td>
                      <td className="px-4 py-4">{subject.pending}</td>
                      <td className="px-4 py-4">{subject.overdue}</td>
                      <td className="px-4 py-4">{subject.advanceRate}%</td>
                      <td className="px-4 py-4">{subject.punctualityRate}%</td>
                      <td className="px-4 py-4">{subject.relativeLoad}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>
    </MainLayout>
  );
}
