const escapeCsvValue = (value) => {
  const text = String(value ?? '');

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const toCsv = (rows) => rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');

const buildReportCsv = (report) => {
  const metrics = report.metrics;
  const rows = [
    ['Sección', 'Métrica', 'Valor'],
    ['Resumen', 'Periodo', report.period.label],
    ['Resumen', 'Total de tareas', metrics.total],
    ['Resumen', 'Total de tareas completadas', metrics.completed],
    ['Resumen', 'Total de tareas pendientes', metrics.pending],
    ['Resumen', 'Total de tareas vencidas', metrics.overdue],
    ['Resumen', 'Total de tareas ignoradas', metrics.ignored],
    ['Resumen', 'Tareas entregadas a tiempo', metrics.onTime],
    ['Resumen', 'Tareas entregadas tarde', metrics.late],
    ['Resumen', 'Promedio completadas por semana', metrics.averageCompletedPerWeek],
    ['Resumen', 'Tiempo promedio de resolución en días', metrics.averageResolutionDays],
    ['Resumen', 'Cumplimiento general', `${metrics.completionRate}%`],
    ['Resumen', 'Puntualidad', `${metrics.punctualityRate}%`],
    ['Resumen', 'Materia con mayor carga', report.topLoadSubject?.nombre ?? 'Sin datos'],
    ['Resumen', 'Materia con mayor retraso', report.topDelaySubject?.nombre ?? 'Sin datos'],
    [],
    ['Distribución por prioridad', 'Prioridad', 'Total', 'Porcentaje'],
    ...report.priorityDistribution.map((item) => ['Distribución por prioridad', item.label, item.total, `${item.percent}%`]),
    [],
    ['Distribución por tipo', 'Tipo', 'Total', 'Porcentaje'],
    ...report.typeDistribution.map((item) => ['Distribución por tipo', item.label, item.total, `${item.percent}%`]),
    [],
    ['Seguimiento por materia', 'Materia', 'Total', 'Completadas', 'Pendientes', 'Vencidas', 'Avance', 'Puntualidad', 'Carga relativa'],
    ...report.subjectMetrics.map((subject) => [
      'Seguimiento por materia',
      subject.nombre,
      subject.total,
      subject.completed,
      subject.pending,
      subject.overdue,
      `${subject.advanceRate}%`,
      `${subject.punctualityRate}%`,
      `${subject.relativeLoad}%`,
    ]),
  ];

  return toCsv(rows);
};

const buildReportJson = (report) =>
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      filters: report.filters,
      period: report.period,
      range: report.range,
      metrics: report.metrics,
      topLoadSubject: report.topLoadSubject,
      topDelaySubject: report.topDelaySubject,
      priorityDistribution: report.priorityDistribution,
      typeDistribution: report.typeDistribution,
      subjectMetrics: report.subjectMetrics,
    },
    null,
    2,
  );

export { buildReportCsv, buildReportJson };
