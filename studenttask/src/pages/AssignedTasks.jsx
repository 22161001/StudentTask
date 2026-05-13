import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClipboard, FiExternalLink, FiFilter, FiRotateCcw, FiSave } from 'react-icons/fi';
import FeedbackBanner from '../components/FeedbackBanner';
import MainLayout from '../layout/MainLayout';
import EmptyState from '../components/EmptyState';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { getTasks, syncTasks, toggleTaskStatus, updateAssignedTaskProgress } from '../services/taskService';
import {
  compareByDueDate,
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
} from '../utils/date';
import {
  buildTaskBadges,
  getSubjectName,
  getTaskDeadlineMeta,
} from '../utils/taskInsights';

const initialFilters = {
  search: '',
  materiaId: 'todas',
  docente: 'todos',
  grupo: 'todos',
  estado: 'todos',
  prioridad: 'todas',
};

const uniqueValues = (items, getter) =>
  Array.from(new Set(items.map(getter).filter(Boolean))).sort((itemA, itemB) => itemA.localeCompare(itemB));

export default function AssignedTasks() {
  const [tasks, setTasks] = useState(getTasks());
  const [subjects, setSubjects] = useState(getSubjects());
  const [filters, setFilters] = useState(initialFilters);
  const [noteDrafts, setNoteDrafts] = useState({});
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
        setFeedback({ type: 'error', message: tasksResult.message || 'No se pudieron cargar tus tareas asignadas.' });
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
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

  const assignedTasks = useMemo(() => tasks.filter((task) => task.tipo === 'asignada'), [tasks]);
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const docentes = useMemo(() => uniqueValues(assignedTasks, (task) => task.docenteNombre), [assignedTasks]);
  const grupos = useMemo(() => uniqueValues(assignedTasks, (task) => task.grupoNombre), [assignedTasks]);

  const filteredTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return assignedTasks
      .filter((task) => (filters.materiaId === 'todas' ? true : task.materiaId === Number(filters.materiaId)))
      .filter((task) => (filters.docente === 'todos' ? true : task.docenteNombre === filters.docente))
      .filter((task) => (filters.grupo === 'todos' ? true : task.grupoNombre === filters.grupo))
      .filter((task) => (filters.estado === 'todos' ? true : task.estado === filters.estado))
      .filter((task) => (filters.prioridad === 'todas' ? true : task.prioridad === filters.prioridad))
      .filter((task) => {
        if (!query) {
          return true;
        }

        return [task.titulo, task.descripcion, task.instrucciones, task.docenteNombre, task.grupoNombre, task.notaPersonal]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((taskA, taskB) => compareByDueDate(taskA, taskB));
  }, [assignedTasks, filters]);

  const pendingAssigned = assignedTasks.filter((task) => task.estado === 'pendiente');
  const completedAssigned = assignedTasks.filter((task) => task.estado === 'completada');
  const unreviewedAssigned = pendingAssigned.filter((task) => !String(task.notaPersonal ?? '').trim());

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleNoteChange = (taskId, value) => {
    setNoteDrafts((currentDrafts) => ({ ...currentDrafts, [taskId]: value }));
    setFeedback(null);
  };

  const handleToggleStatus = async (task) => {
    const note = noteDrafts[task.id] ?? task.notaPersonal ?? '';
    const result = await toggleTaskStatus(task);

    if (!result.ok) {
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    if (note !== (task.notaPersonal ?? '')) {
      const updatedTask = result.tasks.find((item) => item.id === task.id) ?? task;
      const noteResult = await updateAssignedTaskProgress(task.id, {
        estado: updatedTask.estado,
        notaPersonal: note,
      });

      if (noteResult.ok) {
        setTasks(noteResult.tasks);
      } else {
        setTasks(result.tasks);
      }
    } else {
      setTasks(result.tasks);
    }

    setFeedback({
      type: 'success',
      message: task.estado === 'completada' ? 'La tarea volvió a pendiente.' : 'Tarea completada.',
    });
  };

  const handleSaveNote = async (task) => {
    const result = await updateAssignedTaskProgress(task.id, {
      estado: task.estado,
      notaPersonal: noteDrafts[task.id] ?? task.notaPersonal ?? '',
    });

    if (!result.ok) {
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setTasks(result.tasks);
    setFeedback({ type: 'success', message: 'Nota guardada.' });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <MainLayout
      title="Tareas asignadas"
      subtitle="Revisa actividades de tus docentes y registra tu avance."
    >
      <PageHero
        eyebrow="Actividades docentes"
        title="Atiende tus actividades asignadas con claridad."
        description="Marca avances, guarda notas personales y consulta instrucciones cuando lo necesites."
        stats={[
          { label: 'Asignadas', value: assignedTasks.length, helper: 'Actividades recibidas de docentes.', tone: 'primary', Icon: FiClipboard },
          { label: 'Pendientes', value: pendingAssigned.length, helper: 'Todavía requieren seguimiento.', Icon: FiRotateCcw },
          { label: 'Sin revisar', value: unreviewedAssigned.length, helper: 'Sin nota o avance personal.', tone: unreviewedAssigned.length ? 'warning' : 'neutral', Icon: FiSave },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando tareas asignadas..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow={`${filteredTasks.length} resultado(s)`}
        title="Filtros de tareas asignadas"
        description="Afina la vista por materia, docente, grupo, estado o prioridad."
        Icon={FiFilter}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="text-sm font-medium text-slate-600">Buscar</label>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="field-control"
              placeholder="Título, instrucciones, docente o grupo"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Materia</label>
            <select name="materiaId" value={filters.materiaId} onChange={handleFilterChange} className="field-control">
              <option value="todas">Todas</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Docente</label>
            <select name="docente" value={filters.docente} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todos</option>
              {docentes.map((docente) => (
                <option key={docente} value={docente}>
                  {docente}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Grupo</label>
            <select name="grupo" value={filters.grupo} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todos</option>
              {grupos.map((grupo) => (
                <option key={grupo} value={grupo}>
                  {grupo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Estado</label>
            <select name="estado" value={filters.estado} onChange={handleFilterChange} className="field-control">
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Prioridad</label>
            <select name="prioridad" value={filters.prioridad} onChange={handleFilterChange} className="field-control">
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="soft-chip soft-chip--cool">{completedAssigned.length} completada(s)</span>
          <button type="button" onClick={resetFilters} className="secondary-btn">
            Limpiar filtros
          </button>
        </div>
      </SectionCard>

      <section className="mt-6">
        {filteredTasks.length === 0 ? (
          <EmptyState
            title="No hay tareas asignadas para mostrar"
            description="Ajusta los filtros o revisa más tarde."
            Icon={FiClipboard}
          />
        ) : (
          <div className="space-y-5">
            {filteredTasks.map((task) => {
              const deadlineMeta = getTaskDeadlineMeta(task);
              const noteValue = noteDrafts[task.id] ?? task.notaPersonal ?? '';

              return (
                <article
                  key={`${task.tipo}-${task.id}`}
                  className={`surface-panel interactive-card p-5 ${
                    deadlineMeta.key === 'vencida' ? '!border-rose-100 ring-1 ring-rose-100' : ''
                  }`}
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${deadlineMeta.className}`}>
                          {deadlineMeta.label}
                        </span>
                        {buildTaskBadges(task).map((badge) => (
                          <span key={badge.key} className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        ))}
                      </div>

                      <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{task.titulo}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{getSubjectName(subjectMap, task)}</p>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-700">Docente:</span> {task.docenteNombre || 'Sin docente'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Grupo:</span> {task.grupoNombre || 'Sin grupo'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Publicada:</span> {formatShortDate(task.fechaPublicacion)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Límite:</span> {formatShortDate(task.fechaEntrega)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Estado:</span> {formatStateLabel(task.estado)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Prioridad:</span> {formatPriorityLabel(task.prioridad)}
                        </p>
                      </div>

                      <div className="content-card mt-5 p-4">
                        <p className="text-sm font-bold text-slate-800">Instrucciones del docente</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{task.instrucciones || 'Sin instrucciones detalladas.'}</p>
                        {task.enlaceApoyo ? (
                          <a
                            href={task.enlaceApoyo}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                          >
                            <FiExternalLink className="text-base" />
                            Abrir enlace de apoyo
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="content-card p-4">
                      <label className="text-sm font-medium text-slate-600">Nota personal</label>
                      <textarea
                        value={noteValue}
                        onChange={(event) => handleNoteChange(task.id, event.target.value)}
                        rows="7"
                        className="field-control min-h-[150px] resize-y"
                        placeholder="Agrega dudas, avances o pendientes que quieras recordar."
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveNote(task)}
                          className="secondary-btn text-sm"
                        >
                          <FiSave className="text-base" />
                          Guardar nota
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(task)}
                          className="primary-btn text-sm"
                        >
                          {task.estado === 'completada' ? <FiRotateCcw className="text-base" /> : <FiCheckCircle className="text-base" />}
                          {task.estado === 'completada' ? 'Marcar pendiente' : 'Marcar completada'}
                        </button>
                      </div>

                      {task.fechaCompletada ? (
                        <p className="mt-4 rounded-[18px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          Completada: {formatShortDate(task.fechaCompletada)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
