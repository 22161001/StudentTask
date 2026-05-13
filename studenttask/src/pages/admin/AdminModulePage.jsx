import { Link } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiShield } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';

export default function AdminModulePage({
  title,
  description,
  route,
  Icon = FiShield,
}) {
  return (
    <MainLayout title={title} subtitle="Módulo administrativo base.">
      <PageHero
        eyebrow="Administración"
        title={title}
        description={description}
        actions={[
          <Link key="dashboard" to="/admin/dashboard" className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Dashboard
          </Link>,
        ]}
        stats={[
          { label: 'Estado', value: 'En preparación', helper: 'CRUD pendiente.', tone: 'primary', Icon },
          { label: 'Ruta', value: route, helper: 'Acceso protegido por rol.', Icon: FiShield },
        ]}
      />

      <SectionCard
        eyebrow="Vista base"
        title="Módulo en preparación"
        description="La estructura queda lista para implementar administración completa en la siguiente subfase."
        Icon={Icon}
      >
        <EmptyState
          title="Sin registros para administrar todavía"
          description="El CRUD de esta sección se agregará en una subfase posterior."
          Icon={FiClock}
        />
      </SectionCard>
    </MainLayout>
  );
}
