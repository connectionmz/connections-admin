import { useCallback, useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { db } from '../../fb';
import { companyEmail, companyPhone, describeLastContact, hasRecentContact, lastContactByCompany } from '../../domain/contacts';
import { accessesByDay, buildEngagementList, countByEngagement, ENGAGEMENT, reactivationStats } from '../../domain/engagement';
import { createActivities, createActivity } from '../../services/crmActivities';
import { AdminPage, AdminPageHeader, ConfirmDialog, InlineAlert, LoadingState, PrimaryButton, SecondaryButton } from '../admin/ui/AdminUI';
import { ActivityFormModal } from '../crm/CrmActivitiesPanel';
import EngagementContactActions, { CallResultModal } from './EngagementContactActions';
import EngagementDetailsModal from './EngagementDetailsModal';
import EngagementOverview from './EngagementOverview';
import EngagementTable from './EngagementTable';

const SOURCES = [['companies', 'company'], ['accessLogs', 'accessLogs'], ['crm', 'adminCrm']];
const TAB_CONFIG = {
  offline: { title: 'Empresas offline', description: 'Sem acesso há mais de 7 dias, das mais antigas para as mais recentes.', withoutRecentContact: true },
  at_risk: { title: 'Empresas em risco', description: 'Último acesso há 2 a 7 dias.', withoutRecentContact: false },
  never: { title: 'Empresas que nunca acederam', description: 'Sem lastLogin válido nem accessLogs, das registadas há mais tempo para as mais recentes.', withoutRecentContact: true },
  all: { title: 'Todas as empresas', description: 'Carteira completa com o estado de uso de cada empresa.', withoutRecentContact: false },
};
const ENGAGEMENT_STATUSES = new Set(Object.values(ENGAGEMENT));

const byName = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt');
const byDaysDesc = (a, b) => b.daysSinceAccess - a.daysSinceAccess || byName(a, b);
const byCreatedAsc = (a, b) => {
  if (a.createdAt === null && b.createdAt === null) return byName(a, b);
  if (a.createdAt === null) return 1;
  if (b.createdAt === null) return -1;
  return a.createdAt - b.createdAt;
};
const tomorrowAtNine = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
};
const engagementSource = row => ({ source: 'engagement', engagementStatus: row.status });
const followUpPath = (companyIds, audience) => {
  const params = new URLSearchParams({ tab: 'followup', companies: companyIds.join(',') });
  if (ENGAGEMENT_STATUSES.has(audience)) params.set('audience', audience);
  return `/crm?${params.toString()}`;
};

