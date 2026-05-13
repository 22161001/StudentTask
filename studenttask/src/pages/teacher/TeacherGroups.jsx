import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiLayers, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { syncTeacherGroups } from '../../services/teacherService';

const formatValue = (value, fallback = 'Sin dato') => String(value ?? '').trim() || fallback;
const formatTurn = (value) => {
  const text = formatValue(value, 'Sin turno');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const buildGroupLink = (group) => {
  const params = new URLSearchParams();

  if (group.materiaId) {
    params.set('materiaId', String(group.materiaId));
  }

  if (group.periodo) {
    params.set('periodo', group.periodo);
  }

  const query = params.toString();
  return `/docente/grupos/${group.idGrupo || group.id}${query ? `?${query}` : ''}`;
};

export default function TeacherGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadGroups = async () => {
      const result = await syncTeacherGroups();

      if (!isMounted) {
        return;
      }

      setGroups(result.groups ?? []);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la lista de grupos asignados.' });
      }
      setLoading(false);
    };

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalAlumnos = useMemo(() => groups.reduce((total, group) => total + group.totalAlumnos, 0), [groups]);
  const totalMaterias = useMemo(() => new Set(groups.map((group) => group.materiaId || group.materiaNombre)).size, [groups]);

  return (
    <MainLayout title="Mis grupos" subtitle="Consulta los grupos y materias que tienes asignados.">
      <PageHero
        eyebrow="Grupos asignados"
        title="Mis grupos"
        description="Consulta carrera, semestre, turno, materia, periodo y alumnos vinculados a tu carga académica."
        stats={[
          { label: 'Grupos', value: groups.length, helper: 'Asignaciones activas.', tone: 'primary', Icon: FiUsers },
          { label: 'Materias', value: totalMaterias, helper: 'Materias distintas.', Icon: FiBookOpen },
          { label: 'Alumnos', value: totalAlumnos, helper: 'Alumnos atendidos.', Icon: FiLayers },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando grupos asignados..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow={`${groups.length} resultado(s)`}
        title="Grupos y materias"
        description="Relación docente-grupo-materia vigente en MySQL."
        Icon={FiUsers}
      >
        {groups.length === 0 ? (
          <EmptyState
            title="Aún no tienes grupos asignados."
            description="Cuando exista una asignación docente-grupo-materia, aparecerá en esta sección."
            Icon={FiUsers}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => (
              <article key={`${group.idGrupo}-${group.materiaId}-${group.periodo}`} className="content-card interactive-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: group.materiaColor }}
                        aria-hidden="true"
                      />
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">{group.materiaNombre}</p>
                    </div>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{group.nombreGrupo}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{group.carrera}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                    {group.periodo || 'Periodo activo'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Semestre</p>
                    <p className="mt-2 font-black text-slate-900">{formatValue(group.semestre)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Turno</p>
                    <p className="mt-2 font-black text-slate-900">{formatTurn(group.turno)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Alumnos</p>
                    <p className="mt-2 font-black text-slate-900">{group.totalAlumnos}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tareas</p>
                    <p className="mt-2 font-black text-slate-900">{group.totalTareasPublicadas}</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Link to={buildGroupLink(group)} className="primary-btn">
                    Ver grupo
                    <FiArrowRight className="text-base" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </MainLayout>
  );
}
