import { useEffect, useMemo, useState } from 'react';
import { push, ref, set, update } from 'firebase/database';
import { auth, db } from '../../fb';
import { companyEmail } from '../../domain/contacts';
import { ENGAGEMENT } from '../../domain/engagement';
import { selectFollowUpRecipients } from '../../domain/followUps';
import { sendEmailBatch } from '../../services/emailNotifications';
import { safeMultilineText, safePlainText } from '../../utils/safeText';
import { effectiveInvoiceStatus } from '../../domain/billing';
import { AdminCard, EmptyState, InlineAlert, PrimaryButton } from '../admin/ui/AdminUI';

// Com REACT_APP_EMAIL_QUEUE=true o envio passa para a Cloud Function (com link de cancelamento).
// Sem a variável, mantém-se o envio direto pelo browser até as Functions estarem publicadas.
const EMAIL_QUEUE = process.env.REACT_APP_EMAIL_QUEUE === 'true';
const initialForm ={ audience: '', companyIds: [], sectors: [], provinces: [], subject: '', message: '' };
const selected = event => [...event.target.selectedOptions].map(option => option.value);
const normalize = value => String(value || '').trim().toLowerCase();

const SIGNATURE = 'Atenciosamente,\nEquipa Connection Mozambique';
const PRESETS = {
  renewals: { subject: 'Renovação próxima dos seus serviços', message: 'Olá,\n\nA sua subscrição aproxima-se da data de renovação. Estamos disponíveis para ajudar a garantir a continuidade dos serviços.\n\nAtenciosamente,\nConnection Mozambique' },
  overdue: { subject: 'Pagamento pendente', message: 'Olá,\n\nIdentificámos um documento de cobrança vencido associado à sua empresa. Entre em contacto connosco caso necessite de apoio ou esclarecimentos.\n\nAtenciosamente,\nConnection Mozambique' },
  prospects: { subject: 'Soluções para a sua empresa', message: 'Olá,\n\nGostaríamos de apresentar as soluções da Connection Mozambique que podem apoiar o crescimento e a visibilidade da sua empresa.\n\nAtenciosamente,\nConnection Mozambique' },
  [ENGAGEMENT.NEVER]: { subject: 'Comece a usar a Connection Mozambique', message: `Olá {{empresa}},\n\nA sua conta está ativa, mas ainda não fez o primeiro acesso. Entre em https://app.connectionmozambique.com/auth e complete o perfil da empresa para aparecer nas pesquisas, receber cotações e ver concursos.\n\nPrecisa de ajuda? Responda a este email ou fale connosco pelo WhatsApp.\n\n${SIGNATURE}` },
  [ENGAGEMENT.OFFLINE]: { subject: 'Novidades à sua espera na Connection Mozambique', message: `Olá {{empresa}},\n\nNotámos que não acede à plataforma há algum tempo. Desde então foram publicados novos concursos e pedidos de cotação no seu sector. Entre em https://app.connectionmozambique.com/auth para os consultar.\n\n${SIGNATURE}` },
  [ENGAGEMENT.AT_RISK]: { subject: 'Precisa de ajuda com a plataforma?', message: `Olá {{empresa}},\n\nEstamos disponíveis para ajudar a tirar o máximo partido da Connection Mozambique. Responda a este email e marcamos uma demonstração rápida.\n\n${SIGNATURE}` },
};
const QUICK_AUDIENCES = [
  ['renewals', 'Renovações'], ['overdue', 'Pagamentos vencidos'], ['prospects', 'Prospectos'],
  [ENGAGEMENT.OFFLINE, 'Offline +7 dias'], [ENGAGEMENT.AT_RISK, 'Em risco'], [ENGAGEMENT.NEVER, 'Nunca acederam'],
];

