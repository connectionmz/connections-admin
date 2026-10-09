import { useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../../fb';
import { accessesByDay, buildEngagementList, countByEngagement, ENGAGEMENT } from '../../domain/engagement';
import { normalizeEmail } from '../../domain/followUps';
import { AdminPage, AdminPageHeader, InlineAlert, LoadingState } from '../admin/ui/AdminUI';
import EngagementDetailsModal from './EngagementDetailsModal';
import EngagementOverview from './EngagementOverview';
import EngagementTable from './EngagementTable';

const SOURCES = [['companies', 'company'], ['accessLogs', 'accessLogs'], ['crm', 'adminCrm']];
const TAB_CONFIG = {
  offline: { title: 'Empresas offline', description: 'Sem acesso há mais de 7 dias, das mais antigas para as mais recentes.' },
  at_risk: { title: 'Empresas em risco', description: 'Último acesso há 2 a 7 dias.' },
  never: { title: 'Empresas que nunca acederam', description: 'Sem lastLogin válido nem accessLogs, das registadas há mais tempo para as mais recentes.' },
  all: { title: 'Todas as empresas', description: 'Carteira completa com o estado de uso de cada empresa.' },
};

const firstEmail = value => (Array.isArray(value) ? value : [value]).map(normalizeEmail).find(Boolean) || '';
const byName = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt');
const byDaysDesc = (a, b) => b.daysSinceAccess - a.daysSinceAccess || byName(a, b);
const byCreatedAsc = (a, b) => {
  if (a.createdAt === null && b.createdAt === null) return byName(a, b);
  if (a.createdAt === null) return 1;
  if (b.createdAt === null) return -1;
  return a.createdAt - b.createdAt;
};

const EngagementDashboard = () => {
  const [raw, setRaw] = useState({ companies: {}, accessLogs: {}, crm: {}, loadedAt: Date.now() });
  const [ready, setReady] = useState({ companies: false, accessLogs: false, crm: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [openId, setOpenId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const subscriptions = SOURCES.map(([key, path]) => onValue(ref(db, path), snapshot => {
      setRaw(previous => ({ ...previous, [key]: snapshot.val() || {}, loadedAt: Date.now() }));
      setReady(previous => ({ ...previous, [key]: true }));
    }, () => { setReady(previous => ({ ...previous, [key]: true })); setFeedback({ type: 'error', message: `Não foi possível carregar ${path}.` }); }));
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  const now = raw.loadedAt;
  const engagement = useMemo(() => buildEngagementList(raw.companies, raw.accessLogs, { now }), [raw.companies, raw.accessLogs, now]);
  const rows = useMemo(() => engagement.map(item => ({ ...item, emailAddress: firstEmail(item.email) })), [engagement]);
  const byDay = useMemo(() => accessesByDay(raw.accessLogs, now), [raw.accessLogs, now]);
  const counts = useMemo(() => countByEngagement(rows), [rows]);
  const tabRows = useMemo(() => ({
    offline: rows.filter(row => row.status === ENGAGEMENT.OFFLINE).sort(byDaysDesc),
    at_risk: rows.filter(row => row.status === ENGAGEMENT.AT_RISK).sort(byDaysDesc),
    never: rows.filter(row => row.status === ENGAGEMENT.NEVER).sort(byCreatedAsc),
    all: rows.slice().sort(byName),
  }), [rows]);
  const openCompany = rows.find(row => row.id === openId);

  const tabs = [['overview', 'Visão geral'], ['offline', `Offline (${counts.offline})`], ['at_risk', `Em risco (${counts.at_risk})`], ['never', `Nunca acederam (${counts.never})`], ['all', `Todas (${rows.length})`]];

  if (!Object.values(ready).every(Boolean)) return <LoadingState label="A carregar o uso da plataforma..." />;
  return <AdminPage>
    <AdminPageHeader title="Empresas offline" description="Empresas que deixaram de usar a plataforma ou nunca acederam, prontas para contacto pelo CRM." />
    {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert>}
    <nav className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label="Secções de engajamento"><div className="flex min-w-max gap-1" role="tablist">{tabs.map(([id, label]) => <button key={id} id={`engagement-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`engagement-panel-${id}`} onClick={() => setActiveTab(id)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${activeTab === id ? 'bg-blue-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'}`}>{label}</button>)}</div></nav>

    <div id={`engagement-panel-${activeTab}`} role="tabpanel" aria-labelledby={`engagement-tab-${activeTab}`}>
      {activeTab === 'overview' && <EngagementOverview list={rows} byDay={byDay} onSelectTab={setActiveTab} onOpen={row => setOpenId(row.id)} />}
      {activeTab !== 'overview' && <EngagementTable
        key={activeTab}
        rows={tabRows[activeTab]}
        title={TAB_CONFIG[activeTab].title}
        description={TAB_CONFIG[activeTab].description}
        showStatusFilter={activeTab === 'all'}
        onOpen={row => setOpenId(row.id)}
      />}
    </div>

    {openCompany && <EngagementDetailsModal company={openCompany} onClose={() => setOpenId(null)} />}
  </AdminPage>;
};

export default EngagementDashboard;
