import { useMemo, useState } from 'react';
import { push, ref, set, update } from 'firebase/database';
import { auth, db } from '../../fb';
import { safePlainText } from '../../utils/safeText';
import { AdminCard, EmptyState, InlineAlert, PrimaryButton, SecondaryButton } from '../admin/ui/AdminUI';

const TYPES = { call: 'Chamada', meeting: 'Reunião', email: 'Email', whatsapp: 'WhatsApp', collection: 'Cobrança', follow_up: 'Follow-up' };
const emptyActivity = { companyId: '', type: 'follow_up', title: '', dueAt: '' };
const toDate = value => {
  const date = new Date(Number(value) || value);
  return Number.isNaN(date.getTime()) ? 'Sem data' : new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const CrmActivitiesPanel = ({ companies, activities }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyActivity);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const sorted = useMemo(() => activities.slice().sort((a, b) => Number(a.dueAt || 0) - Number(b.dueAt || 0)), [activities]);

  const saveActivity = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const activityRef = push(ref(db, 'adminCrm/activities'));
      await set(activityRef, {
        companyId: form.companyId,
        type: form.type,
        title: safePlainText(form.title, 180),
        status: 'pending',
        dueAt: new Date(form.dueAt).getTime(),
        ownerId: auth.currentUser?.uid || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setForm(emptyActivity);
      setShowForm(false);
      setFeedback({ type: 'success', message: 'Atividade agendada.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Não foi possível agendar a atividade.' });
    } finally { setSaving(false); }
  };

  const setStatus = async (id, status) => {
    try {
      await update(ref(db, `adminCrm/activities/${id}`), {
        status,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || null,
        ...(status === 'completed' && { completedAt: Date.now() }),
      });
      setFeedback({ type: 'success', message: status === 'completed' ? 'Atividade concluída.' : 'Atividade cancelada.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Não foi possível atualizar a atividade.' });
    }
  };

  return <AdminCard className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-gray-950">Atividades e follow-ups</h2><p className="text-sm text-gray-500">Chamadas, reuniões, cobranças e próximos contactos.</p></div><PrimaryButton type="button" onClick={() => setShowForm(true)}>Agendar atividade</PrimaryButton></div>
    {feedback && <div className="p-4 pb-0"><InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert></div>}
    {sorted.length === 0 ? <EmptyState title="Nenhuma atividade agendada" description="Crie um follow-up para uma empresa da carteira." /> : <div className="divide-y divide-gray-100">{sorted.slice(0, 12).map(activity => {
      const company = companies.find(item => item.id === activity.companyId);
      const overdue = activity.status === 'pending' && Number(activity.dueAt) < Date.now();
      return <article key={activity.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{TYPES[activity.type] || activity.type}</span>{overdue && <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Vencida</span>}{activity.status === 'completed' && <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">Concluída</span>}</div><h3 className="mt-2 truncate font-semibold text-gray-900">{safePlainText(activity.title, 180)}</h3><p className="text-xs text-gray-500">{safePlainText(company?.nome || 'Empresa')} · {toDate(activity.dueAt)}</p></div>{activity.status === 'pending' && <div className="flex gap-2"><SecondaryButton type="button" onClick={() => setStatus(activity.id, 'cancelled')}>Cancelar</SecondaryButton><PrimaryButton type="button" onClick={() => setStatus(activity.id, 'completed')}>Concluir</PrimaryButton></div>}</article>;
    })}</div>}
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={saveActivity} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="activity-title"><h2 id="activity-title" className="text-xl font-bold">Agendar atividade</h2><div className="mt-5 grid gap-4"><label className="text-sm font-semibold">Empresa<select required value={form.companyId} onChange={event => setForm(value => ({ ...value, companyId: event.target.value }))} className="mt-1 w-full border px-3"><option value="">Selecionar empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{safePlainText(company.nome || company.email)}</option>)}</select></label><label className="text-sm font-semibold">Tipo<select value={form.type} onChange={event => setForm(value => ({ ...value, type: event.target.value }))} className="mt-1 w-full border px-3">{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Descrição<input required maxLength="180" value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} className="mt-1 w-full border px-3" /></label><label className="text-sm font-semibold">Data e hora<input required type="datetime-local" value={form.dueAt} onChange={event => setForm(value => ({ ...value, dueAt: event.target.value }))} className="mt-1 w-full border px-3" /></label></div><div className="mt-6 flex justify-end gap-3"><SecondaryButton type="button" disabled={saving} onClick={() => setShowForm(false)}>Fechar</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? 'A guardar...' : 'Agendar'}</PrimaryButton></div></form></div>}
  </AdminCard>;
};

export default CrmActivitiesPanel;
