import { useState } from 'react';
import { FiBookOpen, FiMail, FiSave, FiUser } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import { getProfile, updateProfile } from '../services/profileService';

const initialErrors = {
  nombre: '',
  apellidos: '',
  matricula: '',
  carrera: '',
  semestre: '',
  grupo: '',
};

export default function Profile() {
  const [profile, setProfile] = useState(getProfile());
  const [errors, setErrors] = useState(initialErrors);
  const [saved, setSaved] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((currentProfile) => ({ ...currentProfile, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {
      nombre: profile.nombre.trim() ? '' : 'El nombre es obligatorio.',
      apellidos: profile.apellidos.trim() ? '' : 'Los apellidos son obligatorios.',
      matricula: profile.matricula.trim() ? '' : 'La matrícula es obligatoria.',
      carrera: profile.carrera.trim() ? '' : 'La carrera o programa es obligatorio.',
      semestre: profile.semestre.trim() ? '' : 'El semestre o nivel es obligatorio.',
      grupo: profile.grupo.trim() ? '' : 'El grupo es obligatorio.',
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const result = updateProfile(profile);
    if (result.ok) {
      setProfile(result.profile);
      setSaved(true);
    }
  };

  const fullName = `${profile.nombre} ${profile.apellidos}`.trim();
  const initials = `${profile.nombre?.[0] ?? ''}${profile.apellidos?.[0] ?? ''}`.toUpperCase();

  return (
    <MainLayout
      title="Perfil"
      subtitle="Mantén actualizados tus datos personales y académicos."
    >
      <PageHero
        eyebrow="Identidad académica"
        title="Tus datos listos para cada actividad académica."
        description="Actualiza tu nombre, matrícula, carrera, semestre y grupo."
        stats={[
          { label: 'Estudiante', value: fullName || initials, helper: profile.matricula, tone: 'primary', Icon: FiUser },
          { label: 'Carrera', value: profile.carrera, helper: `Grupo ${profile.grupo}`, Icon: FiBookOpen },
          { label: 'Semestre', value: profile.semestre, helper: 'Nivel académico actual.', Icon: FiUser },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
        <SectionCard
          eyebrow="Resumen"
          title="Datos actuales"
          description="Información visible en tu sesión."
          Icon={FiUser}
        >
          <div className="space-y-4">
            {[
              { label: 'Nombre completo', value: fullName },
              { label: 'Correo electrónico', value: profile.email },
              { label: 'Matrícula', value: profile.matricula },
              { label: 'Carrera', value: profile.carrera },
              { label: 'Semestre', value: profile.semestre },
              { label: 'Grupo', value: profile.grupo },
            ].map((item) => (
              <div
                key={item.label}
                className="content-card px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Edición"
          title="Actualiza tu perfil"
          description="Modifica tus datos personales y académicos."
          Icon={FiBookOpen}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Nombre</label>
                <input
                  name="nombre"
                  value={profile.nombre}
                  onChange={handleChange}
                  className={`field-control ${errors.nombre ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.nombre ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.nombre}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Apellidos</label>
                <input
                  name="apellidos"
                  value={profile.apellidos}
                  onChange={handleChange}
                  className={`field-control ${errors.apellidos ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.apellidos ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.apellidos}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Correo electrónico</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-[1.35rem] text-slate-400">
                    <FiMail className="text-base" />
                  </span>
                  <input
                    name="email"
                    value={profile.email}
                    readOnly
                    className="field-control pl-11 text-slate-500"
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">El correo se mantiene fijo para proteger tu acceso.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Matrícula</label>
                <input
                  name="matricula"
                  value={profile.matricula}
                  onChange={handleChange}
                  className={`field-control ${errors.matricula ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.matricula ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.matricula}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Carrera o programa</label>
                <input
                  name="carrera"
                  value={profile.carrera}
                  onChange={handleChange}
                  className={`field-control ${errors.carrera ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.carrera ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.carrera}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Grupo</label>
                <input
                  name="grupo"
                  value={profile.grupo}
                  onChange={handleChange}
                  className={`field-control ${errors.grupo ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.grupo ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.grupo}</p> : null}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Semestre o nivel</label>
              <input
                name="semestre"
                value={profile.semestre}
                onChange={handleChange}
                className={`field-control ${errors.semestre ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
              />
              {errors.semestre ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.semestre}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-btn inline-flex items-center gap-2">
                <FiSave className="text-base" />
                Guardar perfil
              </button>
              {saved ? <span className="soft-chip soft-chip--cool">Perfil actualizado</span> : null}
            </div>
          </form>
        </SectionCard>
      </div>
    </MainLayout>
  );
}
