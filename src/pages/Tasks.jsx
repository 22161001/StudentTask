import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiFilter, FiList, FiPlusCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import FeedbackBanner from '../components/FeedbackBanner';
import MainLayout from '../layout/MainLayout';
import PageHero from '../components/PageHero';
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
      message: editingId ? 'Tarea actualizada.' : 'Tarea creada.',
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
    if (!window.confirm(`Se eliminará la tarea "${task.titulo}". ¿Deseas continuar?`)) {
      return;
    }

    const result = await deleteTask(task.id);
    if (!result.ok) {
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setTasks(result.tasks);
    setFeedback({ type: 'success', message: 'Tarea eliminada.' });
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
      message: task.estado === 'completada' ? 'La tarea volvió a pendiente.' : 'Tarea completada.',
    });
  };

  return (
    <MainLayout
      title="Tareas"
      subtitle="Organiza tus pendientes por materia, fecha y prioridad."
    >
      <PageHero
        eyebrow="Pendientes"
        title="Reúne tus tareas personales y las asignadas por docentes."
        description="Da seguimiento a fechas, prioridades, notas y avance desde una sola vista."
        stats={[
          { label: 'Pendientes', value: pendingTasks.length, helper: `${nextDeliveries.length} vencen esta semana.`, tone: 'primary', Icon: FiClock },
          { label: 'Completadas', value: completedTasks.length, helper: 'Actividades marcadas como resueltas.', tone: 'success', Icon: FiCheckCircle },
          { label: 'Vencidas', value: overdueTasks.length, helper: 'Requieren atención prioritaria.', tone: overdueTasks.length ? 'danger' : 'neutral', Icon: FiAlertTriangle },
        ]}
      />

      {feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow={editingId ? 'Edición activa' : 'Agregar tarea'}
          title={editingId ? 'Actualiza una tarea personal' : 'Registra una nueva tarea personal'}
          description="Agrega materia, fecha, prioridad y una nota personal."
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
            title="Filtrar tareas"
            description="Encuentra pendientes por estado, prioridad, materia o fecha."
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
            eyebrow={`${nextDeliveries.length} próximas`}
            title="Tareas personales y asignadas"
            description={`${personalTasks.length} personales y ${assignedTasks.length} asignadas.`}
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
