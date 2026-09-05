import { calculateInvoiceTotals, canAttachPayment, effectiveInvoiceStatus } from './billing';

test('calcula subtotal, desconto, imposto e total', () => {
  expect(calculateInvoiceTotals([{ quantity: 2, unitPrice: 1000 }], 16, 200)).toEqual({ subtotal: 2000, discount: 200, tax: 288, total: 2088 });
});
test('marca documento emitido vencido pela data', () => {
  expect(effectiveInvoiceStatus({ status: 'issued', dueAt: 100 }, 101)).toBe('overdue');
});
test('não associa trial ou ativação manual', () => {
  const invoice = { companyId: 'c1', total: 100 };
  expect(canAttachPayment(invoice, { userId: 'c1', amount: 100, isTrial: true })).toBe(false);
  expect(canAttachPayment(invoice, { userId: 'c1', amount: 100, paymentMethod: 'mpesa' })).toBe(true);
  expect(canAttachPayment(invoice, { userId: 'c1', amount: 99, paymentMethod: 'mpesa' })).toBe(false);
});
