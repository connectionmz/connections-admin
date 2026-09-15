import { getReportPath, isCompanyPendingValidation, isCompanyVerified, MODERATION_STATUS, normalizeModerationStatus } from './moderation';

describe('moderation contract', () => {
  test('accepts legacy and current verification values', () => {
    expect(isCompanyVerified({ subscriptions: { isverify: true } })).toBe(true);
    expect(isCompanyVerified({ subscriptions: { isverify: 'true' } })).toBe(true);
    expect(isCompanyVerified({ subscriptions: { isverify: 'false' } })).toBe(false);
  });

  test('does not return rejected companies to the pending queue', () => {
    expect(isCompanyPendingValidation({ subscriptions: { isverify: 'false' } })).toBe(true);
    expect(isCompanyPendingValidation({ subscriptions: { isverify: 'false' }, verificationStatus: 'rejeitado' })).toBe(false);
  });

  test('normalizes report statuses created by connection-master', () => {
    expect(normalizeModerationStatus('pending')).toBe(MODERATION_STATUS.PENDING);
    expect(normalizeModerationStatus('resolved')).toBe(MODERATION_STATUS.RESOLVED);
  });

  test('builds the existing nested post report path', () => {
    expect(getReportPath({ tipo: 'post', postId: 'post-1', reporterId: 'user-1', id: 'report-1' }))
      .toBe('denuncias/posts/post-1/user-1/report-1');
  });
});
