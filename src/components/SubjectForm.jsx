export default function SubjectForm({ form, errors, isEditing, onChange, onSubmit, onCancel }) {
  return (
    <form id="subject-form" onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-600">Nombre de la materia</label>
        <input
          name="nombre"
          value={form.nombre}
          onChange={onChange}
          className={`field-control ${errors.nombre ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
          placeholder="Ej. Programacion, Matematicas o Historia"
        />
        {errors.nombre ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.nombre}</p> : null}
      </div>

      <div className="rounded-[24px] border border-white/70 bg-white/[0.72] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
        <p className="text-sm font-medium text-slate-600">Color identificador</p>
        <div className="mt-3 flex items-center gap-4">
          <span className="h-12 w-12 rounded-[18px] shadow-inner" style={{ backgroundColor: form.color }} />
          <input
            name="color"
            type="color"
            value={form.color}
            onChange={onChange}
            className="h-12 w-20 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1"
          />
          <p className="text-sm leading-6 text-slate-500">Se muestra en el listado y en el panel academico.</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Descripcion</label>
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={onChange}
          rows="4"
          className="field-control min-h-[120px] resize-y"
          placeholder="Tema general, docente o tipo de actividades de la materia."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="primary-btn">
          {isEditing ? 'Guardar cambios' : 'Nueva materia'}
        </button>
        <button type="button" onClick={onCancel} className="secondary-btn">
          Limpiar
        </button>
      </div>
    </form>
  );
}
