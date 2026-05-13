import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';

const emptyTask = {
  idGrupo: '',
  idMateria: '',
  titulo: '',
  descripcion: '',
  instrucciones: '',
  enlaceApoyo: '',
  fechaLimite: '',
  prioridad: 'media',
  activa: true,
};

const fieldClass = (hasError) =>
  `field-control ${hasError ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`;

const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();

export default function TeacherTaskForm({
  mode = 'create',
  assignments = [],
  value = emptyTask,
  errors = {},
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({ ...emptyTask, ...value });
  const isEdit = mode === 'edit';

  useEffect(() => {
    setForm({ ...emptyTask, ...value });
  }, [value]);

  const groupOptions = useMemo(() => {
    const groups = new Map();

    assignments.forEach((assignment) => {
      if (!assignment.idGrupo) return;
      if (!groups.has(assignment.idGrupo)) {
        groups.set(assignment.idGrupo, {
          idGrupo: assignment.idGrupo,
          nombreGrupo: assignment.nombreGrupo,
          carrera: assignment.carrera,
          semestre: assignment.semestre,
        });
      }
    });

    return Array.from(groups.values());
  }, [assignments]);

  const subjectOptions = useMemo(
    () =>
      assignments
        .filter((assignment) => String(assignment.idGrupo) === String(form.idGrupo))
        .map((assignment) => ({
          idMateria: assignment.idMateria || assignment.materiaId,
          materiaNombre: assignment.materiaNombre,
          materiaColor: assignment.materiaColor,
          periodo: assignment.periodo,
        })),
    [assignments, form.idGrupo],
  );

  useEffect(() => {
    if (isEdit) return;

    if (!form.idGrupo && form.idMateria) {
      setForm((current) => ({ ...current, idMateria: '' }));
      return;
    }

    if (form.idGrupo && subjectOptions.length === 1 && String(form.idMateria) !== String(subjectOptions[0].idMateria)) {
      setForm((current) => ({ ...current, idMateria: String(subjectOptions[0].idMateria) }));
    }
  }, [form.idGrupo, form.idMateria, isEdit, subjectOptions]);

  const handleChange = (event) => {
    const { name, value: inputValue, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : inputValue,
      ...(name === 'idGrupo' ? { idMateria: '' } : {}),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isEdit ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="content-card px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Grupo</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{normalizeText(value.nombreGrupo, 'Sin grupo')}</p>
          </div>
          <div className="content-card px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Materia</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{normalizeText(value.materiaNombre, 'Sin materia')}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Grupo</span>
            <select name="idGrupo" value={form.idGrupo} onChange={handleChange} className={fieldClass(errors.idGrupo)}>
              <option value="">Selecciona un grupo</option>
              {groupOptions.map((group) => (
                <option key={group.idGrupo} value={group.idGrupo}>
                  {group.nombreGrupo} · {group.carrera} · Semestre {group.semestre}
                </option>
              ))}
            </select>
            {errors.idGrupo ? <p className="mt-1 text-xs font-semibold text-rose-600">{errors.idGrupo}</p> : null}
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Materia</span>
            <select
              name="idMateria"
              value={form.idMateria}
              onChange={handleChange}
              disabled={!form.idGrupo}
              className={fieldClass(errors.idMateria)}
            >
              <option value="">{form.idGrupo ? 'Selecciona una materia' : 'Primero selecciona un grupo'}</option>
              {subjectOptions.map((subject) => (
                <option key={`${subject.idMateria}-${subject.periodo}`} value={subject.idMateria}>
                  {subject.materiaNombre} · {subject.periodo || 'Periodo activo'}
                </option>
              ))}
            </select>
            {errors.idMateria ? <p className="mt-1 text-xs font-semibold text-rose-600">{errors.idMateria}</p> : null}
          </label>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Título</span>
        <input
          type="text"
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          className={fieldClass(errors.titulo)}
          placeholder="Ej. Proyecto CRUD con React"
        />
        {errors.titulo ? <p className="mt-1 text-xs font-semibold text-rose-600">{errors.titulo}</p> : null}
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Descripción</span>
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          className="field-control min-h-[105px] resize-y"
          placeholder="Resumen breve de la actividad."
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Instrucciones</span>
        <textarea
          name="instrucciones"
          value={form.instrucciones}
          onChange={handleChange}
          className="field-control min-h-[135px] resize-y"
          placeholder="Indicaciones, criterios y entregables esperados."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-1">
          <span className="text-sm font-bold text-slate-700">Enlace de apoyo</span>
          <input
            type="url"
            name="enlaceApoyo"
            value={form.enlaceApoyo}
            onChange={handleChange}
            className="field-control"
            placeholder="https://..."
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Fecha límite</span>
          <input
            type="date"
            name="fechaLimite"
            value={form.fechaLimite}
            onChange={handleChange}
            className={fieldClass(errors.fechaLimite)}
          />
          {errors.fechaLimite ? <p className="mt-1 text-xs font-semibold text-rose-600">{errors.fechaLimite}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Prioridad</span>
          <select name="prioridad" value={form.prioridad} onChange={handleChange} className={fieldClass(errors.prioridad)}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          {errors.prioridad ? <p className="mt-1 text-xs font-semibold text-rose-600">{errors.prioridad}</p> : null}
        </label>
      </div>

      {isEdit ? (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <input
            type="checkbox"
            name="activa"
            checked={Boolean(form.activa)}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm font-bold text-slate-700">Tarea activa para los alumnos</span>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className="primary-btn">
          <FiCheckCircle className="text-base" />
          {isEdit ? 'Guardar cambios' : 'Publicar tarea'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting} className="secondary-btn">
          <FiX className="text-base" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
