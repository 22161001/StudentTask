import {
  addDays,
  getEndOfMonth,
  getStartOfMonth,
  getStartOfWeek,
  getTodayKey,
  parseLocalDate,
  toDateKey,
} from '../utils/date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const REPORT_PERIODS = [
  {
    value: 'last7',
    label: 'Últimos 7 días',
    description: 'Actividad académica de la última semana.',
  },
  {
    value: 'last30',
    label: 'Últimos 30 días',
    description: 'Actividad reciente del mes móvil.',
  },
  {
    value: 'currentMonth',
    label: 'Mes actual',
    description: 'Tareas del calendario mensual en curso.',
  },
  {
    value: 'all',
    label: 'Periodo general',
    description: 'Todo el historial disponible.',
  },
];

const priorityOptions = [
  { key: 'alta', label: 'Alta' },
  { key: 'media', label: 'Media' },
  { key: 'baja', label: 'Baja' },
];

const typeOptions = [
  { key: 'personal', label: 'Personal' },
  { key: 'asignada', label: 'Asignada' },
];

const roundNumber = (value, decimals = 1) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const percent = (value, total) => {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
};

const getDateKey = (value) => {
  if (!value) {
    return '';
  }

  const rawValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10);
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return toDateKey(date);
};

const getSubjectMap = (subjects) => new Map(subjects.map((subject) => [Number(subject.id), subject]));

const getSubjectName = (subjectMap, subjectId) => subjectMap.get(Number(subjectId))?.nombre ?? 'Sin materia';

const diffDays = (startKey, endKey) => {
  const startDate = parseLocalDate(startKey);
  const endDate = parseLocalDate(endKey);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((endDate - startDate) / MS_PER_DAY));
};

const isInRange = (dateKey, range) => {
  if (!dateKey) {
    return false;
  }

  if (!range?.start || !range?.end) {
    return true;
  }

  return dateKey >= range.start && dateKey <= range.end;
};

const getRelevantTaskDates = (task) =>
  [task.createdKey, task.dueKey, task.completedKey, task.updatedKey].filter(Boolean);

const taskMatchesRange = (task, range) => {
  if (!range?.start || !range?.end) {
    return true;
  }

  return getRelevantTaskDates(task).some((dateKey) => isInRange(dateKey, range));
};

const enrichTasks = (tasks, subjects = []) => {
  const subjectMap = getSubjectMap(subjects);
  const todayKey = getTodayKey();

  return tasks.map((task) => {
    const createdKey = getDateKey(task.fechaPublicacion || task.createdAt);
    const dueKey = getDateKey(task.fechaEntrega);
    const completedKey = task.estado === 'completada' ? getDateKey(task.fechaCompletada || task.updatedAt) : '';
    const updatedKey = getDateKey(task.updatedAt);
    const isCompleted = task.estado === 'completada';
    const isPending = task.estado !== 'completada';
    const isOverdue = isPending && dueKey && dueKey < todayKey;
    const isOnTime = isCompleted && completedKey && dueKey ? completedKey <= dueKey : false;
    const isLate = isCompleted && completedKey && dueKey ? completedKey > dueKey : false;
    const resolutionDays = isCompleted && createdKey && completedKey ? diffDays(createdKey, completedKey) : null;

    return {
      ...task,
      createdKey,
      dueKey,
      completedKey,
      updatedKey,
      subjectName: getSubjectName(subjectMap, task.materiaId),
      isCompleted,
      isPending,
      isOverdue,
      isIgnored: isOverdue,
      isOnTime,
      isLate,
      resolutionDays,
      estimatedHours: Number(task.tiempoEstimadoHoras) || 0,
    };
  });
};

const calculateTaskMetrics = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.isCompleted).length;
  const pending = tasks.filter((task) => task.isPending).length;
  const overdue = tasks.filter((task) => task.isOverdue).length;
  const ignored = tasks.filter((task) => task.isIgnored).length;
  const onTime = tasks.filter((task) => task.isOnTime).length;
  const late = tasks.filter((task) => task.isLate).length;
  const personal = tasks.filter((task) => task.tipo === 'personal').length;
  const assigned = tasks.filter((task) => task.tipo === 'asignada').length;
  const estimatedHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  const completedWithResolution = tasks.filter((task) => task.resolutionDays !== null);
  const resolutionTotal = completedWithResolution.reduce((sum, task) => sum + task.resolutionDays, 0);

  return {
    total,
    completed,
    pending,
    overdue,
    ignored,
    onTime,
    late,
    personal,
    assigned,
    estimatedHours: roundNumber(estimatedHours),
    completionRate: percent(completed, total),
    pendingRate: percent(pending, total),
    ignoredRate: percent(ignored, total),
    punctualityRate: percent(onTime, completed),
    averageResolutionDays: roundNumber(resolutionTotal / Math.max(completedWithResolution.length, 1)),
  };
};

