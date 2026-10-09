import { ENGAGEMENT, toTimestamp } from './engagement';
import { normalizeEmail } from './followUps';

const DAY = 86_400_000;
const ENGAGEMENT_STATUSES = new Set(Object.values(ENGAGEMENT));

export const ACTIVITY_TYPE_LABEL = Object.freeze({
  call: 'Chamada', meeting: 'Reunião', email: 'Email', whatsapp: 'WhatsApp', collection: 'Cobrança', follow_up: 'Follow-up',
});

// Normaliza telefone moçambicano: devolve '2588XXXXXXXX' ou ''.
// Aceita '84 123 4567', '+258841234567', '258 84 123 4567', '841234567'.
// Válido: 9 dígitos começados por 8 (após remover o prefixo 258).
export const normalizeMzPhone = value => {
  if (Array.isArray(value)) return value.map(normalizeMzPhone).find(Boolean) || '';
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00258')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('258')) digits = digits.slice(3);
  return /^8\d{8}$/.test(digits) ? `258${digits}` : '';
};

export const whatsappUrl = (phone, text = '') => {
  const number = normalizeMzPhone(phone);
  if (!number) return '';
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export const telUrl = phone => {
  const number = normalizeMzPhone(phone);
  return number ? `tel:+${number}` : '';
};

export const companyEmail = company => (Array.isArray(company?.email) ? company.email : [company?.email]).map(normalizeEmail).find(Boolean) || '';
export const companyPhone = company => normalizeMzPhone([company?.contacto, company?.telefone, company?.phone].flat().filter(Boolean));

// Último contacto por empresa a partir de adminCrm.activities (status 'completed')
// e adminCrm.followUps[*].deliveries[companyId] (status 'delivered').
export const lastContactByCompany = (crm = {}) => {
  const latest = new Map();
  const consider = (companyId, contact) => {
    if (!companyId || contact.at === null) return;
    const current = latest.get(companyId);
    if (!current || contact.at > current.at) latest.set(companyId, contact);
  };

  Object.values(crm?.activities || {}).forEach(activity => {
    if (activity?.status !== 'completed') return;
    consider(activity.companyId, {
      at: toTimestamp(activity.completedAt) ?? toTimestamp(activity.updatedAt) ?? toTimestamp(activity.createdAt),
      channel: activity.type,
      label: ACTIVITY_TYPE_LABEL[activity.type] || 'Atividade',
      engagementStatus: ENGAGEMENT_STATUSES.has(activity.engagementStatus) ? activity.engagementStatus : null,
    });
  });

  Object.values(crm?.followUps || {}).forEach(campaign => {
    const audience = ENGAGEMENT_STATUSES.has(campaign?.audience) ? campaign.audience : null;
    Object.entries(campaign?.deliveries || {}).forEach(([companyId, delivery]) => {
      if (delivery?.status !== 'delivered') return;
      consider(companyId, {
        at: toTimestamp(delivery.attemptedAt) ?? toTimestamp(campaign.completedAt) ?? toTimestamp(campaign.createdAt),
        channel: 'email',
        label: 'Email',
        engagementStatus: audience,
      });
    });
  });

  return latest;
};

export const hasRecentContact = (contact, now = Date.now(), days = 7) => Boolean(contact) && now - contact.at <= days * DAY;

// "há 3 dias · WhatsApp", "hoje · Email" ou "—".
export const describeLastContact = (contact, now = Date.now()) => {
  if (!contact) return '—';
  const days = Math.max(0, Math.floor((now - contact.at) / DAY));
  const when = days === 0 ? 'hoje' : days === 1 ? 'há 1 dia' : `há ${days} dias`;
  return `${when} · ${contact.label}`;
};
