export default function TaskFilters({ filters, subjects, onChange, onReset, resultsCount }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="xl:col-span-2">
          <label className="text-sm font-medium text-slate-600">Buscar</label>
          <input
            name="search"
            value={filters.search}
            onChange={onChange}
            className="field-control"
            placeholder="Título, descripción, docente o grupo"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Estado</label>
          <select name="estado" value={filters.estado} onChange={onChange} className="field-control">
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="completada">Completada</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Prioridad</label>
          <select name="prioridad" value={filters.prioridad} onChange={onChange} className="field-control">
            <option value="todas">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Materia</label>
          <select name="materiaId" value={filters.materiaId} onChange={onChange} className="field-control">
            <option value="todas">Todas</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Tipo</label>
          <select name="tipo" value={filters.tipo} onChange={onChange} className="field-control">
            <option value="todos">Todos</option>
            <option value="personal">Personal</option>
            <option value="asignada">Asignada</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Origen</label>
          <select name="origen" value={filters.origen} onChange={onChange} className="field-control">
            <option value="todos">Todos</option>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-3 md:w-[320px]">
          <div>
            <label className="text-sm font-medium text-slate-600">Ordenar por fecha</label>
            <select name="orden" value={filters.orden} onChange={onChange} className="field-control">
              <option value="asc">Más cercanas primero</option>
              <option value="desc">Más lejanas primero</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="soft-chip soft-chip--cool">{resultsCount} resultado(s)</span>
          <button type="button" onClick={onReset} className="secondary-btn">
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
