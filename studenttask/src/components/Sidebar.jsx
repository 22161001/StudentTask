import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiGrid,
  FiLogOut,
  FiPlusCircle,
  FiShield,
  FiSettings,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import logo from '../assets/studenttask-logo.jpeg';
import { logoutUser, getSession } from '../services/authService';
import { normalizeRoleKey } from '../utils/roles';

const navigationByRole = {
  alumno: {
    ariaLabel: 'Navegación del estudiante',
    panelTitle: 'Panel académico',
    fallbackName: 'Estudiante',
    groups: [
      {
        label: 'Trabajo diario',
        items: [
          { to: '/dashboard', label: 'Dashboard', Icon: FiGrid },
          { to: '/tareas', label: 'Tareas', Icon: FiCheckSquare },
          { to: '/agenda', label: 'Agenda', Icon: FiCalendar },
          { to: '/materias', label: 'Materias', Icon: FiBookOpen },
          { to: '/tareas-asignadas', label: 'Tareas asignadas', Icon: FiClipboard },
        ],
      },
      {
        label: 'Análisis',
        items: [
          { to: '/reportes', label: 'Reportes', Icon: FiBarChart2 },
          { to: '/seguimiento', label: 'Seguimiento académico', Icon: FiActivity },
        ],
      },
      {
        label: 'Cuenta',
        items: [
          { to: '/perfil', label: 'Perfil', Icon: FiUser },
          { to: '/configuracion', label: 'Configuración', Icon: FiSettings },
        ],
      },
    ],
  },
  docente: {
    ariaLabel: 'Navegación del docente',
    panelTitle: 'Panel docente',
    fallbackName: 'Docente',
    groups: [
      {
        label: 'Docencia',
        items: [
          { to: '/docente/dashboard', label: 'Dashboard', Icon: FiGrid },
          { to: '/docente/grupos', label: 'Grupos', Icon: FiUsers },
          { to: '/docente/materias', label: 'Materias', Icon: FiBookOpen },
          { to: '/docente/tareas', label: 'Tareas asignadas', Icon: FiClipboard },
          { to: '/docente/tareas/nueva', label: 'Crear tarea', Icon: FiPlusCircle },
          { to: '/docente/seguimiento', label: 'Seguimiento', Icon: FiActivity },
          { to: '/docente/reportes', label: 'Reportes', Icon: FiBarChart2 },
        ],
      },
      {
        label: 'Cuenta',
        items: [{ to: '/docente/perfil', label: 'Perfil', Icon: FiUser }],
      },
    ],
  },
  administrador: {
    ariaLabel: 'Navegación del administrador',
    panelTitle: 'Panel administrador',
    fallbackName: 'Administrador',
    groups: [
      {
        label: 'Administración',
        items: [
          { to: '/admin/dashboard', label: 'Dashboard', Icon: FiShield },
          { to: '/admin/usuarios', label: 'Usuarios', Icon: FiUsers },
          { to: '/admin/alumnos', label: 'Alumnos', Icon: FiUser },
          { to: '/admin/docentes', label: 'Docentes', Icon: FiBriefcase },
          { to: '/admin/grupos', label: 'Grupos', Icon: FiGrid },
          { to: '/admin/materias', label: 'Materias', Icon: FiBookOpen },
          { to: '/admin/asignaciones', label: 'Asignaciones', Icon: FiClipboard },
        ],
      },
      {
        label: 'Cuenta',
        items: [{ to: '/admin/perfil', label: 'Perfil', Icon: FiUser }],
      },
    ],
  },
};

function getInitials(session) {
  const initials = `${session?.nombre?.[0] ?? ''}${session?.apellidos?.[0] ?? ''}`.toUpperCase();
  return initials || 'ST';
}

function SidebarItem({ item, onCloseMobile }) {
  return (
    <NavLink
      to={item.to}
      onClick={onCloseMobile}
      className={({ isActive }) =>
        `group relative flex min-h-[2.45rem] items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
              isActive
                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                : 'text-slate-500 group-hover:bg-white group-hover:text-blue-700 group-hover:shadow-sm'
            }`}
          >
            <item.Icon className="text-base" />
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ isMobileOpen = false, onCloseMobile }) {
  const navigate = useNavigate();
  const session = getSession();
  const initials = getInitials(session);
  const roleKey = normalizeRoleKey(session?.rol) || 'alumno';
  const navigation = navigationByRole[roleKey] ?? navigationByRole.alumno;

  const handleLogout = async () => {
    await logoutUser();
    onCloseMobile?.();
    navigate('/login');
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar navegación"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-sidebar"
        aria-label={navigation.ariaLabel}
        className={`fixed inset-y-0 left-0 z-50 w-[min(15.25rem,calc(100vw-1rem))] shrink-0 p-3 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[14.25rem] lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col rounded-[20px] border border-slate-200/80 bg-white/95 p-3 text-slate-700 shadow-[0_18px_42px_rgba(15,23,42,0.075)] backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-inner ring-1 ring-slate-200/70">
              <img src={logo} alt="StudentTask" className="h-8 w-8 object-contain" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-blue-600">StudentTask</p>
              <h1 className="mt-0.5 truncate text-sm font-black tracking-tight text-slate-950">{navigation.panelTitle}</h1>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 lg:hidden"
              aria-label="Cerrar navegación"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <nav className="sidebar-nav mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1" aria-label={navigation.ariaLabel}>
            {navigation.groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[0.62rem] font-black uppercase tracking-[0.17em] text-slate-400">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarItem key={item.to} item={item} onCloseMobile={onCloseMobile} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <footer className="mt-auto border-t border-slate-200/75 pt-3">
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50/75 p-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-sky-500 text-xs font-black text-white shadow-sm">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{session?.nombreCompleto ?? navigation.fallbackName}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{session?.rol ?? navigation.fallbackName}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex min-h-[2.4rem] w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
            >
              <FiLogOut className="text-base" />
              Cerrar sesión
            </button>
          </footer>
        </div>
      </aside>
    </>
  );
}
