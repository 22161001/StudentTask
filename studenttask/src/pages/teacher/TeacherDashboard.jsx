import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiBarChart2, FiBookOpen, FiCalendar, FiClipboard, FiTrendingUp, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { syncTeacherDashboard } from '../../services/teacherService';
import { emptyReportSummary, getTeacherReportSummary } from '../../services/teacherReportService';
import { emptyTrackingSummary, getTeacherTrackingSummary } from '../../services/teacherTrackingService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const emptyDashboard = {
  docente: null,
  totalGrupos: 0,
  totalMaterias: 0,
  totalAlumnos: 0,
  totalTareas: 0,
  totalTareasPublicadas: 0,
  proximasTareas: [],
};

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [trackingSummary, setTrackingSummary] = useState(emptyTrackingSummary);
  const [reportSummary, setReportSummary] = useState(emptyReportSummary);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [result, trackingResult, reportResult] = await Promise.all([
        syncTeacherDashboard(),
        getTeacherTrackingSummary(),
        getTeacherReportSummary(),
      ]);

      if (!isMounted) {
        return;
      }

      setDashboard(result.dashboard ?? emptyDashboard);
      setTrackingSummary(trackingResult.summary ?? emptyTrackingSummary);
      setReportSummary(reportResult.summary ?? emptyReportSummary);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la información del docente.' });
      } else if (!trackingResult.ok) {
        setFeedback({ type: 'error', message: trackingResult.message || 'No se pudo cargar el resumen de seguimiento.' });
      } else if (!reportResult.ok) {
        setFeedback({ type: 'error', message: reportResult.message || 'No se pudo cargar el resumen de reportes.' });
      }
      setLoading(false);
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const docente = dashboard.docente ?? {};
  const nombreDocente = docente.nombre || 'Docente';
  const proximasTareas = useMemo(() => dashboard.proximasTareas ?? [], [dashboard.proximasTareas]);
  const totalTareasPublicadas = dashboard.totalTareasPublicadas || dashboard.totalTareas;

  return (
    <MainLayout title="Dashboard docente" subtitle="Consulta grupos, materias y tareas publicadas.">
      <PageHero
        eyebrow="Panel docente"
        title={`Bienvenido, ${nombreDocente}.`}
        description="Revisa tu carga académica activa con datos reales de grupos, materias, alumnos y tareas."
        actions={[
          <Link key="grupos" to="/docente/grupos" className="primary-btn">
            <FiUsers className="text-base" />
            Mis grupos
          </Link>,
          <Link key="materias" to="/docente/materias" className="secondary-btn">
            <FiBookOpen className="text-base" />
            Mis materias
          </Link>,
          <Link key="tareas" to="/docente/tareas" className="secondary-btn">
            <FiClipboard className="text-base" />
            Ver tareas asignadas
          </Link>,
          <Link key="seguimiento" to="/docente/seguimiento" className="secondary-btn">
            <FiActivity className="text-base" />
            Seguimiento
          </Link>,
          <Link key="reportes" to="/docente/reportes" className="secondary-btn">
            <FiBarChart2 className="text-base" />
            Reportes
          </Link>,
        ]}
        stats={[
          { label: 'Grupos', value: dashboard.totalGrupos, helper: 'Asignados actualmente.', tone: 'primary', Icon: FiUsers },
          { label: 'Materias', value: dashboard.totalMaterias, helper: 'Materias activas.', Icon: FiBookOpen },
          { label: 'Alumnos', value: dashboard.totalAlumnos, helper: 'Alumnos atendidos.', Icon: FiUsers },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando dashboard docente..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Grupos asignados" value={dashboard.totalGrupos} helper="Grupos vinculados a tus materias." tone="blue" Icon={FiUsers} />
        <StatCard title="Materias asignadas" value={dashboard.totalMaterias} helper="Materias bajo tu seguimiento." tone="sky" Icon={FiBookOpen} />
        <StatCard title="Alumnos atendidos" value={dashboard.totalAlumnos} helper="Alumnos en tus grupos." tone="indigo" Icon={FiUsers} />
        <StatCard title="Tareas publicadas" value={totalTareasPublicadas} helper="Actividades creadas para grupos." tone="rose" Icon={FiClipboard} />
      </section>

      <section className="mt-6">
        <Link to="/docente/seguimiento" className="content-card interactive-card block p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="soft-chip soft-chip--cool">Seguimiento</span>
              <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900">Resumen de cumplimiento</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Acceso rápido al avance de entregas por tarea, grupo y materia.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
              <span className="rounded-2xl bg-blue-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  <FiTrendingUp className="text-sm" />
                  Cumplimiento
                </span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{trackingSummary.porcentajeCumplimientoGeneral}%</span>
              </span>
              <span className="rounded-2xl bg-rose-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rose-600">
                  <FiAlertTriangle className="text-sm" />
                  Pendientes
                </span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{trackingSummary.totalEntregasPendientes}</span>
              </span>
              <span className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <FiClipboard className="text-sm" />
                  Bajo avance
                </span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{trackingSummary.tareasConBajoCumplimiento.length}</span>
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-6">
        <Link to="/docente/reportes" className="content-card interactive-card block p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="soft-chip soft-chip--cool">Reportes</span>
              <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900">Analítica docente</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Consulta reportes por grupo, materia, alumno y tarea.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
              <span className="rounded-2xl bg-blue-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  <FiBarChart2 className="text-sm" />
                  Cumplimiento
                </span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{reportSummary.porcentajeCumplimientoGeneral}%</span>
              </span>
              <span className="rounded-2xl bg-rose-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rose-600">
                  <FiUsers className="text-sm" />
                  Grupo menor
                </span>
                <span className="mt-2 block truncate text-2xl font-black text-slate-900">
                  {reportSummary.grupoMenorCumplimiento?.nombreGrupo ?? 'Sin datos'}
                </span>
              </span>
              <span className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <FiAlertTriangle className="text-sm" />
                  Más pendientes
                </span>
                <span className="mt-2 block truncate text-2xl font-black text-slate-900">
                  {reportSummary.alumnoMasPendientes?.totalPendientes ?? 0}
                </span>
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Link to="/docente/grupos" className="content-card interactive-card flex items-center justify-between gap-4 p-5">
          <span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Acceso rápido</span>
            <span className="mt-2 block text-xl font-black tracking-tight text-slate-900">Mis grupos</span>
            <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">Consulta alumnos y detalle de cada grupo.</span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <FiUsers className="text-lg" />
          </span>
        </Link>

        <Link to="/docente/materias" className="content-card interactive-card flex items-center justify-between gap-4 p-5">
          <span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Acceso rápido</span>
            <span className="mt-2 block text-xl font-black tracking-tight text-slate-900">Mis materias</span>
            <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">Revisa materias, grupos, alumnos y tareas.</span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <FiBookOpen className="text-lg" />
          </span>
        </Link>
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow={`${proximasTareas.length} tarea(s)`}
          title="Tareas próximas a vencer"
          description="Actividades activas ordenadas por fecha límite."
          Icon={FiCalendar}
        >
          {proximasTareas.length === 0 ? (
            <EmptyState
              title="No hay tareas próximas a vencer"
              description="Cuando publiques tareas con fecha límite aparecerán aquí."
              Icon={FiClipboard}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {proximasTareas.map((task) => (
                <article key={task.id} className="content-card interactive-card p-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{task.materia}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{task.grupo}</span>
                    <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                      {formatPriorityLabel(task.prioridad)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">{task.titulo}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Límite: {formatShortDate(task.fechaLimite)}</p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </MainLayout>
  );
}
