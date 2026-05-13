import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiCalendar, FiClipboard, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { syncTeacherDashboard } from '../../services/teacherService';
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
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const result = await syncTeacherDashboard();

      if (!isMounted) {
        return;
      }

      setDashboard(result.dashboard ?? emptyDashboard);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la información del docente.' });
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
