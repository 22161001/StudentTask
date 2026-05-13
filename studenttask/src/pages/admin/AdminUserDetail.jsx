import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBriefcase,
  FiEdit2,
  FiMail,
  FiPower,
  FiShield,
  FiUser,
  FiUserCheck,
} from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { formatLongDate } from '../../utils/date';
import {
  formatProfileTypeLabel,
  formatRoleLabel,
  formatStatusLabel,
  getAdminUserById,
  updateAdminUserStatus,
} from '../../services/adminUserService';

function DetailItem({ label, value }) {
  return (
    <div className="content-card px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{value || 'Sin dato'}</p>
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(
    location.state?.successMessage ? { type: 'success', message: location.state.successMessage } : null,
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setLoading(true);
      const result = await getAdminUserById(id);

      if (!isMounted) {
        return;
      }

      if (!result.ok || !result.user) {
        setFeedback({ type: 'error', message: result.message || 'No se pudo cargar el usuario.' });
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(result.user);
      setLoading(false);
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleStatus = async () => {
    if (!user) return;

    const nextActive = !user.activo;
    if (!nextActive && !window.confirm(`¿Desactivar la cuenta de ${user.nombreCompleto}?`)) {
      return;
    }

    setUpdatingStatus(true);
    setFeedback(null);
    const result = await updateAdminUserStatus(user.idUsuario, nextActive);

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message || 'No se pudo actualizar el estado del usuario.' });
      setUpdatingStatus(false);
      return;
    }

    setUser((currentUser) => ({ ...currentUser, activo: nextActive }));
    setFeedback({
      type: 'success',
      message: nextActive ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
    });
    setUpdatingStatus(false);
  };

  const goBack = () => navigate('/admin/usuarios');

  return (
    <MainLayout
      title="Detalle de usuario"
      subtitle="Información de la cuenta registrada."
    >
      <PageHero
        eyebrow="Usuario"
        title={user?.nombreCompleto || 'Detalle de usuario'}
        description="Consulta los datos básicos, estado y perfil académico asociado."
        actions={[
          <button key="volver" type="button" onClick={goBack} className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Volver
          </button>,
          user ? (
            <Link key="editar" to={`/admin/usuarios/${user.idUsuario}/editar`} className="primary-btn">
              <FiEdit2 className="text-base" />
              Editar
            </Link>
          ) : null,
          user ? (
            <button key="estado" type="button" onClick={handleToggleStatus} disabled={updatingStatus} className="secondary-btn">
              <FiPower className="text-base" />
              {user.activo ? 'Desactivar' : 'Activar'}
            </button>
          ) : null,
        ].filter(Boolean)}
        stats={[
          { label: 'Rol', value: formatRoleLabel(user?.rol), helper: 'Tipo de acceso.', tone: 'primary', Icon: FiShield },
          { label: 'Estado', value: formatStatusLabel(user?.activo), helper: 'Control de sesión.', Icon: FiUserCheck },
          { label: 'Perfil', value: formatProfileTypeLabel(user?.tipoPerfil), helper: 'Asociación académica.', Icon: FiUser },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando usuario..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !user ? (
        <EmptyState
          title="Usuario no encontrado"
          description="El registro solicitado no existe o no pudo cargarse."
          action={
            <Link to="/admin/usuarios" className="primary-btn">
              <FiArrowLeft className="text-base" />
              Volver a usuarios
            </Link>
          }
          Icon={FiUser}
        />
      ) : user ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <SectionCard
            eyebrow="Cuenta"
            title="Datos principales"
            description="Información base usada para iniciar sesión y controlar permisos."
            Icon={FiUser}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Nombre" value={user.nombre} />
              <DetailItem label="Apellidos" value={user.apellidos} />
              <DetailItem label="Correo" value={user.email} />
              <DetailItem label="Rol" value={formatRoleLabel(user.rol)} />
              <DetailItem label="Estado" value={formatStatusLabel(user.activo)} />
              <DetailItem label="Perfil asociado" value={formatProfileTypeLabel(user.tipoPerfil)} />
              <DetailItem label="Fecha de creación" value={formatLongDate(user.createdAt)} />
              <DetailItem label="Última actualización" value={user.updatedAt ? formatLongDate(user.updatedAt) : 'Sin cambios'} />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Perfil"
            title="Perfil académico asociado"
            description="Datos de alumno o docente si ya existen."
            Icon={user.datosDocente ? FiBriefcase : FiMail}
          >
            {user.datosAlumno ? (
              <div className="space-y-4">
                <DetailItem label="Matrícula" value={user.datosAlumno.matricula} />
                <DetailItem label="Carrera" value={user.datosAlumno.carrera} />
                <DetailItem label="Semestre" value={user.datosAlumno.semestre} />
                <DetailItem label="Grupo" value={user.datosAlumno.grupo} />
              </div>
            ) : user.datosDocente ? (
              <div className="space-y-4">
                <DetailItem label="Número de empleado" value={user.datosDocente.numeroEmpleado} />
                <DetailItem label="Especialidad" value={user.datosDocente.especialidad} />
              </div>
            ) : (
              <EmptyState
                title="Sin perfil académico asociado"
                description="La vinculación académica de alumnos y docentes queda pendiente para la Subfase 3.3."
                Icon={FiUser}
              />
            )}
          </SectionCard>
        </div>
      ) : null}
    </MainLayout>
  );
}
