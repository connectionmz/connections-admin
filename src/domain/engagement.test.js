import {
  accessesByDay, buildEngagementList, countByEngagement, ENGAGEMENT, isCompanyAccount, reactivationStats, summarizeEngagement, toTimestamp,
} from './engagement';

const NOW = new Date(2026, 8, 3, 12).getTime();
const DAY = 86_400_000;

test('isCompanyAccount exclui singulares e aceita type ausente', () => {
  expect(isCompanyAccount({ type: 'singular' })).toBe(false);
  expect(isCompanyAccount({ type: ' Singular ' })).toBe(false);
  expect(isCompanyAccount({ nome: 'Empresa' })).toBe(true);
  expect(isCompanyAccount({ type: 'empresa' })).toBe(true);
});

test('sem lastLogin e sem logs a conta nunca acedeu (e não fica offline)', () => {
  const summary = summarizeEngagement({}, {}, NOW);
  expect(summary.status).toBe(ENGAGEMENT.NEVER);
  expect(summary.lastAccessAt).toBeNull();
  expect(summary.daysSinceAccess).toBeNull();
});

test('lastLogin inválido não conta como acesso', () => {
  expect(summarizeEngagement({ lastLogin: 'abc' }, {}, NOW).status).toBe(ENGAGEMENT.NEVER);
});

test('accessLog de ontem sem lastLogin torna a conta ativa', () => {
  expect(summarizeEngagement({}, { a: { accessedAt: NOW - DAY } }, NOW).status).toBe(ENGAGEMENT.ACTIVE);
});

test('prevalece o acesso mais recente entre lastLogin e accessLogs', () => {
  const summary = summarizeEngagement({ lastLogin: NOW - 30 * DAY }, { a: { timestamp: NOW - 2 * DAY } }, NOW);
  expect(summary.status).toBe(ENGAGEMENT.AT_RISK);
  expect(summary.daysSinceAccess).toBe(2);
});

test('lastLogin de há 8 dias fica offline', () => {
  const summary = summarizeEngagement({ lastLogin: NOW - 8 * DAY }, {}, NOW);
  expect(summary.status).toBe(ENGAGEMENT.OFFLINE);
  expect(summary.daysSinceAccess).toBe(8);
});

test('converte lastLogin em segundos, strings ISO e {seconds}', () => {
  expect(toTimestamp(Math.floor((NOW - 3 * DAY) / 1000))).toBe(Math.floor((NOW - 3 * DAY) / 1000) * 1000);
  expect(summarizeEngagement({ lastLogin: Math.floor((NOW - 3 * DAY) / 1000) }, {}, NOW).daysSinceAccess).toBe(3);
  expect(toTimestamp(new Date(NOW).toISOString())).toBe(NOW);
  expect(toTimestamp({ seconds: NOW / 1000 })).toBe(NOW);
  expect(toTimestamp('')).toBeNull();
  expect(toTimestamp(0)).toBeNull();
});

test('datas no futuro contam como agora e createdAt em falta fica nulo', () => {
  const summary = summarizeEngagement({ lastLogin: NOW + 10 * DAY }, {}, NOW);
  expect(summary.lastAccessAt).toBe(NOW);
  expect(summary.status).toBe(ENGAGEMENT.ACTIVE);
  expect(summary.createdAt).toBeNull();
});

test('conta acessos por período a partir de todos os logs', () => {
  const logs = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`l${index}`, { accessedAt: NOW - index * 3 * DAY }]));
  const summary = summarizeEngagement({}, logs, NOW);
  expect(summary).toEqual(expect.objectContaining({ accessesToday: 1, accesses7d: 3, accesses30d: 10, totalAccesses: 12 }));
  expect(summary.recentAccesses).toEqual([NOW, NOW - 3 * DAY, NOW - 6 * DAY, NOW - 9 * DAY, NOW - 12 * DAY]);
});

test('buildEngagementList exclui singulares por omissão', () => {
  const companies = { c1: { nome: 'Empresa' }, s1: { nome: 'Pessoa', type: 'singular' } };
  expect(buildEngagementList(companies, {}, { now: NOW }).map(item => item.id)).toEqual(['c1']);
  expect(buildEngagementList(companies, {}, { now: NOW, includeSingulares: true }).map(item => item.id)).toEqual(['c1', 's1']);
});

test('a soma dos estados é igual ao total', () => {
  const list = buildEngagementList({ a: {}, b: { lastLogin: NOW }, c: { lastLogin: NOW - 3 * DAY }, d: { lastLogin: NOW - 9 * DAY } }, {}, { now: NOW });
  const counts = countByEngagement(list);
  expect(counts).toEqual({ active: 1, at_risk: 1, offline: 1, never: 1 });
  expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(list.length);
});

test('accessesByDay conta todos os logs e termina hoje', () => {
  const logs = { c1: Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`l${index}`, { accessedAt: NOW - index * 1000 }])), c2: { a: { timestamp: NOW - 6 * DAY }, old: { timestamp: NOW - 8 * DAY } } };
  const days = accessesByDay(logs, NOW);
  expect(days).toHaveLength(7);
  expect(days[6].count).toBe(8);
  expect(days[0].count).toBe(1);
  expect(days[6].date).toBe(new Date(2026, 8, 3).getTime());
});

test('accessesByDay funciona ao domingo', () => {
  const sunday = new Date(2026, 8, 6, 18).getTime();
  expect(new Date(sunday).getDay()).toBe(0);
  const days = accessesByDay({ c1: { a: { accessedAt: sunday - 1000 }, b: { accessedAt: sunday - DAY } } }, sunday);
  expect(days[6].date).toBe(new Date(2026, 8, 6).getTime());
  expect(days[6].count).toBe(1);
  expect(days[5].count).toBe(1);
  expect(days.every(day => day.date <= sunday)).toBe(true);
});

test('reactivationStats mede empresas que voltaram após o contacto', () => {
  const list = [
    { id: 'a', lastAccessAt: NOW - DAY },
    { id: 'b', lastAccessAt: NOW - 20 * DAY },
    { id: 'c', lastAccessAt: null },
    { id: 'd', lastAccessAt: NOW },
  ];
  const contacts = new Map([
    ['a', { at: NOW - 5 * DAY, engagementStatus: 'offline' }],
    ['b', { at: NOW - 5 * DAY, engagementStatus: 'at_risk' }],
    ['c', { at: NOW - 5 * DAY, engagementStatus: 'never' }],
    ['d', { at: NOW - 5 * DAY }],
  ]);
  const stats = reactivationStats(list, contacts, NOW);
  expect(stats.contacted).toBe(3);
  expect(stats.reactivated).toBe(1);
  expect(stats.rate).toBeCloseTo(33.3, 1);
});
