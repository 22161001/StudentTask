import { FiShield } from 'react-icons/fi';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';

export default function AdminDashboard() {
  return (
    <MainLayout
      title="Dashboard administrador"
      subtitle="Base preparada para una fase posterior."
    >
      <PageHero
        eyebrow="Administración"
        title="Módulo administrador en preparación."
        description="La ruta queda protegida por rol para habilitar futuras funciones administrativas."
        stats={[
          { label: 'Estado', value: 'Pendiente', helper: 'Fase posterior.', tone: 'primary', Icon: FiShield },
        ]}
      />

      <SectionCard
        eyebrow="Próxima fase"
        title="Panel administrativo"
        description="Gestión de usuarios, catálogos, grupos y reportes institucionales se implementará después."
        Icon={FiShield}
      >
        <div className="content-card px-4 py-4 text-sm font-semibold text-slate-600">
          Ruta preparada: /admin/dashboard
        </div>
      </SectionCard>
    </MainLayout>
  );
}
