import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ title, description, action, Icon = FiInbox }) {
  return (
    <div className="content-card animate-enter border-dashed px-5 py-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
        <Icon className="text-xl" />
      </span>
      <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
