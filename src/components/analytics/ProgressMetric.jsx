export default function ProgressMetric({ label, value, helper, tone = 'blue' }) {
  const toneClasses = {
    blue: {
      gradient: 'from-blue-600 to-sky-500',
      text: 'text-blue-700',
      badge: 'bg-blue-50',
    },
    sky: {
      gradient: 'from-sky-500 to-cyan-400',
      text: 'text-sky-700',
      badge: 'bg-sky-50',
    },
    indigo: {
      gradient: 'from-indigo-500 to-blue-500',
      text: 'text-indigo-700',
      badge: 'bg-indigo-50',
    },
    emerald: {
      gradient: 'from-emerald-500 to-teal-400',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50',
    },
    rose: {
      gradient: 'from-rose-500 to-orange-400',
      text: 'text-rose-700',
      badge: 'bg-rose-50',
    },
  };
  const palette = toneClasses[tone] ?? toneClasses.blue;

  return (
    <div className="content-card interactive-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={`mt-3 text-4xl font-black tracking-tight ${palette.text}`}>{value}%</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${palette.badge} ${palette.text}`}>Índice</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${palette.gradient}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
      {helper ? <p className="mt-3 text-sm leading-6 text-slate-600">{helper}</p> : null}
    </div>
  );
}
