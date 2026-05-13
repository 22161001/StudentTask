import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiPlusCircle } from 'react-icons/fi';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { syncTeacherGroups } from '../../services/teacherService';
import { createTeacherTask } from '../../services/teacherTaskService';
import TeacherTaskForm from './TeacherTaskForm';

const validateForm = (form) => {
  const errors = {};

  if (!Number(form.idGrupo)) errors.idGrupo = 'Selecciona un grupo.';
  if (!Number(form.idMateria)) errors.idMateria = 'Selecciona una materia.';
  if (!String(form.titulo ?? '').trim()) errors.titulo = 'El título de la tarea es obligatorio.';
  if (!String(form.fechaLimite ?? '').trim()) errors.fechaLimite = 'Selecciona una fecha límite válida.';
  if (!String(form.prioridad ?? '').trim()) errors.prioridad = 'Selecciona una prioridad.';

  return errors;
};

export default function TeacherTaskCreate() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAssignments = async () => {
      const result = await syncTeacherGroups();

      if (!isMounted) return;

      setAssignments(result.groups ?? []);
      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message || 'No se pudieron cargar tus grupos.' });
      }
      setLoading(false);
    };

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (form) => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setFeedback(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    const result = await createTeacherTask(form);

    if (result.ok) {
      navigate('/docente/tareas', {
        replace: true,
        state: {
          taskFeedback: `La tarea fue publicada correctamente. Entregas generadas: ${result.totalEntregasGeneradas}.`,
        },
      });
      return;
    }

    setErrors(result.errors ?? {});
    setFeedback({ type: 'error', message: result.message || 'No se pudo publicar la tarea.' });
    setSubmitting(false);
  };

  return (
    <MainLayout title="Nueva tarea" subtitle="Publica una actividad para un grupo completo.">
      <PageHero
        eyebrow="Crear tarea"
        title="Publicar nueva tarea"
        description="Selecciona un grupo, una materia y captura los datos de la actividad. Al publicar se generarán entregas para los alumnos activos."
        stats={[
          { label: 'Grupos', value: assignments.length, helper: 'Asignaciones disponibles.', tone: 'primary', Icon: FiClipboard },
          { label: 'Modo', value: 'Publicación', helper: 'Creación con entregas automáticas.', Icon: FiPlusCircle },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando grupos y materias..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Formulario"
        title="Datos de la tarea"
        description="El grupo y la materia no podrán cambiarse después de publicar."
        Icon={FiClipboard}
      >
        <TeacherTaskForm
          assignments={assignments}
          errors={errors}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/docente/tareas')}
        />
      </SectionCard>
    </MainLayout>
  );
}
