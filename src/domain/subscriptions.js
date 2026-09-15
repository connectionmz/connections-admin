export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pendente',
  PAID: 'pago',
  REJECTED: 'rejeitado',
});

export const normalizePaymentStatus = status => {
  const normalized = String(status || '').trim().toLowerCase();
  if (['pago', 'paid', 'approved', 'aprovado', 'success', 'successful'].includes(normalized)) return PAYMENT_STATUS.PAID;
  if (['rejeitado', 'rejected', 'failed', 'falhou', 'cancelled', 'cancelado'].includes(normalized)) return PAYMENT_STATUS.REJECTED;
  return PAYMENT_STATUS.PENDING;
};

export const normalizeExpirationTimestamp = value => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const isActiveModule = (module, now = Date.now()) => {
  if (!module || module.status !== 'active') return false;
  const expiresAt = normalizeExpirationTimestamp(module.expiresAt);
  return expiresAt === null || (!Number.isNaN(expiresAt) && expiresAt > now);
};

export const buildActiveModuleFromPayment = (payment, now = Date.now()) => {
  if (!payment?.userId || !payment?.moduleKey) return null;
  const durationDays = Number(payment.subscription?.durationDays || 30);
  const suppliedExpiration = payment.subscription?.end ?? payment.subscription?.expiresAt ?? payment.expiresAt;
  const expiration = normalizeExpirationTimestamp(suppliedExpiration);
  const expiresAt = expiration !== null && !Number.isNaN(expiration)
    ? expiration
    : now + durationDays * 24 * 60 * 60 * 1000;

  return {
    moduleKey: payment.moduleKey,
    moduleName: payment.moduleName || payment.moduleKey,
    status: 'active',
    paidAt: new Date(now).toISOString(),
    expiresAt,
    durationDays,
    paymentId: payment.id || null,
    ...(payment.moduleKey === 'moduloSMS' && { smsCount: Number(payment.smsCount || payment.subscription?.smsCount || 100) }),
    ...(payment.moduleKey === 'moduloMarket' && { isPremium: true }),
  };
};
