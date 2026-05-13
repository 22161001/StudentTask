import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClipboard, FiPlusCircle, FiRotateCcw } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { syncTeacherTasks } from '../../services/teacherService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

export default function TeacherTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      const result = await syncTeacherTasks();

      if (!isMounted) {
        return;
      }

      setTasks(result.tasks ?? []);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la lista de tareas publicadas.' });
      }
      setLoading(false);
    };

    void loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTasks = useMemo(() => tasks.filter((task) => task.activa), [tasks]);
  const nextTasks = useMemo(() => activeTasks.filter((task) => task.fechaLimite).slice(0, 5), [activeTasks]);

  return (
    <MainLayout
      title="Tareas asignadas"
      subtitle="Consulta actividades publicadas para tus grupos."
    >
      <PageHero
        eyebrow="Tareas publicadas"
        title="Actividades docentes en modo consulta."
        description="Revisa materia, grupo, fecha límite, prioridad y estado de publicación."
        actions={
          <button type="button" disabled className="secondary-btn">
            <FiPlusCircle className="text-base" />
            Nueva tarea
          </button>
        }
        stats={[
          { label: 'Publicadas', value: tasks.length, helper: 'Tareas registradas.', tone: 'primary', Icon: FiClipboard },
          { label: 'Activas', value: activeTasks.length, helper: 'Disponibles para alumnos.', Icon: FiRotateCcw },
          { label: 'Próximas', value: nextTasks.length, helper: 'Con fecha límite.', Icon: FiCalendar },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando tareas publicadas..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow={`${tasks.length} resultado(s)`}
        title="Lista de tareas"
        description="Publicaciones existentes asociadas a tu usuario docente."
        Icon={FiClipboard}
      >
        {tasks.length === 0 ? (
          <EmptyState
            title="Aún no has publicado tareas."
            description="La creación completa de tareas queda pendiente para la subfase 2.3."
            Icon={FiClipboard}
          />
        ) : (
          <div className="table-shell">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-black">Título</th>
                  <th className="px-4 py-3 font-black">Materia</th>
                  <th className="px-4 py-3 font-black">Grupo</th>
                  <th className="px-4 py-3 font-black">Fecha límite</th>
                  <th className="px-4 py-3 font-black">Prioridad</th>
                  <th className="px-4 py-3 font-black">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/70">
                {tasks.map((task) => (
                  <tr key={task.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">{task.titulo}</p>
                      {task.descripcion ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.descripcion}</p> : null}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{task.materia}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{task.grupo}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{formatShortDate(task.fechaLimite)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[task.prioridad]}`}>
                        {formatPriorityLabel(task.prioridad)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          task.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {task.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </MainLayout>
  );
}
