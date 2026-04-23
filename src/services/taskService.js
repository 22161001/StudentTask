import {
  STORAGE_KEYS,
  createId,
  readStorage,
  validTaskPriorities,
  validTaskStates,
  writeStorage,
} from './storageService';
import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import {
  normalizeApiErrors,
  normalizeTaskPayload,
  normalizeTasksPayload,
  serializeTaskPayload,
} from './apiMappers';

const TASK_PRIORITY_OPTIONS = ['baja', 'media', 'alta'];
const TASK_STATE_OPTIONS = ['pendiente', 'completada'];

const getTasks = () => readStorage(STORAGE_KEYS.tasks, []);

const persistTasks = (tasks) => {
  writeStorage(STORAGE_KEYS.tasks, tasks);
  return tasks;
};

const isValidDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const validateTask = (data) => {
  const errors = {};
  const title = String(data.titulo ?? '').trim();
  const subjectId = Number(data.materiaId);
  const dueDate = String(data.fechaEntrega ?? '').trim();
  const priority = String(data.prioridad ?? '').trim().toLowerCase();
  const state = String(data.estado ?? '').trim().toLowerCase();
  const subjects = readStorage(STORAGE_KEYS.subjects, []);

  if (!title) {
    errors.titulo = 'El titulo es obligatorio.';
  }

  if (!subjectId || !subjects.some((subject) => subject.id === subjectId)) {
    errors.materiaId = 'Selecciona una materia valida.';
  }

  if (!dueDate) {
    errors.fechaEntrega = 'La fecha de entrega es obligatoria.';
  } else if (!isValidDateKey(dueDate)) {
    errors.fechaEntrega = 'Captura una fecha de entrega valida.';
  }

  if (!validTaskPriorities.has(priority)) {
    errors.prioridad = 'Selecciona una prioridad valida.';
  }

  if (!validTaskStates.has(state)) {
    errors.estado = 'Selecciona un estado valido.';
  }

  return errors;
};

const createTaskLocal = (data) => {
  const errors = validateTask(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const tasks = getTasks();
  const timestamp = new Date().toISOString();
  const task = {
    id: createId(tasks),
    titulo: String(data.titulo).trim(),
    descripcion: String(data.descripcion ?? '').trim(),
    materiaId: Number(data.materiaId),
    fechaEntrega: String(data.fechaEntrega).trim(),
    prioridad: String(data.prioridad).trim().toLowerCase(),
    estado: String(data.estado).trim().toLowerCase(),
    recordatorio: Boolean(data.recordatorio),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const nextTasks = persistTasks([...tasks, task]);
  return { ok: true, task, tasks: nextTasks };
};

const updateTaskLocal = (taskId, data) => {
  const errors = validateTask(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === taskId);

  if (!currentTask) {
    return { ok: false, message: 'La tarea que intentas editar ya no existe.' };
  }

  const updatedTask = {
    ...currentTask,
    titulo: String(data.titulo).trim(),
    descripcion: String(data.descripcion ?? '').trim(),
    materiaId: Number(data.materiaId),
    fechaEntrega: String(data.fechaEntrega).trim(),
    prioridad: String(data.prioridad).trim().toLowerCase(),
    estado: String(data.estado).trim().toLowerCase(),
    recordatorio: Boolean(data.recordatorio),
    updatedAt: new Date().toISOString(),
  };

  const nextTasks = persistTasks(tasks.map((task) => (task.id === taskId ? updatedTask : task)));
  return { ok: true, task: updatedTask, tasks: nextTasks };
};

const deleteTaskLocal = (taskId) => {
  const tasks = getTasks();
  const nextTasks = persistTasks(tasks.filter((task) => task.id !== taskId));
  return { ok: true, tasks: nextTasks };
};

const syncTasks = async () => {
  try {
    const { data } = await request('/tareas');
    const tasks = persistTasks(normalizeTasksPayload(data));
    return { ok: true, tasks };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return { ok: true, tasks: getTasks() };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudieron cargar las tareas.'),
      errors: normalizeApiErrors(error.payload),
      tasks: getTasks(),
    };
  }
};

const createTask = async (data) => {
  const errors = validateTask(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const { data: responseData } = await request('/tareas', {
      method: 'POST',
      body: serializeTaskPayload(data),
    });

    const syncResult = await syncTasks();
    return {
      ok: true,
      task: normalizeTaskPayload(responseData),
      tasks: syncResult.tasks ?? getTasks(),
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return createTaskLocal(data);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo crear la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateTask = async (taskId, data) => {
  const errors = validateTask(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    await request(`/tareas/${taskId}`, {
      method: 'PUT',
      body: serializeTaskPayload(data),
    });

    const syncResult = await syncTasks();
    const tasks = syncResult.tasks ?? getTasks();
    return {
      ok: true,
      task: tasks.find((task) => task.id === taskId) ?? null,
      tasks,
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return updateTaskLocal(taskId, data);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const deleteTask = async (taskId) => {
  try {
    await request(`/tareas/${taskId}`, { method: 'DELETE' });
    const syncResult = await syncTasks();
    return { ok: true, tasks: syncResult.tasks ?? getTasks() };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return deleteTaskLocal(taskId);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo eliminar la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const toggleTaskStatus = async (taskId) => {
  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === taskId);

  if (!currentTask) {
    return { ok: false, message: 'La tarea que intentas actualizar ya no existe.' };
  }

  const nextState = currentTask.estado === 'completada' ? 'pendiente' : 'completada';
  return updateTask(taskId, { ...currentTask, estado: nextState });
};

export {
  TASK_PRIORITY_OPTIONS,
  TASK_STATE_OPTIONS,
  createTask,
  deleteTask,
  getTasks,
  syncTasks,
  toggleTaskStatus,
  updateTask,
};
