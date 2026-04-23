import { FiCheckCircle, FiEdit3, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import EmptyState from './EmptyState';
import {
  formatPriorityLabel,
  formatShortDate,
  formatStateLabel,
  getDateParts,
  getTodayKey,
} from '../utils/date';

const priorityStyles = {
  alta: 'bg-blue-50 text-blue-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const statusStyles = {
  pendiente: 'bg-amber-50 text-amber-700',
  completada: 'bg-emerald-50 text-emerald-700',
};

const getDeadlineMeta = (task) => {
  const todayKey = getTodayKey();

  if (task.estado !== 'completada' && task.fechaEntrega < todayKey) {
    return { label: 'Vencida', className: 'bg-rose-50 text-rose-700' };
  }

  if (task.fechaEntrega === todayKey) {
    return { label: 'Entrega hoy', className: 'bg-blue-50 text-blue-700' };
  }

  return { label: 'Proxima', className: 'bg-slate-100 text-slate-600' };
};

export default function TaskList({ tasks, subjectsById, onEdit, onDelete, onToggleStatus, emptyAction }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No hay tareas para mostrar"
        description="Ajusta los filtros o crea una nueva tarea para empezar a seguir tus entregas."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const dateParts = getDateParts(task.fechaEntrega);
        const deadlineMeta = getDeadlineMeta(task);
        const subjectName = subjectsById.get(task.materiaId)?.nombre ?? 'Sin materia';

        return (
          <article
            key={task.id}
            className={`rounded-[26px] border bg-white/[0.76] p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(37,99,235,0.12)] ${
              deadlineMeta.label === 'Vencida' ? 'border-rose-100 ring-1 ring-rose-100' : 'border-white/70'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${deadlineMeta.className}`}>
                    {deadlineMeta.label}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                    {formatStateLabel(task.estado)}
                  </span>
                  {task.recordatorio ? (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Recordatorio activo
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{task.titulo}</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">{subjectName}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || 'Sin descripcion todavia.'}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-3 py-1.5 font-semibold ${priorityStyles[task.prioridad] ?? 'bg-slate-100 text-slate-600'}`}>
                    Prioridad: {formatPriorityLabel(task.prioridad)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    Entrega: {formatShortDate(task.fechaEntrega)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-center text-white shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                  <p className="text-3xl font-black leading-none">{dateParts.day}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/[0.52]">{dateParts.month}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(task)}
                    className="rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      {task.estado === 'completada' ? <FiRotateCcw className="text-base" /> : <FiCheckCircle className="text-base" />}
                      {task.estado === 'completada' ? 'Reabrir' : 'Completar'}
                    </span>
                  </button>

                  <button type="button" onClick={() => onEdit(task)} className="secondary-btn flex items-center gap-2 px-4 py-2.5 text-sm">
                    <FiEdit3 className="text-sm" />
                    Editar
                  </button>
                  <button type="button" onClick={() => onDelete(task)} className="danger-btn flex items-center gap-2 px-4 py-2.5 text-sm">
                    <FiTrash2 className="text-sm" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
