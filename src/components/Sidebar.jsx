import { NavLink, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiCheckSquare, FiGrid, FiLogOut, FiSettings, FiUser, FiZap } from 'react-icons/fi';
import { logoutUser, getSession } from '../services/authService';
import { getSettings } from '../services/settingsService';

const links = [
  { to: '/dashboard', label: 'Dashboard', hint: 'Resumen academico', Icon: FiGrid },
  { to: '/materias', label: 'Materias', hint: 'Registro personal', Icon: FiBookOpen },
  { to: '/tareas', label: 'Tareas', hint: 'Seguimiento y filtros', Icon: FiCheckSquare },
  { to: '/perfil', label: 'Perfil', hint: 'Datos del estudiante', Icon: FiUser },
  { to: '/configuracion', label: 'Configuracion', hint: 'Preferencias personales', Icon: FiSettings },
];

const defaultViewLabels = {
  dashboard: 'Dashboard',
  materias: 'Materias',
  tareas: 'Tareas',
  perfil: 'Perfil',
  configuracion: 'Configuracion',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const session = getSession();
  const settings = getSettings();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <aside className="relative z-10 w-full px-4 pt-4 md:w-[320px] md:px-6 md:py-6">
      <div className="surface-panel-dark flex h-full flex-col gap-7 p-6 text-white md:min-h-[calc(100vh-3rem)]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-sky-300/20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/[0.45]">App de control escolar</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">StudentTask</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/70">
            Tu espacio personal para organizar materias, tareas y avance academico sin modulos administrativos.
          </p>
        </div>

        <nav className="space-y-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `group flex items-center gap-4 rounded-[24px] px-4 py-3.5 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_18px_35px_rgba(37,99,235,0.28)]'
                    : 'border border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.08]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/75'
                    }`}
                  >
                    <link.Icon className="text-lg" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{link.label}</p>
                    <p className={`text-xs ${isActive ? 'text-white/80' : 'text-white/[0.45]'}`}>{link.hint}</p>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/[0.45]">Sesion activa</p>
            <p className="mt-3 text-base font-semibold">{session?.nombreCompleto ?? 'Estudiante'}</p>
            <p className="mt-2 text-sm text-white/[0.62]">
              {session?.matricula ?? 'Sin matricula'} | {session?.rol ?? 'Estudiante'}
            </p>
            <p className="mt-2 text-xs text-white/[0.5]">
              Vista inicial: {defaultViewLabels[settings.vistaDefault] ?? 'Dashboard'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.1] text-white/85">
              <FiZap className="text-lg" />
            </span>
            <div>
              <p className="text-sm font-semibold">Todo listo para continuar</p>
              <p className="mt-1 text-xs text-white/[0.55]">Tus cambios usan cache local y se sincronizan con la API cuando esta disponible.</p>
            </div>
          </div>

          <button type="button" onClick={handleLogout} className="secondary-btn mt-5 flex w-full items-center justify-center gap-2 bg-white/95 text-slate-800">
            <FiLogOut className="text-base" />
            Cerrar sesion
          </button>
        </div>
      </div>
    </aside>
  );
}
