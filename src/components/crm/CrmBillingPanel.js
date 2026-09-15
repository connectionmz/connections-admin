import { useMemo, useState } from 'react';
import { push, ref, runTransaction, set, update } from 'firebase/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { auth, db } from '../../fb';
import { calculateInvoiceTotals, canAttachPayment, effectiveInvoiceStatus, INVOICE_STATUS_LABEL } from '../../domain/billing';
import { isCollectedRevenuePayment } from '../../domain/crm';
import { safeFileSegment, safePlainText } from '../../utils/safeText';
import { AdminCard, EmptyState, InlineAlert, PrimaryButton, SecondaryButton } from '../admin/ui/AdminUI';

const emptyForm = { companyId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0, discount: 0, dueAt: '' };
const money = value => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(Number(value || 0));

const CrmBillingPanel = ({ companies, payments, invoices }) => {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const items = useMemo(() => [{ description: safePlainText(form.description, 240), quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }], [form]);
  const totals = useMemo(() => calculateInvoiceTotals(items, form.taxRate, form.discount), [items, form.taxRate, form.discount]);
  const visible = useMemo(() => invoices.map(invoice => ({ ...invoice, effectiveStatus: effectiveInvoiceStatus(invoice) })).filter(invoice => status === 'all' || invoice.effectiveStatus === status).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)), [invoices, status]);

  const createInvoice = async event => {
    event.preventDefault(); setSaving(true);
    try {
      const year = new Date().getFullYear();
      const counter = await runTransaction(ref(db, `adminCrm/counters/invoices/${year}`), current => Number(current || 0) + 1);
      if (!counter.committed) throw new Error('Não foi possível reservar a numeração.');
      const sequence = Number(counter.snapshot.val());
      const invoiceRef = push(ref(db, 'adminCrm/invoices'));
      await set(invoiceRef, {
        number: `INT-${year}-${String(sequence).padStart(6, '0')}`, documentType: 'internal_non_fiscal',
        companyId: form.companyId, currency: 'MZN', items, ...totals,
        taxRate: Number(form.taxRate), dueAt: new Date(`${form.dueAt}T23:59:59`).getTime(),
        status: 'draft', createdAt: Date.now(), createdBy: auth.currentUser?.uid || null,
      });
      setForm(emptyForm); setShowForm(false); setFeedback({ type: 'success', message: 'Documento interno criado como rascunho.' });
    } catch (error) { setFeedback({ type: 'error', message: error.message || 'Não foi possível criar o documento.' }); } finally { setSaving(false); }
  };

  const changeStatus = async (invoice, nextStatus, paymentId = null) => {
    const values = { status: nextStatus, updatedAt: Date.now(), updatedBy: auth.currentUser?.uid || null };
    if (nextStatus === 'issued') values.issuedAt = Date.now();
    if (nextStatus === 'cancelled') values.cancelledAt = Date.now();
    if (nextStatus === 'paid') Object.assign(values, { paidAt: Date.now(), paymentId });
    try { await update(ref(db, `adminCrm/invoices/${invoice.id}`), values); setFeedback({ type: 'success', message: 'Estado atualizado.' }); }
    catch { setFeedback({ type: 'error', message: 'Não foi possível atualizar o documento.' }); }
  };

  const usedPaymentIds = new Set(invoices.map(invoice => invoice.paymentId).filter(Boolean));
  const realPayments = invoice => payments.filter(payment => !usedPaymentIds.has(payment.id) && isCollectedRevenuePayment(payment) && canAttachPayment(invoice, payment));
  const download = invoice => {
    const company = companies.find(item => item.id === invoice.companyId);
    const pdf = new jsPDF();
    pdf.setFontSize(17); pdf.text('Documento interno de cobrança', 14, 18);
    pdf.setFontSize(9); pdf.text('Não constitui fatura fiscal nem documento fiscal certificado.', 14, 25);
    pdf.setFontSize(11); pdf.text(`Número: ${invoice.number}`, 14, 36); pdf.text(`Empresa: ${safePlainText(company?.nome || company?.email || 'Empresa')}`, 14, 43);
    autoTable(pdf, { startY: 51, head: [['Descrição', 'Qtd.', 'Preço', 'Total']], body: (invoice.items || []).map(item => [safePlainText(item.description), item.quantity, money(item.unitPrice), money(Number(item.quantity) * Number(item.unitPrice))]) });
    pdf.text(`Total: ${money(invoice.total)}`, 14, pdf.lastAutoTable.finalY + 10);
    pdf.save(`${safeFileSegment(invoice.number)}.pdf`);
  };

  return <div className="space-y-5">
    {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Faturação operacional interna.</strong> Estes documentos apoiam cobrança e reconciliação, mas não substituem uma fatura fiscal certificada.</div>
    <AdminCard className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Documentos de cobrança</h2><p className="text-sm text-gray-500">Emissão, vencimentos e associação a pagamentos reais.</p></div><div className="flex gap-2"><select aria-label="Filtrar estado" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border px-3"><option value="all">Todos os estados</option>{Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><PrimaryButton onClick={() => setShowForm(true)}>Novo documento</PrimaryButton></div></div>
      {visible.length === 0 ? <EmptyState title="Sem documentos" description="Crie o primeiro documento interno de cobrança." /> : <div className="divide-y">{visible.map(invoice => {
        const company = companies.find(item => item.id === invoice.companyId);
        const eligible = realPayments(invoice);
        return <article key={invoice.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{invoice.number}</h3><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold">{INVOICE_STATUS_LABEL[invoice.effectiveStatus]}</span></div><p className="mt-1 text-sm text-gray-600">{safePlainText(company?.nome || company?.email || 'Empresa')} · vence {new Date(invoice.dueAt).toLocaleDateString('pt-MZ')}</p><p className="mt-2 text-lg font-bold">{money(invoice.total)}</p></div><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => download(invoice)}>PDF interno</SecondaryButton>{invoice.status === 'draft' && <PrimaryButton onClick={() => changeStatus(invoice, 'issued')}>Emitir</PrimaryButton>}{['issued', 'overdue'].includes(invoice.effectiveStatus) && <><select aria-label={`Pagamento de ${invoice.number}`} defaultValue="" onChange={event => event.target.value && changeStatus(invoice, 'paid', event.target.value)} className="rounded-lg border px-2 text-sm"><option value="">Associar pagamento real</option>{eligible.map(payment => <option key={payment.id} value={payment.id}>{payment.reference || payment.id} · {money(payment.amount || payment.valor)}</option>)}</select><SecondaryButton onClick={() => changeStatus(invoice, 'cancelled')}>Cancelar</SecondaryButton></>}</div></article>;
      })}</div>}
    </AdminCard>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={createInvoice} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true"><h2 className="text-xl font-bold">Novo documento interno</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2">Empresa<select required value={form.companyId} onChange={event => setForm(value => ({ ...value, companyId: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"><option value="">Selecionar empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{company.nome || company.email}</option>)}</select></label><label className="sm:col-span-2">Descrição<input required maxLength="240" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Quantidade<input required min="1" type="number" value={form.quantity} onChange={event => setForm(value => ({ ...value, quantity: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Preço unitário (MZN)<input required min="0.01" step="0.01" type="number" value={form.unitPrice} onChange={event => setForm(value => ({ ...value, unitPrice: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Imposto (%)<input min="0" step="0.01" type="number" value={form.taxRate} onChange={event => setForm(value => ({ ...value, taxRate: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Desconto (MZN)<input min="0" step="0.01" type="number" value={form.discount} onChange={event => setForm(value => ({ ...value, discount: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>Vencimento<input required type="date" value={form.dueAt} onChange={event => setForm(value => ({ ...value, dueAt: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Total previsto</p><p className="text-xl font-bold">{money(totals.total)}</p></div></div><div className="mt-6 flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setShowForm(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Criar rascunho'}</PrimaryButton></div></form></div>}
  </div>;
};

export default CrmBillingPanel;
