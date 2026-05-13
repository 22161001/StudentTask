import { FiCalendar, FiHome, FiMenu } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { getSession } from '../services/authService';

const todayLabel = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date());

const routeLabels = {
  '/dashboard': 'Inicio',
  '/materias': 'Materias',
  '/tareas': 'Tareas',
  '/agenda': 'Agenda',
  '/tareas-asignadas': 'Tareas asignadas',
  '/reportes': 'Reportes',
  '/seguimiento': 'Seguimiento académico',
  '/perfil': 'Perfil',
  '/configuracion': 'Configuración',
  '/docente/dashboard': 'Dashboard docente',
  '/docente/grupos': 'Grupos',
  '/docente/tareas': 'Tareas asignadas',
  '/docente/perfil': 'Perfil docente',
  '/admin/dashboard': 'Dashboard administrador',
};

function getInitials(session) {
  const initials = `${session?.nombre?.[0] ?? ''}${session?.apellidos?.[0] ?? ''}`.toUpperCase();
  return initials || 'ST';
}

export default function Header({
  title,
  subtitle,
  onOpenMobileSidebar,
}) {
  const location = useLocation();
  const session = getSession();
  const initials = getInitials(session);
  const currentRoute = routeLabels[location.pathname] ?? title;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-slate-50/82 px-4 py-3 backdrop-blur-xl md:px-6 lg:px-8">
      <div className="page-content">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="icon-button shrink-0 lg:hidden"
              aria-label="Abrir navegación"
              aria-controls="app-sidebar"
            >
              <FiMenu className="text-lg" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="hidden items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200/80 sm:inline-flex">
                  <FiHome className="text-sm text-blue-700" />
                  StudentTask
                </span>
                <span className="hidden text-slate-300 sm:inline">/</span>
                <span className="truncate">{currentRoute}</span>
              </div>
              <div className="mt-1 flex min-w-0 items-baseline gap-3">
                <h1 className="truncate text-xl font-black tracking-tight text-slate-950 md:text-2xl">{title}</h1>
                <p className="hidden max-w-xl truncate text-sm text-slate-500 xl:block">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm md:flex">
              <FiCalendar className="text-base text-blue-700" />
              <span>{todayLabel}</span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-2 py-2 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-sky-500 text-xs font-black text-white">
                {initials}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[10rem] truncate text-sm font-black text-slate-900">{session?.nombreCompleto ?? 'Estudiante'}</p>
                <p className="text-xs font-semibold text-slate-500">{session?.rol ?? 'Estudiante'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
