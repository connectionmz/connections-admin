import {
  buildActiveModuleFromPayment,
  isActiveModule,
  normalizeExpirationTimestamp,
  normalizePaymentStatus,
  PAYMENT_STATUS,
} from './subscriptions';

describe('shared subscription contract', () => {
  test.each(['pago', 'paid', 'approved', 'aprovado', 'success'])(
    'normalizes %s as paid',
    status => expect(normalizePaymentStatus(status)).toBe(PAYMENT_STATUS.PAID)
  );

  test('uses the same active-module rules as connection-master', () => {
    expect(isActiveModule({ status: 'active', expiresAt: 2000 }, 1000)).toBe(true);
    expect(isActiveModule({ status: 'active', expiresAt: 500 }, 1000)).toBe(false);
    expect(isActiveModule({ status: 'inactive', expiresAt: 2000 }, 1000)).toBe(false);
    expect(normalizeExpirationTimestamp('1970-01-01T00:00:02.000Z')).toBe(2000);
  });

  test('builds a market module compatible with the portal', () => {
    expect(buildActiveModuleFromPayment({
      id: 'payment-1',
      userId: 'company-1',
      moduleKey: 'moduloMarket',
      moduleName: 'Market',
      subscription: { end: 5000, durationDays: 30 },
    }, 1000)).toEqual(expect.objectContaining({
      moduleKey: 'moduloMarket',
      status: 'active',
      expiresAt: 5000,
      paymentId: 'payment-1',
      isPremium: true,
    }));
  });
});
