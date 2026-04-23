import { useEffect, useState } from 'react';
import { FiMonitor, FiRefreshCw, FiSave, FiSettings, FiSliders } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import SectionCard from '../components/SectionCard';
import { getSettings, syncSettings, updateSettings } from '../services/settingsService';
import { resetAppData } from '../services/storageService';

const viewOptions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'materias', label: 'Materias' },
  { value: 'tareas', label: 'Tareas' },
  { value: 'perfil', label: 'Perfil' },
  { value: 'configuracion', label: 'Configuracion' },
];

export default function Settings() {
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const result = await syncSettings();
      if (isMounted && result.ok) {
        setSettings(result.settings);
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings((currentSettings) => ({
      ...currentSettings,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await updateSettings(settings);
    if (result.ok) {
      setSettings(result.settings);
      setSaved(true);
    }
  };

  return (
    <MainLayout
      title="Configuracion"
      subtitle="Ajusta tus preferencias personales sin tocar configuraciones globales ni modulos administrativos."
    >
      <section className="surface-panel relative mb-6 overflow-hidden p-6 lg:p-7">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-blue-200/45 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <span className="soft-chip soft-chip--cool">Preferencias personales</span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900">
              Deja el sistema listo para tu forma de estudiar.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Aqui controlas solo idioma, vista inicial, recordatorios y una base preparada para tema visual futuro.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/80 px-4 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Idioma</p>
              <p className="mt-3 text-2xl font-black text-slate-900">{settings.idioma === 'en' ? 'English' : 'Espanol'}</p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Vista inicial</p>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {viewOptions.find((option) => option.value === settings.vistaDefault)?.label ?? 'Dashboard'}
              </p>
            </div>
            <div className="rounded-[24px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 px-4 py-5 text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]">
              <p className="text-xs uppercase tracking-[0.28em] text-white/[0.45]">Recordatorios</p>
              <p className="mt-3 text-2xl font-black">{settings.recordatoriosActivos ? 'Activos' : 'Pausados'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Preferencias"
          title="Configuracion del panel"
          description="Los cambios se guardan en cache local y se envian a la API cuando esta disponible."
          Icon={FiSettings}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Idioma</label>
                <select name="idioma" value={settings.idioma} onChange={handleChange} className="field-control">
                  <option value="es">Espanol</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Vista inicial</label>
                <select name="vistaDefault" value={settings.vistaDefault} onChange={handleChange} className="field-control">
                  {viewOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Tema</label>
              <select name="tema" value={settings.tema} onChange={handleChange} className="field-control">
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
              </select>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                La preferencia se guarda desde ahora y queda preparada para una futura version visual mas completa del tema.
              </p>
            </div>

            <label className="flex items-center gap-4 rounded-[24px] border border-white/70 bg-white/[0.74] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
              <input
                type="checkbox"
                name="recordatoriosActivos"
                checked={settings.recordatoriosActivos}
                onChange={handleChange}
                className="h-5 w-5 accent-blue-600"
              />
              <div>
                <p className="font-semibold text-slate-700">Recordatorios activos</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Mantiene visible la preferencia para tareas que requieren seguimiento mas atento.
                </p>
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-btn inline-flex items-center gap-2">
                <FiSave className="text-base" />
                Guardar configuracion
              </button>
              {saved ? <span className="soft-chip soft-chip--cool">Preferencias actualizadas</span> : null}
            </div>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Estado actual"
            title="Resumen de preferencias"
            description="Un vistazo rapido a la configuracion que ya tienes guardada."
            Icon={FiSliders}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Tema', value: settings.tema === 'oscuro' ? 'Oscuro' : 'Claro' },
                { label: 'Idioma', value: settings.idioma === 'en' ? 'English' : 'Espanol' },
                { label: 'Vista inicial', value: viewOptions.find((option) => option.value === settings.vistaDefault)?.label ?? 'Dashboard' },
                { label: 'Recordatorios', value: settings.recordatoriosActivos ? 'Activos' : 'Pausados' },
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
            eyebrow="Mantenimiento"
            title="Restablecer datos demo"
            description="Si quieres empezar de nuevo para la entrega, puedes restaurar perfil, materias, tareas y configuracion base."
            Icon={FiMonitor}
          >
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/[0.72] p-5 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
              <p className="text-sm leading-7 text-slate-600">
                Esta accion borra la sesion activa y vuelve a cargar los datos demo iniciales del estudiante con persistencia local.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('Se restableceran los datos demo del estudiante. Deseas continuar?')) {
                    return;
                  }

                  resetAppData();
                  window.location.href = '/login';
                }}
                className="danger-btn mt-4 inline-flex items-center gap-2"
              >
                <FiRefreshCw className="text-base" />
                Restablecer datos
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </MainLayout>
  );
}
