import { useEffect, useState } from 'react';
import { FiMail, FiShield, FiUser } from 'react-icons/fi';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { buildSessionAdmin, syncAdminProfile } from '../../services/adminService';

export default function AdminProfile() {
  const [profile, setProfile] = useState(buildSessionAdmin());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const result = await syncAdminProfile();

      if (!isMounted) {
        return;
      }

      setProfile(result.profile ?? buildSessionAdmin());
      if (result.message) {
        setFeedback({ type: result.ok && result.fallback ? 'info' : 'error', message: result.message });
      } else if (!result.ok) {
        setFeedback({ type: 'error', message: 'No se pudo cargar la información administrativa.' });
      }
      setLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const fullName = profile.nombreCompleto || `${profile.nombre ?? ''} ${profile.apellidos ?? ''}`.trim() || 'Administrador';

  return (
    <MainLayout
      title="Perfil administrador"
      subtitle="Consulta la cuenta administrativa activa."
    >
      <PageHero
        eyebrow="Perfil"
        title={fullName}
        description="Información base del usuario administrador conectado al sistema."
        stats={[
          { label: 'Rol', value: profile.rol || 'Administrador', helper: 'Acceso administrativo.', tone: 'primary', Icon: FiShield },
          { label: 'Correo', value: profile.email || 'Sin correo', helper: 'Cuenta de acceso.', Icon: FiMail },
          { label: 'ID usuario', value: profile.id_usuario || 'Sin dato', helper: 'Identificador interno.', Icon: FiUser },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando perfil administrador..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Consulta"
        title="Datos del administrador"
        description="La edición de cuentas administrativas queda pendiente para las siguientes subfases."
        Icon={FiShield}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: 'ID de usuario', value: profile.id_usuario || 'Sin dato' },
            { label: 'Nombre', value: profile.nombre || 'Sin dato' },
            { label: 'Apellidos', value: profile.apellidos || 'Sin dato' },
            { label: 'Correo', value: profile.email || 'Sin dato' },
            { label: 'Rol', value: profile.rol || 'Administrador' },
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
