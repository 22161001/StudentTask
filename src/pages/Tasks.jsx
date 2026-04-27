import { useEffect, useMemo, useState } from 'react';
import { FiFilter, FiList, FiPlusCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import SectionCard from '../components/SectionCard';
import TaskFilters from '../components/TaskFilters';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import {
  createTask,
  deleteTask,
  getTasks,
  syncTasks,
  toggleTaskStatus,
  updateTask,
} from '../services/taskService';
import { getSubjects, syncSubjects } from '../services/subjectService';
import { compareByDueDate, getTodayKey, getUpcomingLimitKey } from '../utils/date';

const createInitialForm = (subjects) => ({
  titulo: '',
  descripcion: '',
  materiaId: subjects[0]?.id?.toString() ?? '',
  fechaPublicacion: getTodayKey(),
  fechaEntrega: '',
  prioridad: 'media',
  estado: 'pendiente',
  tiempoEstimadoHoras: '',
  recordatorio: false,
  notaPersonal: '',
});

const initialFilters = {
  search: '',
  estado: 'todos',
  prioridad: 'todas',
  materiaId: 'todas',
  tipo: 'todos',
  origen: 'todos',
  orden: 'asc',
};

export default function Tasks() {
  const [tasks, setTasks] = useState(getTasks());
  const [subjects, setSubjects] = useState(getSubjects());
  const [form, setForm] = useState(createInitialForm(getSubjects()));
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [tasksResult, subjectsResult] = await Promise.all([syncTasks(), syncSubjects()]);

      if (!isMounted) {
        return;
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
        setForm((currentForm) => (currentForm.materiaId ? currentForm : createInitialForm(subjectsResult.subjects)));
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasSubjects = subjects.length > 0;
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);

  const filteredTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return tasks
      .filter((task) => (filters.estado === 'todos' ? true : task.estado === filters.estado))
      .filter((task) => (filters.prioridad === 'todas' ? true : task.prioridad === filters.prioridad))
      .filter((task) => (filters.materiaId === 'todas' ? true : task.materiaId === Number(filters.materiaId)))
      .filter((task) => (filters.tipo === 'todos' ? true : task.tipo === filters.tipo))
      .filter((task) => (filters.origen === 'todos' ? true : task.origen === filters.origen))
      .filter((task) => {
        if (!query) {
          return true;
        }

        return [task.titulo, task.descripcion, task.docenteNombre, task.grupoNombre, task.instrucciones, task.notaPersonal]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((taskA, taskB) => compareByDueDate(taskA, taskB, filters.orden));
  }, [filters, tasks]);

  const todayKey = getTodayKey();
  const nextWeekKey = getUpcomingLimitKey(7);
  const pendingTasks = tasks.filter((task) => task.estado === 'pendiente');
  const completedTasks = tasks.filter((task) => task.estado === 'completada');
  const personalTasks = tasks.filter((task) => task.tipo === 'personal');
  const assignedTasks = tasks.filter((task) => task.tipo === 'asignada');
  const overdueTasks = pendingTasks.filter((task) => task.fechaEntrega < todayKey);
  const nextDeliveries = pendingTasks.filter((task) => task.fechaEntrega >= todayKey && task.fechaEntrega <= nextWeekKey);

  const resetForm = () => {
    setForm(createInitialForm(subjects));
    setEditingId(null);
    setErrors({});
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setFeedback(null);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = editingId ? await updateTask(editingId, form) : await createTask(form);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setTasks(result.tasks);
    setFeedback({
      type: 'success',
      message: editingId ? 'La tarea se actualizo correctamente.' : 'La tarea se creo correctamente.',
    });
    resetForm();
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({
      titulo: task.titulo,
      descripcion: task.descripcion,
      materiaId: String(task.materiaId),
      fechaPublicacion: task.fechaPublicacion,
      fechaEntrega: task.fechaEntrega,
      prioridad: task.prioridad,
      estado: task.estado,
      tiempoEstimadoHoras: String(task.tiempoEstimadoHoras ?? ''),
      recordatorio: Boolean(task.recordatorio),
      notaPersonal: task.notaPersonal ?? '',
    });
    setErrors({});
    setFeedback(null);
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Se eliminara la tarea "${task.titulo}". Deseas continuar?`)) {
      return;
    }

    const result = await deleteTask(task.id);
    if (!result.ok) {
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setTasks(result.tasks);
    setFeedback({ type: 'success', message: 'La tarea se elimino correctamente.' });
    if (editingId === task.id) {
      resetForm();
    }
  };

  const handleToggleStatus = async (task) => {
    const result = await toggleTaskStatus(task.id);
    if (!result.ok) {
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setTasks(result.tasks);
    setFeedback({
      type: 'success',
      message: task.estado === 'completada' ? 'La tarea volvio a pendiente.' : 'La tarea se marco como completada.',
    });
  };

  return (
    <MainLayout
      title="Tareas"
      subtitle="CRUD completo de tus tareas con filtros, busqueda, orden por fecha y seguimiento academico real."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <span className="soft-chip soft-chip--cool">CRUD de tareas</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900">
              Controla tus tareas personales y revisa las asignadas por docente en una sola lista operativa.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Puedes crear, editar y eliminar tareas personales. Las asignadas se muestran con sus datos protegidos y solo permiten avance de estado.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 px-4 py-5 text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/[0.45]">Pendientes</p>
              <p className="mt-3 text-3xl font-black">{pendingTasks.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completadas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{completedTasks.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Vencidas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{overdueTasks.length}</p>
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={`mb-6 rounded-[24px] px-5 py-4 text-sm font-medium ${
            feedback.type === 'error'
              ? 'border border-rose-100 bg-rose-50 text-rose-700'
              : 'border border-blue-100 bg-blue-50 text-blue-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow={editingId ? 'Edicion activa' : 'Agregar tarea'}
          title={editingId ? 'Actualiza una tarea personal' : 'Registra una nueva tarea personal'}
          description="Incluye materia, fechas, prioridad, tiempo estimado, nota y recordatorio."
          Icon={FiPlusCircle}
        >
          <TaskForm
            form={form}
            errors={errors}
            subjects={subjects}
            hasSubjects={hasSubjects}
            isEditing={Boolean(editingId)}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow={`${filteredTasks.length} tarea(s)`}
            title="Listado filtrable de tareas"
            description="Busca y filtra por estado, prioridad, materia, tipo, origen o fecha de entrega."
            Icon={FiFilter}
          >
            <TaskFilters
              filters={filters}
              subjects={subjects}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              resultsCount={filteredTasks.length}
            />
          </SectionCard>

          <SectionCard
            eyebrow={`${nextDeliveries.length} proximas`}
            title="Tareas personales y asignadas"
            description={`${personalTasks.length} personales y ${assignedTasks.length} asignadas, ordenadas con acciones segun el origen.`}
            Icon={FiList}
          >
            <TaskList
              tasks={filteredTasks}
              subjectsById={subjectMap}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              emptyAction={
                hasSubjects ? (
                  <button type="button" onClick={handleResetFilters} className="secondary-btn">
                    Limpiar filtros
                  </button>
                ) : (
                  <Link to="/materias" className="primary-btn">
                    Registrar materia
                  </Link>
                )
              }
            />
          </SectionCard>
        </div>
      </div>
    </MainLayout>
  );
}
