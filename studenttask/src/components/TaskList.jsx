import { Link } from 'react-router-dom';
import { FiCheckCircle, FiEdit3, FiExternalLink, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import EmptyState from './EmptyState';
import {
  formatShortDate,
  getDateParts,
} from '../utils/date';
import {
  buildTaskBadges,
  getSubjectName,
  getTaskDeadlineMeta,
  getTaskPath,
} from '../utils/taskInsights';

export default function TaskList({ tasks, subjectsById, onEdit, onDelete, onToggleStatus, emptyAction }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No hay tareas para mostrar"
        description="Ajusta los filtros o crea una nueva actividad."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const dateParts = getDateParts(task.fechaEntrega);
        const deadlineMeta = getTaskDeadlineMeta(task);
        const subjectName = getSubjectName(subjectsById, task);
        const isAssigned = task.tipo === 'asignada';

        return (
          <article
            key={`${task.tipo}-${task.id}`}
            className={`content-card interactive-card p-5 ${
              deadlineMeta.key === 'vencida' ? '!border-rose-100 ring-1 ring-rose-100' : ''
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${deadlineMeta.className}`}>
                    {deadlineMeta.label}
                  </span>
                  {buildTaskBadges(task).map((badge) => (
                    <span key={badge.key} className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  ))}
                  {task.recordatorio ? (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Recordatorio activo
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{task.titulo}</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">{subjectName}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{task.descripcion || 'Sin descripción.'}</p>

                {isAssigned ? (
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-semibold text-slate-700">Docente:</span> {task.docenteNombre || 'Sin docente'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Grupo:</span> {task.grupoNombre || 'Sin grupo'}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    Publicada: {formatShortDate(task.fechaPublicacion)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    Entrega: {formatShortDate(task.fechaEntrega)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    Estimado: {task.tiempoEstimadoHoras || 0} h
                  </span>
                  {task.fechaCompletada ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                      Completada: {formatShortDate(task.fechaCompletada)}
                    </span>
                  ) : null}
                </div>

                {task.notaPersonal ? (
                  <p className="mt-4 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-700">Nota:</span> {task.notaPersonal}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="rounded-2xl bg-slate-950 px-3.5 py-3 text-center text-white shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                  <p className="text-2xl font-black leading-none">{dateParts.day}</p>
                  <p className="mt-1.5 text-xs uppercase tracking-[0.24em] text-white/[0.52]">{dateParts.month}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(task)}
                    className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    {task.estado === 'completada' ? <FiRotateCcw className="text-base" /> : <FiCheckCircle className="text-base" />}
                    {task.estado === 'completada' ? 'Reabrir' : 'Completar'}
                  </button>

                  {isAssigned ? (
                    <Link to={getTaskPath(task)} className="secondary-btn text-sm">
                      <FiExternalLink className="text-sm" />
                      Ver asignada
                    </Link>
                  ) : (
                    <>
                      <button type="button" onClick={() => onEdit(task)} className="secondary-btn text-sm">
                        <FiEdit3 className="text-sm" />
                        Editar
                      </button>
                      <button type="button" onClick={() => onDelete(task)} className="danger-btn text-sm">
                        <FiTrash2 className="text-sm" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
