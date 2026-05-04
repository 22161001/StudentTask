const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
});

const monthYearFormatter = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
});

const dayFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });

const padDatePart = (value) => String(value).padStart(2, '0');

const toDateKey = (date) => {
  const localDate = date instanceof Date ? date : new Date(date);
  return `${localDate.getFullYear()}-${padDatePart(localDate.getMonth() + 1)}-${padDatePart(localDate.getDate())}`;
};

const parseLocalDate = (value) => {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = String(value ?? '').split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
};

const getTodayKey = () => toDateKey(new Date());

const addDays = (dateOrKey, days) => {
  const date = parseLocalDate(dateOrKey);
  date.setDate(date.getDate() + days);
  return date;
};

const getRelativeDateKey = (days) => toDateKey(addDays(getTodayKey(), days));
const getTomorrowKey = () => getRelativeDateKey(1);

const formatShortDate = (value) => (value ? shortDateFormatter.format(parseLocalDate(value)) : 'Sin fecha');
const formatLongDate = (value) => (value ? longDateFormatter.format(parseLocalDate(value)) : 'Sin fecha');
const formatMonthTitle = (value) => monthYearFormatter.format(parseLocalDate(value));
const formatWeekday = (value) => weekdayFormatter.format(parseLocalDate(value));

const getDateParts = (value) => {
  const date = parseLocalDate(value);
  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date),
  };
};

const isTaskOverdue = (dateValue, state) => state !== 'completada' && dateValue < getTodayKey();
const isTaskToday = (dateValue) => dateValue === getTodayKey();

const getUpcomingLimitKey = (days = 7) => toDateKey(addDays(getTodayKey(), days));

const compareByDueDate = (taskA, taskB, direction = 'asc') => {
  const order = direction === 'desc' ? -1 : 1;
  return String(taskA.fechaEntrega).localeCompare(String(taskB.fechaEntrega)) * order;
};

const getStartOfWeek = (dateOrKey) => {
  const date = parseLocalDate(dateOrKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const getEndOfWeek = (dateOrKey) => addDays(toDateKey(getStartOfWeek(dateOrKey)), 6);

const getStartOfMonth = (dateOrKey) => {
  const date = parseLocalDate(dateOrKey);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (dateOrKey) => {
  const date = parseLocalDate(dateOrKey);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const getWeekDays = (dateOrKey) => {
  const start = getStartOfWeek(dateOrKey);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = toDateKey(date);
    return {
      key,
      date,
      day: dayFormatter.format(date),
      weekday: weekdayFormatter.format(date),
      isToday: key === getTodayKey(),
    };
  });
};

const getMonthGridDays = (dateOrKey) => {
  const monthStart = getStartOfMonth(dateOrKey);
  const monthEnd = getEndOfMonth(dateOrKey);
  const gridStart = getStartOfWeek(monthStart);
  const totalDays = Math.ceil(((monthEnd - gridStart) / 86400000 + 1) / 7) * 7;

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    return {
      key,
      date,
      day: dayFormatter.format(date),
      weekday: weekdayFormatter.format(date),
      isToday: key === getTodayKey(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
    };
  });
};

const moveDateByPeriod = (dateKey, mode, direction) => {
  const date = parseLocalDate(dateKey);

  if (mode === 'mes') {
    date.setMonth(date.getMonth() + direction);
    return toDateKey(date);
  }

  if (mode === 'semana') {
    date.setDate(date.getDate() + direction * 7);
    return toDateKey(date);
  }

  date.setDate(date.getDate() + direction);
  return toDateKey(date);
};

const getPeriodLabel = (dateKey, mode) => {
  if (mode === 'mes') {
    return formatMonthTitle(dateKey);
  }

  if (mode === 'semana') {
    const start = toDateKey(getStartOfWeek(dateKey));
    const end = toDateKey(getEndOfWeek(dateKey));
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  return formatLongDate(dateKey);
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

const formatTaskTypeLabel = (value) => {
  const labelMap = {
    personal: 'Personal',
    asignada: 'Asignada',
  };
  return labelMap[value] ?? value;
};

const formatTaskOriginLabel = (value) => {
  const labelMap = {
    estudiante: 'Estudiante',
    docente: 'Docente',
  };
  return labelMap[value] ?? value;
};

export {
  addDays,
  compareByDueDate,
  formatLongDate,
  formatMonthTitle,
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
  formatTaskOriginLabel,
  formatTaskTypeLabel,
  formatWeekday,
  getDateParts,
  getEndOfMonth,
  getEndOfWeek,
  getMonthGridDays,
  getPeriodLabel,
  getRelativeDateKey,
  getStartOfMonth,
  getStartOfWeek,
  getTodayKey,
  getTomorrowKey,
  getUpcomingLimitKey,
  getWeekDays,
  isTaskOverdue,
  isTaskToday,
  moveDateByPeriod,
  parseLocalDate,
  toDateKey,
};
