const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
});

const dayFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });

const parseLocalDate = (value) => new Date(`${value}T00:00:00`);
const getTodayKey = () => new Date().toISOString().split('T')[0];

const formatShortDate = (value) => shortDateFormatter.format(parseLocalDate(value));
const formatLongDate = (value) => longDateFormatter.format(parseLocalDate(value));

const getDateParts = (value) => {
  const date = parseLocalDate(value);
  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date),
  };
};

const isTaskOverdue = (dateValue, state) => state !== 'completada' && dateValue < getTodayKey();
const isTaskToday = (dateValue) => dateValue === getTodayKey();

const getUpcomingLimitKey = (days = 7) => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().split('T')[0];
};

const compareByDueDate = (taskA, taskB, direction = 'asc') => {
  const order = direction === 'desc' ? -1 : 1;
  return taskA.fechaEntrega.localeCompare(taskB.fechaEntrega) * order;
};

const formatPriorityLabel = (value) => {
  const labelMap = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
  };
  return labelMap[value] ?? value;
};

const formatStateLabel = (value) => {
  const labelMap = {
    pendiente: 'Pendiente',
    completada: 'Completada',
  };
  return labelMap[value] ?? value;
};

export {
  compareByDueDate,
  formatLongDate,
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
  getDateParts,
  getTodayKey,
  getUpcomingLimitKey,
  isTaskOverdue,
  isTaskToday,
  parseLocalDate,
};