const buildDistribution = (tasks, field, options) =>
  options.map((option) => {
    const total = tasks.filter((task) => task[field] === option.key).length;

    return {
      ...option,
      total,
      percent: percent(total, tasks.length),
    };
  });

const buildSubjectMetrics = (tasks, subjects = [], includeEmpty = false) => {
  const knownSubjectIds = includeEmpty ? subjects.map((subject) => Number(subject.id)) : [];
  const subjectIds = Array.from(new Set([...knownSubjectIds, ...tasks.map((task) => Number(task.materiaId) || 0)]));
  const subjectMap = getSubjectMap(subjects);

  return subjectIds
    .map((subjectId) => {
      const subjectTasks = tasks.filter((task) => Number(task.materiaId) === subjectId);
      const metrics = calculateTaskMetrics(subjectTasks);

      return {
        id: subjectId,
        nombre: getSubjectName(subjectMap, subjectId),
        color: subjectMap.get(subjectId)?.color ?? '#2563eb',
        ...metrics,
        advanceRate: metrics.completionRate,
        relativeLoad: percent(subjectTasks.length, tasks.length),
      };
    })
    .filter((subject) => includeEmpty || subject.total > 0);
};

const getPeriodOption = (period) => REPORT_PERIODS.find((item) => item.value === period) ?? REPORT_PERIODS[3];

const getReportPeriodRange = (period) => {
  const todayKey = getTodayKey();

  if (period === 'last7') {
    return {
      start: toDateKey(addDays(todayKey, -6)),
      end: todayKey,
    };
  }

  if (period === 'last30') {
    return {
      start: toDateKey(addDays(todayKey, -29)),
      end: todayKey,
    };
  }

  if (period === 'currentMonth') {
    return {
      start: toDateKey(getStartOfMonth(todayKey)),
      end: toDateKey(getEndOfMonth(todayKey)),
    };
  }

  return {
    start: null,
    end: null,
  };
};

const getRangeDays = (range) => {
  if (!range?.start || !range?.end) {
    return 0;
  }

  return diffDays(range.start, range.end) + 1;
};

const getWeeksForReport = (range, tasks) => {
  if (range?.start && range?.end) {
    return Math.max(1, getRangeDays(range) / 7);
  }

  const dates = tasks.flatMap(getRelevantTaskDates).sort();
  if (dates.length === 0) {
    return 1;
  }

  return Math.max(1, (diffDays(dates[0], dates[dates.length - 1]) + 1) / 7);
};

const findTopMetric = (subjectMetrics, metricKey) => {
  const sorted = [...subjectMetrics].sort((subjectA, subjectB) => {
    if (subjectB[metricKey] !== subjectA[metricKey]) {
      return subjectB[metricKey] - subjectA[metricKey];
    }

    return subjectB.total - subjectA.total;
  });

  return sorted.find((subject) => subject[metricKey] > 0) ?? null;
};

const getReportAnalytics = ({ tasks = [], subjects = [], period = 'all', subjectId = 'todas', type = 'todos' } = {}) => {
  const range = getReportPeriodRange(period);
  const periodOption = getPeriodOption(period);
  const enrichedTasks = enrichTasks(tasks, subjects);
  const filteredTasks = enrichedTasks
    .filter((task) => taskMatchesRange(task, range))
    .filter((task) => (subjectId === 'todas' ? true : Number(task.materiaId) === Number(subjectId)))
    .filter((task) => (type === 'todos' ? true : task.tipo === type));
  const metrics = calculateTaskMetrics(filteredTasks);
  const subjectMetrics = buildSubjectMetrics(filteredTasks, subjects);
  const weeks = getWeeksForReport(range, filteredTasks);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      period,
      subjectId,
      type,
    },
    period: periodOption,
    range,
    tasks: filteredTasks,
    metrics: {
      ...metrics,
      averageCompletedPerWeek: roundNumber(metrics.completed / weeks),
    },
    subjectMetrics: subjectMetrics.sort((subjectA, subjectB) => subjectB.total - subjectA.total),
    topLoadSubject: findTopMetric(subjectMetrics, 'total'),
    topDelaySubject: findTopMetric(subjectMetrics, 'overdue'),
    priorityDistribution: buildDistribution(filteredTasks, 'prioridad', priorityOptions),
    typeDistribution: buildDistribution(filteredTasks, 'tipo', typeOptions),
  };
};

