import { FiBookOpen, FiEdit3, FiTrash2 } from 'react-icons/fi';
import EmptyState from './EmptyState';
import { formatShortDate } from '../utils/date';

export default function SubjectList({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aun no tienes materias registradas"
        description="Crea tu primera materia para empezar a organizar tareas, colores y entregas por asignatura."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((subject) => (
        <article
          key={subject.id}
          className="rounded-[26px] border border-white/70 bg-white/[0.76] p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(37,99,235,0.12)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-[18px] shadow-inner" style={{ backgroundColor: subject.color }}>
                  <FiBookOpen className="text-lg text-white" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">{subject.nombre}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{subject.descripcion || 'Sin descripcion todavia.'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">
                  {subject.pendingTasks} pendientes
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                  {subject.totalTasks} tareas
                </span>
                {subject.nextDue ? (
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 font-semibold text-sky-700">
                    Proxima: {formatShortDate(subject.nextDue)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Avance</span>
                  <span>{subject.completionRate}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${subject.completionRate}%` }} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:justify-end">
              <button type="button" onClick={() => onEdit(subject)} className="secondary-btn flex items-center gap-2">
                <FiEdit3 className="text-sm" />
                Editar
              </button>
              <button type="button" onClick={() => onDelete(subject)} className="danger-btn flex items-center gap-2">
                <FiTrash2 className="text-sm" />
                Eliminar
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
