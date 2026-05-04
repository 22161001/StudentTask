import { useEffect, useState } from 'react';
import { FiMonitor, FiRefreshCw, FiSave, FiSettings, FiSliders } from 'react-icons/fi';
import MainLayout from '../layout/MainLayout';
import PageHero from '../components/PageHero';
import SectionCard from '../components/SectionCard';
import { getSettings, syncSettings, updateSettings } from '../services/settingsService';
import { resetAppData } from '../services/storageService';

const viewOptions = [
  { value: 'dashboard', label: 'Inicio' },
  { value: 'materias', label: 'Materias' },
  { value: 'tareas', label: 'Tareas' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'tareas-asignadas', label: 'Tareas asignadas' },
  { value: 'reportes', label: 'Reportes' },
  { value: 'seguimiento', label: 'Seguimiento académico' },
  { value: 'perfil', label: 'Perfil' },
  { value: 'configuracion', label: 'Configuración' },
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
      title="Configuración"
      subtitle="Personaliza tu experiencia de estudio."
    >
      <PageHero
        eyebrow="Preferencias personales"
        title="Deja el sistema listo para tu forma de estudiar."
        description="Elige idioma, vista inicial, recordatorios y tema visual."
        stats={[
          { label: 'Idioma', value: settings.idioma === 'en' ? 'English' : 'Español', helper: 'Idioma de interfaz.', Icon: FiSettings },
          {
            label: 'Vista inicial',
            value: viewOptions.find((option) => option.value === settings.vistaDefault)?.label ?? 'Inicio',
            helper: 'Pantalla al entrar.',
            Icon: FiMonitor,
          },
          {
            label: 'Recordatorios',
            value: settings.recordatoriosActivos ? 'Activos' : 'Pausados',
            helper: 'Visibilidad de tareas clave.',
            tone: 'primary',
            Icon: FiSliders,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Preferencias"
          title="Configuración del panel"
          description="Tus preferencias se guardan en este dispositivo."
          Icon={FiSettings}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Idioma</label>
                <select name="idioma" value={settings.idioma} onChange={handleChange} className="field-control">
                  <option value="es">Español</option>
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
                El tema se aplicará a las vistas que lo soporten.
              </p>
            </div>

            <label className="content-card flex items-center gap-4 p-4">
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
                  Mantiene visibles las tareas que requieren seguimiento más atento.
                </p>
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-btn inline-flex items-center gap-2">
                <FiSave className="text-base" />
                Guardar configuración
              </button>
              {saved ? <span className="soft-chip soft-chip--cool">Preferencias actualizadas</span> : null}
            </div>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Estado actual"
            title="Resumen de preferencias"
            description="Un vistazo rápido a tus preferencias."
            Icon={FiSliders}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Tema', value: settings.tema === 'oscuro' ? 'Oscuro' : 'Claro' },
                { label: 'Idioma', value: settings.idioma === 'en' ? 'English' : 'Español' },
                { label: 'Vista inicial', value: viewOptions.find((option) => option.value === settings.vistaDefault)?.label ?? 'Inicio' },
                { label: 'Recordatorios', value: settings.recordatoriosActivos ? 'Activos' : 'Pausados' },
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
            eyebrow="Mantenimiento"
            title="Restablecer datos"
            description="Vuelve a la información inicial de materias, tareas y preferencias."
            Icon={FiMonitor}
          >
            <div className="content-card border-dashed p-5">
              <p className="text-sm leading-7 text-slate-600">
                Esta acción cierra tu sesión y restaura los datos de trabajo iniciales. Tus cuentas guardadas se conservan.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('Se restablecerán los datos iniciales. ¿Deseas continuar?')) {
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
