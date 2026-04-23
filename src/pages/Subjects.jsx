import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiLayers } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import SectionCard from '../components/SectionCard';
import SubjectForm from '../components/SubjectForm';
import SubjectList from '../components/SubjectList';
import { createSubject, deleteSubject, getSubjects, syncSubjects, updateSubject } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';

const initialForm = {
  nombre: '',
  color: '#2563eb',
  descripcion: '',
};

export default function Subjects() {
  const [subjects, setSubjects] = useState(getSubjects());
  const [tasks, setTasks] = useState(getTasks());
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [subjectsResult, tasksResult] = await Promise.all([syncSubjects(), syncTasks()]);

      if (!isMounted) {
        return;
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const subjectInsights = useMemo(
    () =>
      subjects
        .map((subject) => {
          const subjectTasks = tasks.filter((task) => task.materiaId === subject.id);
          const pendingTasks = subjectTasks.filter((task) => task.estado === 'pendiente');
          const completedTasks = subjectTasks.filter((task) => task.estado === 'completada');
          const completionRate = subjectTasks.length ? Math.round((completedTasks.length / subjectTasks.length) * 100) : 0;

          return {
            ...subject,
            totalTasks: subjectTasks.length,
            pendingTasks: pendingTasks.length,
            completedTasks: completedTasks.length,
            nextDue: pendingTasks.sort((taskA, taskB) => taskA.fechaEntrega.localeCompare(taskB.fechaEntrega))[0]?.fechaEntrega ?? null,
            completionRate,
          };
        })
        .sort((subjectA, subjectB) => subjectB.pendingTasks - subjectA.pendingTasks || subjectA.nombre.localeCompare(subjectB.nombre)),
    [subjects, tasks],
  );

  const totalPending = subjectInsights.reduce((sum, subject) => sum + subject.pendingTasks, 0);
  const busiestSubject = subjectInsights[0];

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setErrors({});
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = editingId ? await updateSubject(editingId, form) : await createSubject(form);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFeedback(result.message ? { type: 'error', message: result.message } : null);
      return;
    }

    setSubjects(result.subjects);
    setFeedback({
      type: 'success',
      message: editingId ? 'La materia se actualizo correctamente.' : 'La materia se creo correctamente.',
    });
    resetForm();
  };

  const handleEdit = (subject) => {
    setEditingId(subject.id);
    setForm({
      nombre: subject.nombre,
      color: subject.color,
      descripcion: subject.descripcion,
    });
    setErrors({});
    setFeedback(null);
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Se intentara eliminar la materia "${subject.nombre}". Deseas continuar?`)) {
      return;
    }

    const result = await deleteSubject(subject.id);
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message });
      return;
    }

    setSubjects(result.subjects);
    setFeedback({ type: 'success', message: 'La materia se elimino correctamente.' });
    if (editingId === subject.id) {
      resetForm();
    }
  };

  return (
    <MainLayout
      title="Materias"
      subtitle="Gestiona solo tus materias con un CRUD limpio, claro y pensado para la entrega escolar."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <span className="soft-chip soft-chip--cool">CRUD de materias</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900">
              Ten tus materias ordenadas y listas para clasificar cada tarea del periodo.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Aqui solo administras tus propias asignaturas, con color, descripcion y conexion directa con la carga real de tareas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 px-5 py-5 text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/[0.45]">Materias registradas</p>
              <p className="mt-3 text-3xl font-black">{subjects.length}</p>
              <p className="mt-2 text-sm leading-6 text-white/[0.68]">{totalPending} tareas pendientes distribuidas por materia.</p>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mayor carga</p>
              <p className="mt-3 text-lg font-black tracking-tight text-slate-900">{busiestSubject?.nombre ?? 'Sin datos'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {busiestSubject ? `${busiestSubject.pendingTasks} tareas pendientes asociadas.` : 'Aun no tienes materias registradas.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={`mb-6 rounded-[24px] px-5 py-4 text-sm font-medium ${
            feedback.type === 'error'
              ? 'border border-rose-100 bg-rose-50 text-rose-700'
              : 'border border-blue-100 bg-blue-50 text-blue-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          eyebrow={editingId ? 'Edicion activa' : 'Nueva materia'}
          title={editingId ? 'Actualiza una materia' : 'Registra una materia'}
          description="Nombre, color y descripcion corta. Lo justo para mantener el panel ordenado."
          Icon={FiBookOpen}
        >
          <SubjectForm
            form={form}
            errors={errors}
            isEditing={Boolean(editingId)}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SectionCard>

        <SectionCard
          eyebrow={`${subjects.length} materia(s)`}
          title="Listado personal de materias"
          description="Vista breve de tus materias con tareas asociadas, avance y siguiente entrega."
          Icon={FiLayers}
        >
          <SubjectList items={subjectInsights} onEdit={handleEdit} onDelete={handleDelete} />
        </SectionCard>
      </div>
    </MainLayout>
  );
}
