import { useEffect, useState } from 'react';
import { FiBriefcase, FiMail, FiUser } from 'react-icons/fi';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { syncTeacherProfile } from '../../services/teacherService';

export default function TeacherProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const result = await syncTeacherProfile();

      if (!isMounted) {
        return;
      }

      setProfile(result.profile ?? null);
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar el perfil docente.' });
      }
      setLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const teacher = profile ?? {};
  const fullName = teacher.nombreCompleto || `${teacher.nombre ?? ''} ${teacher.apellidos ?? ''}`.trim() || 'Docente';

  return (
    <MainLayout
      title="Perfil docente"
      subtitle="Consulta tu información institucional."
    >
      <PageHero
        eyebrow="Perfil"
        title={fullName}
        description="Información base del usuario docente conectado al sistema."
        stats={[
          { label: 'Rol', value: teacher.rol || 'Docente', helper: 'Acceso docente.', tone: 'primary', Icon: FiUser },
          { label: 'Empleado', value: teacher.numeroEmpleado || 'Sin dato', helper: 'Número institucional.', Icon: FiBriefcase },
          { label: 'Correo', value: teacher.email || 'Sin correo', helper: 'Cuenta de acceso.', Icon: FiMail },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando perfil docente..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Consulta"
        title="Datos del docente"
        description="La edición del perfil docente queda para una mejora posterior."
        Icon={FiUser}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: 'Nombre', value: teacher.nombre || 'Sin dato' },
            { label: 'Apellidos', value: teacher.apellidos || 'Sin dato' },
            { label: 'Correo', value: teacher.email || 'Sin dato' },
            { label: 'Número de empleado', value: teacher.numeroEmpleado || 'Sin dato' },
            { label: 'Especialidad', value: teacher.especialidad || 'Sin dato' },
            { label: 'Rol', value: teacher.rol || 'Docente' },
          ].map((item) => (
            <div key={item.label} className="content-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </MainLayout>
  );
}