const EngagementDashboard = () => {
  const navigate = useNavigate();
  const [raw, setRaw] = useState({ companies: {}, accessLogs: {}, crm: {}, loadedAt: Date.now() });
  const [ready, setReady] = useState({ companies: false, accessLogs: false, crm: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [openId, setOpenId] = useState(null);
  const [callRow, setCallRow] = useState(null);
  const [scheduleRow, setScheduleRow] = useState(null);
  const [bulk, setBulk] = useState({ dueAt: tomorrowAtNine(), rows: null, clear: null, saving: false });
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
  const lastContacts = useMemo(() => lastContactByCompany(raw.crm), [raw.crm]);
  const rows = useMemo(() => engagement.map(item => ({
    ...item, emailAddress: companyEmail(item), phoneNumber: companyPhone(item), lastContact: lastContacts.get(item.id),
  })), [engagement, lastContacts]);
  const byDay = useMemo(() => accessesByDay(raw.accessLogs, now), [raw.accessLogs, now]);
  const reactivation = useMemo(() => reactivationStats(rows, lastContacts, now), [rows, lastContacts, now]);
  const counts = useMemo(() => countByEngagement(rows), [rows]);
  const tabRows = useMemo(() => ({
    offline: rows.filter(row => row.status === ENGAGEMENT.OFFLINE).sort(byDaysDesc),
    at_risk: rows.filter(row => row.status === ENGAGEMENT.AT_RISK).sort(byDaysDesc),
    never: rows.filter(row => row.status === ENGAGEMENT.NEVER).sort(byCreatedAsc),
    all: rows.slice().sort(byName),
  }), [rows]);
  const isRecentlyContacted = useCallback(row => hasRecentContact(row.lastContact, now), [now]);
  const openCompany = rows.find(row => row.id === openId);

  const fail = message => () => setFeedback({ type: 'error', message });
  const recordWhatsapp = row => createActivity({ companyId: row.id, type: 'whatsapp', status: 'completed', title: 'Reativação via WhatsApp', ...engagementSource(row) })
    .then(() => setFeedback({ type: 'success', message: `Contacto por WhatsApp com ${row.nome || 'a empresa'} registado no CRM.` }))
    .catch(fail('O WhatsApp foi aberto, mas não foi possível registar o contacto no CRM.'));
  const saveCall = async ({ notes, nextAt }) => {
    const row = callRow;
    try {
      await createActivities([
        { companyId: row.id, type: 'call', status: 'completed', title: 'Chamada de reativação', notes, ...engagementSource(row) },
        ...(nextAt ? [{ companyId: row.id, type: 'follow_up', status: 'pending', title: 'Próximo contacto após chamada', dueAt: nextAt, ...engagementSource(row) }] : []),
      ]);
      setCallRow(null);
      setFeedback({ type: 'success', message: nextAt ? 'Chamada registada e próximo contacto agendado.' : 'Chamada registada no CRM.' });
    } catch { fail('Não foi possível registar a chamada.')(); }
  };
  const openEmail = row => navigate(followUpPath([row.id], row.status));
  const scheduleBulk = async () => {
    const dueAt = new Date(bulk.dueAt).getTime();
    setBulk(value => ({ ...value, saving: true }));
    try {
      await createActivities(bulk.rows.map(row => ({ companyId: row.id, type: 'follow_up', status: 'pending', title: 'Follow-up de reativação', dueAt, ...engagementSource(row) })));
      bulk.clear?.();
      setFeedback({ type: 'success', message: `${bulk.rows.length} follow-up(s) agendado(s) no CRM.` });
      setBulk(value => ({ ...value, rows: null, clear: null, saving: false }));
    } catch {
      setBulk(value => ({ ...value, saving: false }));
      fail('Não foi possível agendar os follow-ups.')();
    }
  };

  const renderActions = row => <EngagementContactActions row={row} onWhatsapp={recordWhatsapp} onCall={setCallRow} onEmail={openEmail} onSchedule={setScheduleRow} />;
  const renderBulkActions = (selectedRows, clear) => {
    const statuses = new Set(selectedRows.map(row => row.status));
    const audience = statuses.size === 1 ? [...statuses][0] : '';
    const withEmail = selectedRows.filter(row => row.emailAddress);
    return <>
      <PrimaryButton type="button" disabled={withEmail.length === 0} title={withEmail.length ? undefined : 'Nenhuma empresa selecionada tem email válido'} onClick={() => navigate(followUpPath(withEmail.map(row => row.id), audience))}>Enviar email ({withEmail.length})</PrimaryButton>
      <label className="flex items-center gap-2 text-sm font-semibold text-blue-900">Data<input type="datetime-local" aria-label="Data do follow-up" value={bulk.dueAt} onChange={event => setBulk(value => ({ ...value, dueAt: event.target.value }))} className="rounded-lg border border-blue-200 bg-white px-2 py-1.5" /></label>
      <SecondaryButton type="button" disabled={!bulk.dueAt} onClick={() => setBulk(value => ({ ...value, rows: selectedRows, clear }))}>Agendar follow-up para todas</SecondaryButton>
    </>;
  };

  const tabs = [['overview', 'Visão geral'], ['offline', `Offline (${counts.offline})`], ['at_risk', `Em risco (${counts.at_risk})`], ['never', `Nunca acederam (${counts.never})`], ['all', `Todas (${rows.length})`]];

  if (!Object.values(ready).every(Boolean)) return <LoadingState label="A carregar o uso da plataforma..." />;
  return <AdminPage>
    <AdminPageHeader title="Empresas offline" description="Empresas que deixaram de usar a plataforma ou nunca acederam, prontas para contacto pelo CRM." />
    {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert>}
    <nav className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label="Secções de engajamento"><div className="flex min-w-max gap-1" role="tablist">{tabs.map(([id, label]) => <button key={id} id={`engagement-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`engagement-panel-${id}`} onClick={() => setActiveTab(id)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${activeTab === id ? 'bg-blue-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'}`}>{label}</button>)}</div></nav>

    <div id={`engagement-panel-${activeTab}`} role="tabpanel" aria-labelledby={`engagement-tab-${activeTab}`}>
      {activeTab === 'overview' && <EngagementOverview list={rows} byDay={byDay} reactivation={reactivation} onSelectTab={setActiveTab} onOpen={row => setOpenId(row.id)} />}
      {activeTab !== 'overview' && <EngagementTable
        key={activeTab}
        rows={tabRows[activeTab]}
        title={TAB_CONFIG[activeTab].title}
        description={TAB_CONFIG[activeTab].description}
        showStatusFilter={activeTab === 'all'}
        defaultWithoutRecentContact={TAB_CONFIG[activeTab].withoutRecentContact}
        hasRecentContact={isRecentlyContacted}
        renderLastContact={row => describeLastContact(row.lastContact, now)}
        renderActions={renderActions}
        renderBulkActions={renderBulkActions}
        onOpen={row => setOpenId(row.id)}
      />}
    </div>

    {openCompany && <EngagementDetailsModal company={openCompany} lastContactLabel={describeLastContact(openCompany.lastContact, now)} actions={renderActions(openCompany)} onClose={() => setOpenId(null)} />}
    {callRow && <CallResultModal company={callRow} onClose={() => setCallRow(null)} onSave={saveCall} />}
    {scheduleRow && <ActivityFormModal
      companies={rows}
      initial={{ companyId: scheduleRow.id, type: 'follow_up', title: 'Follow-up de reativação', dueAt: tomorrowAtNine() }}
      extra={engagementSource(scheduleRow)}
      onClose={() => setScheduleRow(null)}
      onSaved={() => { setScheduleRow(null); setFeedback({ type: 'success', message: 'Follow-up agendado no CRM.' }); }}
      onError={fail('Não foi possível agendar o follow-up.')}
    />}
    <ConfirmDialog
      open={Boolean(bulk.rows)}
      title="Agendar follow-up para todas?"
      description={`Vai criar ${bulk.rows?.length || 0} atividade(s) pendente(s) no CRM para ${bulk.dueAt ? new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(bulk.dueAt)) : 'a data escolhida'}.`}
      confirmLabel="Agendar"
      busy={bulk.saving}
      onConfirm={scheduleBulk}
      onCancel={() => setBulk(value => ({ ...value, rows: null, clear: null }))}
    />
  </AdminPage>;
};

export default EngagementDashboard;
