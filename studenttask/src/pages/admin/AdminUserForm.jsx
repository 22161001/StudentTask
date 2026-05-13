import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiLock, FiMail, FiSave, FiUser, FiUserPlus } from 'react-icons/fi';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import {
  createAdminUser,
  formatRoleLabel,
  getAdminUserById,
  roleOptions,
  updateAdminUser,
} from '../../services/adminUserService';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  confirmPassword: '',
  rol: 'alumno',
  activo: true,
};

const validateForm = (form, mode) => {
  const errors = {};
  const email = String(form.email ?? '').trim();
  const password = String(form.password ?? '');
  const confirmPassword = String(form.confirmPassword ?? '');

  if (!String(form.nombre ?? '').trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!String(form.apellidos ?? '').trim()) errors.apellidos = 'Los apellidos son obligatorios.';

  if (!email) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (!form.rol) {
    errors.rol = 'Selecciona un rol.';
  }

  if (mode === 'create') {
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma la contraseña.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
  }

  return errors;
};

export default function AdminUserForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    let isMounted = true;

    const loadUser = async () => {
      setLoading(true);
      const result = await getAdminUserById(id);

      if (!isMounted) {
        return;
      }

      if (!result.ok || !result.user) {
        setFeedback({ type: 'error', message: result.message || 'No se pudo cargar el usuario.' });
        setLoading(false);
        return;
      }

      setForm({
        nombre: result.user.nombre,
        apellidos: result.user.apellidos,
        email: result.user.email,
        password: '',
        confirmPassword: '',
        rol: result.user.rol,
        activo: result.user.activo,
      });
      setLoading(false);
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  const heroCopy = useMemo(
    () =>
      isEdit
        ? {
            title: 'Editar usuario',
            description: 'Actualiza los datos principales y el estado de la cuenta.',
            eyebrow: 'Edición',
          }
        : {
            title: 'Nuevo usuario',
            description: 'Crea una cuenta base para alumno, docente o administrador.',
            eyebrow: 'Alta de cuenta',
          },
    [isEdit],
  );

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: type === 'checkbox' ? checked : value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form, mode);
    setErrors(nextErrors);
    setFeedback(null);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback({ type: 'error', message: 'Revisa los campos marcados.' });
      return;
    }

    setSubmitting(true);
    const result = isEdit ? await updateAdminUser(id, form) : await createAdminUser(form);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFeedback({ type: 'error', message: result.message || 'No se pudo guardar el usuario.' });
      setSubmitting(false);
      return;
    }

    if (isEdit) {
      navigate(`/admin/usuarios/${id}`, {
        replace: true,
        state: { successMessage: 'Usuario actualizado correctamente.' },
      });
      return;
    }

    navigate('/admin/usuarios', {
      replace: true,
      state: { successMessage: 'Usuario creado correctamente.' },
    });
  };

  return (
    <MainLayout
      title={heroCopy.title}
      subtitle="Gestión de usuarios por administrador."
    >
      <PageHero
        eyebrow={heroCopy.eyebrow}
        title={heroCopy.title}
        description={heroCopy.description}
        actions={[
          <Link key="volver" to="/admin/usuarios" className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Volver
          </Link>,
        ]}
        stats={[
          { label: 'Rol', value: formatRoleLabel(form.rol), helper: 'Tipo de acceso.', tone: 'primary', Icon: FiUser },
          { label: 'Estado', value: form.activo ? 'Activo' : 'Inactivo', helper: 'Control de acceso.', Icon: FiCheckCircle },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando usuario..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      <SectionCard
        eyebrow="Formulario"
        title={isEdit ? 'Datos del usuario' : 'Cuenta base'}
        description={isEdit ? 'La contraseña no se edita desde esta vista.' : 'Los perfiles académicos se completarán en subfases posteriores.'}
        Icon={isEdit ? FiUser : FiUserPlus}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className={`field-control ${errors.nombre ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
              />
              {errors.nombre ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.nombre}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Apellidos</label>
              <input
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                className={`field-control ${errors.apellidos ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
              />
              {errors.apellidos ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.apellidos}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Correo electrónico</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-[1.35rem] text-slate-400">
                  <FiMail className="text-base" />
                </span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`field-control pl-11 ${errors.email ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
              </div>
              {errors.email ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.email}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Rol</label>
              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className={`field-control ${errors.rol ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
              >
                {roleOptions.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.rol ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.rol}</p> : null}
            </div>
          </div>

          {!isEdit ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Contraseña</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-[1.35rem] text-slate-400">
                    <FiLock className="text-base" />
                  </span>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className={`field-control pl-11 ${errors.password ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                  />
                </div>
                {errors.password ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.password}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Confirmar contraseña</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`field-control ${errors.confirmPassword ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.confirmPassword ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.confirmPassword}</p> : null}
              </div>
            </div>
          ) : null}

          <label className="content-card flex cursor-pointer items-center justify-between gap-4 px-4 py-4">
            <span>
              <span className="block text-sm font-black text-slate-900">Cuenta activa</span>
              <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">
                Las cuentas inactivas no pueden iniciar sesión.
              </span>
            </span>
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleChange}
              className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting || loading} className="primary-btn">
              <FiSave className="text-base" />
              {submitting ? 'Guardando...' : 'Guardar usuario'}
            </button>
            <Link to="/admin/usuarios" className="secondary-btn">
              Cancelar
            </Link>
          </div>
        </form>
      </SectionCard>
    </MainLayout>
  );
}
