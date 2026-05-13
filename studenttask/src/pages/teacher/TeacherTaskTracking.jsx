import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClipboard,
  FiEdit3,
  FiEye,
  FiMessageSquare,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import FeedbackBanner from '../../components/FeedbackBanner';
import MainLayout from '../../layout/MainLayout';
import PageHero from '../../components/PageHero';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import { getTeacherTaskTracking, updateDeliveryReview } from '../../services/teacherTrackingService';
import { formatPriorityLabel, formatShortDate } from '../../utils/date';

const emptyTracking = {
  tarea: null,
  metricas: {
    totalAlumnos: 0,
    totalPendientes: 0,
    totalCompletadas: 0,
    porcentajeCumplimiento: 0,
    porcentajePendiente: 0,
    entregasATiempo: 0,
    entregasTarde: 0,
  },
  entregas: [],
};

const emptyFilters = {
  status: 'all',
  search: '',
};

const priorityClasses = {
  alta: 'bg-rose-50 text-rose-700',
  media: 'bg-sky-50 text-sky-700',
  baja: 'bg-slate-100 text-slate-600',
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const formatValue = (value, fallback = 'Sin dato') => String(value ?? '').trim() || fallback;
const asPercent = (value) => Math.max(0, Math.min(100, Number(value ?? 0) || 0));

function StatusBadge({ delivery }) {
  const completed = delivery.estado === 'completada';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {completed ? 'Completada' : 'Pendiente'}
    </span>
  );
}

function ReviewBadge({ reviewed }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${reviewed ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
      {reviewed ? 'Revisada' : 'Sin revisar'}
    </span>
  );
}

