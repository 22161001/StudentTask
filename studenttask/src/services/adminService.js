import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import { getSession } from './authService';
import { normalizeRole, unwrapApiData } from './apiMappers';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();
const toNumber = (value) => Number(value ?? 0) || 0;

const emptyAdminDashboard = {
  totalUsuarios: 0,
  totalAlumnos: 0,
  totalDocentes: 0,
  totalAdministradores: 0,
  totalGrupos: 0,
  totalMaterias: 0,
  usuariosActivos: 0,
  usuariosInactivos: 0,
};

const buildSessionAdmin = () => {
  const session = getSession();
  const nombre = normalizeText(session?.nombre, 'Administrador');
  const apellidos = normalizeText(session?.apellidos);

  return {
    id_usuario: Number(pickFirstDefined(session?.idUsuario, session?.id_usuario, session?.id, 0)) || 0,
    nombre,
    apellidos,
    nombreCompleto: normalizeText(session?.nombreCompleto, `${nombre} ${apellidos}`) || 'Administrador',
    email: normalizeText(session?.email),
    rol: normalizeRole(session?.rol, 'Administrador'),
  };
};

const normalizeAdminProfile = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.perfil ?? data.admin ?? data.administrador ?? data.user ?? data.usuario ?? data;
  const fallback = buildSessionAdmin();
  const nombre = normalizeText(pickFirstDefined(source.nombre, fallback.nombre), fallback.nombre);
  const apellidos = normalizeText(pickFirstDefined(source.apellidos, fallback.apellidos), fallback.apellidos);

  return {
    id_usuario: Number(pickFirstDefined(source.id_usuario, source.idUsuario, source.id, fallback.id_usuario)) || fallback.id_usuario,
    nombre,
    apellidos,
    nombreCompleto: normalizeText(`${nombre} ${apellidos}`) || fallback.nombreCompleto,
    email: normalizeText(pickFirstDefined(source.email, source.correo, fallback.email), fallback.email),
    rol: normalizeRole(pickFirstDefined(source.rol, fallback.rol), 'Administrador'),
  };
};

const normalizeAdminDashboard = (payload) => {
  const data = unwrapApiData(payload) ?? {};
  const source = data.dashboard ?? data.resumen ?? data;

  return {
    totalUsuarios: toNumber(pickFirstDefined(source.totalUsuarios, source.total_usuarios)),
    totalAlumnos: toNumber(pickFirstDefined(source.totalAlumnos, source.total_alumnos)),
    totalDocentes: toNumber(pickFirstDefined(source.totalDocentes, source.total_docentes)),
    totalAdministradores: toNumber(pickFirstDefined(source.totalAdministradores, source.total_administradores)),
    totalGrupos: toNumber(pickFirstDefined(source.totalGrupos, source.total_grupos)),
    totalMaterias: toNumber(pickFirstDefined(source.totalMaterias, source.total_materias)),
    usuariosActivos: toNumber(pickFirstDefined(source.usuariosActivos, source.usuarios_activos)),
    usuariosInactivos: toNumber(pickFirstDefined(source.usuariosInactivos, source.usuarios_inactivos)),
  };
};

const getAdminErrorMessage = (error, fallback) => {
  if (error?.status === 401) {
    return 'La sesión no es válida. Inicia sesión nuevamente.';
  }

  if (error?.status === 403) {
    return 'No tienes permiso para acceder a esta sección.';
  }

  return extractApiMessage(error?.payload, fallback);
};

const syncAdminDashboard = async () => {
  try {
    const { data } = await request('/admin/dashboard');
    return { ok: true, dashboard: normalizeAdminDashboard(data) };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return {
        ok: true,
        fallback: true,
        dashboard: emptyAdminDashboard,
        message: 'No se pudo cargar la información administrativa.',
      };
    }

    return {
      ok: false,
      dashboard: emptyAdminDashboard,
      message: getAdminErrorMessage(error, 'No se pudo cargar la información administrativa.'),
    };
  }
};

const syncAdminProfile = async () => {
  try {
    const { data } = await request('/admin/perfil');
    return { ok: true, profile: normalizeAdminProfile(data) };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return {
        ok: true,
        fallback: true,
        profile: buildSessionAdmin(),
        message: 'No se pudo cargar la información administrativa.',
      };
    }

    return {
      ok: false,
      profile: buildSessionAdmin(),
      message: getAdminErrorMessage(error, 'No se pudo cargar la información administrativa.'),
    };
  }
};

export {
  buildSessionAdmin,
  emptyAdminDashboard,
  normalizeAdminDashboard,
  normalizeAdminProfile,
  syncAdminDashboard,
  syncAdminProfile,
};
