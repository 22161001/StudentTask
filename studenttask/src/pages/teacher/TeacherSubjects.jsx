import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiClipboard, FiLayers, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { syncTeacherSubjects } from '../../services/teacherService';

const formatValue = (value, fallback = 'Sin dato') => String(value ?? '').trim() || fallback;

const buildGroupLink = (subject, group) => {
  const params = new URLSearchParams();

  if (subject.idMateria || subject.id) {
    params.set('materiaId', String(subject.idMateria || subject.id));
  }

  if (group.periodo) {
    params.set('periodo', group.periodo);
  }

  const query = params.toString();
  return `/docente/grupos/${group.idGrupo}${query ? `?${query}` : ''}`;
};

export default function TeacherSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSubjects = async () => {
      const result = await syncTeacherSubjects();

      if (!isMounted) {
        return;
      }

      setSubjects(result.subjects ?? []);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la lista de materias asignadas.' });
      }
      setLoading(false);
    };

    void loadSubjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(
    () =>
      subjects.reduce(
        (summary, subject) => ({
          groups: summary.groups + subject.totalGrupos,
          students: summary.students + subject.totalAlumnos,
          tasks: summary.tasks + subject.totalTareasPublicadas,
        }),
        { groups: 0, students: 0, tasks: 0 },
      ),
    [subjects],
  );

  return (
    <MainLayout title="Materias" subtitle="Consulta las materias que impartes y sus grupos.">
      <PageHero
        eyebrow="Materias asignadas"
        title="Mis materias"
        description="Revisa las materias de tu carga académica, los grupos vinculados, alumnos atendidos y tareas publicadas."
        stats={[
          { label: 'Materias', value: subjects.length, helper: 'Asignadas actualmente.', tone: 'primary', Icon: FiBookOpen },
          { label: 'Grupos', value: totals.groups, helper: 'Grupos donde se imparten.', Icon: FiUsers },
          { label: 'Alumnos', value: totals.students, helper: 'Alumnos atendidos.', Icon: FiLayers },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando materias asignadas..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow={`${subjects.length} materia(s)`}
        title="Materias y grupos"
        description="Información agrupada desde la relación docente-grupo-materia."
        Icon={FiBookOpen}
      >
        {subjects.length === 0 ? (
          <EmptyState
            title="Aún no tienes materias asignadas."
            description="Cuando exista una asignación docente-grupo-materia, aparecerá en esta sección."
            Icon={FiBookOpen}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {subjects.map((subject) => (
              <article key={subject.id} className="content-card interactive-card overflow-hidden p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: subject.color }} />
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Materia</p>
                    </div>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{subject.nombre}</h3>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                      {subject.descripcion || 'Sin descripción registrada.'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Grupos</p>
                    <p className="mt-2 font-black text-slate-900">{subject.totalGrupos}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Alumnos</p>
                    <p className="mt-2 font-black text-slate-900">{subject.totalAlumnos}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tareas</p>
                    <p className="mt-2 font-black text-slate-900">{subject.totalTareasPublicadas}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Grupos donde se imparte</p>
                  {subject.grupos.length === 0 ? (
                    <p className="mt-3 text-sm font-semibold text-slate-500">Sin grupos vinculados.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {subject.grupos.map((group) => (
                        <div
                          key={`${subject.id}-${group.idGrupo}-${group.periodo}`}
                          className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-base font-black text-slate-900">{formatValue(group.nombreGrupo)}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {formatValue(group.carrera)} · Semestre {formatValue(group.semestre)}
                              </p>
                              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                {group.periodo || 'Sin periodo'}
                              </p>
                            </div>
                            <Link to={buildGroupLink(subject, group)} className="secondary-btn">
                              Ver grupo
                              <FiArrowRight className="text-base" />
                            </Link>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                              <FiUsers className="text-sm" />
                              {group.totalAlumnos} alumnos
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                              <FiClipboard className="text-sm" />
                              {group.totalTareasPublicadas} tareas
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </MainLayout>
  );
}
