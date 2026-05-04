import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function FeedbackBanner({ type = 'success', message, children, className = '' }) {
  const Icon = type === 'error' ? FiAlertCircle : FiCheckCircle;
  const tone = type === 'error' ? 'feedback-banner--error' : 'feedback-banner--success';

  return (
    <div className={`feedback-banner ${tone} flex items-start gap-3 ${className}`.trim()} role="status">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70">
        <Icon className="text-base" />
      </span>
      <p className="min-w-0 leading-6">{children ?? message}</p>
    </div>
  );
}
