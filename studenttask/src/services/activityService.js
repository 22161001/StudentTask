import { getTodayKey } from '../utils/date';
import { enrichTasks } from './analyticsService';

const buildActivity = ({ id, type, dateKey, title, description, task }) => ({
  id,
  type,
  dateKey,
  title,
  description,
  taskId: task.id,
  taskTitle: task.titulo,
  subjectName: task.subjectName,
  taskType: task.tipo,
});

const getActivityHistory = (tasks = [], subjects = [], limit = 12) => {
  const todayKey = getTodayKey();
  const enrichedTasks = enrichTasks(tasks, subjects);
  const activities = [];

  enrichedTasks.forEach((task) => {
    if (task.createdKey) {
      activities.push(
        buildActivity({
          id: `${task.id}-created`,
          type: task.tipo === 'asignada' ? 'assigned_received' : 'created',
          dateKey: task.createdKey,
          title: task.tipo === 'asignada' ? 'Tarea asignada recibida' : 'Tarea creada',
          description:
            task.tipo === 'asignada'
              ? `${task.docenteNombre || 'Docente'} publicó una actividad para ${task.subjectName}.`
              : `Registraste una tarea personal en ${task.subjectName}.`,
          task,
        }),
      );
    }

    if (task.completedKey) {
      activities.push(
        buildActivity({
          id: `${task.id}-completed`,
          type: task.isLate ? 'completed_late' : 'completed',
          dateKey: task.completedKey,
          title: task.isLate ? 'Tarea completada tarde' : 'Tarea completada',
          description: `${task.titulo} quedó marcada como completada.`,
          task,
        }),
      );
    }

    if (task.isOverdue && task.dueKey && task.dueKey <= todayKey) {
      activities.push(
        buildActivity({
          id: `${task.id}-overdue`,
          type: 'overdue',
          dateKey: task.dueKey,
          title: 'Tarea vencida',
          description: `${task.titulo} pasó su fecha límite y sigue pendiente.`,
          task,
        }),
      );
    }

    if (task.updatedKey && task.updatedKey !== task.createdKey && task.updatedKey !== task.completedKey) {
      activities.push(
        buildActivity({
          id: `${task.id}-updated`,
          type: 'updated',
          dateKey: task.updatedKey,
          title: 'Cambio importante',
          description: `Actualizaste seguimiento, estado o nota de ${task.titulo}.`,
          task,
        }),
      );
    }
  });

  return activities
    .sort((activityA, activityB) => {
      if (activityB.dateKey !== activityA.dateKey) {
        return activityB.dateKey.localeCompare(activityA.dateKey);
      }

      return activityA.title.localeCompare(activityB.title);
    })
    .slice(0, limit);
};

export { getActivityHistory };