const getTasksByRange = (tasks, range) => tasks.filter((task) => taskMatchesRange(task, range));

const getCompletedByRange = (tasks, range) => tasks.filter((task) => task.completedKey && isInRange(task.completedKey, range));

const getCreatedOrDueByRange = (tasks, range) =>
  tasks.filter((task) => isInRange(task.createdKey, range) || isInRange(task.dueKey, range));

const getCurrentAndPreviousWeekRanges = () => {
  const weekStart = toDateKey(getStartOfWeek(getTodayKey()));

  return {
    current: {
      start: weekStart,
      end: toDateKey(addDays(weekStart, 6)),
    },
    previous: {
      start: toDateKey(addDays(weekStart, -7)),
      end: toDateKey(addDays(weekStart, -1)),
    },
  };
};

const getCompletionStreak = (tasks) => {
  const completedDates = Array.from(new Set(tasks.map((task) => task.completedKey).filter(Boolean))).sort();
  const latestCompletionKey = completedDates[completedDates.length - 1] ?? '';

  if (!latestCompletionKey) {
    return {
      days: 0,
      latestCompletionKey: '',
      daysSinceLastCompletion: null,
      isActiveToday: false,
    };
  }

  const completedDateSet = new Set(completedDates);
  let cursor = latestCompletionKey;
  let days = 0;

  while (completedDateSet.has(cursor)) {
    days += 1;
    cursor = toDateKey(addDays(cursor, -1));
  }

  return {
    days,
    latestCompletionKey,
    daysSinceLastCompletion: diffDays(latestCompletionKey, getTodayKey()),
    isActiveToday: latestCompletionKey === getTodayKey(),
  };
};

const getWeeklyConstancy = (tasks, weekCount = 4) => {
  const currentWeekStart = toDateKey(getStartOfWeek(getTodayKey()));
  const activeWeeks = Array.from({ length: weekCount }, (_, index) => {
    const start = toDateKey(addDays(currentWeekStart, index * -7));
    const end = toDateKey(addDays(start, 6));
    return getCompletedByRange(tasks, { start, end }).length > 0;
  }).filter(Boolean).length;

  return percent(activeWeeks, weekCount);
};

const buildWeeklyPerformance = (tasks, weekCount = 8) => {
  const currentWeekStart = toDateKey(getStartOfWeek(getTodayKey()));

  return Array.from({ length: weekCount }, (_, index) => {
    const offset = weekCount - index - 1;
    const start = toDateKey(addDays(currentWeekStart, offset * -7));
    const end = toDateKey(addDays(start, 6));
    const range = { start, end };
    const activeTasks = getTasksByRange(tasks, range);
    const completedTasks = getCompletedByRange(tasks, range);
    const overdueTasks = tasks.filter((task) => task.isOverdue && isInRange(task.dueKey, range));

    return {
      key: start,
      start,
      end,
      total: activeTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
      completionRate: percent(completedTasks.length, activeTasks.length),
    };
  });
};

const buildMonthlyEvolution = (tasks, monthCount = 6) => {
  const today = parseLocalDate(getTodayKey());

  return Array.from({ length: monthCount }, (_, index) => {
    const offset = monthCount - index - 1;
    const monthStartDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const monthEndDate = new Date(today.getFullYear(), today.getMonth() - offset + 1, 0);
    const range = {
      start: toDateKey(monthStartDate),
      end: toDateKey(monthEndDate),
    };
    const activeTasks = getTasksByRange(tasks, range);
    const metrics = calculateTaskMetrics(activeTasks);

    return {
      key: range.start,
      start: range.start,
      end: range.end,
      ...metrics,
    };
  });
};

