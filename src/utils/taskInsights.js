import {
  addDays,
  compareByDueDate,
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
  formatTaskOriginLabel,
  formatTaskTypeLabel,
  getTodayKey,
  getTomorrowKey,
  getUpcomingLimitKey,
  isTaskOverdue,
  toDateKey,
} from './date';

const priorityStyles = {
  alta: 'bg-blue-50 text-blue-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const statusStyles = {
  pendiente: 'bg-amber-50 text-amber-700',
  completada: 'bg-emerald-50 text-emerald-700',
};

const typeStyles = {
  personal: 'bg-indigo-50 text-indigo-700',
  asignada: 'bg-cyan-50 text-cyan-700',
};

const originStyles = {
  estudiante: 'bg-slate-100 text-slate-600',
  docente: 'bg-blue-50 text-blue-700',
};

const deadlineStyles = {
  vencida: 'bg-rose-50 text-rose-700',
  hoy: 'bg-blue-50 text-blue-700',
  manana: 'bg-sky-50 text-sky-700',
  proxima: 'bg-slate-100 text-slate-600',
  completada: 'bg-emerald-50 text-emerald-700',
};

const getTaskPath = (task) => (task.tipo === 'asignada' ? '/tareas-asignadas' : '/tareas');

const getSubjectName = (subjectsById, task) => subjectsById.get(task.materiaId)?.nombre ?? 'Sin materia';

const getTaskDeadlineMeta = (task) => {
  if (task.estado === 'completada') {
    return { key: 'completada', label: 'Completada', className: deadlineStyles.completada };
  }

  if (isTaskOverdue(task.fechaEntrega, task.estado)) {
    return { key: 'vencida', label: 'Vencida', className: deadlineStyles.vencida };
  }

  if (task.fechaEntrega === getTodayKey()) {
    return { key: 'hoy', label: 'Entrega hoy', className: deadlineStyles.hoy };
  }

  if (task.fechaEntrega === getTomorrowKey()) {
    return { key: 'manana', label: 'Entrega mañana', className: deadlineStyles.manana };
  }

  return { key: 'proxima', label: 'Próxima', className: deadlineStyles.proxima };
};

const getReminderInsights = (tasks, days = 7) => {
  const todayKey = getTodayKey();
  const tomorrowKey = getTomorrowKey();
  const upcomingLimitKey = getUpcomingLimitKey(days);
  const pendingTasks = tasks.filter((task) => task.estado === 'pendiente');

  return {
    dueToday: pendingTasks.filter((task) => task.fechaEntrega === todayKey).sort(compareByDueDate),
    dueTomorrow: pendingTasks.filter((task) => task.fechaEntrega === tomorrowKey).sort(compareByDueDate),
    overdue: pendingTasks.filter((task) => task.fechaEntrega < todayKey).sort(compareByDueDate),
    highPriorityUpcoming: pendingTasks
      .filter((task) => task.prioridad === 'alta' && task.fechaEntrega >= todayKey && task.fechaEntrega <= upcomingLimitKey)
      .sort(compareByDueDate),
    assignedUnreviewed: pendingTasks
      .filter((task) => task.tipo === 'asignada' && !String(task.notaPersonal ?? '').trim())
      .sort(compareByDueDate),
  };
};

const getReminderCards = (tasks) => {
  const reminders = getReminderInsights(tasks);

  return [
    {
      key: 'today',
      label: 'Vencen hoy',
      value: reminders.dueToday.length,
      helper: reminders.dueToday[0]?.titulo ?? 'Sin entregas para hoy.',
      tone: 'blue',
    },
    {
      key: 'tomorrow',
      label: 'Vencen mañana',
      value: reminders.dueTomorrow.length,
      helper: reminders.dueTomorrow[0]?.titulo ?? 'Mañana está despejado.',
      tone: 'sky',
    },
    {
      key: 'overdue',
      label: 'Vencidas',
      value: reminders.overdue.length,
      helper: reminders.overdue[0]?.titulo ?? 'No hay atrasos visibles.',
      tone: 'rose',
    },
    {
      key: 'assigned',
      label: 'Asignadas sin revisar',
      value: reminders.assignedUnreviewed.length,
      helper: reminders.assignedUnreviewed[0]?.titulo ?? 'Todas tienen seguimiento.',
      tone: 'indigo',
    },
  ];
};

const getWeeklySummary = (tasks) => {
  const todayKey = getTodayKey();
  const nextWeekKey = getUpcomingLimitKey(6);
  const pendingTasks = tasks.filter((task) => task.estado === 'pendiente' && task.fechaEntrega >= todayKey && task.fechaEntrega <= nextWeekKey);

  return Array.from({ length: 7 }, (_, index) => {
    const key = toDateKey(addDays(todayKey, index));
    const tasksForDay = pendingTasks.filter((task) => task.fechaEntrega === key);

    return {
      key,
      label: index === 0 ? 'Hoy' : formatShortDate(key),
      total: tasksForDay.length,
      highPriority: tasksForDay.filter((task) => task.prioridad === 'alta').length,
      assigned: tasksForDay.filter((task) => task.tipo === 'asignada').length,
    };
  });
};

const buildTaskBadges = (task) => [
  {
    key: 'estado',
    label: formatStateLabel(task.estado),
    className: statusStyles[task.estado] ?? 'bg-slate-100 text-slate-600',
  },
  {
    key: 'prioridad',
    label: `Prioridad: ${formatPriorityLabel(task.prioridad)}`,
    className: priorityStyles[task.prioridad] ?? 'bg-slate-100 text-slate-600',
  },
  {
    key: 'tipo',
    label: formatTaskTypeLabel(task.tipo),
    className: typeStyles[task.tipo] ?? 'bg-slate-100 text-slate-600',
  },
  {
    key: 'origen',
    label: formatTaskOriginLabel(task.origen),
    className: originStyles[task.origen] ?? 'bg-slate-100 text-slate-600',
  },
];

export {
  buildTaskBadges,
  deadlineStyles,
  getReminderCards,
  getReminderInsights,
  getSubjectName,
  getTaskDeadlineMeta,
  getTaskPath,
  getWeeklySummary,
  originStyles,
  priorityStyles,
  statusStyles,
  typeStyles,
};
