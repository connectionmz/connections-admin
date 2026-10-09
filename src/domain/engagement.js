import { safePlainText } from '../utils/safeText';

export const ENGAGEMENT = Object.freeze({
  ACTIVE: 'active',
  AT_RISK: 'at_risk',
  OFFLINE: 'offline',
  NEVER: 'never',
});

export const ENGAGEMENT_LABEL = Object.freeze({
  active: 'Ativa', at_risk: 'Em risco', offline: 'Offline', never: 'Nunca acedeu',
});

export const OFFLINE_THRESHOLD_DAYS = 7;
export const AT_RISK_THRESHOLD_DAYS = 1;

const DAY = 86_400_000;
const REACTIVATION_STATUSES = new Set([ENGAGEMENT.OFFLINE, ENGAGEMENT.NEVER, ENGAGEMENT.AT_RISK]);

const fromNumber = number => {
  if (!Number.isFinite(number) || number <= 0) return null;
  return number < 1e12 ? number * 1000 : number;
};

// Converte number (ms ou segundos), string ISO, {seconds} ou Date em ms; devolve null se inválido.
export const toTimestamp = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (value instanceof Date) return fromNumber(value.getTime());
  if (typeof value === 'number') return fromNumber(value);
  if (typeof value === 'object') return value.seconds !== undefined ? fromNumber(Number(value.seconds) * 1000) : null;
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return fromNumber(Number(text));
  return fromNumber(Date.parse(text));
};

// true quando o registo é uma empresa (exclui type === 'singular').
export const isCompanyAccount = account => Boolean(account) && String(account.type || '').trim().toLowerCase() !== 'singular';

// Lista de timestamps válidos (ms) de um nó accessLogs/<uid>.
export const accessTimestamps = (logs = {}) => Object.values(logs || {})
  .map(log => (log && typeof log === 'object' && !(log instanceof Date) && log.seconds === undefined
    ? toTimestamp(log.accessedAt ?? log.timestamp)
    : toTimestamp(log)))
  .filter(value => value !== null);

const startOfDay = now => {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const classifyEngagement = daysSinceAccess => {
  if (daysSinceAccess === null) return ENGAGEMENT.NEVER;
  if (daysSinceAccess > OFFLINE_THRESHOLD_DAYS) return ENGAGEMENT.OFFLINE;
  if (daysSinceAccess > AT_RISK_THRESHOLD_DAYS) return ENGAGEMENT.AT_RISK;
  return ENGAGEMENT.ACTIVE;
};

// Resumo de uso de uma conta.
export const summarizeEngagement = (account = {}, logs = {}, now = Date.now()) => {
  // Datas no futuro indicam relógio errado e contam como "agora".
  const accesses = accessTimestamps(logs).map(value => Math.min(value, now)).sort((a, b) => b - a);
  const lastLogin = toTimestamp(account?.lastLogin);
  const candidates = [lastLogin === null ? null : Math.min(lastLogin, now), accesses[0] ?? null].filter(value => value !== null);
  const lastAccessAt = candidates.length ? Math.max(...candidates) : null;
  const daysSinceAccess = lastAccessAt === null ? null : Math.floor((now - lastAccessAt) / DAY);
  const today = startOfDay(now);
  return {
    lastAccessAt,
    createdAt: toTimestamp(account?.createdAt) ?? toTimestamp(account?.criadoEm) ?? toTimestamp(account?.dataCadastro),
    daysSinceAccess,
    status: classifyEngagement(daysSinceAccess),
    accessesToday: accesses.filter(value => value >= today).length,
    accesses7d: accesses.filter(value => value > now - 7 * DAY).length,
    accesses30d: accesses.filter(value => value > now - 30 * DAY).length,
    totalAccesses: accesses.length,
    recentAccesses: accesses.slice(0, 5),
  };
};

// Junta company + accessLogs; por omissão só empresas.
export const buildEngagementList = (companies = {}, accessLogs = {}, { now = Date.now(), includeSingulares = false } = {}) => Object.entries(companies || {})
  .filter(([, account]) => account && (includeSingulares || isCompanyAccount(account)))
  .map(([id, account]) => ({
    ...account,
    id,
    nome: safePlainText(account.nome, 150),
    ...summarizeEngagement(account, accessLogs?.[id], now),
  }));

export const countByEngagement = (list = []) => list.reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), {
  [ENGAGEMENT.ACTIVE]: 0, [ENGAGEMENT.AT_RISK]: 0, [ENGAGEMENT.OFFLINE]: 0, [ENGAGEMENT.NEVER]: 0,
});

const weekdayFormatter = new Intl.DateTimeFormat('pt-MZ', { weekday: 'short', day: '2-digit' });

// Acessos por dia nos últimos 7 dias (hoje incluído), a partir de TODOS os logs.
export const accessesByDay = (accessLogs = {}, now = Date.now()) => {
  const current = new Date(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(current.getFullYear(), current.getMonth(), current.getDate() - (6 - index)).getTime();
    const end = new Date(current.getFullYear(), current.getMonth(), current.getDate() - (5 - index)).getTime();
    return { date: start, end, label: weekdayFormatter.format(start), count: 0 };
  });
  Object.values(accessLogs || {}).forEach(logs => accessTimestamps(logs).forEach(value => {
    const day = days.find(item => value >= item.date && value < item.end);
    if (day) day.count += 1;
  }));
  return days.map(({ date, label, count }) => ({ date, label, count }));
};

// Empresas contactadas (lastContactByCompany) quando estavam offline/never/at_risk
// e cujo lastAccessAt > data do contacto. Janela: últimos 30 dias.
// Só contam contactos com engagementStatus conhecido, para não misturar cobranças ou renovações.
export const reactivationStats = (engagementList = [], lastContacts = new Map(), now = Date.now()) => {
  const windowStart = now - 30 * DAY;
  let contacted = 0;
  let reactivated = 0;
  engagementList.forEach(item => {
    const contact = lastContacts.get(item.id);
    if (!contact || contact.at < windowStart || contact.at > now || !REACTIVATION_STATUSES.has(contact.engagementStatus)) return;
    contacted += 1;
    if (item.lastAccessAt !== null && item.lastAccessAt > contact.at) reactivated += 1;
  });
  return { contacted, reactivated, rate: contacted ? reactivated / contacted * 100 : 0 };
};
