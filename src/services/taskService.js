import {
  STORAGE_KEYS,
  createId,
  readStorage,
  validTaskOrigins,
  validTaskPriorities,
  validTaskStates,
  validTaskTypes,
  writeStorage,
} from './storageService';
import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import {
  normalizeApiErrors,
  normalizeTaskPayload,
  normalizeTasksPayload,
  serializeTaskPayload,
} from './apiMappers';
import { getTodayKey } from '../utils/date';

const TASK_PRIORITY_OPTIONS = ['baja', 'media', 'alta'];
const TASK_STATE_OPTIONS = ['pendiente', 'completada'];
const TASK_TYPE_OPTIONS = ['personal', 'asignada'];
const TASK_ORIGIN_OPTIONS = ['estudiante', 'docente'];

const getTasks = () => readStorage(STORAGE_KEYS.tasks, []);
const getPersonalTasks = () => getTasks().filter((task) => task.tipo === 'personal');
const getAssignedTasks = () => getTasks().filter((task) => task.tipo === 'asignada');
const getTaskId = (taskOrId) => Number(typeof taskOrId === 'object' ? taskOrId?.id : taskOrId);
const getTaskType = (taskOrId) => (typeof taskOrId === 'object' ? taskOrId?.tipo : undefined);
const findTaskByIdentity = (tasks, taskOrId) => {
  const taskId = getTaskId(taskOrId);
  const taskType = getTaskType(taskOrId);

  return tasks.find((task) => task.id === taskId && (!taskType || task.tipo === taskType)) ?? null;
};

const persistTasks = (tasks) => {
  writeStorage(STORAGE_KEYS.tasks, tasks);
  return tasks;
};

const isValidDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const validateDateField = (errors, key, value, label) => {
  if (!value) {
    errors[key] = `${label} es obligatoria.`;
  } else if (!isValidDateKey(value)) {
    errors[key] = `Captura una ${label.toLowerCase()} válida.`;
  }
};

const validateTask = (data) => {
  const errors = {};
  const title = String(data.titulo ?? '').trim();
  const subjectId = Number(data.materiaId);
  const publicationDate = String(data.fechaPublicacion ?? '').trim();
  const dueDate = String(data.fechaEntrega ?? '').trim();
  const priority = String(data.prioridad ?? '').trim().toLowerCase();
  const state = String(data.estado ?? '').trim().toLowerCase();
  const taskType = String(data.tipo ?? 'personal').trim().toLowerCase();
  const origin = String(data.origen ?? 'estudiante').trim().toLowerCase();
  const estimatedHours = data.tiempoEstimadoHoras === '' ? 0 : Number(data.tiempoEstimadoHoras);
  const subjects = readStorage(STORAGE_KEYS.subjects, []);

  if (!title) {
    errors.titulo = 'El título es obligatorio.';
  }

  if (!subjectId || !subjects.some((subject) => subject.id === subjectId)) {
    errors.materiaId = 'Selecciona una materia válida.';
  }

  validateDateField(errors, 'fechaPublicacion', publicationDate, 'Fecha de publicación');
  validateDateField(errors, 'fechaEntrega', dueDate, 'Fecha de entrega');

  if (!validTaskPriorities.has(priority)) {
    errors.prioridad = 'Selecciona una prioridad válida.';
  }

  if (!validTaskStates.has(state)) {
    errors.estado = 'Selecciona un estado válido.';
  }

  if (!validTaskTypes.has(taskType)) {
    errors.tipo = 'Selecciona un tipo de tarea válido.';
  }

  if (!validTaskOrigins.has(origin)) {
    errors.origen = 'Selecciona un origen válido.';
  }

  if (!Number.isFinite(estimatedHours) || estimatedHours < 0) {
    errors.tiempoEstimadoHoras = 'Captura un tiempo estimado válido.';
  }

  return errors;
};

const buildCompletionDate = (nextState, previousTask, requestedDate) => {
  if (nextState !== 'completada') {
    return null;
  }

  return String(requestedDate ?? previousTask?.fechaCompletada ?? '').trim() || getTodayKey();
};

