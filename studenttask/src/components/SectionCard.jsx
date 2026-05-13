export default function SectionCard({
  eyebrow,
  title,
  description,
  Icon,
  action,
  className = '',
  children,
}) {
  return (
    <section className={`surface-panel animate-enter p-5 ${className}`.trim()}>
      {title || description || action ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? <span className="soft-chip soft-chip--cool">{eyebrow}</span> : null}
            {title ? <h2 className="mt-3.5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">{title}</h2> : null}
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>

          {action ? (
            action
          ) : Icon ? (
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm sm:flex">
              <Icon className="text-lg" />
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={title || description || action ? 'mt-5' : ''}>{children}</div>
    </section>
  );
}
