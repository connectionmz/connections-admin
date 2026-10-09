import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { safePlainText } from '../../utils/safeText';
import { SecondaryButton } from '../admin/ui/AdminUI';
import { formatDate, formatDateTime, StatusBadge } from './EngagementTable';

const Stat = ({ label, value }) => <div className="rounded-lg bg-gray-50 p-3 text-center"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-950">{value}</p></div>;

const EngagementDetailsModal = ({ company, lastContactLabel, actions, onClose }) => {
  useEffect(() => {
    const onKeyDown = event => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="engagement-details-title">
      <header className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white p-6">
        <div className="min-w-0"><h2 id="engagement-details-title" className="truncate text-xl font-bold text-gray-950">{company.nome || 'Empresa sem nome'}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={company.status} /><span className="text-sm text-gray-500">{company.createdAt ? `Registada em ${formatDate(company.createdAt)}` : 'Data de registo desconhecida'}</span></div></div>
        <button type="button" onClick={onClose} className="text-3xl leading-none text-gray-500 hover:text-gray-800" aria-label="Fechar">×</button>
      </header>
      <div className="space-y-6 p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-gray-500">Email</dt><dd className="text-gray-900">{company.emailAddress || 'Sem email'}</dd></div>
          <div><dt className="font-semibold text-gray-500">Contacto</dt><dd className="text-gray-900">{safePlainText(company.contacto, 60) || 'Sem contacto'}</dd></div>
          <div><dt className="font-semibold text-gray-500">Último acesso</dt><dd className="text-gray-900">{company.lastAccessAt ? `${formatDateTime(company.lastAccessAt)} (há ${company.daysSinceAccess} dia(s))` : 'Nunca'}</dd></div>
          <div><dt className="font-semibold text-gray-500">Último contacto CRM</dt><dd className="text-gray-900">{lastContactLabel || '—'}</dd></div>
        </dl>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Hoje" value={company.accessesToday} /><Stat label="7 dias" value={company.accesses7d} /><Stat label="30 dias" value={company.accesses30d} /><Stat label="Total" value={company.totalAccesses} /></div>
        <div><h3 className="font-semibold text-gray-900">Últimos acessos</h3>{company.recentAccesses.length === 0 ? <p className="mt-2 text-sm text-gray-500">Nenhum acesso registado em accessLogs.</p> : <ul className="mt-2 space-y-2">{company.recentAccesses.map((value, index) => <li key={`${value}-${index}`} className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{formatDateTime(value)}</li>)}</ul>}</div>
        {actions && <div><h3 className="mb-2 font-semibold text-gray-900">Contactar</h3>{actions}</div>}
      </div>
      <footer className="flex justify-end gap-3 border-t p-4"><Link to={`/empresas/${company.id}`} className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">Abrir ficha da empresa</Link><SecondaryButton type="button" onClick={onClose}>Fechar</SecondaryButton></footer>
    </section>
  </div>;
};

export default EngagementDetailsModal;
