import { isNonRevenuePayment } from './crm';

export const INVOICE_STATUS = Object.freeze({ DRAFT: 'draft', ISSUED: 'issued', PAID: 'paid', OVERDUE: 'overdue', CANCELLED: 'cancelled' });
export const INVOICE_STATUS_LABEL = Object.freeze({ draft: 'Rascunho', issued: 'Emitida', paid: 'Paga', overdue: 'Vencida', cancelled: 'Cancelada' });

export const calculateInvoiceTotals = (items = [], taxRate = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)) * Math.max(0, Number(item.unitPrice || 0)), 0);
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount || 0)));
  const taxable = subtotal - safeDiscount;
  const tax = taxable * Math.max(0, Number(taxRate || 0)) / 100;
  return { subtotal, discount: safeDiscount, tax, total: taxable + tax };
};

export const effectiveInvoiceStatus = (invoice, now = Date.now()) => {
  if (!invoice) return INVOICE_STATUS.DRAFT;
  if ([INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.DRAFT].includes(invoice.status)) return invoice.status;
  const dueAt = Number(invoice.dueAt) || Date.parse(invoice.dueAt);
  return dueAt > 0 && dueAt < now ? INVOICE_STATUS.OVERDUE : INVOICE_STATUS.ISSUED;
};

export const canAttachPayment = (invoice, payment) => {
  if (!invoice || !payment || invoice.companyId !== (payment.userId || payment.companyId)) return false;
  const amount = Number(payment.amount || payment.valor || 0);
  return !isNonRevenuePayment(payment) && amount > 0 && amount >= Number(invoice.total || 0);
};
