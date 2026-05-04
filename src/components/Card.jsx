const toneClasses = {
  coral: {
    bar: 'bg-gradient-to-r from-blue-600 to-sky-500',
    badge: 'bg-blue-50 text-blue-700',
  },
  cyan: {
    bar: 'bg-gradient-to-r from-cyan-500 to-sky-400',
    badge: 'bg-cyan-50 text-cyan-700',
  },
  violet: {
    bar: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  amber: {
    bar: 'bg-gradient-to-r from-sky-500 to-cyan-400',
    badge: 'bg-sky-50 text-sky-700',
  },
};

export default function Card({ title, value, helper, tone = 'coral', Icon }) {
  const palette = toneClasses[tone] ?? toneClasses.coral;

  return (
    <div className="surface-panel interactive-card animate-enter relative overflow-hidden p-4 md:p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${palette.bar}`} />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_42%)]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{value}</p>
          {helper ? <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p> : null}
        </div>

        {Icon ? (
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/70 ${palette.badge}`}>
            <Icon className="text-lg" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
