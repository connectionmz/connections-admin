const time = value => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const quoteState = (quote, now = Date.now()) => {
  if (!quote || typeof quote !== 'object') return { moderation: 'pending', lifecycle: 'open', label: 'Indefinida' };
  const legacy = String(quote.status || '').toLowerCase();
  const moderation = quote.moderationStatus || (legacy === 'bloqueada' ? 'blocked' : (quote.verified || legacy === 'open') ? 'approved' : 'pending');
  const deadline = time(quote.datalimite || quote.deadline);
  let lifecycle = quote.lifecycleStatus || 'open';
  if (quote.archived === true || legacy === 'arquivada') lifecycle = 'archived';
  else if (['fechada', 'closed'].includes(legacy)) lifecycle = 'closed';
  else if (['expirada', 'expired'].includes(legacy) || (deadline > 0 && deadline < now)) lifecycle = 'expired';

  const label = lifecycle === 'archived' ? 'Arquivada'
    : moderation === 'blocked' ? 'Bloqueada'
      : lifecycle === 'closed' ? 'Fechada'
        : lifecycle === 'expired' ? 'Expirada'
          : moderation === 'approved' ? 'Aprovada' : 'Pendente';
  return { moderation, lifecycle, label };
};

export const isQuotePublic = (quote, viewerId, now = Date.now()) => {
  const state = quoteState(quote, now);
  const ownerId = quote?.company?.id || quote?.userId || quote?.createdBy;
  if (quote?.archived === true || state.lifecycle === 'archived' || state.moderation === 'blocked') return false;
  if (ownerId && viewerId === ownerId) return true;
  return state.moderation === 'approved';
};

export const isStorePublic = store => Boolean(store)
  && store.archived !== true
  && store.isActive !== false
  && !['blocked', 'suspended', 'archived'].includes(String(store.status || '').toLowerCase());
