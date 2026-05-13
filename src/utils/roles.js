const roleAliases = {
  alumno: 'alumno',
  estudiante: 'alumno',
  student: 'alumno',
  docente: 'docente',
  teacher: 'docente',
  profesor: 'docente',
  profesora: 'docente',
  administrador: 'administrador',
  admin: 'administrador',
};

const roleLabels = {
  alumno: 'Estudiante',
  docente: 'Docente',
  administrador: 'Administrador',
};

const roleHomePaths = {
  alumno: '/dashboard',
  docente: '/docente/dashboard',
  administrador: '/admin/dashboard',
};

const normalizeRoleKey = (role) => {
  const normalizedRole = String(role ?? '').trim().toLowerCase();
  return roleAliases[normalizedRole] ?? '';
};

const normalizeRoleLabel = (role, fallback = '') => {
  const roleKey = normalizeRoleKey(role);
  return roleLabels[roleKey] ?? String(role ?? fallback).trim() ?? fallback;
};

const isKnownRole = (role) => Boolean(normalizeRoleKey(role));

const roleMatches = (role, allowedRoles = []) => {
  const roleKey = normalizeRoleKey(role);
  const allowedRoleKeys = allowedRoles.map(normalizeRoleKey).filter(Boolean);

  return allowedRoleKeys.length === 0 || allowedRoleKeys.includes(roleKey);
};

const getRoleHomePath = (role) => roleHomePaths[normalizeRoleKey(role)] ?? '/login';

export {
  getRoleHomePath,
  isKnownRole,
  normalizeRoleKey,
  normalizeRoleLabel,
  roleMatches,
};
