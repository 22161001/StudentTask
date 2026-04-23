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
    <section className={`surface-panel p-6 ${className}`.trim()}>
      {title || description || action ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <span className="soft-chip soft-chip--cool">{eyebrow}</span> : null}
            {title ? <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>

          {action ? (
            action
          ) : Icon ? (
            <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:flex">
              <Icon className="text-lg" />
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={title || description || action ? 'mt-6' : ''}>{children}</div>
    </section>
  );
}
