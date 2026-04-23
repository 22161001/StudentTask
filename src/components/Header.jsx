import { FiCalendar, FiUser } from 'react-icons/fi';
import { getSession } from '../services/authService';
import { getSettings } from '../services/settingsService';

const todayLabel = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'full',
}).format(new Date());

const languageLabels = {
  es: 'Espanol',
  en: 'English',
};

export default function Header({ title, subtitle }) {
  const session = getSession();
  const settings = getSettings();

  return (
    <header className="page-content px-4 pt-4 md:px-6 md:pt-5 lg:px-8">
      <div className="surface-panel flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="soft-chip soft-chip--cool">Panel del estudiante</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">{subtitle}</p>
        </div>

        <div className="min-w-[280px] rounded-[24px] bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 px-4 py-4 text-white shadow-[0_18px_48px_rgba(37,99,235,0.24)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner">
              <FiCalendar className="text-lg" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/[0.45]">Hoy</p>
              <p className="mt-1 text-sm text-white/80">{todayLabel}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{session?.nombreCompleto ?? 'Estudiante'}</p>
              <p className="mt-1 text-xs text-white/[0.55]">
                {session?.rol ?? 'Sin rol'} | {languageLabels[settings.idioma] ?? 'Espanol'}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <FiUser className="text-base" />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
