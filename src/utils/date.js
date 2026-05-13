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

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const formatDateKeyFromDate = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const buildLocalDate = (year, month, day) => {
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date(Number.NaN);
  }

  return date;
};

const normalizeDateKey = (value) => {
  if (value instanceof Date) {
    return isValidDate(value) ? formatDateKeyFromDate(value) : '';
  }

  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return '';
  }

  const dateKeyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (dateKeyMatch) {
    const [, yearValue, monthValue, dayValue] = dateKeyMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = buildLocalDate(year, month, day);

    return isValidDate(date) ? `${yearValue}-${monthValue}-${dayValue}` : '';
  }

  const parsedDate = new Date(rawValue);
  return isValidDate(parsedDate) ? formatDateKeyFromDate(parsedDate) : '';
};

const toDateKey = (date) => {
  const localDate = date instanceof Date ? date : parseLocalDate(date);
  if (!isValidDate(localDate)) {
    return '';
  }

  return `${localDate.getFullYear()}-${padDatePart(localDate.getMonth() + 1)}-${padDatePart(localDate.getDate())}`;
};

const parseLocalDate = (value) => {
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : new Date(Number.NaN);
  }

  const dateKey = normalizeDateKey(value);
  if (!dateKey) {
    return new Date(Number.NaN);
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  return buildLocalDate(year, month, day);
};

const getTodayKey = () => toDateKey(new Date());

const addDays = (dateOrKey, days) => {
  const date = parseLocalDate(dateOrKey);
  date.setDate(date.getDate() + days);
  return date;
};

const getRelativeDateKey = (days) => toDateKey(addDays(getTodayKey(), days));
const getTomorrowKey = () => getRelativeDateKey(1);

const formatDateValue = (value, formatter, fallback = 'Sin fecha') => {
  const date = parseLocalDate(value);
  return isValidDate(date) ? formatter.format(date) : fallback;
};

const formatShortDate = (value) => formatDateValue(value, shortDateFormatter);
const formatLongDate = (value) => formatDateValue(value, longDateFormatter);
const formatMonthTitle = (value) => formatDateValue(value, monthYearFormatter);
const formatWeekday = (value) => formatDateValue(value, weekdayFormatter);

const getDateParts = (value) => {
  const date = parseLocalDate(value);
  if (!isValidDate(date)) {
    return {
      day: '--',
      month: 'Sin fecha',
    };
  }

  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date),
  };
};

const isTaskOverdue = (dateValue, state) => {
  const dateKey = normalizeDateKey(dateValue);
  return state !== 'completada' && Boolean(dateKey) && dateKey < getTodayKey();
};

const isTaskToday = (dateValue) => normalizeDateKey(dateValue) === getTodayKey();

const getUpcomingLimitKey = (days = 7) => toDateKey(addDays(getTodayKey(), days));

const compareByDueDate = (taskA, taskB, direction = 'asc') => {
  const order = direction === 'desc' ? -1 : 1;
  const dateA = normalizeDateKey(taskA?.fechaEntrega);
  const dateB = normalizeDateKey(taskB?.fechaEntrega);

  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateA.localeCompare(dateB) * order;
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
  normalizeDateKey,
  parseLocalDate,
  toDateKey,
};
