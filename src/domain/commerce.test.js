import { isQuotePublic, isStorePublic, quoteState } from './commerce';

test('separa moderação e ciclo de vida das cotações legadas', () => {
  expect(quoteState({ status: 'Fechada', verified: true }, 100)).toEqual(expect.objectContaining({ lifecycle: 'closed', moderation: 'approved', label: 'Fechada' }));
  expect(quoteState({ status: 'Bloqueada' }, 100).label).toBe('Bloqueada');
});

test('não publica cotações bloqueadas nem lojas desativadas', () => {
  expect(isQuotePublic({ moderationStatus: 'blocked', company: { id: 'owner' } }, 'owner')).toBe(false);
  expect(isStorePublic({ isActive: false })).toBe(false);
  expect(isStorePublic({ isActive: true })).toBe(true);
});
