export const AdminPage = ({ children }) => (
  <div className="mx-auto w-full max-w-[90rem] space-y-6">{children}</div>
);

export const AdminPageHeader = ({ title, description, actions }) => (
  <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-gray-600 sm:text-base">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export const AdminCard = ({ children, className = '', as: Component = 'section' }) => (
  <Component className={`rounded-2xl border border-gray-200/90 bg-white shadow-[0_8px_30px_rgba(15,28,45,0.05)] ${className}`}>{children}</Component>
);

export const LoadingState = ({ label = 'A carregar...' }) => (
  <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-8" role="status" aria-live="polite">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" aria-hidden="true" />
    <p className="text-sm font-medium text-gray-600">{label}</p>
  </div>
);

export const EmptyState = ({ title, description, action }) => (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500" aria-hidden="true">—</div>
    <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
    {description && <p className="mx-auto mt-1 max-w-lg text-sm text-gray-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const InlineAlert = ({ type = 'info', children, onClose }) => {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 text-sm ${styles[type] || styles.info}`} role="status" aria-live="polite">
      <p>{children}</p>
      {onClose && <button type="button" onClick={onClose} className="font-bold" aria-label="Fechar mensagem">×</button>}
    </div>
  );
};

export const PrimaryButton = ({ className = '', ...props }) => (
  <button {...props} className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} />
);

export const SecondaryButton = ({ className = '', ...props }) => (
  <button {...props} className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} />
);

export const ConfirmDialog = ({ open, title, description, confirmLabel = 'Confirmar', danger = false, busy = false, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <h2 id="confirm-title" className="text-xl font-bold text-gray-950">{title}</h2>
        <p id="confirm-description" className="mt-2 text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton type="button" onClick={onCancel} disabled={busy}>Cancelar</SecondaryButton>
          <button type="button" onClick={onConfirm} disabled={busy} className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'}`}>
            {busy ? 'A processar...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
