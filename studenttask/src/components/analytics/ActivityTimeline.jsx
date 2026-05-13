import { FiAlertCircle, FiCheckCircle, FiClipboard, FiEdit3, FiPlusCircle } from 'react-icons/fi';
import EmptyState from '../EmptyState';
import { formatShortDate } from '../../utils/date';

const iconByType = {
  assigned_received: FiClipboard,
  created: FiPlusCircle,
  completed: FiCheckCircle,
  completed_late: FiAlertCircle,
  overdue: FiAlertCircle,
  updated: FiEdit3,
};

const toneByType = {
  assigned_received: 'bg-blue-50 text-blue-700',
  created: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700',
  completed_late: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
  updated: 'bg-indigo-50 text-indigo-700',
};

export default function ActivityTimeline({ activities = [] }) {
  if (activities.length === 0) {
    return <EmptyState title="Sin actividad reciente" description="Tus cambios recientes aparecerán aquí." Icon={FiClipboard} />;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = iconByType[activity.type] ?? FiEdit3;

        return (
          <article key={activity.id} className="content-card interactive-card px-4 py-4">
            <div className="flex gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneByType[activity.type] ?? toneByType.updated}`}>
                <Icon className="text-lg" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{activity.title}</p>
                  <span className="text-xs font-semibold text-slate-400">{formatShortDate(activity.dateKey)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{activity.subjectName}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
