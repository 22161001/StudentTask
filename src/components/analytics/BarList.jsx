const palette = [
  'from-blue-600 to-sky-500',
  'from-sky-500 to-cyan-400',
  'from-indigo-500 to-blue-500',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-orange-400',
];

export default function BarList({ items, valueLabel = 'tarea(s)', maxValue }) {
  const safeMax = maxValue ?? Math.max(...items.map((item) => item.total), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const width = safeMax ? Math.max((item.total / safeMax) * 100, item.total > 0 ? 6 : 0) : 0;

        return (
          <div key={item.key ?? item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="text-slate-500">
                {item.total} {valueLabel}
                {item.percent !== undefined ? ` | ${item.percent}%` : ''}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${palette[index % palette.length]}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