const buildPersonalTaskPayload = (data, currentTask = {}) => {
  const timestamp = new Date().toISOString();
  const nextState = String(data.estado ?? 'pendiente').trim().toLowerCase();

  return {
    ...currentTask,
    titulo: String(data.titulo ?? '').trim(),
    descripcion: String(data.descripcion ?? '').trim(),
    materiaId: Number(data.materiaId),
    fechaPublicacion: String(data.fechaPublicacion ?? '').trim(),
    fechaEntrega: String(data.fechaEntrega ?? '').trim(),
    prioridad: String(data.prioridad ?? 'media').trim().toLowerCase(),
    estado: nextState,
    tipo: 'personal',
    origen: 'estudiante',
    docenteNombre: '',
    grupoNombre: '',
    instrucciones: '',
    enlaceApoyo: '',
    tiempoEstimadoHoras: Number(data.tiempoEstimadoHoras) || 0,
    recordatorio: Boolean(data.recordatorio),
    notaPersonal: String(data.notaPersonal ?? '').trim(),
    fechaCompletada: buildCompletionDate(nextState, currentTask, data.fechaCompletada),
    createdAt: currentTask.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

const createTaskLocal = (data) => {
  const payload = { ...data, tipo: 'personal', origen: 'estudiante' };
  const errors = validateTask(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const tasks = getTasks();
  const task = {
    id: createId(tasks),
    ...buildPersonalTaskPayload(payload),
  };

  const nextTasks = persistTasks([...tasks, task]);
  return { ok: true, task, tasks: nextTasks };
};

const updateTaskLocal = (taskId, data) => {
  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === taskId);

  if (!currentTask) {
    return { ok: false, message: 'La tarea que intentas editar ya no existe.' };
  }

  if (currentTask.tipo === 'asignada') {
    return {
      ok: false,
      message: 'Las tareas asignadas por docente solo permiten cambiar estado y nota personal.',
    };
  }

  const payload = { ...data, tipo: 'personal', origen: 'estudiante' };
  const errors = validateTask(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const updatedTask = {
    ...buildPersonalTaskPayload(payload, currentTask),
    id: currentTask.id,
  };

  const nextTasks = persistTasks(tasks.map((task) => (task.id === taskId ? updatedTask : task)));
  return { ok: true, task: updatedTask, tasks: nextTasks };
};

const updateAssignedTaskProgressLocal = (taskId, changes) => {
  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === getTaskId(taskId) && task.tipo === 'asignada');

  if (!currentTask) {
    return { ok: false, message: 'La tarea asignada que intentas actualizar ya no existe.' };
  }

  if (currentTask.tipo !== 'asignada') {
    return { ok: false, message: 'Esta acción solo aplica para tareas asignadas por docente.' };
  }

  const nextState = String(changes.estado ?? currentTask.estado).trim().toLowerCase();
  if (!validTaskStates.has(nextState)) {
    return { ok: false, errors: { estado: 'Selecciona un estado válido.' } };
  }

  const updatedTask = {
    ...currentTask,
    estado: nextState,
    notaPersonal: String(changes.notaPersonal ?? currentTask.notaPersonal ?? '').trim(),
    fechaCompletada: buildCompletionDate(nextState, currentTask, changes.fechaCompletada),
    updatedAt: new Date().toISOString(),
  };

  const nextTasks = persistTasks(tasks.map((task) => (task.id === getTaskId(taskId) && task.tipo === 'asignada' ? updatedTask : task)));
  return { ok: true, task: updatedTask, tasks: nextTasks };
};

const updateTaskProgressLocal = (taskOrId, changes) => {
  const tasks = getTasks();
  const currentTask = findTaskByIdentity(tasks, taskOrId);

  if (!currentTask) {
    return { ok: false, message: 'La tarea que intentas actualizar ya no existe.' };
  }

  if (currentTask.tipo === 'asignada') {
    return updateAssignedTaskProgressLocal(currentTask, changes);
  }

  const nextState = String(changes.estado ?? currentTask.estado).trim().toLowerCase();
  if (!validTaskStates.has(nextState)) {
    return { ok: false, errors: { estado: 'Selecciona un estado válido.' } };
  }

  const updatedTask = {
    ...currentTask,
    estado: nextState,
    notaPersonal: String(changes.notaPersonal ?? currentTask.notaPersonal ?? '').trim(),
    fechaCompletada: buildCompletionDate(nextState, currentTask, changes.fechaCompletada),
    updatedAt: new Date().toISOString(),
  };

  const nextTasks = persistTasks(tasks.map((task) => (task.id === currentTask.id && task.tipo === currentTask.tipo ? updatedTask : task)));
  return { ok: true, task: updatedTask, tasks: nextTasks };
};

const deleteTaskLocal = (taskId) => {
  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === taskId);

  if (currentTask?.tipo === 'asignada') {
    return { ok: false, message: 'No puedes eliminar tareas asignadas por docente desde el rol estudiante.' };
  }

  const nextTasks = persistTasks(tasks.filter((task) => task.id !== taskId));
  return { ok: true, tasks: nextTasks };
};

const syncTasks = async () => {
  const localTasks = getTasks();
  const localPersonalTasks = localTasks.filter((task) => task.tipo !== 'asignada');
  const localAssignedTasks = localTasks.filter((task) => task.tipo === 'asignada');
  const errors = [];

  const personalResult = await request('/tareas')
    .then(({ data }) => ({
      ok: true,
      tasks: normalizeTasksPayload(data).map((task) => ({ ...task, tipo: 'personal', origen: task.origen || 'estudiante' })),
    }))
    .catch((error) => {
      errors.push(error);
      return { ok: false, tasks: localPersonalTasks, error };
    });

  const assignedResult = await request('/tareas-asignadas')
    .then(({ data }) => ({
      ok: true,
      tasks: normalizeTasksPayload(data).map((task) => ({ ...task, tipo: 'asignada', origen: 'docente' })),
    }))
    .catch((error) => {
      errors.push(error);
      return { ok: false, tasks: localAssignedTasks, error };
    });

  const tasks = persistTasks([...personalResult.tasks, ...assignedResult.tasks]);

  if (personalResult.ok || assignedResult.ok) {
    return {
      ok: true,
      tasks,
      message: errors.length > 0 ? 'Se muestran datos locales de respaldo para algunos módulos.' : '',
      fallback: errors.length > 0,
    };
  }

  const firstError = errors[0];
  if (errors.every((error) => isApiFallbackError(error))) {
    return {
      ok: true,
      tasks,
      message: 'No se pudo conectar con el servidor. Se muestran datos locales de respaldo.',
      fallback: true,
    };
  }

  return {
    ok: false,
    message: extractApiMessage(firstError?.payload, 'No se pudieron cargar tus tareas.'),
    errors: normalizeApiErrors(firstError?.payload),
    tasks,
  };
};

const createTask = async (data) => {
  const payload = { ...data, tipo: 'personal', origen: 'estudiante' };
  const errors = validateTask(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const { data: responseData } = await request('/tareas', {
      method: 'POST',
      body: serializeTaskPayload(buildPersonalTaskPayload(payload)),
    });

    const syncResult = await syncTasks();
    return {
      ok: true,
      task: normalizeTaskPayload(responseData),
      tasks: syncResult.tasks ?? getTasks(),
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return createTaskLocal(payload);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo crear la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateTask = async (taskId, data) => {
  const currentTask = getTasks().find((task) => task.id === taskId);

  if (currentTask?.tipo === 'asignada') {
    return {
      ok: false,
      message: 'Las tareas asignadas por docente solo permiten cambiar estado y nota personal.',
    };
  }

  const payload = { ...data, tipo: 'personal', origen: 'estudiante' };
  const errors = validateTask(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    await request(`/tareas/${taskId}`, {
      method: 'PUT',
      body: serializeTaskPayload(buildPersonalTaskPayload(payload, currentTask)),
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
      return updateTaskLocal(taskId, payload);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateAssignedTaskProgress = async (taskId, changes) => {
  const assignedTaskId = getTaskId(taskId);

  try {
    await request(`/tareas-asignadas/${assignedTaskId}/progreso`, {
      method: 'PATCH',
      body: {
        estado: changes.estado,
        nota_personal: changes.notaPersonal,
        fecha_entrega: changes.fechaCompletada,
      },
    });

    const syncResult = await syncTasks();
    const tasks = syncResult.tasks ?? getTasks();
    return {
      ok: true,
      task: tasks.find((task) => task.id === assignedTaskId && task.tipo === 'asignada') ?? null,
      tasks,
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return updateAssignedTaskProgressLocal(taskId, changes);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar la tarea asignada.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateTaskProgress = async (taskOrId, changes) => {
  const currentTask = findTaskByIdentity(getTasks(), taskOrId);

  if (currentTask?.tipo === 'asignada') {
    return updateAssignedTaskProgress(currentTask, changes);
  }

  const taskId = getTaskId(taskOrId);

  try {
    await request(`/tareas/${taskId}/progreso`, {
      method: 'PATCH',
      body: {
        estado: changes.estado,
        nota_personal: changes.notaPersonal,
        fecha_completada: changes.fechaCompletada,
      },
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
      return updateTaskProgressLocal(taskId, changes);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar el estado de la tarea.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const deleteTask = async (taskId) => {
  const currentTask = getTasks().find((task) => task.id === taskId);

  if (currentTask?.tipo === 'asignada') {
    return { ok: false, message: 'No puedes eliminar tareas asignadas por docente desde el rol estudiante.' };
  }

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

const toggleTaskStatus = async (taskOrId) => {
  const tasks = getTasks();
  const currentTask = findTaskByIdentity(tasks, taskOrId);

  if (!currentTask) {
    return { ok: false, message: 'La tarea que intentas actualizar ya no existe.' };
  }

  const nextState = currentTask.estado === 'completada' ? 'pendiente' : 'completada';
  return updateTaskProgress(currentTask, {
    estado: nextState,
    notaPersonal: currentTask.notaPersonal,
  });
};

export {
  TASK_ORIGIN_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATE_OPTIONS,
  TASK_TYPE_OPTIONS,
  createTask,
  deleteTask,
  getAssignedTasks,
  getPersonalTasks,
  getTasks,
  syncTasks,
  toggleTaskStatus,
  updateAssignedTaskProgress,
  updateTask,
  updateTaskProgress,
};
