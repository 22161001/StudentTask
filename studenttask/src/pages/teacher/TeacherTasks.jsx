import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiEdit3, FiEye, FiPlusCircle, FiSearch, FiSlash, FiClipboard, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { deleteTeacherTask, getTeacherTasks } from '../../services/teacherTaskService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const emptyFilters = {
  search: '',
  group: 'all',
  subject: 'all',
  priority: 'all',
  status: 'all',
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

export default function TeacherTasks() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(location.state?.taskFeedback ? { type: 'success', message: location.state.taskFeedback } : null);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    const result = await getTeacherTasks();
    setTasks(result.tasks ?? []);

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message || 'No se pudieron cargar las tareas.' });
    } else if (location.state?.taskFeedback) {
      setFeedback({ type: 'success', message: location.state.taskFeedback });
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const activeTasks = useMemo(() => tasks.filter((task) => task.activa), [tasks]);
  const totalStudents = useMemo(() => tasks.reduce((total, task) => total + task.totalAlumnos, 0), [tasks]);

  const groupOptions = useMemo(() => {
    const groups = new Map();
    tasks.forEach((task) => {
      if (task.idGrupo) groups.set(task.idGrupo, task.nombreGrupo);
    });
    return Array.from(groups.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const subjectOptions = useMemo(() => {
    const subjects = new Map();
    tasks.forEach((task) => {
      if (task.idMateria) subjects.set(task.idMateria, task.materiaNombre);
    });
    return Array.from(subjects.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesSearch = !filters.search || normalizeText(task.titulo).includes(normalizeText(filters.search));
        const matchesGroup = filters.group === 'all' || String(task.idGrupo) === filters.group;
        const matchesSubject = filters.subject === 'all' || String(task.idMateria) === filters.subject;
        const matchesPriority = filters.priority === 'all' || task.prioridad === filters.priority;
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'activa' && task.activa) ||
          (filters.status === 'inactiva' && !task.activa);

        return matchesSearch && matchesGroup && matchesSubject && matchesPriority && matchesStatus;
      }),
    [filters, tasks],
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleDeactivate = async (task) => {
    if (!task.activa) return;

    setDeactivatingId(task.id);
    const result = await deleteTeacherTask(task.id);

    if (result.ok) {
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, activa: false, estado: 'Inactiva' } : item)));
      setFeedback({ type: 'success', message: result.message || 'Tarea desactivada correctamente.' });
    } else {
      setFeedback({ type: 'error', message: result.message || 'No se pudo desactivar la tarea.' });
    }

    setDeactivatingId(null);
  };

  return (
    <MainLayout title="Tareas publicadas" subtitle="Administra las actividades asignadas a tus grupos.">
      <PageHero
        eyebrow="Tareas docentes"
        title="Tareas publicadas"
        description="Crea, consulta, edita y desactiva tareas académicas para grupos completos."
        actions={
          <Link to="/docente/tareas/nueva" className="primary-btn">
            <FiPlusCircle className="text-base" />
            Nueva tarea
          </Link>
        }
        stats={[
          { label: 'Publicadas', value: tasks.length, helper: 'Tareas registradas.', tone: 'primary', Icon: FiClipboard },
          { label: 'Activas', value: activeTasks.length, helper: 'Disponibles para alumnos.', Icon: FiClipboard },
          { label: 'Alumnos', value: totalStudents, helper: 'Entregas esperadas.', Icon: FiUsers },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando tareas publicadas..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow={`${filteredTasks.length} resultado(s)`}
        title="Lista de tareas"
        description="Publicaciones asociadas a tu usuario docente."
        Icon={FiClipboard}
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[1.3fr_repeat(4,1fr)_auto]">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Búsqueda</span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-[calc(50%+0.25rem)] -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="field-control pl-10"
                placeholder="Buscar por título"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Grupo</span>
            <select name="group" value={filters.group} onChange={handleFilterChange} className="field-control">
              <option value="all">Todos</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Materia</span>
            <select name="subject" value={filters.subject} onChange={handleFilterChange} className="field-control">
              <option value="all">Todas</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Prioridad</span>
            <select name="priority" value={filters.priority} onChange={handleFilterChange} className="field-control">
              <option value="all">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Estado</span>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="field-control">
              <option value="all">Todas</option>
              <option value="activa">Activas</option>
              <option value="inactiva">Inactivas</option>
            </select>
          </label>

          <div className="flex items-end">
            <button type="button" onClick={() => setFilters(emptyFilters)} className="secondary-btn w-full">
              Limpiar
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            title="Aún no has publicado tareas."
            description="Publica una tarea para un grupo completo y se generarán entregas para sus alumnos."
            action={
              <Link to="/docente/tareas/nueva" className="primary-btn">
                <FiPlusCircle className="text-base" />
                Nueva tarea
              </Link>
            }
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
                  <th className="px-4 py-3 font-black">Límite</th>
                  <th className="px-4 py-3 font-black">Prioridad</th>
                  <th className="px-4 py-3 font-black">Estado</th>
                  <th className="px-4 py-3 font-black">Alumnos</th>
                  <th className="px-4 py-3 font-black">Cumplimiento</th>
                  <th className="px-4 py-3 font-black">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/70">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">{task.titulo}</p>
                      {task.descripcion ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.descripcion}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.materiaColor }} />
                        {task.materiaNombre}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{task.nombreGrupo}</td>
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
                    <td className="px-4 py-4 font-semibold text-slate-600">{task.totalAlumnos}</td>
                    <td className="px-4 py-4">
                      <div className="min-w-[8rem]">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-500"
                            style={{ width: `${Math.min(task.porcentajeCumplimiento, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-500">{task.porcentajeCumplimiento}% completado</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/docente/tareas/${task.id}`} className="secondary-btn text-sm">
                          <FiEye className="text-base" />
                          Ver
                        </Link>
                        <Link to={`/docente/tareas/${task.id}/editar`} className="secondary-btn text-sm">
                          <FiEdit3 className="text-base" />
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(task)}
                          disabled={!task.activa || deactivatingId === task.id}
                          className="danger-btn text-sm"
                        >
                          <FiSlash className="text-base" />
                          Desactivar
                        </button>
                      </div>
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
