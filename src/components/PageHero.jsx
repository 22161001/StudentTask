const metricToneClasses = {
  primary: 'hero-metric--featured',
  neutral: '',
  success: 'hero-metric--success',
  warning: 'hero-metric--warning',
  danger: 'hero-metric--danger',
  info: 'hero-metric--info',
};

function HeroMetric({ metric }) {
  const Icon = metric.Icon;
  const isFeatured = metric.tone === 'primary';
  const valueSize = String(metric.value ?? '').length > 11 ? 'text-xl' : 'text-3xl';

  return (
    <div className={`hero-metric ${metricToneClasses[metric.tone ?? 'neutral'] ?? ''}`.trim()}>
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isFeatured ? 'text-white/50' : 'text-slate-400'}`}>
            {metric.label}
          </p>
          <p className={`mt-2.5 truncate font-black tracking-tight ${valueSize} ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
            {metric.value}
          </p>
          {metric.helper ? (
            <p className={`mt-1.5 line-clamp-2 text-sm leading-6 ${isFeatured ? 'text-white/70' : 'text-slate-600'}`}>
              {metric.helper}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isFeatured ? 'bg-white/[0.12] text-white' : 'bg-white/80 text-blue-700 shadow-sm'
            }`}
          >
            <Icon className="text-lg" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
  stats = [],
  children,
  className = '',
}) {
  const hasSide = stats.length > 0 || Boolean(children);
  const statsGrid =
    stats.length >= 3
      ? 'grid gap-3 sm:grid-cols-3'
      : stats.length === 2
        ? 'grid gap-3 sm:grid-cols-2'
        : 'grid gap-3';

  return (
    <section className={`surface-panel page-hero mb-5 p-5 md:p-6 ${className}`.trim()}>
      <div className={`relative grid gap-5 ${hasSide ? 'xl:grid-cols-[1.05fr_0.95fr]' : ''}`}>
        <div className="min-w-0">
          {eyebrow ? <span className="soft-chip soft-chip--cool">{eyebrow}</span> : null}
          <h2 className="mt-4 max-w-3xl text-2xl font-black tracking-tight text-slate-900 md:text-3xl lg:text-[2.15rem]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
          ) : null}
          {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>

        {hasSide ? (
          <div className="min-w-0">
            {children ?? (
              <div className={statsGrid}>
                {stats.map((metric) => (
                  <HeroMetric key={metric.label} metric={metric} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
