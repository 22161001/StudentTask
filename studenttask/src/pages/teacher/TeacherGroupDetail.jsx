import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen, FiCalendar, FiClipboard, FiMail, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { syncTeacherGroupDetail, syncTeacherGroupStudents } from '../../services/teacherService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const formatValue = (value, fallback = 'Sin dato') => String(value ?? '').trim() || fallback;
const formatTurn = (value) => {
  const text = formatValue(value, 'Sin turno');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

export default function TeacherGroupDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadGroup = async () => {
      const options = {
        materiaId: new URLSearchParams(queryString).get('materiaId'),
        periodo: new URLSearchParams(queryString).get('periodo'),
      };

      const [detailResult, studentsResult] = await Promise.all([
        syncTeacherGroupDetail(id, options),
        syncTeacherGroupStudents(id),
      ]);

      if (!isMounted) {
        return;
      }

      setGroup(detailResult.group ?? null);
      setStudents(studentsResult.students ?? []);

      if (!detailResult.ok) {
        setFeedback({ type: 'error', message: detailResult.message || 'No se pudo cargar el detalle del grupo.' });
      } else if (!studentsResult.ok) {
        setFeedback({ type: 'error', message: studentsResult.message || 'No se pudo cargar la lista de alumnos.' });
      } else if (detailResult.message || studentsResult.message) {
        setFeedback({ type: detailResult.fallback || studentsResult.fallback ? 'info' : 'error', message: detailResult.message || studentsResult.message });
      }

      setLoading(false);
    };

    void loadGroup();

    return () => {
      isMounted = false;
    };
  }, [id, queryString]);

  const activeStudents = useMemo(() => students.filter((student) => student.activo), [students]);
  const upcomingTasks = group?.proximasTareas ?? [];
  const subjects = group?.materias?.length ? group.materias : [];
  const pageTitle = group ? `Grupo ${group.nombreGrupo}` : 'Detalle del grupo';
  const subjectLabel = group?.materiaNombre || subjects.map((subject) => subject.nombre).join(', ') || 'Sin materia';

  return (
    <MainLayout title={pageTitle} subtitle="Consulta la relación docente-grupo-materia y sus alumnos.">
      <PageHero
        eyebrow="Detalle de grupo"
        title={pageTitle}
        description={
          group
            ? `${formatValue(group.carrera)} · Semestre ${formatValue(group.semestre)} · Turno ${formatTurn(group.turno)}`
            : 'Cargando información del grupo asignado.'
        }
        actions={
          <Link to="/docente/grupos" className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Volver a grupos
          </Link>
        }
        stats={[
          { label: 'Alumnos', value: group?.totalAlumnos ?? students.length, helper: 'Inscritos en el grupo.', tone: 'primary', Icon: FiUsers },
          { label: 'Tareas', value: group?.totalTareasPublicadas ?? 0, helper: 'Publicadas para esta asignación.', Icon: FiClipboard },
          { label: 'Próximas', value: upcomingTasks.length, helper: 'Con fecha límite vigente.', Icon: FiCalendar },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando detalle del grupo..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !group ? (
        <EmptyState
          title="No se pudo consultar este grupo."
          description="Verifica que el grupo pertenezca a tu carga académica activa."
          Icon={FiUsers}
        />
      ) : group ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total de alumnos" value={group.totalAlumnos} helper="Alumnos inscritos." tone="blue" Icon={FiUsers} />
            <StatCard title="Alumnos activos" value={group.alumnosActivos || activeStudents.length} helper="Disponibles en el grupo." tone="sky" Icon={FiUsers} />
            <StatCard title="Tareas publicadas" value={group.totalTareasPublicadas} helper="Actividades docentes." tone="indigo" Icon={FiClipboard} />
            <StatCard title="Tareas próximas" value={upcomingTasks.length} helper="Fecha límite vigente." tone="rose" Icon={FiCalendar} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <SectionCard eyebrow={group.periodo || 'Periodo activo'} title="Información del grupo" Icon={FiBookOpen}>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: 'Grupo', value: group.nombreGrupo },
                  { label: 'Carrera', value: group.carrera },
                  { label: 'Semestre', value: group.semestre },
                  { label: 'Turno', value: formatTurn(group.turno) },
                  { label: 'Materia', value: subjectLabel },
                  { label: 'Periodo', value: group.periodo || 'Sin periodo' },
                ].map((item) => (
                  <div key={item.label} className="content-card px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{formatValue(item.value)}</p>
                  </div>
                ))}
              </div>

              {subjects.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <span
                      key={`${subject.id}-${subject.periodo}`}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden="true" />
                      {subject.nombre}
                      {subject.periodo ? <span className="text-slate-400">· {subject.periodo}</span> : null}
                    </span>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              eyebrow={`${upcomingTasks.length} tarea(s)`}
              title="Próximas tareas"
              description="Actividades vigentes del grupo y materia seleccionados."
              Icon={FiCalendar}
            >
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  title="No hay tareas próximas."
                  description="Cuando existan tareas activas con fecha límite aparecerán aquí."
                  Icon={FiClipboard}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <article key={task.id} className="content-card p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{task.materia}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[task.prioridad]}`}>
                          {formatPriorityLabel(task.prioridad)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-black tracking-tight text-slate-900">{task.titulo}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Límite: {formatShortDate(task.fechaLimite)}</p>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              eyebrow={`${students.length} alumno(s)`}
              title="Alumnos del grupo"
              description="Lista de alumnos inscritos. Esta vista es solo de consulta."
              Icon={FiUsers}
            >
              {students.length === 0 ? (
                <EmptyState
                  title="No hay alumnos inscritos."
                  description="Cuando existan alumnos vinculados al grupo aparecerán aquí."
                  Icon={FiUsers}
                />
              ) : (
                <div className="table-shell">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-black">Alumno</th>
                        <th className="px-4 py-3 font-black">Matrícula</th>
                        <th className="px-4 py-3 font-black">Correo</th>
                        <th className="px-4 py-3 font-black">Carrera</th>
                        <th className="px-4 py-3 font-black">Semestre</th>
                        <th className="px-4 py-3 font-black">Grupo</th>
                        <th className="px-4 py-3 font-black">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/70">
                      {students.map((student) => (
                        <tr key={student.idAlumno || student.id} className="align-top">
                          <td className="px-4 py-4">
                            <p className="font-black text-slate-900">{student.nombreCompleto}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{student.nombre}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.matricula)}</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                              <FiMail className="text-sm text-slate-400" />
                              {formatValue(student.email)}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.carrera)}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.semestre)}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.grupo)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                student.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {student.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </section>
        </>
      ) : null}
    </MainLayout>
  );
}
