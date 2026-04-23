import { useState } from 'react';
import { FiBookOpen, FiMail, FiSave, FiUser } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
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
      matricula: profile.matricula.trim() ? '' : 'La matricula es obligatoria.',
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
      subtitle="Consulta y actualiza tu informacion personal sin salir del panel del estudiante."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <span className="soft-chip soft-chip--cool">Identidad academica</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900">
              Tu perfil siempre a la mano para que el panel se sienta realmente tuyo.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Mantiene actualizados tu nombre, matricula y datos academicos sin tocar configuraciones globales del sistema.
            </p>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 p-5 text-white shadow-[0_20px_48px_rgba(37,99,235,0.24)]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/12 text-2xl font-black tracking-[0.12em] text-white shadow-inner">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-black tracking-tight">{fullName}</p>
                <p className="mt-2 text-sm text-white/75">{profile.matricula}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Carrera</p>
                <p className="mt-2 text-sm font-semibold text-white/85">{profile.carrera}</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.08] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">Semestre</p>
                <p className="mt-2 text-sm font-semibold text-white/85">{profile.semestre}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
        <SectionCard
          eyebrow="Resumen"
          title="Datos actuales"
          description="Informacion visible para tu sesion y para el panel academico."
          Icon={FiUser}
        >
          <div className="space-y-4">
            {[
              { label: 'Nombre completo', value: fullName },
              { label: 'Correo demo', value: profile.email },
              { label: 'Matricula', value: profile.matricula },
              { label: 'Carrera', value: profile.carrera },
              { label: 'Semestre', value: profile.semestre },
              { label: 'Grupo', value: profile.grupo },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-white/70 bg-white/[0.74] px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Edicion"
          title="Actualiza tu perfil"
          description="Puedes modificar tus datos personales y academicos. El correo demo se mantiene fijo para conservar el acceso."
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
                <label className="text-sm font-medium text-slate-600">Correo demo</label>
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
                <p className="mt-2 text-sm text-slate-500">Se mantiene fijo para conservar el acceso con las credenciales demo.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Matricula</label>
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
