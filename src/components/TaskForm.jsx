import { formatPriorityLabel, formatStateLabel } from '../utils/date';

export default function TaskForm({
  form,
  errors,
  subjects,
  hasSubjects,
  isEditing,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form id="task-form" onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-600">Título</label>
        <input
          name="titulo"
          value={form.titulo}
          onChange={onChange}
          className={`field-control ${errors.titulo ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          placeholder="Ej. Entregar práctica de laboratorio"
        />
        {errors.titulo ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.titulo}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Descripción</label>
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={onChange}
          rows="4"
          className="field-control min-h-[120px] resize-y"
          placeholder="Nota breve sobre lo que debes entregar o preparar."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Materia</label>
          <select
            name="materiaId"
            value={form.materiaId}
            onChange={onChange}
            className={`field-control ${errors.materiaId ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
            disabled={!hasSubjects}
          >
            <option value="">Selecciona una materia</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
          {errors.materiaId ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.materiaId}</p> : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Fecha de publicación</label>
          <input
            name="fechaPublicacion"
            type="date"
            value={form.fechaPublicacion}
            onChange={onChange}
            className={`field-control ${errors.fechaPublicacion ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          />
          {errors.fechaPublicacion ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.fechaPublicacion}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Fecha de entrega</label>
          <input
            name="fechaEntrega"
            type="date"
            value={form.fechaEntrega}
            onChange={onChange}
            className={`field-control ${errors.fechaEntrega ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          />
          {errors.fechaEntrega ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.fechaEntrega}</p> : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Tiempo estimado (horas)</label>
          <input
            name="tiempoEstimadoHoras"
            type="number"
            min="0"
            step="0.5"
            value={form.tiempoEstimadoHoras}
            onChange={onChange}
            className={`field-control ${errors.tiempoEstimadoHoras ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
            placeholder="Ej. 2"
          />
          {errors.tiempoEstimadoHoras ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.tiempoEstimadoHoras}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Prioridad</label>
          <select
            name="prioridad"
            value={form.prioridad}
            onChange={onChange}
            className={`field-control ${errors.prioridad ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          >
            {['baja', 'media', 'alta'].map((priority) => (
              <option key={priority} value={priority}>
                {formatPriorityLabel(priority)}
              </option>
            ))}
          </select>
          {errors.prioridad ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.prioridad}</p> : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Estado</label>
          <select
            name="estado"
            value={form.estado}
            onChange={onChange}
            className={`field-control ${errors.estado ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          >
            {['pendiente', 'completada'].map((state) => (
              <option key={state} value={state}>
                {formatStateLabel(state)}
              </option>
            ))}
          </select>
          {errors.estado ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.estado}</p> : null}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Nota personal</label>
        <textarea
          name="notaPersonal"
          value={form.notaPersonal}
          onChange={onChange}
          rows="3"
          className="field-control min-h-[92px] resize-y"
          placeholder="Apunta dudas, recursos o pasos que quieres recordar."
        />
      </div>

      <label className="content-card flex items-center gap-4 p-4">
        <input
          type="checkbox"
          name="recordatorio"
          checked={form.recordatorio}
          onChange={onChange}
          className="h-5 w-5 accent-blue-600"
        />
        <div>
          <p className="font-semibold text-slate-700">Activar recordatorio</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Destaca esta tarea en tus recordatorios.</p>
        </div>
      </label>

      {!hasSubjects ? (
        <div className="rounded-[22px] border border-dashed border-blue-200 bg-blue-50/80 px-4 py-4 text-sm leading-6 text-blue-800">
          Primero registra una materia para poder vincular nuevas tareas.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!hasSubjects} className="primary-btn disabled:cursor-not-allowed disabled:opacity-60">
          {isEditing ? 'Guardar cambios' : 'Agregar tarea'}
        </button>
        <button type="button" onClick={onCancel} className="secondary-btn">
          Limpiar
        </button>
      </div>
    </form>
  );
}
