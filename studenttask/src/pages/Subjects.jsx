import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiClock, FiLayers } from 'react-icons/fi';
import FeedbackBanner from '../components/FeedbackBanner';
import MainLayout from '../layout/MainLayout';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import SubjectForm from '../components/SubjectForm';
import SubjectList from '../components/SubjectList';
import { createSubject, deleteSubject, getSubjects, syncSubjects, updateSubject } from '../services/subjectService';
import { getTasks, syncTasks } from '../services/taskService';
import { compareByDueDate, normalizeDateKey } from '../utils/date';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [subjectsResult, tasksResult] = await Promise.all([syncSubjects(), syncTasks()]);

      if (!isMounted) {
        return;
      }

      if (subjectsResult.ok) {
        setSubjects(subjectsResult.subjects);
        if (subjectsResult.message) {
          setFeedback({ type: subjectsResult.fallback ? 'info' : 'success', message: subjectsResult.message });
        }
      } else {
        setFeedback({ type: 'error', message: subjectsResult.message || 'No se pudieron cargar las materias.' });
      }

      if (tasksResult.ok) {
        setTasks(tasksResult.tasks);
      } else {
        setFeedback({ type: 'error', message: tasksResult.message || 'No se pudieron cargar tus tareas.' });
      }

      setLoading(false);
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
            nextDue: [...pendingTasks].sort(compareByDueDate).map((task) => normalizeDateKey(task.fechaEntrega)).find(Boolean) ?? null,
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
      message: editingId ? 'Materia actualizada.' : 'Materia creada.',
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
    if (!window.confirm(`Se eliminará la materia "${subject.nombre}". ¿Deseas continuar?`)) {
      return;
    }

    const result = await deleteSubject(subject.id);
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message });
      return;
    }

    setSubjects(result.subjects);
    setFeedback({ type: 'success', message: 'Materia eliminada.' });
    if (editingId === subject.id) {
      resetForm();
    }
  };

  return (
    <MainLayout
      title="Materias"
      subtitle="Mantén tus asignaturas ordenadas para clasificar cada entrega."
    >
      <PageHero
        eyebrow="Asignaturas"
        title="Materias claras para organizar mejor tus tareas."
        description="Usa colores y notas breves para reconocer cada asignatura al instante."
        stats={[
          {
            label: 'Materias registradas',
            value: subjects.length,
            helper: `${totalPending} tareas pendientes distribuidas por materia.`,
            tone: 'primary',
            Icon: FiBookOpen,
          },
          {
            label: 'Mayor carga',
            value: busiestSubject?.nombre ?? 'Sin datos',
            helper: busiestSubject ? `${busiestSubject.pendingTasks} tareas pendientes asociadas.` : 'Aún no tienes materias registradas.',
            Icon: FiClock,
          },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando materias..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          eyebrow={editingId ? 'Edición activa' : 'Nueva materia'}
          title={editingId ? 'Actualiza una materia' : 'Registra una materia'}
          description="Nombre, color y una nota breve."
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
          title="Tus materias"
          description="Avance, pendientes y próxima entrega por asignatura."
          Icon={FiLayers}
        >
          <SubjectList items={subjectInsights} onEdit={handleEdit} onDelete={handleDelete} />
        </SectionCard>
      </div>
    </MainLayout>
  );
}
