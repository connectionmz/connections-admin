import { useState } from 'react';
import { telUrl, whatsappUrl } from '../../domain/contacts';
import { ENGAGEMENT } from '../../domain/engagement';
import { fillFollowUpTemplate } from '../../domain/followUps';
import { PrimaryButton, SecondaryButton } from '../admin/ui/AdminUI';

const APP_URL = 'https://app.connectionmozambique.com/auth';
const WHATSAPP_MESSAGES = {
  [ENGAGEMENT.NEVER]: `Olá {{empresa}}, a sua conta na Connection Mozambique está ativa, mas ainda não fez o primeiro acesso. Entre em ${APP_URL} e complete o perfil da empresa para aparecer nas pesquisas, receber cotações e ver concursos. Podemos ajudar?`,
  [ENGAGEMENT.OFFLINE]: `Olá {{empresa}}, notámos que não acede à Connection Mozambique há algum tempo. Foram publicados novos concursos e pedidos de cotação no seu sector. Consulte em ${APP_URL}`,
  [ENGAGEMENT.AT_RISK]: 'Olá {{empresa}}, estamos disponíveis para ajudar a tirar o máximo partido da Connection Mozambique. Quer marcar uma demonstração rápida?',
  [ENGAGEMENT.ACTIVE]: 'Olá {{empresa}}, obrigado por usar a Connection Mozambique. Precisa de ajuda com alguma funcionalidade?',
};

export const whatsappMessage = row => fillFollowUpTemplate(WHATSAPP_MESSAGES[row.status] || WHATSAPP_MESSAGES[ENGAGEMENT.ACTIVE], row);

const base = 'inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300';
const enabled = {
  whatsapp: 'bg-green-700 text-white hover:bg-green-800',
  call: 'bg-violet-700 text-white hover:bg-violet-800',
  email: 'bg-blue-700 text-white hover:bg-blue-800',
  schedule: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
};
const disabled = 'cursor-not-allowed bg-gray-100 text-gray-400';

const EngagementContactActions = ({ row, onWhatsapp, onCall, onEmail, onSchedule }) => {
  const whatsapp = whatsappUrl(row.phoneNumber, whatsappMessage(row));
  const tel = telUrl(row.phoneNumber);
  return <div className="flex flex-wrap gap-1.5">
    {whatsapp
      ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => onWhatsapp(row)} className={`${base} ${enabled.whatsapp}`}>WhatsApp</a>
      : <button type="button" disabled title="Contacto inválido" className={`${base} ${disabled}`}>WhatsApp</button>}
    {tel
      ? <a href={tel} onClick={() => onCall(row)} className={`${base} ${enabled.call}`}>Ligar</a>
      : <button type="button" disabled title="Contacto inválido" className={`${base} ${disabled}`}>Ligar</button>}
    <button type="button" disabled={!row.emailAddress} title={row.emailAddress ? 'Abrir follow-up por email no CRM' : 'Sem email válido'} onClick={() => onEmail(row)} className={`${base} ${row.emailAddress ? enabled.email : disabled}`}>Email</button>
    <button type="button" onClick={() => onSchedule(row)} className={`${base} ${enabled.schedule}`}>Agendar follow-up</button>
  </div>;
};

export const CallResultModal = ({ company, onClose, onSave }) => {
  const [notes, setNotes] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    try { await onSave({ notes, nextAt: nextAt ? new Date(nextAt).getTime() : null }); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
    <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="call-result-title">
      <h2 id="call-result-title" className="text-xl font-bold">Resultado da chamada</h2>
      <p className="mt-1 text-sm text-gray-500">{company.nome || 'Empresa sem nome'} · {company.contacto || company.phoneNumber}</p>
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-semibold">O que ficou combinado?<textarea required autoFocus maxLength="2000" rows="4" value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Ex.: não atendeu; pediu ajuda para recuperar a senha; vai completar o perfil esta semana" /></label>
        <label className="text-sm font-semibold">Agendar próximo contacto (opcional)<input type="datetime-local" value={nextAt} onChange={event => setNextAt(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      </div>
      <div className="mt-6 flex justify-end gap-3"><SecondaryButton type="button" disabled={saving} onClick={onClose}>Fechar sem registar</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Registar chamada'}</PrimaryButton></div>
    </form>
  </div>;
};

export default EngagementContactActions;
