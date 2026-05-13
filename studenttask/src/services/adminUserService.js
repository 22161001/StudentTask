import { extractApiMessage, request } from './apiClient';
import { normalizeApiErrors, unwrapApiData } from './apiMappers';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const normalizeText = (value, fallback = '') => String(value ?? fallback).trim() || fallback;
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const toBoolean = (value) => value === true || value === 1 || value === '1' || String(value ?? '').trim().toLowerCase() === 'true';

const roleOptions = [
  { value: '', label: 'Todos los roles' },
  { value: 'alumno', label: 'Alumno' },
  { value: 'docente', label: 'Docente' },
  { value: 'administrador', label: 'Administrador' },
];

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: '1', label: 'Activos' },
  { value: '0', label: 'Inactivos' },
];

const normalizeRoleForApi = (role) => {
  const normalizedRole = normalizeText(role).toLowerCase();

  if (normalizedRole === 'admin') return 'administrador';
  if (normalizedRole === 'administrador') return 'administrador';
  if (normalizedRole === 'docente') return 'docente';
  return normalizedRole === 'alumno' || normalizedRole === 'estudiante' ? 'alumno' : '';
};

const formatRoleLabel = (role) => {
  const labels = {
    alumno: 'Alumno',
    docente: 'Docente',
    administrador: 'Administrador',
    admin: 'Administrador',
  };

  return labels[String(role ?? '').trim().toLowerCase()] ?? 'Sin rol';
};

const formatStatusLabel = (active) => (active ? 'Activo' : 'Inactivo');

const formatProfileTypeLabel = (profileType) => {
  const labels = {
    alumno: 'Alumno',
    docente: 'Docente',
    administrador: 'Administrador',
    sin_perfil: 'Sin perfil',
  };

  return labels[String(profileType ?? '').trim().toLowerCase()] ?? 'Sin perfil';
};

const normalizeStudentData = (source) => {
  if (!source) return null;

  return {
    idAlumno: Number(pickFirstDefined(source.idAlumno, source.id_alumno, 0)) || 0,
    matricula: normalizeText(source.matricula),
    carrera: normalizeText(source.carrera),
    semestre: normalizeText(source.semestre),
    grupo: normalizeText(source.grupo),
  };
};

const normalizeTeacherData = (source) => {
  if (!source) return null;

  return {
    idDocente: Number(pickFirstDefined(source.idDocente, source.id_docente, 0)) || 0,
    numeroEmpleado: normalizeText(pickFirstDefined(source.numeroEmpleado, source.numero_empleado)),
    especialidad: normalizeText(source.especialidad),
  };
};

const normalizeAdminUser = (payload) => {
  const user = unwrapApiData(payload) ?? {};

  return {
    idUsuario: Number(pickFirstDefined(user.idUsuario, user.id_usuario, user.id, 0)) || 0,
    nombre: normalizeText(user.nombre),
    apellidos: normalizeText(user.apellidos),
    nombreCompleto: normalizeText(`${user.nombre ?? ''} ${user.apellidos ?? ''}`) || 'Usuario',
    email: normalizeEmail(pickFirstDefined(user.email, user.correo)),
    rol: normalizeRoleForApi(user.rol),
    activo: toBoolean(pickFirstDefined(user.activo, true)),
    createdAt: normalizeText(pickFirstDefined(user.createdAt, user.created_at)),
    updatedAt: normalizeText(pickFirstDefined(user.updatedAt, user.updated_at)),
    tipoPerfil: normalizeText(pickFirstDefined(user.tipoPerfil, user.tipo_perfil), 'sin_perfil'),
    datosAlumno: normalizeStudentData(pickFirstDefined(user.datosAlumno, user.datos_alumno)),
    datosDocente: normalizeTeacherData(pickFirstDefined(user.datosDocente, user.datos_docente)),
  };
};

const extractUsers = (payload) => {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.usuarios)) return data.usuarios;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const extractUser = (payload) => {
  const data = unwrapApiData(payload);
  return data?.usuario ?? data?.user ?? data;
};

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();
  const search = normalizeText(filters.search);
  const role = normalizeRoleForApi(filters.rol);
  const active = String(filters.activo ?? '').trim();

  if (search) params.set('search', search);
  if (role) params.set('rol', role);
  if (active === '1' || active === '0') params.set('activo', active);

  const query = params.toString();
  return query ? `?${query}` : '';
};

const buildAdminUserPayload = (data, options = {}) => ({
  nombre: normalizeText(data.nombre),
  apellidos: normalizeText(data.apellidos),
  email: normalizeEmail(data.email),
  rol: normalizeRoleForApi(data.rol),
  activo: Boolean(data.activo),
  ...(options.includePassword ? { password: String(data.password ?? '') } : {}),
});

const handleAdminUserError = (error, fallback, fallbackKey, fallbackValue) => ({
  ok: false,
  message: error?.status === 401
    ? 'La sesión no es válida. Inicia sesión nuevamente.'
    : error?.status === 403
      ? 'No tienes permiso para acceder a esta sección.'
      : extractApiMessage(error?.payload, fallback),
  errors: normalizeApiErrors(error?.payload),
  [fallbackKey]: fallbackValue,
});

const getAdminUsers = async (filters = {}) => {
  try {
    const { data } = await request(`/admin/usuarios${buildQuery(filters)}`);
    return { ok: true, users: extractUsers(data).map(normalizeAdminUser) };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo cargar la lista de usuarios.', 'users', []);
  }
};

const getAdminUserById = async (id) => {
  try {
    const { data } = await request(`/admin/usuarios/${id}`);
    return { ok: true, user: normalizeAdminUser(extractUser(data)) };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo cargar el usuario.', 'user', null);
  }
};

const createAdminUser = async (data) => {
  try {
    const { data: responseData } = await request('/admin/usuarios', {
      method: 'POST',
      body: buildAdminUserPayload(data, { includePassword: true }),
    });

    const response = unwrapApiData(responseData) ?? {};
    return { ok: true, idUsuario: Number(response.idUsuario ?? response.id_usuario ?? 0) || 0 };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo crear el usuario.', 'idUsuario', 0);
  }
};

const updateAdminUser = async (id, data) => {
  try {
    const { data: responseData } = await request(`/admin/usuarios/${id}`, {
      method: 'PUT',
      body: buildAdminUserPayload(data),
    });

    return { ok: true, user: normalizeAdminUser(extractUser(responseData)) };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo actualizar el usuario.', 'user', null);
  }
};

const updateAdminUserStatus = async (id, active) => {
  try {
    const { data } = await request(`/admin/usuarios/${id}/estado`, {
      method: 'PATCH',
      body: { activo: Boolean(active) },
    });

    return { ok: true, data: unwrapApiData(data) ?? {} };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo actualizar el estado del usuario.', 'data', null);
  }
};

const deleteAdminUser = async (id) => {
  try {
    const { data } = await request(`/admin/usuarios/${id}`, { method: 'DELETE' });
    return { ok: true, data: unwrapApiData(data) ?? {} };
  } catch (error) {
    return handleAdminUserError(error, 'No se pudo desactivar el usuario.', 'data', null);
  }
};

export {
  createAdminUser,
  deleteAdminUser,
  formatProfileTypeLabel,
  formatRoleLabel,
  formatStatusLabel,
  getAdminUserById,
  getAdminUsers,
  normalizeAdminUser,
  normalizeRoleForApi,
  roleOptions,
  statusOptions,
  updateAdminUser,
  updateAdminUserStatus,
};
