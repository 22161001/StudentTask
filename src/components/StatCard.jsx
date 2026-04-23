const toneClasses = {
  blue: {
    bar: 'bg-gradient-to-r from-blue-600 to-sky-500',
    glow: 'bg-blue-300/60',
    badge: 'bg-blue-50 text-blue-700',
  },
  sky: {
    bar: 'bg-gradient-to-r from-sky-500 to-cyan-400',
    glow: 'bg-sky-300/60',
    badge: 'bg-sky-50 text-sky-700',
  },
  indigo: {
    bar: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    glow: 'bg-indigo-300/60',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  rose: {
    bar: 'bg-gradient-to-r from-rose-500 to-orange-400',
    glow: 'bg-rose-300/60',
    badge: 'bg-rose-50 text-rose-700',
  },
};

export default function StatCard({ title, value, helper, tone = 'blue', Icon }) {
  const palette = toneClasses[tone] ?? toneClasses.blue;

  return (
    <div className="surface-panel relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(37,99,235,0.14)]">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${palette.bar}`} />
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl ${palette.glow}`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-black tracking-tight text-slate-900">{value}</p>
          {helper ? <p className="mt-3 text-sm leading-6 text-slate-600">{helper}</p> : null}
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
