import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import logo from '../assets/studenttask-logo.jpeg';
import { getDefaultPrivateRoute } from '../services/settingsService';
import { isAuthenticated, loginUser, loginWithProvider } from '../services/authService';

const initialForm = {
  email: '',
  password: '',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.63v3.02h3.87c2.26-2.08 3.56-5.14 3.56-8.68Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3.02c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.26A7.19 7.19 0 0 1 4.89 12c0-.79.14-1.56.38-2.26V6.62H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.43-3.43C17.95 1.15 15.23 0 12 0A12 12 0 0 0 1.27 6.62l4 3.12c.95-2.85 3.6-4.97 6.73-4.97Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M18.9 2H22l-6.77 7.73L23.2 22h-6.26l-4.9-6.52L6.33 22H3.2l7.23-8.27L.8 2h6.35l4.42 5.9L18.9 2Zm-1.1 18h1.73L6.22 3.9H4.37L17.8 20Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.1.82-.26.82-.58v-2.16c-3.34.72-4.05-1.42-4.05-1.42-.54-1.39-1.32-1.76-1.32-1.76-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.05 1.81 2.76 1.29 3.43.98.11-.78.41-1.29.74-1.59-2.66-.3-5.47-1.33-5.47-5.94 0-1.31.47-2.38 1.23-3.23-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.39 11.39 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.85 1.23 1.92 1.23 3.23 0 4.62-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

const socialOptions = [
  {
    id: 'google',
    label: 'Google',
    helper: 'Acceso alternativo',
    Icon: GoogleIcon,
    className: 'border-white/70 bg-white/[0.92] text-slate-800 hover:bg-white',
  },
  {
    id: 'x',
    label: 'X',
    helper: 'Acceso alternativo',
    Icon: XIcon,
    className: 'border-slate-900/80 bg-slate-950 text-white hover:bg-slate-900',
  },
  {
    id: 'github',
    label: 'GitHub',
    helper: 'Acceso alternativo',
    Icon: GitHubIcon,
    className: 'border-blue-900/70 bg-blue-900 text-white hover:bg-blue-800',
  },
];

const chips = [
  { label: 'Materias', delay: '0s' },
  { label: 'Tareas', delay: '1.4s' },
  { label: 'Avance académico', delay: '2.5s' },
];

const benefits = [
  'Organiza tus materias desde un solo panel personal.',
  'Registra tareas, prioridades y fechas sin perder el ritmo.',
  'Consulta próximas entregas y avances de un vistazo.',
];

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState('');

  if (isAuthenticated()) {
    return <Navigate to={getDefaultPrivateRoute()} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {
      email: form.email.trim() ? '' : 'Captura tu correo.',
      password: form.password.trim() ? '' : 'Captura tu contraseña.',
    };

    setErrors(nextErrors);
    setErrorMessage('');

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setSubmitting('credentials');
    const result = await loginUser(form);

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting('');
      return;
    }

    navigate(result.redirectTo ?? '/dashboard');
  };

  const handleSocialLogin = async (provider) => {
    setErrorMessage('');
    setSubmitting(provider);
    const result = await loginWithProvider(provider);

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting('');
      return;
    }

    navigate(result.redirectTo ?? '/dashboard');
  };

  const isBusy = Boolean(submitting);

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 lg:px-6 lg:py-5">
      <div className="auth-backdrop" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white/[0.35] shadow-[0_28px_120px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <section className="blue-hero relative hidden w-[52%] overflow-hidden px-8 py-7 text-white lg:flex lg:flex-col lg:justify-between xl:px-9 xl:py-8">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex flex-wrap justify-center gap-2.5">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className="soft-chip chip-drift border border-white/[0.15] bg-white/[0.12] text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)]"
                  style={{ animationDelay: chip.delay }}
                >
                  {chip.label}
                </span>
              ))}
            </div>

            <div className="mx-auto mt-7 flex w-full max-w-[19rem] flex-col items-center rounded-[34px] bg-white px-4 py-4 text-center text-slate-900 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <div className="flex w-full max-w-[15.75rem] items-center justify-center rounded-[30px] bg-slate-50 px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-100">
                <img src={logo} alt="StudentTask logo" className="block h-auto max-h-[12.75rem] w-full object-contain" />
              </div>
              <p className="mt-3 max-w-[15.5rem] text-[1.02rem] font-semibold leading-6 text-slate-900">
                Tu panel para organizar el periodo académico
              </p>
            </div>

            <h1 className="mt-7 max-w-[34rem] text-4xl font-black leading-[1.05] tracking-tight xl:text-[3.2rem]">
              Todo tu semestre, claro y bajo control.
            </h1>
            <p className="mt-4 max-w-[32rem] text-base leading-7 text-white/[0.8] xl:text-lg">
              Materias, tareas y progreso académico en una experiencia rápida, visual y cómoda.
            </p>
          </div>

          <div className="relative z-10 rounded-[28px] border border-white/[0.12] bg-white/[0.1] p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/[0.45]">Panel central</p>
            <h2 className="mt-2 text-xl font-bold xl:text-2xl">Sigue tu ritmo académico sin perder contexto.</h2>

            <div className="mt-4 space-y-2.5">
              {benefits.map((item, index) => (
                <div
                  key={item}
                  className={`flex items-start gap-3 rounded-2xl bg-white/[0.08] px-4 py-3 ${index % 2 === 0 ? 'float-slow' : 'float-delayed'}`}
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-300" />
                  <p className="text-sm leading-6 text-white/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8 lg:px-8">
          <div className="w-full max-w-[420px]">
            <span className="soft-chip soft-chip--cool chip-drift">Inicio de sesión</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Bienvenido de nuevo</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Inicia sesión para continuar con tu seguimiento académico.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Correo electrónico</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="alumno@itoaxaca.edu.mx"
                  className={`field-control ${errors.email ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.email ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.email}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Tu contraseña"
                  className={`field-control ${errors.password ? 'border-rose-300 focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : ''}`}
                />
                {errors.password ? <p className="mt-2 text-sm font-medium text-rose-600">{errors.password}</p> : null}
              </div>

              {errorMessage ? (
                <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 px-4 py-3 text-sm text-blue-700">
                  {errorMessage}
                </div>
              ) : null}

              <button type="submit" disabled={isBusy} className="primary-btn w-full py-3.5 text-lg disabled:opacity-70">
                {submitting === 'credentials' ? 'Validando...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-5 rounded-[22px] border border-white/70 bg-white/70 px-4 py-4 text-center text-sm text-slate-600">
              ¿Aún no tienes cuenta?{' '}
              <Link to="/registro" className="font-bold text-blue-700 hover:text-blue-900">
                Crear cuenta
              </Link>
            </div>

            <div className="my-6 flex items-center gap-4 text-sm text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              <span>otros accesos</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {socialOptions.map(({ id, label, helper, Icon, className }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSocialLogin(id)}
                  disabled={isBusy}
                  className={`group flex items-center justify-center gap-2 rounded-[18px] border px-3 py-3 text-sm font-semibold shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
                  title={helper}
                >
                  <Icon />
                  <span>{submitting === id ? 'Validando...' : label}</span>
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-xs leading-6 text-slate-500">
              StudentTask · Seguimiento académico para estudiantes.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
