import { isActiveModule, normalizePaymentStatus, PAYMENT_STATUS } from './subscriptions';
import { safePlainText } from '../utils/safeText';

export const CRM_STAGE = Object.freeze({
  IDENTIFIED: 'identified',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
});

export const CRM_STAGE_LABEL = Object.freeze({
  identified: 'Identificada', contacted: 'Contactada', interested: 'Interessada',
  proposal: 'Proposta enviada', negotiation: 'Negociação', won: 'Ganha', lost: 'Perdida',
});

const timestamp = value => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isNonRevenuePayment = payment => {
  if (!payment) return true;
  const method = String(payment.paymentMethod || payment.method || '').trim().toLowerCase();
  const subscriptionType = String(payment.subscription?.subscriptionType || payment.subscriptionType || '').trim().toLowerCase();
  const source = String(payment.source || payment.origin || '').trim().toLowerCase();
  const activationType = String(payment.activationType || '').trim().toLowerCase();
  return payment.revenueEligible === false || payment.isTrial === true || subscriptionType === 'trial' || source === 'trial'
    || payment.manualActivation === true || payment.activatedManually === true
    || method === 'manual' || source === 'manual' || source === 'admin_manual_activation' || activationType === 'manual';
};

export const isCollectedRevenuePayment = payment => {
  if (!payment || normalizePaymentStatus(payment.status) !== PAYMENT_STATUS.PAID || isNonRevenuePayment(payment)) return false;
  return Number(payment.amount || payment.valor || 0) > 0;
};

export const isPendingRevenuePayment = payment => {
  if (!payment || normalizePaymentStatus(payment.status) !== PAYMENT_STATUS.PENDING) return false;
  return !isNonRevenuePayment(payment) && Number(payment.amount || payment.valor || 0) > 0;
};

export const normalizeCrmCollections = (companies = {}, payments = {}, crm = {}) => ({
  companies: Object.entries(companies || {}).map(([id, value]) => ({ ...(value || {}), id, nome: safePlainText(value?.nome, 150) })),
  payments: Object.entries(payments || {}).map(([id, value]) => ({ ...(value || {}), id, rawStatus: String(value?.status || '').trim().toLowerCase(), nome: safePlainText(value?.nome, 150), userName: safePlainText(value?.userName, 150), reference: safePlainText(value?.reference, 180), status: normalizePaymentStatus(value?.status) })),
  accounts: crm.accounts || {},
  opportunities: Object.entries(crm.opportunities || {}).map(([id, value]) => ({ id, ...(value || {}) })),
  activities: Object.entries(crm.activities || {}).map(([id, value]) => ({ id, ...(value || {}) })),
  invoices: Object.entries(crm.invoices || {}).map(([id, value]) => ({ id, ...(value || {}) })),
});

export const calculateCrmMetrics = ({ companies = [], payments = [], opportunities = [], activities = [], invoices = [] }, now = Date.now()) => {
  const date = new Date(now);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
  const paid = payments.filter(isCollectedRevenuePayment);
  const revenueThisMonth = paid.filter(payment => {
    const paidAt = timestamp(payment.paidAt || payment.approvedAt || payment.timestamp || payment.createdAt);
    return paidAt >= monthStart && paidAt < monthEnd;
  }).reduce((sum, payment) => sum + Number(payment.amount || payment.valor || 0), 0);
  const pendingPayments = payments.filter(isPendingRevenuePayment);
  const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || payment.valor || 0), 0);
  const paidCustomers = new Set(paid.map(payment => payment.userId || payment.companyId).filter(Boolean)).size;
  const paidBySubscription = new Map();
  paid.forEach(payment => {
    const companyId = payment.userId || payment.companyId;
    if (!companyId || !payment.moduleKey) return;
    const key = `${companyId}:${payment.moduleKey}`;
    paidBySubscription.set(key, (paidBySubscription.get(key) || 0) + 1);
  });
  const recurringSubscriptions = [...paidBySubscription.values()].filter(count => count > 1).length;
  const renewalRate = paidBySubscription.size ? recurringSubscriptions / paidBySubscription.size * 100 : 0;
  const cancelledPayments = payments.filter(payment => ['cancelled', 'canceled', 'cancelado', 'cancelada'].includes(payment.rawStatus)).length;
  const cancellations = cancelledPayments + invoices.filter(invoice => invoice.status === 'cancelled').length;

  const latestByModule = new Map();
  paid.forEach(payment => {
    const companyId = payment.userId || payment.companyId;
    if (!companyId || !payment.moduleKey) return;
    const key = `${companyId}:${payment.moduleKey}`;
    if (!latestByModule.has(key) || timestamp(payment.timestamp) > timestamp(latestByModule.get(key).timestamp)) latestByModule.set(key, payment);
  });
  const mrr = companies.reduce((total, company) => total + Object.entries(company.activeModules || {}).reduce((sum, [moduleKey, module]) => {
    if (!isActiveModule(module, now)) return sum;
    const payment = latestByModule.get(`${company.id}:${moduleKey}`);
    const amount = Number(payment?.amount || payment?.valor || 0);
    const days = Number(payment?.subscription?.durationDays || module?.durationDays || 30);
    return sum + (amount > 0 && days > 0 ? amount * (30 / days) : 0);
  }, 0), 0);

  const renewalLimit = now + 30 * 24 * 60 * 60 * 1000;
  const renewalsDue = companies.reduce((count, company) => count + Object.values(company.activeModules || {}).filter(module => {
    const expiresAt = timestamp(module?.expiresAt);
    return module?.status === 'active' && expiresAt > now && expiresAt <= renewalLimit;
  }).length, 0);
  const openOpportunities = opportunities.filter(item => ![CRM_STAGE.WON, CRM_STAGE.LOST].includes(item.stage));
  const pipelineValue = openOpportunities.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const weightedPipeline = openOpportunities.reduce((sum, item) => sum + Number(item.value || 0) * (Number(item.probability || 0) / 100), 0);
  const overdueActivities = activities.filter(item => item.status !== 'completed' && timestamp(item.dueAt) > 0 && timestamp(item.dueAt) < now).length;

  return { totalCompanies: companies.length, paidCustomers, revenueThisMonth, pendingRevenue, pendingPayments: pendingPayments.length, mrr, renewalsDue, renewalRate, cancellations, pipelineValue, weightedPipeline, openOpportunities: openOpportunities.length, overdueActivities };
};

export const companyCrmSummary = (company, payments = [], account = {}, now = Date.now()) => {
  const companyPayments = payments.filter(payment => (payment.userId || payment.companyId) === company.id);
  const lifetimeRevenue = companyPayments.filter(isCollectedRevenuePayment)
    .reduce((sum, payment) => sum + Number(payment.amount || payment.valor || 0), 0);
  const activeModules = Object.values(company.activeModules || {}).filter(module => isActiveModule(module, now)).length;
  return { ...company, crm: account, lifetimeRevenue, activeModules, relationshipStatus: account.relationshipStatus || (activeModules ? 'active_customer' : 'prospect') };
};
