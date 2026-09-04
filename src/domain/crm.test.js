import { calculateCrmMetrics, companyCrmSummary, normalizeCrmCollections } from './crm';

const NOW = new Date(2026, 8, 3, 12).getTime();

test('normaliza coleções e calcula receita, MRR e pipeline', () => {
  const data = normalizeCrmCollections({ c1: { activeModules: { market: { status: 'active', expiresAt: NOW + 100000, durationDays: 30 } } } }, {
    p1: { userId: 'c1', moduleKey: 'market', status: 'pago', amount: 3000, paymentMethod: 'mpesa', timestamp: NOW },
    p2: { userId: 'c1', status: 'pendente', amount: 1200, timestamp: NOW },
  }, { opportunities: { o1: { stage: 'proposal', value: 10000, probability: 50 } } });
  expect(calculateCrmMetrics(data, NOW)).toEqual(expect.objectContaining({ revenueThisMonth: 3000, pendingRevenue: 1200, mrr: 3000, pipelineValue: 10000, weightedPipeline: 5000 }));
});

test('resume o relacionamento financeiro de uma empresa', () => {
  const summary = companyCrmSummary({ id: 'c1', activeModules: {} }, [{ userId: 'c1', status: 'pago', amount: 500, paymentMethod: 'mpesa' }], {});
  expect(summary).toEqual(expect.objectContaining({ lifetimeRevenue: 500, activeModules: 0, relationshipStatus: 'prospect' }));
});

test('exclui trials e ativações manuais da receita e do MRR', () => {
  const data = normalizeCrmCollections({
    c1: { activeModules: { market: { status: 'active', expiresAt: NOW + 100000 } } },
    c2: { activeModules: { sms: { status: 'active', expiresAt: NOW + 100000 } } },
  }, {
    manual: { userId: 'c1', moduleKey: 'market', status: 'pago', amount: 9000, paymentMethod: 'manual', timestamp: NOW },
    trial: { userId: 'c2', moduleKey: 'sms', status: 'pago', amount: 5000, isTrial: true, timestamp: NOW },
    real: { userId: 'c2', moduleKey: 'sms', status: 'pago', amount: 1500, paymentMethod: 'mpesa', timestamp: NOW },
  });
  expect(calculateCrmMetrics(data, NOW)).toEqual(expect.objectContaining({ revenueThisMonth: 1500, mrr: 1500 }));
  expect(companyCrmSummary(data.companies[0], data.payments, {}, NOW).lifetimeRevenue).toBe(0);
});
