import { useMemo, useState } from 'react';
import { push, ref, set, update } from 'firebase/database';
import { auth, db } from '../../fb';
import { selectFollowUpRecipients } from '../../domain/followUps';
import { sendEmailBatch } from '../../services/emailNotifications';
import { safePlainText } from '../../utils/safeText';
import { AdminCard, EmptyState, InlineAlert, PrimaryButton } from '../admin/ui/AdminUI';

const initialForm = { companyIds: [], sectors: [], provinces: [], subject: '', message: '' };
const selected = event => [...event.target.selectedOptions].map(option => option.value);
const normalize = value => String(value || '').trim().toLowerCase();

const CrmBulkFollowUp = ({ companies }) => {
  const [form, setForm] = useState(initialForm);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const sectors = useMemo(() => [...new Set(companies.filter(item => form.provinces.length === 0 || form.provinces.some(value => normalize(value) === normalize(item.provincia || item.province))).map(item => item.sector).filter(Boolean))].sort(), [companies, form.provinces]);
  const provinces = useMemo(() => [...new Set(companies.filter(item => form.sectors.length === 0 || form.sectors.some(value => normalize(value) === normalize(item.sector))).map(item => item.provincia || item.province).filter(Boolean))].sort(), [companies, form.sectors]);
  const filteredCompanies = useMemo(() => companies.filter(item => {
    const matchesSector = form.sectors.length === 0 || form.sectors.some(value => normalize(value) === normalize(item.sector));
    const matchesProvince = form.provinces.length === 0 || form.provinces.some(value => normalize(value) === normalize(item.provincia || item.province));
    return matchesSector && matchesProvince;
  }), [companies, form.sectors, form.provinces]);
  const recipients = useMemo(() => selectFollowUpRecipients(companies, form), [companies, form]);

  const changeProvinces = event => {
    const next = selected(event);
    const valid = new Set(companies.filter(item => next.length === 0 || next.some(value => normalize(value) === normalize(item.provincia || item.province))).map(item => normalize(item.sector)));
    setForm(value => ({ ...value, provinces: next, sectors: value.sectors.filter(sector => valid.has(normalize(sector))), companyIds: [] }));
  };
  const changeSectors = event => {
    const next = selected(event);
    const valid = new Set(companies.filter(item => next.length === 0 || next.some(value => normalize(value) === normalize(item.sector))).map(item => normalize(item.provincia || item.province)));
    setForm(value => ({ ...value, sectors: next, provinces: value.provinces.filter(province => valid.has(normalize(province))), companyIds: [] }));
  };

  const send = async event => {
    event.preventDefault();
    if (recipients.length === 0) return setFeedback({ type: 'error', message: 'Selecione um público que tenha pelo menos um email válido.' });
    setSending(true);
    setFeedback(null);
    const campaignRef = push(ref(db, 'adminCrm/followUps'));
    const createdAt = Date.now();
    try {
      const subject = safePlainText(form.subject, 140);
      const message = safePlainText(form.message, 5000);
      await set(campaignRef, {
        subject, message, status: 'sending', channel: 'email',
        filters: { companyIds: form.companyIds, sectors: form.sectors, provinces: form.provinces },
        recipientCount: recipients.length, createdAt, createdBy: auth.currentUser?.uid || null,
      });
      const results = await sendEmailBatch({ recipients, subject, text: message });
      const updates = {};
      results.forEach(({ recipient, ok, error }) => {
        updates[`adminCrm/followUps/${campaignRef.key}/deliveries/${recipient.id}`] = {
          email: recipient.email, status: ok ? 'delivered' : 'failed', error: safePlainText(error, 250) || null, attemptedAt: Date.now(),
        };
      });
      const delivered = results.filter(result => result.ok).length;
      const failed = results.length - delivered;
      updates[`adminCrm/followUps/${campaignRef.key}/status`] = failed === 0 ? 'completed' : delivered > 0 ? 'partial' : 'failed';
      updates[`adminCrm/followUps/${campaignRef.key}/deliveredCount`] = delivered;
      updates[`adminCrm/followUps/${campaignRef.key}/failedCount`] = failed;
      updates[`adminCrm/followUps/${campaignRef.key}/completedAt`] = Date.now();
      await update(ref(db), updates);
      setFeedback({ type: failed ? 'warning' : 'success', message: `${delivered} email(s) entregue(s); ${failed} falharam.` });
      if (!failed) setForm(initialForm);
    } catch (error) {
      await update(campaignRef, { status: 'failed', failedAt: Date.now(), error: safePlainText(error.message, 250) }).catch(() => {});
      setFeedback({ type: 'error', message: error.message || 'Não foi possível concluir o envio.' });
    } finally { setSending(false); }
  };

  return <AdminCard className="overflow-hidden">
    <div className="border-b border-gray-200 p-5"><h2 className="text-lg font-bold text-gray-950">Follow-up por email</h2><p className="text-sm text-gray-500">Defina o segmento. Província e sector filtram-se mutuamente e limitam as empresas disponíveis.</p></div>
    <form onSubmit={send} className="grid gap-5 p-5 lg:grid-cols-3">
      {feedback && <div className="lg:col-span-3"><InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert></div>}
      <label className="text-sm font-semibold">1. Províncias<span className="mt-1 block text-xs font-normal text-gray-500">Use Ctrl/Cmd para selecionar várias.</span><select multiple value={form.provinces} onChange={changeProvinces} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{provinces.map(value => <option key={value}>{safePlainText(value)}</option>)}</select></label>
      <label className="text-sm font-semibold">2. Sectores<span className="mt-1 block text-xs font-normal text-gray-500">{sectors.length} disponível(is) para as províncias.</span><select multiple value={form.sectors} onChange={changeSectors} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{sectors.map(value => <option key={value}>{safePlainText(value)}</option>)}</select></label>
      <label className="text-sm font-semibold">3. Empresas específicas<span className="mt-1 block text-xs font-normal text-gray-500">{filteredCompanies.length} dentro do segmento.</span><select multiple value={form.companyIds} onChange={event => setForm(value => ({ ...value, companyIds: selected(event) }))} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{filteredCompanies.map(company => <option key={company.id} value={company.id}>{safePlainText(company.nome || company.email || 'Empresa')}</option>)}</select></label>
      <label className="text-sm font-semibold lg:col-span-3">Assunto<input required maxLength="140" value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm font-semibold lg:col-span-3">Mensagem<textarea required maxLength="5000" rows="7" value={form.message} onChange={event => setForm(value => ({ ...value, message: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600"><strong>{recipients.length}</strong> destinatário(s) únicos com email válido.</p><PrimaryButton type="submit" disabled={sending || recipients.length === 0}>{sending ? 'A enviar...' : 'Enviar follow-up'}</PrimaryButton></div>
      {companies.length === 0 && <div className="lg:col-span-3"><EmptyState title="Sem empresas" description="Não existem empresas disponíveis para segmentação." /></div>}
    </form>
  </AdminCard>;
};

export default CrmBulkFollowUp;
