import { useEffect, useMemo, useState } from 'react';
import { onValue, push, ref, set, update } from 'firebase/database';
import { Link } from 'react-router-dom';
import { auth, db } from '../fb';
import { calculateCrmMetrics, companyCrmSummary, CRM_STAGE_LABEL, normalizeCrmCollections } from '../domain/crm';
import { AdminCard, AdminPage, AdminPageHeader, EmptyState, InlineAlert, LoadingState, PrimaryButton, SecondaryButton } from './admin/ui/AdminUI';
import CrmActivitiesPanel from './crm/CrmActivitiesPanel';
import CrmBulkFollowUp from './crm/CrmBulkFollowUp';
import CrmBillingPanel from './crm/CrmBillingPanel';

const PAGE_SIZE = 10;
const money = value => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(Number(value || 0));
const RELATIONSHIPS = { prospect: 'Prospecto', negotiation: 'Em negociação', active_customer: 'Cliente ativo', inactive_customer: 'Cliente inativo', lost: 'Perdido' };
const TABS = [['overview', 'Visão geral'], ['companies', 'Empresas'], ['billing', 'Faturação'], ['pipeline', 'Pipeline'], ['activities', 'Atividades'], ['followup', 'Follow-up']];
const emptyOpportunity = { companyId: '', title: '', productType: 'module', productId: '', stage: 'identified', billingCycle: 'monthly', value: '', probability: 25, expectedCloseAt: '' };
const Metric = ({ label, value, help }) => <AdminCard className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-950">{value}</p><p className="mt-1 text-xs text-gray-500">{help}</p></AdminCard>;