const calculateDisciplineIndex = (overallMetrics, weeklyConstancy) => {
  if (overallMetrics.total === 0) {
    return {
      score: 0,
      components: {
        cumplimiento: 0,
        puntualidad: 0,
        sinIgnoradas: 0,
        constanciaSemanal: 0,
      },
    };
  }

  const components = {
    cumplimiento: overallMetrics.completionRate,
    puntualidad: overallMetrics.punctualityRate,
    sinIgnoradas: Math.max(0, 100 - overallMetrics.ignoredRate),
    constanciaSemanal: weeklyConstancy,
  };

  // Índice de disciplina: 40% cumplimiento, 30% puntualidad, 20% tareas no ignoradas, 10% constancia semanal.
  const score =
    components.cumplimiento * 0.4 +
    components.puntualidad * 0.3 +
    components.sinIgnoradas * 0.2 +
    components.constanciaSemanal * 0.1;

  return {
    score: Math.round(score),
    components,
  };
};

const buildStudentAlerts = (tasks = [], subjects = []) => {
  const enrichedTasks = enrichTasks(tasks, subjects);
  const subjectMetrics = buildSubjectMetrics(enrichedTasks, subjects, true);
  const overallMetrics = calculateTaskMetrics(enrichedTasks);
  const alerts = [];
  const weekRanges = getCurrentAndPreviousWeekRanges();
  const currentWeekTasks = getTasksByRange(enrichedTasks, weekRanges.current);
  const previousWeekTasks = getTasksByRange(enrichedTasks, weekRanges.previous);
  const currentWeekCompleted = getCompletedByRange(enrichedTasks, weekRanges.current);
  const previousWeekCompleted = getCompletedByRange(enrichedTasks, weekRanges.previous);
  const currentWeekMetrics = calculateTaskMetrics(currentWeekTasks);
  const previousWeekMetrics = calculateTaskMetrics(previousWeekTasks);
  const currentPunctuality = calculateTaskMetrics(currentWeekCompleted).punctualityRate;
  const previousPunctuality = calculateTaskMetrics(previousWeekCompleted).punctualityRate;
  const currentLoad = getCreatedOrDueByRange(enrichedTasks, weekRanges.current).length;
  const previousLoad = getCreatedOrDueByRange(enrichedTasks, weekRanges.previous).length;
  const currentLoadSubject = findTopMetric(
    subjectMetrics.map((subject) => ({
      ...subject,
      activeLoad: enrichedTasks.filter((task) => task.materiaId === subject.id && task.isPending).length,
    })),
    'activeLoad',
  );
  const unreviewedAssigned = enrichedTasks.filter(
    (task) => task.tipo === 'asignada' && task.isPending && !String(task.notaPersonal ?? '').trim(),
  );
  const streak = getCompletionStreak(enrichedTasks);

  if (overallMetrics.ignored >= 2) {
    alerts.push({
      id: 'overdue-many',
      tone: 'rose',
      severity: 'alta',
      title: 'Tienes varias tareas vencidas',
      description: `${overallMetrics.ignored} tarea(s) están vencidas y siguen pendientes.`,
      value: overallMetrics.ignored,
      to: '/tareas',
    });
  } else if (overallMetrics.ignored === 1) {
    alerts.push({
      id: 'overdue-one',
      tone: 'amber',
      severity: 'media',
      title: 'Hay una tarea vencida',
      description: 'Resolverla pronto ayudará a recuperar puntualidad.',
      value: 1,
      to: '/tareas',
    });
  }

  if (currentLoadSubject) {
    alerts.push({
      id: 'current-load-subject',
      tone: 'blue',
      severity: 'info',
      title: `Mayor carga actual: ${currentLoadSubject.nombre}`,
      description: `${currentLoadSubject.activeLoad} tarea(s) pendientes concentran tu carga más visible.`,
      value: currentLoadSubject.activeLoad,
      to: '/seguimiento',
    });
  }

  if (previousWeekCompleted.length > 0 && currentWeekCompleted.length > 0 && currentPunctuality + 5 < previousPunctuality) {
    alerts.push({
      id: 'punctuality-drop',
      tone: 'amber',
      severity: 'media',
      title: 'Tu puntualidad bajó respecto al periodo anterior',
      description: `Pasó de ${previousPunctuality}% a ${currentPunctuality}% en entregas completadas.`,
      value: `${currentPunctuality}%`,
      to: '/reportes',
    });
  }

  if (
    previousWeekMetrics.total > 0 &&
    currentWeekMetrics.total > 0 &&
    currentWeekMetrics.completionRate >= previousWeekMetrics.completionRate + 10
  ) {
    alerts.push({
      id: 'completion-improved',
      tone: 'emerald',
      severity: 'positiva',
      title: 'Tu cumplimiento mejoró esta semana',
      description: `Subió de ${previousWeekMetrics.completionRate}% a ${currentWeekMetrics.completionRate}%.`,
      value: `${currentWeekMetrics.completionRate}%`,
      to: '/seguimiento',
    });
  }

  if (unreviewedAssigned.length > 0) {
    alerts.push({
      id: 'assigned-unreviewed',
      tone: 'blue',
      severity: 'media',
      title: 'Tienes tareas asignadas sin revisar',
      description: `${unreviewedAssigned.length} actividad(es) docentes aún no tienen nota personal ni avance visible.`,
      value: unreviewedAssigned.length,
      to: '/tareas-asignadas',
    });
  }

  if (streak.daysSinceLastCompletion !== null && streak.daysSinceLastCompletion >= 3) {
    alerts.push({
      id: 'inactive-days',
      tone: 'amber',
      severity: 'media',
      title: 'Llevas varios días sin completar actividades',
      description: `La última tarea completada fue hace ${streak.daysSinceLastCompletion} día(s).`,
      value: streak.daysSinceLastCompletion,
      to: '/seguimiento',
    });
  }

  if (previousLoad > 0 && currentLoad > previousLoad) {
    alerts.push({
      id: 'load-increase',
      tone: 'indigo',
      severity: 'info',
      title: 'La carga académica subió respecto al periodo anterior',
      description: `Esta semana concentra ${currentLoad} actividad(es), contra ${previousLoad} de la semana previa.`,
      value: currentLoad,
      to: '/reportes',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'stable',
      tone: 'emerald',
      severity: 'positiva',
      title: 'Tu seguimiento académico está estable',
      description: 'No hay señales críticas con los datos actuales.',
      value: `${overallMetrics.completionRate}%`,
      to: '/seguimiento',
    });
  }

  return alerts;
};

