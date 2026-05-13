import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiActivity, FiArrowLeft, FiEdit3, FiExternalLink, FiSlash, FiClipboard, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { deleteTeacherTask, getTeacherTaskById } from '../../services/teacherTaskService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const formatValue = (value, fallback = 'Sin dato') => String(value ?? '').trim() || fallback;

export default function TeacherTaskDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(location.state?.taskFeedback ? { type: 'success', message: location.state.taskFeedback } : null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTask = async () => {
      const result = await getTeacherTaskById(id);

      if (!isMounted) return;

      setTask(result.task ?? null);
      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message || 'No tienes permiso para consultar esta tarea.' });
      } else if (location.state?.taskFeedback) {
        setFeedback({ type: 'success', message: location.state.taskFeedback });
      }
      setLoading(false);
    };

    void loadTask();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDeactivate = async () => {
    if (!task?.activa) return;

    setDeactivating(true);
    const result = await deleteTeacherTask(task.id);

    if (result.ok) {
      setTask((current) => (current ? { ...current, activa: false, estado: 'Inactiva' } : current));
      setFeedback({ type: 'success', message: result.message || 'Tarea desactivada correctamente.' });
    } else {
      setFeedback({ type: 'error', message: result.message || 'No se pudo desactivar la tarea.' });
    }

    setDeactivating(false);
  };

  return (
    <MainLayout title="Detalle de tarea" subtitle="Consulta la información básica de una tarea publicada.">
      <PageHero
        eyebrow="Tarea publicada"
        title={task?.titulo || 'Detalle de tarea'}
        description={
          task
            ? `${formatValue(task.materiaNombre)} · Grupo ${formatValue(task.nombreGrupo)} · Límite ${formatShortDate(task.fechaLimite)}`
            : 'Cargando información de la tarea.'
        }
        actions={[
          <Link key="volver" to="/docente/tareas" className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Volver
          </Link>,
          task ? (
            <Link key="seguimiento" to={`/docente/tareas/${task.id}/seguimiento`} className="secondary-btn">
              <FiActivity className="text-base" />
              Seguimiento
            </Link>
          ) : null,
          task ? (
            <Link key="editar" to={`/docente/tareas/${task.id}/editar`} className="primary-btn">
              <FiEdit3 className="text-base" />
              Editar
            </Link>
          ) : null,
          task ? (
            <button key="desactivar" type="button" onClick={handleDeactivate} disabled={!task.activa || deactivating} className="danger-btn">
              <FiSlash className="text-base" />
              Desactivar
            </button>
          ) : null,
        ]}
        stats={[
          { label: 'Alumnos', value: task?.totalAlumnos ?? 0, helper: 'Entregas esperadas.', tone: 'primary', Icon: FiUsers },
          { label: 'Completadas', value: task?.totalCompletadas ?? 0, helper: 'Marcadas por alumnos.', Icon: FiClipboard },
          { label: 'Cumplimiento', value: `${task?.porcentajeCumplimiento ?? 0}%`, helper: 'Avance básico.', Icon: FiClipboard },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando detalle de tarea..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !task ? (
        <EmptyState
          title="No se pudo consultar esta tarea."
          description="Verifica que la tarea pertenezca a tu cuenta docente."
          Icon={FiClipboard}
        />
      ) : task ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total de alumnos" value={task.totalAlumnos} helper="Alumnos del grupo." tone="blue" Icon={FiUsers} />
            <StatCard title="Pendientes" value={task.totalPendientes} helper="Sin marcar completada." tone="sky" Icon={FiClipboard} />
            <StatCard title="Completadas" value={task.totalCompletadas} helper="Entregas completadas." tone="indigo" Icon={FiClipboard} />
            <StatCard title="Cumplimiento" value={`${task.porcentajeCumplimiento}%`} helper="Porcentaje de avance." tone="rose" Icon={FiClipboard} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <SectionCard eyebrow={task.estado} title="Información de la tarea" Icon={FiClipboard}>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: 'Materia', value: task.materiaNombre },
                  { label: 'Grupo', value: task.nombreGrupo },
                  { label: 'Fecha de publicación', value: formatShortDate(task.fechaPublicacion) },
                  { label: 'Fecha límite', value: formatShortDate(task.fechaLimite) },
                  { label: 'Prioridad', value: formatPriorityLabel(task.prioridad) },
                  { label: 'Estado', value: task.estado },
                ].map((item) => (
                  <div key={item.label} className="content-card px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{formatValue(item.value)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                <div className="content-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Descripción</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{task.descripcion || 'Sin descripción.'}</p>
                </div>
                <div className="content-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Instrucciones</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{task.instrucciones || 'Sin instrucciones.'}</p>
                </div>
                {task.enlaceApoyo ? (
                  <a
                    href={task.enlaceApoyo}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-btn w-fit"
                  >
                    <FiExternalLink className="text-base" />
                    Abrir enlace de apoyo
                  </a>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard eyebrow="Avance" title="Cumplimiento básico" Icon={FiUsers}>
              <div className="content-card p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Porcentaje de cumplimiento</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">{task.porcentajeCumplimiento}%</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[task.prioridad]}`}>
                    {formatPriorityLabel(task.prioridad)}
                  </span>
                </div>
                <div className="mt-5 h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500"
                    style={{ width: `${Math.min(task.porcentajeCumplimiento, 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {task.totalCompletadas} completadas y {task.totalPendientes} pendientes.
                </p>
              </div>
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              eyebrow={`${task.alumnos.length} alumno(s)`}
              title="Alumnos y estado"
              description="Consulta rápida de entregas; para filtros y revisión usa el seguimiento de la tarea."
              Icon={FiUsers}
            >
              {task.alumnos.length === 0 ? (
                <EmptyState
                  title="No hay entregas asociadas."
                  description="La tarea no tiene alumnos activos vinculados."
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
                        <th className="px-4 py-3 font-black">Estado</th>
                        <th className="px-4 py-3 font-black">Fecha de entrega</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/70">
                      {task.alumnos.map((student) => (
                        <tr key={student.idAlumno || student.id} className="align-top">
                          <td className="px-4 py-4 font-black text-slate-900">{student.nombreCompleto}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.matricula)}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(student.email)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                student.estado === 'completada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {student.estado === 'completada' ? 'Completada' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatShortDate(student.fechaEntrega)}</td>
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
