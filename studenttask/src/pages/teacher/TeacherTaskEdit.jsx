import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiClipboard, FiEdit3 } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { getTeacherTaskById, updateTeacherTask } from '../../services/teacherTaskService';
import TeacherTaskForm from './TeacherTaskForm';

const validateForm = (form) => {
  const errors = {};

  if (!String(form.titulo ?? '').trim()) errors.titulo = 'El título de la tarea es obligatorio.';
  if (!String(form.fechaLimite ?? '').trim()) errors.fechaLimite = 'Selecciona una fecha límite válida.';
  if (!String(form.prioridad ?? '').trim()) errors.prioridad = 'Selecciona una prioridad.';

  return errors;
};

export default function TeacherTaskEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTask = async () => {
      const result = await getTeacherTaskById(id);

      if (!isMounted) return;

      setTask(result.task ?? null);
      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message || 'No tienes permiso para editar esta tarea.' });
      }
      setLoading(false);
    };

    void loadTask();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmit = async (form) => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setFeedback(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    const result = await updateTeacherTask(id, form);

    if (result.ok) {
      navigate(`/docente/tareas/${id}`, {
        replace: true,
        state: { taskFeedback: result.message || 'Tarea actualizada correctamente.' },
      });
      return;
    }

    setErrors(result.errors ?? {});
    setFeedback({ type: 'error', message: result.message || 'No se pudo actualizar la tarea.' });
    setSubmitting(false);
  };

  return (
    <MainLayout title="Editar tarea" subtitle="Actualiza los datos editables de una tarea publicada.">
      <PageHero
        eyebrow="Edición"
        title={task?.titulo || 'Editar tarea'}
        description="Puedes editar texto, enlace de apoyo, fecha límite, prioridad y estado. Grupo y materia quedan bloqueados."
        stats={[
          { label: 'Modo', value: 'Edición', helper: 'Datos de publicación.', tone: 'primary', Icon: FiEdit3 },
          { label: 'Estado', value: task?.estado || 'Cargando', helper: 'Disponibilidad actual.', Icon: FiClipboard },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando tarea..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !task ? (
        <EmptyState
          title="No se pudo cargar la tarea."
          description="Verifica que la tarea pertenezca a tu cuenta docente."
          Icon={FiClipboard}
        />
      ) : task ? (
        <SectionCard
          eyebrow="Formulario"
          title="Datos editables"
          description="La edición no elimina entregas existentes."
          Icon={FiEdit3}
        >
          <TeacherTaskForm
            mode="edit"
            value={task}
            errors={errors}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/docente/tareas/${id}`)}
          />
        </SectionCard>
      ) : null}
    </MainLayout>
  );
}