export default function TeacherTaskTracking() {
  const { id } = useParams();
  const [tracking, setTracking] = useState(emptyTracking);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [observationModal, setObservationModal] = useState({ open: false, delivery: null, text: '' });

  useEffect(() => {
    let isMounted = true;

    const loadTracking = async () => {
      const result = await getTeacherTaskTracking(id);

      if (!isMounted) return;

      setTracking(result.tracking ?? emptyTracking);
      if (!result.ok) {
        setFeedback({
          type: 'error',
          message: result.status === 403 ? 'No tienes permiso para consultar esta tarea.' : result.message,
        });
      }
      setLoading(false);
    };

    void loadTracking();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const task = tracking.tarea;
  const metrics = tracking.metricas;

  const filteredDeliveries = useMemo(
    () =>
      tracking.entregas.filter((delivery) => {
        const searchTarget = `${delivery.nombreCompleto} ${delivery.matricula} ${delivery.email}`;
        const matchesSearch = !filters.search || normalizeText(searchTarget).includes(normalizeText(filters.search));
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'pendiente' && delivery.estado === 'pendiente') ||
          (filters.status === 'completada' && delivery.estado === 'completada') ||
          (filters.status === 'revisada' && delivery.revisada) ||
          (filters.status === 'sin-revisar' && !delivery.revisada);

        return matchesSearch && matchesStatus;
      }),
    [filters, tracking.entregas],
  );

  const updateDeliveryInState = (deliveryId, changes) => {
    setTracking((current) => ({
      ...current,
      entregas: current.entregas.map((delivery) => (delivery.idEntrega === deliveryId ? { ...delivery, ...changes } : delivery)),
    }));
  };

  const handleMarkReviewed = async (delivery) => {
    if (!delivery.idEntrega) {
      setFeedback({ type: 'error', message: 'La entrega no tiene registro para revisar.' });
      return;
    }

    setSavingId(delivery.idEntrega);
    const result = await updateDeliveryReview(delivery.idEntrega, { revisada: true });

    if (result.ok) {
      updateDeliveryInState(delivery.idEntrega, { revisada: true });
      setFeedback({ type: 'success', message: result.message || 'Entrega actualizada correctamente.' });
    } else {
      setFeedback({ type: 'error', message: result.message || 'No se pudo actualizar la entrega.' });
    }

    setSavingId(null);
  };

  const openObservationModal = (delivery) => {
    setObservationModal({ open: true, delivery, text: delivery.observacion ?? '' });
  };

  const closeObservationModal = () => {
    setObservationModal({ open: false, delivery: null, text: '' });
  };

  const handleSaveObservation = async () => {
    const delivery = observationModal.delivery;
    if (!delivery?.idEntrega) {
      setFeedback({ type: 'error', message: 'La entrega no tiene registro para guardar observación.' });
      closeObservationModal();
      return;
    }

    setSavingId(delivery.idEntrega);
    const result = await updateDeliveryReview(delivery.idEntrega, {
      observacion: observationModal.text,
      revisada: delivery.revisada,
    });

    if (result.ok) {
      updateDeliveryInState(delivery.idEntrega, { observacion: observationModal.text.trim() });
      setFeedback({ type: 'success', message: result.message || 'Entrega actualizada correctamente.' });
      closeObservationModal();
    } else {
      setFeedback({ type: 'error', message: result.message || 'No se pudo actualizar la entrega.' });
    }

    setSavingId(null);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <MainLayout title="Seguimiento de tarea" subtitle="Consulta entregas, pendientes y revisión por alumno.">
      <PageHero
        eyebrow="Seguimiento por tarea"
        title={task?.titulo || 'Seguimiento de tarea'}
        description={
          task
            ? `${formatValue(task.materiaNombre)} · Grupo ${formatValue(task.nombreGrupo)} · Límite ${formatShortDate(task.fechaLimite)}`
            : 'Cargando información de seguimiento.'
        }
        actions={[
          <Link key="volver" to="/docente/seguimiento" className="secondary-btn">
            <FiArrowLeft className="text-base" />
            Volver
          </Link>,
          task ? (
            <Link key="detalle" to={`/docente/tareas/${task.id}`} className="secondary-btn">
              <FiEye className="text-base" />
              Ver detalle
            </Link>
          ) : null,
          task ? (
            <Link key="editar" to={`/docente/tareas/${task.id}/editar`} className="primary-btn">
              <FiEdit3 className="text-base" />
              Editar tarea
            </Link>
          ) : null,
        ]}
        stats={[
          { label: 'Cumplimiento', value: `${metrics.porcentajeCumplimiento}%`, helper: 'Avance de la tarea.', tone: 'primary', Icon: FiClipboard },
          { label: 'Pendientes', value: metrics.totalPendientes, helper: 'Alumnos sin completar.', Icon: FiUsers },
          { label: 'Revisadas', value: tracking.entregas.filter((delivery) => delivery.revisada).length, helper: 'Entregas revisadas.', Icon: FiCheckCircle },
        ]}
      />

      {loading ? (
        <FeedbackBanner type="info" message="Cargando seguimiento de tarea..." className="mb-6" />
      ) : feedback ? (
        <FeedbackBanner type={feedback.type} message={feedback.message} className="mb-6" />
      ) : null}

      {!loading && !task ? (
        <EmptyState
          title="No se pudo consultar esta tarea."
          description="Verifica que la tarea exista y pertenezca a tu cuenta docente."
          Icon={FiClipboard}
        />
      ) : task ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Alumnos" value={metrics.totalAlumnos} helper="Entregas esperadas." tone="blue" Icon={FiUsers} />
            <StatCard title="Completadas" value={metrics.totalCompletadas} helper="Marcadas por alumnos." tone="sky" Icon={FiCheckCircle} />
            <StatCard title="Pendientes" value={metrics.totalPendientes} helper="Sin completar." tone="rose" Icon={FiClipboard} />
            <StatCard title="Cumplimiento" value={`${metrics.porcentajeCumplimiento}%`} helper="Porcentaje actual." tone="indigo" Icon={FiClipboard} />
            <StatCard title="A tiempo" value={metrics.entregasATiempo} helper="Completadas antes del límite." tone="blue" Icon={FiCheckCircle} />
            <StatCard title="Tardías" value={metrics.entregasTarde} helper="Completadas después del límite." tone="rose" Icon={FiClipboard} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
            <SectionCard eyebrow={task.activa ? 'Activa' : 'Inactiva'} title="Información de la tarea" Icon={FiClipboard}>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: 'Materia', value: task.materiaNombre },
                  { label: 'Grupo', value: task.nombreGrupo },
                  { label: 'Fecha de publicación', value: formatShortDate(task.fechaPublicacion) },
                  { label: 'Fecha límite', value: formatShortDate(task.fechaLimite) },
                  { label: 'Prioridad', value: formatPriorityLabel(task.prioridad) },
                  { label: 'Estado', value: task.activa ? 'Activa' : 'Inactiva' },
                ].map((item) => (
                  <div key={item.label} className="content-card px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{formatValue(item.value)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard eyebrow="Avance" title="Cumplimiento" Icon={FiClipboard}>
              <div className="content-card p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Porcentaje de cumplimiento</p>
                    <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">{metrics.porcentajeCumplimiento}%</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[task.prioridad]}`}>
                    {formatPriorityLabel(task.prioridad)}
                  </span>
                </div>
                <div className="mt-5 h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500" style={{ width: `${asPercent(metrics.porcentajeCumplimiento)}%` }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {metrics.totalCompletadas} completadas y {metrics.totalPendientes} pendientes.
                </p>
              </div>
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              eyebrow={`${filteredDeliveries.length} resultado(s)`}
              title="Entregas por alumno"
              description="Filtra por estado, revisión, nombre o matrícula."
              Icon={FiUsers}
            >
              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Estado</span>
                  <select name="status" value={filters.status} onChange={handleFilterChange} className="field-control">
                    <option value="all">Todas</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="completada">Completadas</option>
                    <option value="revisada">Revisadas</option>
                    <option value="sin-revisar">Sin revisar</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Búsqueda</span>
                  <div className="relative">
                    <FiSearch className="pointer-events-none absolute left-3 top-[calc(50%+0.25rem)] -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      className="field-control pl-10"
                      placeholder="Alumno o matrícula"
                    />
                  </div>
                </label>

                <div className="flex items-end">
                  <button type="button" onClick={() => setFilters(emptyFilters)} className="secondary-btn w-full">
                    Limpiar
                  </button>
                </div>
              </div>

              {tracking.entregas.length === 0 ? (
                <EmptyState
                  title="Aún no hay entregas registradas para esta tarea."
                  description="La tarea no tiene alumnos activos vinculados."
                  Icon={FiUsers}
                />
              ) : filteredDeliveries.length === 0 ? (
                <EmptyState title="No hay alumnos con ese filtro." description="Ajusta el estado o la búsqueda para ver más entregas." Icon={FiSearch} />
              ) : (
                <div className="table-shell">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-black">Alumno</th>
                        <th className="px-4 py-3 font-black">Matrícula</th>
                        <th className="px-4 py-3 font-black">Correo</th>
                        <th className="px-4 py-3 font-black">Estado</th>
                        <th className="px-4 py-3 font-black">Entrega</th>
                        <th className="px-4 py-3 font-black">Nota personal</th>
                        <th className="px-4 py-3 font-black">Revisión</th>
                        <th className="px-4 py-3 font-black">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/70">
                      {filteredDeliveries.map((delivery) => (
                        <tr key={delivery.idEntrega || delivery.idAlumno || delivery.id} className="align-top">
                          <td className="px-4 py-4 font-black text-slate-900">{delivery.nombreCompleto}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(delivery.matricula)}</td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatValue(delivery.email)}</td>
                          <td className="px-4 py-4">
                            <StatusBadge delivery={delivery} />
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{formatShortDate(delivery.fechaEntrega)}</td>
                          <td className="px-4 py-4 text-slate-600">
                            <p className="max-w-xs whitespace-pre-line text-sm leading-6">{delivery.notaPersonal || 'Sin nota.'}</p>
                            {delivery.observacion ? (
                              <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-700">
                                {delivery.observacion}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <ReviewBadge reviewed={delivery.revisada} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkReviewed(delivery)}
                                disabled={delivery.revisada || savingId === delivery.idEntrega || !delivery.idEntrega}
                                className="secondary-btn text-sm"
                              >
                                <FiCheckCircle className="text-base" />
                                Marcar revisada
                              </button>
                              <button
                                type="button"
                                onClick={() => openObservationModal(delivery)}
                                disabled={savingId === delivery.idEntrega || !delivery.idEntrega}
                                className="secondary-btn text-sm"
                              >
                                <FiMessageSquare className="text-base" />
                                Observación
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </section>
        </>
      ) : null}

      {observationModal.open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Observación</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {observationModal.delivery?.nombreCompleto || 'Entrega'}
                </h2>
              </div>
              <button type="button" onClick={closeObservationModal} className="secondary-btn h-10 w-10 justify-center p-0" aria-label="Cerrar observación">
                <FiX className="text-base" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-700">Observación</span>
              <textarea
                value={observationModal.text}
                onChange={(event) => setObservationModal((current) => ({ ...current, text: event.target.value }))}
                className="field-control min-h-32"
                placeholder="Escribe una observación para el alumno"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeObservationModal} className="secondary-btn justify-center">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveObservation} disabled={savingId === observationModal.delivery?.idEntrega} className="primary-btn justify-center">
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}