const CrmBulkFollowUp = ({ companies, renewals = [], invoices = [], engagement = [], optOut = {}, initialAudience = '', initialCompanyIds = [], onInitialApplied }) => {
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
  const segment = useMemo(() => selectFollowUpRecipients(companies, form), [companies, form]);
  const recipients = useMemo(() => segment.filter(recipient => !optOut[recipient.id]), [segment, optOut]);
  const optedOut = segment.length - recipients.length;
  const withoutEmail = useMemo(() => {
    const ids = new Set(form.companyIds);
    return companies.filter(company => ids.has(company.id) && !companyEmail(company)).length;
  }, [companies, form.companyIds]);
  const audiences = useMemo(() => {
    const byStatus = status => engagement.filter(item => item.status === status).map(item => item.id);
    return {
      renewals: [...new Set(renewals.map(item => item.company.id))],
      overdue: [...new Set(invoices.filter(invoice => effectiveInvoiceStatus(invoice) === 'overdue').map(invoice => invoice.companyId))],
      prospects: companies.filter(company => company.relationshipStatus === 'prospect').map(company => company.id),
      [ENGAGEMENT.OFFLINE]: byStatus(ENGAGEMENT.OFFLINE),
      [ENGAGEMENT.AT_RISK]: byStatus(ENGAGEMENT.AT_RISK),
      [ENGAGEMENT.NEVER]: byStatus(ENGAGEMENT.NEVER),
    };
  }, [companies, engagement, invoices, renewals]);

  const applyPreset = type => {
    setForm({ ...initialForm, audience: type, companyIds: audiences[type], ...PRESETS[type] });
    setFeedback(audiences[type].length ? null : { type: 'info', message: 'Não existem empresas neste público neste momento.' });
  };

  useEffect(() => {
    // Deep-link vindo do ecrã "Empresas offline": empresas escolhidas e/ou público.
    const audience = PRESETS[initialAudience] ? initialAudience : '';
    if (initialCompanyIds.length) setForm({ ...initialForm, ...(PRESETS[audience] || {}), audience, companyIds: initialCompanyIds });
    else if (audience) applyPreset(audience);
    onInitialApplied?.();
    // Aplica o deep-link só ao abrir o separador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeProvinces = event => {
    const next = selected(event);
    const valid = new Set(companies.filter(item => next.length === 0 || next.some(value => normalize(value) === normalize(item.provincia || item.province))).map(item => normalize(item.sector)));
    setForm(value => ({ ...value, audience: '', provinces: next, sectors: value.sectors.filter(sector => valid.has(normalize(sector))), companyIds: [] }));
  };
  const changeSectors = event => {
    const next = selected(event);
    const valid = new Set(companies.filter(item => next.length === 0 || next.some(value => normalize(value) === normalize(item.sector))).map(item => normalize(item.provincia || item.province)));
    setForm(value => ({ ...value, audience: '', sectors: next, provinces: value.provinces.filter(province => valid.has(normalize(province))), companyIds: [] }));
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
      const message = safeMultilineText(form.message, 5000);
      const campaign = {
        subject, message, channel: 'email', audience: form.audience || null,
        filters: { companyIds: form.companyIds, sectors: form.sectors, provinces: form.provinces },
        recipientCount: recipients.length, createdAt, createdBy: auth.currentUser?.uid || null,
      };
      if (EMAIL_QUEUE) {
        // A Cloud Function processFollowUpQueue envia, acrescenta o link de cancelamento e grava as entregas.
        await set(campaignRef, {
          ...campaign,
          status: 'queued',
          recipients: Object.fromEntries(recipients.map(recipient => [recipient.id, { email: recipient.email, nome: safePlainText(recipient.nome, 150) }])),
        });
        setFeedback({ type: 'success', message: `Campanha em fila para ${recipients.length} destinatário(s). As entregas aparecem no CRM à medida que são enviadas.` });
        setForm(initialForm);
        return;
      }
      await set(campaignRef, { ...campaign, status: 'sending' });
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
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:col-span-3"><p className="text-sm font-bold text-gray-900">Públicos rápidos</p><p className="mt-1 text-xs text-gray-500">Carrega o público e uma mensagem editável. Confirme sempre os destinatários antes de enviar.</p><div className="mt-3 flex flex-wrap gap-2">{QUICK_AUDIENCES.map(([type, label]) => <button key={type} type="button" onClick={() => applyPreset(type)} aria-pressed={form.audience === type} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.audience === type ? 'border-blue-700 bg-blue-50 text-blue-800' : 'bg-white'}`}>{label} ({audiences[type].length})</button>)}</div></div>
      <label className="text-sm font-semibold">1. Províncias<span className="mt-1 block text-xs font-normal text-gray-500">Use Ctrl/Cmd para selecionar várias.</span><select multiple value={form.provinces} onChange={changeProvinces} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{provinces.map(value => <option key={value}>{safePlainText(value)}</option>)}</select></label>
      <label className="text-sm font-semibold">2. Sectores<span className="mt-1 block text-xs font-normal text-gray-500">{sectors.length} disponível(is) para as províncias.</span><select multiple value={form.sectors} onChange={changeSectors} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{sectors.map(value => <option key={value}>{safePlainText(value)}</option>)}</select></label>
      <label className="text-sm font-semibold">3. Empresas específicas<span className="mt-1 block text-xs font-normal text-gray-500">{filteredCompanies.length} dentro do segmento. Se escolher empresas, o envio fica limitado a elas.</span><select multiple value={form.companyIds} onChange={event => setForm(value => ({ ...value, companyIds: selected(event) }))} className="mt-2 h-40 w-full rounded-lg border border-gray-300 p-2">{filteredCompanies.map(company => <option key={company.id} value={company.id}>{safePlainText(company.nome || company.email || 'Empresa')}</option>)}</select></label>
      <label className="text-sm font-semibold lg:col-span-3">Assunto<input required maxLength="140" value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm font-semibold lg:col-span-3">Mensagem<span className="mt-1 block text-xs font-normal text-gray-500">Use {'{{empresa}}'} para inserir o nome de cada empresa.</span><textarea required maxLength="5000" rows="9" value={form.message} onChange={event => setForm(value => ({ ...value, message: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      {recipients.length > 0 && <div className="rounded-xl border border-gray-200 lg:col-span-3"><p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-900">Destinatários ({recipients.length})</p><ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">{recipients.map(recipient => <li key={recipient.email} className="flex flex-col px-4 py-2 text-sm sm:flex-row sm:justify-between sm:gap-4"><span className="font-semibold text-gray-900">{safePlainText(recipient.nome || 'Empresa sem nome', 150)}</span><span className="text-gray-600">{recipient.email}</span></li>)}</ul></div>}
      {optedOut > 0 && <div className="lg:col-span-3"><InlineAlert type="info">{optedOut} empresa(s) cancelaram a subscrição de emails e foram retiradas da lista.</InlineAlert></div>}
      {withoutEmail > 0 &&<div className="lg:col-span-3"><InlineAlert type="warning">{withoutEmail} empresa(s) escolhida(s) não têm email válido e não vão receber a mensagem.</InlineAlert></div>}
      <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600"><strong>{recipients.length}</strong> destinatário(s) únicos com email válido.</p><PrimaryButton type="submit" disabled={sending || recipients.length === 0}>{sending ? 'A enviar...' : 'Enviar follow-up'}</PrimaryButton></div>
      {companies.length === 0 && <div className="lg:col-span-3"><EmptyState title="Sem empresas" description="Não existem empresas disponíveis para segmentação." /></div>}
    </form>
  </AdminCard>;
};

export default CrmBulkFollowUp;
