import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBookOpen,
  FiDatabase,
  FiGrid,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from 'react-icons/fi';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { buildSessionAdmin, emptyAdminDashboard, syncAdminDashboard, syncAdminProfile } from '../../services/adminService';

const quickLinks = [
  { to: '/admin/usuarios', label: 'Gestión de usuarios', description: 'Consultar, crear, editar y controlar cuentas.', Icon: FiUsers },
];

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(emptyAdminDashboard);
  const [profile, setProfile] = useState(buildSessionAdmin());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [dashboardResult, profileResult] = await Promise.all([
        syncAdminDashboard(),
        syncAdminProfile(),
      ]);

      if (!isMounted) {
        return;
      }

      setDashboard(dashboardResult.dashboard ?? emptyAdminDashboard);
      setProfile(profileResult.profile ?? buildSessionAdmin());

      if (!dashboardResult.ok) {
        setFeedback({ type: 'error', message: dashboardResult.message || 'No se pudo cargar la información administrativa.' });
      } else if (!profileResult.ok) {
        setFeedback({ type: 'error', message: profileResult.message || 'No se pudo cargar la información administrativa.' });
      } else if (dashboardResult.message || profileResult.message) {
        setFeedback({
          type: dashboardResult.fallback || profileResult.fallback ? 'info' : 'error',
          message: dashboardResult.message || profileResult.message,
        });
      }

      setLoading(false);
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const adminName = profile.nombre || profile.nombreCompleto || 'Administrador';

  return (
    <MainLayout
      title="Dashboard administrador"
      subtitle="Resumen general del sistema."
    >
      <PageHero
        eyebrow="Administración"
        title={`Bienvenido, ${adminName}.`}
        description="Consulta el estado general de usuarios, grupos, materias y cuentas activas desde un panel central."
        actions={[
          <Link key="usuarios" to="/admin/usuarios" className="primary-btn">
            <FiUsers className="text-base" />
            Gestión de usuarios
          </Link>,
        ]}
        stats={[
          { label: 'Usuarios', value: dashboard.totalUsuarios, helper: 'Cuentas registradas.', tone: 'primary', Icon: FiUsers },
          { label: 'Activas', value: dashboard.usuariosActivos, helper: 'Cuentas habilitadas.', tone: 'success', Icon: FiUserCheck },
          { label: 'Inactivas', value: dashboard.usuariosInactivos, helper: 'Cuentas bloqueadas.', tone: 'warning', Icon: FiUserX },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando dashboard administrador..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de usuarios" value={dashboard.totalUsuarios} helper="Todas las cuentas del sistema." tone="blue" Icon={FiUsers} />
        <StatCard title="Alumnos" value={dashboard.totalAlumnos} helper="Usuarios con rol alumno." tone="sky" Icon={FiUserCheck} />
        <StatCard title="Docentes" value={dashboard.totalDocentes} helper="Usuarios con rol docente." tone="indigo" Icon={FiShield} />
        <StatCard title="Administradores" value={dashboard.totalAdministradores} helper="Cuentas administrativas." tone="rose" Icon={FiDatabase} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <StatCard title="Grupos" value={dashboard.totalGrupos} helper="Grupos registrados en MySQL." tone="blue" Icon={FiGrid} />
        <StatCard title="Materias" value={dashboard.totalMaterias} helper="Catálogo de materias." tone="sky" Icon={FiBookOpen} />
        <StatCard title="Cuentas activas" value={dashboard.usuariosActivos} helper="Usuarios que pueden iniciar sesión." tone="indigo" Icon={FiUserCheck} />
        <StatCard title="Cuentas inactivas" value={dashboard.usuariosInactivos} helper="Usuarios sin acceso activo." tone="rose" Icon={FiUserX} />
      </section>

      <section className="mt-6">
        <SectionCard
          eyebrow="Accesos rápidos"
          title="Gestión administrativa"
          description="Entrada principal de la Subfase 3.2."
          Icon={FiShield}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item) => (
              <Link key={item.to} to={item.to} className="content-card interactive-card flex min-h-[8.25rem] flex-col justify-between p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <item.Icon className="text-lg" />
                </span>
                <span>
                  <span className="block text-lg font-black tracking-tight text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </section>
    </MainLayout>
  );
}