const getAcademicTracking = (tasks = [], subjects = []) => {
  const enrichedTasks = enrichTasks(tasks, subjects);
  const overallMetrics = calculateTaskMetrics(enrichedTasks);
  const weeklyConstancy = getWeeklyConstancy(enrichedTasks);
  const discipline = calculateDisciplineIndex(overallMetrics, weeklyConstancy);
  const subjectMetrics = buildSubjectMetrics(enrichedTasks, subjects, true);
  const streak = getCompletionStreak(enrichedTasks);
  const currentLoadSubject = findTopMetric(
    subjectMetrics.map((subject) => ({
      ...subject,
      activeLoad: enrichedTasks.filter((task) => task.materiaId === subject.id && task.isPending).length,
    })),
    'activeLoad',
  );

  return {
    tasks: enrichedTasks,
    overallMetrics,
    discipline,
    subjectMetrics,
    currentLoadSubject,
    weeklyPerformance: buildWeeklyPerformance(enrichedTasks),
    monthlyEvolution: buildMonthlyEvolution(enrichedTasks),
    streak,
    weeklyConstancy,
    alerts: buildStudentAlerts(tasks, subjects),
  };
};

const getDashboardAnalytics = (tasks = [], subjects = []) => {
  const enrichedTasks = enrichTasks(tasks, subjects);
  const overallMetrics = calculateTaskMetrics(enrichedTasks);
  const subjectMetrics = buildSubjectMetrics(enrichedTasks, subjects, true);
  const currentLoadSubject = findTopMetric(
    subjectMetrics.map((subject) => ({
      ...subject,
      activeLoad: enrichedTasks.filter((task) => task.materiaId === subject.id && task.isPending).length,
    })),
    'activeLoad',
  );
  const alerts = buildStudentAlerts(tasks, subjects);

  return {
    overallMetrics,
    currentLoadSubject,
    mainAlert: alerts[0],
    alerts,
  };
};

export {
  REPORT_PERIODS,
  buildStudentAlerts,
  calculateTaskMetrics,
  enrichTasks,
  getAcademicTracking,
  getDashboardAnalytics,
  getReportAnalytics,
  getReportPeriodRange,
  roundNumber,
};
