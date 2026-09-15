import { push, ref, runTransaction } from 'firebase/database';
import { db } from '../fb';
import { safePlainText } from '../utils/safeText';

const reserveNumber = async (type, prefix, now) => {
  const year = new Date(now).getFullYear();
  const result = await runTransaction(ref(db, `adminCrm/counters/${type}/${year}`), current => Number(current || 0) + 1);
  if (!result.committed) throw new Error('Não foi possível reservar a numeração do documento.');
  return `${prefix}-${year}-${String(result.snapshot.val()).padStart(6, '0')}`;
};

export const prepareCashDocuments = async ({ company, item, paymentRef, now, subscriptionEnd, operatorId }) => {
  const [invoiceNumber, receiptNumber] = await Promise.all([
    reserveNumber('invoices', 'INT', now),
    reserveNumber('receipts', 'REC', now),
  ]);
  const invoiceRef = push(ref(db, 'adminCrm/invoices'));
  const receiptRef = push(ref(db, 'adminCrm/receipts'));
  const amount = Number(item.price || 0) * Number(item.quantity || 1);
  const description = safePlainText(item.moduleName || item.moduleKey, 240);
  const common = {
    companyId: company.id, companyName: safePlainText(company.nome || company.email || 'Empresa', 150),
    paymentId: paymentRef.key, currency: 'MZN', amount, createdAt: now, createdBy: operatorId || null,
    documentType: 'internal_non_fiscal',
  };
  return {
    invoiceId: invoiceRef.key, invoiceNumber, receiptId: receiptRef.key, receiptNumber,
    updates: {
      [`adminCrm/invoices/${invoiceRef.key}`]: {
        ...common, number: invoiceNumber, status: 'paid', paidAt: now, issuedAt: now, dueAt: now,
        items: [{ description, quantity: Number(item.quantity || 1), unitPrice: Number(item.price || 0) }],
        subtotal: amount, discount: 0, taxRate: 0, tax: 0, total: amount,
      },
      [`adminCrm/receipts/${receiptRef.key}`]: {
        ...common, number: receiptNumber, invoiceId: invoiceRef.key, invoiceNumber,
        status: 'issued', issuedAt: now, paymentMethod: 'cash', receivedAt: now,
        description, subscriptionEnd,
      },
    },
  };
};
