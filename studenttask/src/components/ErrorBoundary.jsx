import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-xl rounded-[28px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-500">StudentTask</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Ocurrió un problema al cargar esta vista.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Puedes recargar la página o volver al dashboard para continuar trabajando.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={this.handleReload} className="primary-btn">
              Recargar página
            </button>
            <Link to="/dashboard" className="secondary-btn">
              Volver al dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }
}
