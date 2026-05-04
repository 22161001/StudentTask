import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiTrendingUp } from 'react-icons/fi';
import EmptyState from '../EmptyState';

const toneClasses = {
  rose: 'border-rose-100 bg-rose-50/80 text-rose-800',
  amber: 'border-amber-100 bg-amber-50/80 text-amber-800',
  blue: 'border-blue-100 bg-blue-50/80 text-blue-800',
  indigo: 'border-indigo-100 bg-indigo-50/80 text-indigo-800',
  emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-800',
};

const iconByTone = {
  rose: FiAlertTriangle,
  amber: FiAlertTriangle,
  blue: FiInfo,
  indigo: FiTrendingUp,
  emerald: FiCheckCircle,
};

export default function AlertList({ alerts = [], compact = false }) {
  if (alerts.length === 0) {
    return <EmptyState title="Sin alertas por ahora" description="No hay señales académicas que requieran atención inmediata." Icon={FiCheckCircle} />;
  }

  return (
    <div className={compact ? 'space-y-3' : 'grid gap-3 md:grid-cols-2'}>
      {alerts.map((alert) => {
        const Icon = iconByTone[alert.tone] ?? FiInfo;
        const content = (
          <div className={`h-full rounded-[22px] border px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${toneClasses[alert.tone] ?? toneClasses.blue}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                <Icon className="text-lg" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight">{alert.title}</p>
                <p className="mt-1 text-sm leading-6 opacity-80">{alert.description}</p>
              </div>
            </div>
          </div>
        );

        return alert.to ? (
          <Link key={alert.id} to={alert.to} className="block transition hover:-translate-y-0.5">
            {content}
          </Link>
        ) : (
          <div key={alert.id}>{content}</div>
        );
      })}
    </div>
  );
}
