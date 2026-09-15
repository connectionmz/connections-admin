export const MODERATION_STATUS = Object.freeze({
  PENDING: 'pendente',
  IN_REVIEW: 'em_analise',
  RESOLVED: 'resolvida',
  ARCHIVED: 'arquivada',
});

export const normalizeModerationStatus = status => {
  const value = String(status || '').trim().toLowerCase();
  if (['pending', 'pendente'].includes(value)) return MODERATION_STATUS.PENDING;
  if (['in_review', 'reviewing', 'em análise', 'em_analise'].includes(value)) return MODERATION_STATUS.IN_REVIEW;
  if (['resolved', 'resolvido', 'resolvida'].includes(value)) return MODERATION_STATUS.RESOLVED;
  if (['archived', 'arquivado', 'arquivada'].includes(value)) return MODERATION_STATUS.ARCHIVED;
  return MODERATION_STATUS.PENDING;
};

export const isCompanyVerified = company => {
  const value = company?.subscriptions?.isverify;
  return value === true || value === 'true';
};

export const isCompanyPendingValidation = company => {
  if (isCompanyVerified(company)) return false;
  const status = String(company?.verificationStatus || company?.subscriptions?.verificationStatus || '').toLowerCase();
  return !['approved', 'aprovado', 'rejected', 'rejeitado'].includes(status);
};

export const getReportPath = report => {
  const contentId = report.tipo === 'cotacao' ? report.cotacaoId : report.postId;
  if (!report?.tipo || !contentId || !report.reporterId || !report.id) return null;
  const reportNode = report.tipo === 'post' ? 'posts' : 'cotacao';
  return `denuncias/${reportNode}/${contentId}/${report.reporterId}/${report.id}`;
};
