import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUserPlus } from 'react-icons/fi';
import logo from '../assets/studenttask-logo.png';
import { getDefaultPrivateRoute } from '../services/settingsService';
import { isAuthenticated, loginUser, registerUser } from '../services/authService';

const initialForm = {
  nombre: '',
  apellidos: '',
  email: '',
  matricula: '',
  carrera: '',
  semestre: '',
  grupo: '',
  password: '',
  confirmPassword: '',
};

const fields = [
  { name: 'nombre', label: 'Nombre', placeholder: 'Tu nombre' },
  { name: 'apellidos', label: 'Apellidos', placeholder: 'Tus apellidos' },
  { name: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'nombre@correo.edu.mx' },
  { name: 'matricula', label: 'Matrícula', placeholder: 'Tu matrícula' },
  { name: 'carrera', label: 'Carrera', placeholder: 'Ej. Ingeniería en Sistemas' },
  { name: 'semestre', label: 'Semestre', placeholder: 'Ej. 6.º semestre' },
  { name: 'grupo', label: 'Grupo', placeholder: 'Ej. A' },
  { name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 8 caracteres' },
  { name: 'confirmPassword', label: 'Confirmar contraseña', type: 'password', placeholder: 'Repite tu contraseña' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  if (isAuthenticated() && !isRegistered) {
    return <Navigate to={getDefaultPrivateRoute()} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const result = await registerUser(form);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFeedback({ type: 'error', message: result.message ?? 'Revisa los campos marcados.' });
      setSubmitting(false);
      return;
    }

    setErrors({});
    setIsRegistered(true);
    setFeedback({ type: 'success', message: result.message });
    setSubmitting(false);
  };

  const handleLoginNow = async () => {
    setLoggingIn(true);
    const result = await loginUser({ email: form.email, password: form.password });

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message ?? 'No se pudo iniciar sesión.' });
      setLoggingIn(false);
      return;
    }

    navigate(result.redirectTo ?? '/dashboard');
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 lg:px-6 lg:py-5">
      <div className="auth-backdrop" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white/[0.35] shadow-[0_28px_120px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="blue-hero hidden overflow-hidden px-8 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <Link to="/login" className="secondary-btn relative z-10 inline-flex w-fit items-center gap-2 bg-white/95 text-slate-800">
            <FiArrowLeft className="text-base" />
            Iniciar sesión
          </Link>

          <div className="relative z-10">
            <div className="flex w-full max-w-[18rem] flex-col items-center rounded-[32px] bg-white px-4 py-4 text-center text-slate-900 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <div className="flex w-full max-w-[15rem] items-center justify-center rounded-[28px] bg-slate-50 px-2 py-3 ring-1 ring-slate-100">
                <img src={logo} alt="StudentTask" className="block h-auto max-h-[11rem] w-full object-contain" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">Tu espacio académico personal</p>
            </div>

            <h1 className="mt-8 max-w-xl text-4xl font-black leading-[1.05] tracking-tight xl:text-[3.1rem]">
              Empieza tu semestre con todo en orden.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/75">
              Crea tu cuenta y conserva tus materias, tareas y avance en un panel pensado para estudiantes.
            </p>
          </div>

          <div className="relative z-10 rounded-[28px] border border-white/[0.12] bg-white/[0.1] p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/[0.45]">Registro</p>
            <h2 className="mt-2 text-xl font-bold">Tus datos quedan listos para iniciar sesión.</h2>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[720px]">
            <Link to="/login" className="secondary-btn mb-6 text-sm lg:hidden">
              <FiArrowLeft className="text-base" />
              Iniciar sesión
            </Link>

            <span className="soft-chip soft-chip--cool">Crear cuenta</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Crea tu cuenta</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Regístrate para comenzar a organizar tus actividades académicas.
            </p>

            {isRegistered ? (
              <div className="mt-8 rounded-[28px] border border-blue-100 bg-blue-50/90 p-6 text-blue-800">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <FiCheckCircle className="text-xl" />
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Cuenta creada</h3>
                    <p className="mt-2 text-sm leading-6 text-blue-700">
                      Ya puedes entrar a StudentTask con tu correo y contraseña.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={handleLoginNow} disabled={loggingIn} className="primary-btn inline-flex items-center gap-2">
                    <FiUserPlus className="text-base" />
                    {loggingIn ? 'Entrando...' : 'Entrar al panel'}
                  </button>
                  <Link to="/login" className="secondary-btn">
                    Volver al inicio de sesión
                  </Link>
                </div>

                {feedback?.type === 'error' ? (
                  <p className="mt-4 rounded-[18px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {feedback.message}
                  </p>
                ) : null}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.name} className={field.name === 'carrera' ? 'md:col-span-2' : ''}>
                      <label className="text-sm font-medium text-slate-600">{field.label}</label>
                      <input
                        name={field.name}
                        type={field.type ?? 'text'}
                        value={form[field.name]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className={`field-control ${
                          errors[field.name] ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''
                        }`}
                      />
                      {errors[field.name] ? <p className="mt-2 text-sm font-medium text-rose-600">{errors[field.name]}</p> : null}
                    </div>
                  ))}
                </div>

                {feedback ? (
                  <div
                    className={`rounded-[22px] px-4 py-3 text-sm font-medium ${
                      feedback.type === 'error'
                        ? 'border border-rose-100 bg-rose-50 text-rose-700'
                        : 'border border-blue-100 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {feedback.message}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" disabled={submitting} className="primary-btn inline-flex items-center justify-center gap-2">
                    <FiUserPlus className="text-base" />
                    {submitting ? 'Guardando...' : 'Guardar registro'}
                  </button>
                  <Link to="/login" className="secondary-btn text-center">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