const CrmDashboard = () => {
  const [raw, setRaw] = useState({ companies: {}, payments: {}, crm: {} });
  const [ready, setReady] = useState({ companies: false, payments: false, crm: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [relationship, setRelationship] = useState('all');
  const [page, setPage] = useState(1);
  const [showOpportunity, setShowOpportunity] = useState(false);
  const [opportunity, setOpportunity] = useState(emptyOpportunity);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const subscriptions = [['companies', 'company'], ['payments', 'payments'], ['crm', 'adminCrm']].map(([key, path]) => onValue(ref(db, path), snapshot => {
      setRaw(previous => ({ ...previous, [key]: snapshot.val() || {} }));
      setReady(previous => ({ ...previous, [key]: true }));
    }, () => { setReady(previous => ({ ...previous, [key]: true })); setFeedback({ type: 'error', message: `Não foi possível carregar ${path}.` }); }));
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  const data = useMemo(() => normalizeCrmCollections(raw.companies, raw.payments, raw.crm), [raw]);
  const metrics = useMemo(() => calculateCrmMetrics(data), [data]);
  const allCompanies = useMemo(() => data.companies.map(company => companyCrmSummary(company, data.payments, data.accounts[company.id])), [data]);
  const companies = useMemo(() => allCompanies.filter(company => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [company.nome, company.email, company.sector, company.provincia].some(value => String(value || '').toLowerCase().includes(term));
    return matchesSearch && (relationship === 'all' || company.relationshipStatus === relationship);
  }).sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue), [allCompanies, search, relationship]);
  const pageCount = Math.max(1, Math.ceil(companies.length / PAGE_SIZE));
  const pagedCompanies = companies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const renewals = useMemo(() => data.companies.flatMap(company => Object.entries(company.activeModules || {}).map(([moduleKey, module]) => ({ company, moduleKey, module }))).filter(({ module }) => {
    const expiresAt = Number(module.expiresAt) || Date.parse(module.expiresAt);
    return module.status === 'active' && Number.isFinite(expiresAt) && expiresAt > Date.now() && expiresAt <= Date.now() + 30 * 86400000;
  }).sort((a, b) => (Number(a.module.expiresAt) || Date.parse(a.module.expiresAt)) - (Number(b.module.expiresAt) || Date.parse(b.module.expiresAt))), [data.companies]);

  useEffect(() => setPage(1), [search, relationship]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const changeRelationship = async (companyId, relationshipStatus) => {
    try { await update(ref(db, `adminCrm/accounts/${companyId}`), { relationshipStatus, updatedAt: Date.now(), updatedBy: auth.currentUser?.uid || null }); setFeedback({ type: 'success', message: 'Relacionamento atualizado.' }); }
    catch { setFeedback({ type: 'error', message: 'Não foi possível atualizar o cliente.' }); }
  };
  const openRenewal = (company, moduleKey, module) => {
    setOpportunity({ ...emptyOpportunity, companyId: company.id, title: `Renovação de ${module.moduleName || moduleKey}`, productId: moduleKey, probability: 70 });
    setShowOpportunity(true);
  };
  const createOpportunity = async event => {
    event.preventDefault(); setSaving(true);
    try {
      const opportunityRef = push(ref(db, 'adminCrm/opportunities'));
      await set(opportunityRef, { ...opportunity, value: Number(opportunity.value), probability: Number(opportunity.probability), expectedCloseAt: opportunity.expectedCloseAt ? new Date(`${opportunity.expectedCloseAt}T12:00:00`).getTime() : null, currency: 'MZN', ownerId: auth.currentUser?.uid || null, createdAt: Date.now(), updatedAt: Date.now() });
      setOpportunity(emptyOpportunity); setShowOpportunity(false); setActiveTab('pipeline'); setFeedback({ type: 'success', message: 'Oportunidade criada.' });
    } catch { setFeedback({ type: 'error', message: 'Não foi possível criar a oportunidade.' }); } finally { setSaving(false); }
  };

  if (!Object.values(ready).every(Boolean)) return <LoadingState label="A consolidar dados comerciais..." />;
  return <AdminPage>
    <AdminPageHeader title="CRM e Receita" description="Carteira, oportunidades, atividades e comunicação comercial num único espaço." actions={<PrimaryButton type="button" onClick={() => setShowOpportunity(true)}>Nova oportunidade</PrimaryButton>} />
    {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert>}
    <nav className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label="Secções do CRM"><div className="flex min-w-max gap-1" role="tablist">{TABS.map(([id, label]) => <button key={id} id={`crm-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`crm-panel-${id}`} onClick={() => setActiveTab(id)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${activeTab === id ? 'bg-blue-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'}`}>{label}</button>)}</div></nav>

    <div id={`crm-panel-${activeTab}`} role="tabpanel" aria-labelledby={`crm-tab-${activeTab}`}>
      {activeTab === 'overview' && <div className="space-y-6"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores comerciais">
        <Metric label="MRR estimado" value={money(metrics.mrr)} help="Mensalização dos módulos ativos" /><Metric label="Recebido este mês" value={money(metrics.revenueThisMonth)} help="Pagamentos aprovados" /><Metric label="Por receber" value={money(metrics.pendingRevenue)} help="Pagamentos pendentes" /><Metric label="Pipeline ponderado" value={money(metrics.weightedPipeline)} help={`${metrics.openOpportunities} oportunidade(s)`} /><Metric label="Empresas" value={metrics.totalCompanies} help="Carteira cadastrada" /><Metric label="Renovações em 30 dias" value={metrics.renewalsDue} help="Módulos a expirar" /><Metric label="Pipeline bruto" value={money(metrics.pipelineValue)} help="Valor em negociação" /><Metric label="Atividades vencidas" value={metrics.overdueActivities} help="Contactos prioritários" />
      </section><AdminCard className="overflow-hidden"><div className="border-b border-gray-200 p-5"><h2 className="text-lg font-bold">Renovações nos próximos 30 dias</h2><p className="text-sm text-gray-500">Prioridades comerciais para retenção.</p></div>{renewals.length === 0 ? <EmptyState title="Sem renovações próximas" description="Nenhum módulo pago expira neste período." /> : <div className="divide-y">{renewals.slice(0, 10).map(({ company, moduleKey, module }) => <article key={`${company.id}:${moduleKey}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{company.nome || company.email || 'Empresa'}</h3><p className="text-sm text-gray-500">{module.moduleName || moduleKey} · expira em {new Date(Number(module.expiresAt) || module.expiresAt).toLocaleDateString('pt-MZ')}</p></div><SecondaryButton type="button" onClick={() => openRenewal(company, moduleKey, module)}>Criar oportunidade</SecondaryButton></article>)}</div>}</AdminCard></div>}

      {activeTab === 'companies' && <AdminCard className="overflow-hidden"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row"><input aria-label="Pesquisar empresas" value={search} onChange={event => setSearch(event.target.value)} className="flex-1 rounded-lg border px-3 py-2" placeholder="Pesquisar nome, email, sector ou província" /><select aria-label="Filtrar relacionamento" value={relationship} onChange={event => setRelationship(event.target.value)} className="rounded-lg border px-3 py-2"><option value="all">Todos os relacionamentos</option>{Object.entries(RELATIONSHIPS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {companies.length === 0 ? <EmptyState title="Nenhuma empresa encontrada" description="Ajuste os filtros da carteira." /> : <><div className="overflow-x-auto"><table className="min-w-full divide-y"><thead className="bg-gray-50"><tr>{['Empresa', 'Relacionamento', 'Módulos', 'Receita', 'Ação'].map(label => <th key={label} className="px-5 py-3 text-left text-xs uppercase text-gray-500 last:text-right">{label}</th>)}</tr></thead><tbody className="divide-y">{pagedCompanies.map(company => <tr key={company.id} className="hover:bg-gray-50"><td className="px-5 py-4"><p className="font-semibold">{company.nome || 'Empresa sem nome'}</p><p className="text-xs text-gray-500">{company.email || company.provincia || 'Sem contacto'}</p></td><td className="px-5 py-4"><select aria-label={`Relacionamento de ${company.nome || 'empresa'}`} value={company.relationshipStatus} onChange={event => changeRelationship(company.id, event.target.value)} className="rounded-md border px-2 py-1 text-sm">{Object.entries(RELATIONSHIPS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-5 py-4 text-sm font-semibold">{company.activeModules}</td><td className="px-5 py-4 text-sm font-semibold">{money(company.lifetimeRevenue)}</td><td className="px-5 py-4 text-right"><Link className="font-semibold text-blue-700" to={`/empresas/${company.id}`}>Abrir ficha</Link></td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">A mostrar {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, companies.length)} de {companies.length}</p><div className="flex items-center gap-2"><SecondaryButton disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</SecondaryButton><span className="text-sm font-semibold">{page} de {pageCount}</span><SecondaryButton disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Seguinte</SecondaryButton></div></div></>}</AdminCard>}

      {activeTab === 'pipeline' && <AdminCard className="overflow-hidden"><div className="flex justify-between border-b p-5"><div><h2 className="text-lg font-bold">Pipeline comercial</h2><p className="text-sm text-gray-500">Oportunidades recentes.</p></div><PrimaryButton onClick={() => setShowOpportunity(true)}>Adicionar</PrimaryButton></div>{data.opportunities.length === 0 ? <EmptyState title="Pipeline vazio" description="Crie a primeira oportunidade." /> : <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{data.opportunities.slice().sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).map(item => <article key={item.id} className="rounded-xl border p-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{CRM_STAGE_LABEL[item.stage] || item.stage}</span><h3 className="mt-3 font-bold">{item.title}</h3><p className="text-sm text-gray-500">{data.companies.find(company => company.id === item.companyId)?.nome || 'Empresa'}</p><p className="mt-3 text-lg font-bold">{money(item.value)}</p></article>)}</div>}</AdminCard>}
      {activeTab === 'activities' && <CrmActivitiesPanel companies={data.companies} activities={data.activities} />}
      {activeTab === 'followup' && <CrmBulkFollowUp companies={data.companies} />}
      {activeTab === 'billing' && <CrmBillingPanel companies={data.companies} payments={data.payments} invoices={data.invoices} />}
    </div>

    {showOpportunity && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={createOpportunity} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true"><h2 className="text-xl font-bold">Nova oportunidade</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2">Empresa<select required value={opportunity.companyId} onChange={event => setOpportunity(value => ({ ...value, companyId: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"><option value="">Selecionar</option>{data.companies.map(company => <option key={company.id} value={company.id}>{company.nome || company.email}</option>)}</select></label><label className="sm:col-span-2">Título<input required value={opportunity.title} onChange={event => setOpportunity(value => ({ ...value, title: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Valor<input required min="0" type="number" value={opportunity.value} onChange={event => setOpportunity(value => ({ ...value, value: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Probabilidade<input min="0" max="100" type="number" value={opportunity.probability} onChange={event => setOpportunity(value => ({ ...value, probability: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Etapa<select value={opportunity.stage} onChange={event => setOpportunity(value => ({ ...value, stage: event.target.value }))} className="mt-1 w-full rounded-lg border p-2">{Object.entries(CRM_STAGE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Fecho previsto<input type="date" value={opportunity.expectedCloseAt} onChange={event => setOpportunity(value => ({ ...value, expectedCloseAt: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label></div><div className="mt-6 flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setShowOpportunity(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Criar oportunidade'}</PrimaryButton></div></form></div>}
  </AdminPage>;
};

export default CrmDashboard;
