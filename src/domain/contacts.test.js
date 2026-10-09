import { companyEmail, companyPhone, describeLastContact, hasRecentContact, lastContactByCompany, normalizeMzPhone, telUrl, whatsappUrl } from './contacts';

const NOW = new Date(2026, 8, 3, 12).getTime();
const DAY = 86_400_000;

test.each([
  ['84 123 4567'],
  ['+258841234567'],
  ['258 84 123 4567'],
  ['841234567'],
])('normaliza o telefone %s', value => {
  expect(normalizeMzPhone(value)).toBe('258841234567');
});

test('números inválidos dão string vazia', () => {
  ['', null, undefined, '21 123 456', '74123456', '8412345678', '258 21 123 4567', 'abc', '+351 912 345 678'].forEach(value => {
    expect(normalizeMzPhone(value)).toBe('');
  });
});

test('gera links de WhatsApp e de chamada', () => {
  expect(whatsappUrl('84 123 4567', 'Olá Acme & Cª')).toBe('https://wa.me/258841234567?text=Ol%C3%A1%20Acme%20%26%20C%C2%AA');
  expect(whatsappUrl('84 123 4567')).toBe('https://wa.me/258841234567');
  expect(whatsappUrl('123')).toBe('');
  expect(telUrl('841234567')).toBe('tel:+258841234567');
  expect(telUrl('')).toBe('');
});

test('escolhe o primeiro email e telefone válidos', () => {
  expect(companyEmail({ email: ['inválido', ' A@B.COM '] })).toBe('a@b.com');
  expect(companyPhone({ contacto: '123', telefone: '+258 86 000 0000' })).toBe('258860000000');
});

test('lastContactByCompany escolhe o contacto mais recente entre atividades e follow-ups', () => {
  const crm = {
    activities: {
      a1: { companyId: 'c1', type: 'whatsapp', status: 'completed', completedAt: NOW - 5 * DAY, engagementStatus: 'offline' },
      a2: { companyId: 'c1', type: 'call', status: 'pending', dueAt: NOW },
      a3: { companyId: 'c2', type: 'call', status: 'completed', completedAt: NOW - DAY },
    },
    followUps: {
      f1: { audience: 'never', deliveries: { c1: { status: 'delivered', attemptedAt: NOW - 2 * DAY }, c2: { status: 'delivered', attemptedAt: NOW - 3 * DAY } } },
      f2: { deliveries: { c3: { status: 'failed', attemptedAt: NOW } } },
    },
  };
  const result = lastContactByCompany(crm);
  expect(result.get('c1')).toEqual({ at: NOW - 2 * DAY, channel: 'email', label: 'Email', engagementStatus: 'never' });
  expect(result.get('c2')).toEqual(expect.objectContaining({ at: NOW - DAY, channel: 'call', label: 'Chamada', engagementStatus: null }));
  expect(result.has('c3')).toBe(false);
});

test('descreve e avalia o último contacto', () => {
  expect(describeLastContact({ at: NOW - 3 * DAY, label: 'WhatsApp' }, NOW)).toBe('há 3 dias · WhatsApp');
  expect(describeLastContact({ at: NOW - 1000, label: 'Email' }, NOW)).toBe('hoje · Email');
  expect(describeLastContact(undefined, NOW)).toBe('—');
  expect(hasRecentContact({ at: NOW - 6 * DAY }, NOW)).toBe(true);
  expect(hasRecentContact({ at: NOW - 8 * DAY }, NOW)).toBe(false);
  expect(hasRecentContact(undefined, NOW)).toBe(false);
});
