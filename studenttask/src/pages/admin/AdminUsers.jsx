import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiEdit2,
  FiEye,
  FiFilter,
  FiPlus,
  FiPower,
  FiRefreshCw,
  FiSearch,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import { formatLongDate } from '../../utils/date';
import {
  formatProfileTypeLabel,
  formatRoleLabel,
  formatStatusLabel,
  getAdminUsers,
  roleOptions,
  statusOptions,
  updateAdminUserStatus,
} from '../../services/adminUserService';

const initialFilters = {
  search: '',
  rol: '',
  activo: '',
};

function StatusBadge({ active }) {
  return (
    <span className={`soft-chip ${active ? 'soft-chip--cool' : 'soft-chip--warm'} ${active ? 'text-emerald-700' : 'text-rose-700'}`}>
      {formatStatusLabel(active)}
    </span>
  );
}

function RoleBadge({ role }) {
  return <span className="soft-chip soft-chip--cool">{formatRoleLabel(role)}</span>;
}

export default function AdminUsers() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(
    location.state?.successMessage ? { type: 'success', message: location.state.successMessage } : null,
  );
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      const result = await getAdminUsers(filters);

      if (!isMounted) {
        return;
      }

      setUsers(result.users ?? []);
      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message || 'No se pudo cargar la lista de usuarios.' });
      }
      setLoading(false);
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [filters]);

  const totals = useMemo(
    () => ({
      total: users.length,
      activos: users.filter((user) => user.activo).length,
      inactivos: users.filter((user) => !user.activo).length,
    }),
    [users],
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const handleToggleStatus = async (user) => {
    const nextActive = !user.activo;
    if (!nextActive && !window.confirm(`¿Desactivar la cuenta de ${user.nombreCompleto}?`)) {
      return;
    }

    setActionId(user.idUsuario);
    setFeedback(null);
    const result = await updateAdminUserStatus(user.idUsuario, nextActive);

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message || 'No se pudo actualizar el estado del usuario.' });
      setActionId(null);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.idUsuario === user.idUsuario ? { ...currentUser, activo: nextActive } : currentUser,
      ),
    );
    setFeedback({
      type: 'success',
      message: nextActive ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
    });
    setActionId(null);
  };

  return (
    <MainLayout
      title="Gestión de usuarios"
      subtitle="Administra las cuentas registradas en el sistema."
    >
      <PageHero
        eyebrow="Usuarios"
        title="Gestión de usuarios"
        description="Consulta, filtra, crea y controla el estado de las cuentas base de StudentTask."
        actions={[
          <Link key="nuevo" to="/admin/usuarios/nuevo" className="primary-btn">
            <FiPlus className="text-base" />
            Nuevo usuario
          </Link>,
        ]}
        stats={[
          { label: 'Usuarios', value: totals.total, helper: 'Resultado actual.', tone: 'primary', Icon: FiUsers },
          { label: 'Activos', value: totals.activos, helper: 'Pueden iniciar sesión.', tone: 'success', Icon: FiUserCheck },
          { label: 'Inactivos', value: totals.inactivos, helper: 'Acceso bloqueado.', tone: 'warning', Icon: FiPower },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando usuarios..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Filtros"
        title="Buscar usuarios"
        description="Filtra por nombre, correo, rol o estado."
        Icon={FiFilter}
        className="mb-6"
      >
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.8fr_0.8fr_auto] lg:items-end">
          <div>
            <label className="text-sm font-medium text-slate-600">Búsqueda</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-[1.35rem] text-slate-400">
                <FiSearch className="text-base" />
              </span>
              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre, apellidos o correo"
                className="field-control pl-11"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Rol</label>
            <select name="rol" value={filters.rol} onChange={handleFilterChange} className="field-control">
              {roleOptions.map((option) => (
                <option key={option.value || 'todos'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Estado</label>
            <select name="activo" value={filters.activo} onChange={handleFilterChange} className="field-control">
              {statusOptions.map((option) => (
                <option key={option.value || 'todos'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="button" onClick={clearFilters} className="secondary-btn">
            <FiRefreshCw className="text-base" />
            Limpiar
          </button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow={`${users.length} usuario(s)`}
        title="Cuentas registradas"
        description="Listado base de usuarios del sistema."
        Icon={FiUsers}
      >
        {!loading && users.length === 0 ? (
          <EmptyState
            title="No hay usuarios con esos filtros"
            description="Ajusta la búsqueda o registra una cuenta nueva."
            action={
              <Link to="/admin/usuarios/nuevo" className="primary-btn">
                <FiPlus className="text-base" />
                Nuevo usuario
              </Link>
            }
            Icon={FiUsers}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/75 md:block">
              <div className="table-shell rounded-none border-0">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Registro</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.idUsuario} className="align-top">
                        <td className="px-4 py-3 font-bold text-slate-900">{user.nombreCompleto}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{user.email}</td>
                        <td className="px-4 py-3"><RoleBadge role={user.rol} /></td>
                        <td className="px-4 py-3"><StatusBadge active={user.activo} /></td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{formatProfileTypeLabel(user.tipoPerfil)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{formatLongDate(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link to={`/admin/usuarios/${user.idUsuario}`} className="icon-button" title="Ver detalle" aria-label="Ver detalle">
                              <FiEye className="text-base" />
                            </Link>
                            <Link to={`/admin/usuarios/${user.idUsuario}/editar`} className="icon-button" title="Editar" aria-label="Editar">
                              <FiEdit2 className="text-base" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionId === user.idUsuario}
                              className="icon-button"
                              title={user.activo ? 'Desactivar' : 'Activar'}
                              aria-label={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              <FiPower className="text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:hidden">
              {users.map((user) => (
                <article key={user.idUsuario} className="content-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black tracking-tight text-slate-900">{user.nombreCompleto}</h3>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">{user.email}</p>
                    </div>
                    <StatusBadge active={user.activo} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <RoleBadge role={user.rol} />
                    <span className="soft-chip soft-chip--warm">{formatProfileTypeLabel(user.tipoPerfil)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-500">Registro: {formatLongDate(user.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/admin/usuarios/${user.idUsuario}`} className="secondary-btn">
                      <FiEye className="text-base" />
                      Ver
                    </Link>
                    <Link to={`/admin/usuarios/${user.idUsuario}/editar`} className="secondary-btn">
                      <FiEdit2 className="text-base" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      disabled={actionId === user.idUsuario}
                      className="secondary-btn"
                    >
                      <FiPower className="text-base" />
                      {user.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </MainLayout>
  );
}
