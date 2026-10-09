import { push, ref, update } from 'firebase/database';
import { auth, db } from '../fb';
import { safePlainText } from '../utils/safeText';

const buildActivity = ({ companyId, type, title, dueAt, status = 'pending', notes, source, engagementStatus }, now) => ({
  companyId,
  type,
  title: safePlainText(title, 180),
  status,
  dueAt: Number.isFinite(dueAt) ? dueAt : now,
  ownerId: auth.currentUser?.uid || null,
  createdAt: now,
  updatedAt: now,
  ...(status === 'completed' && { completedAt: now }),
  ...(notes && { notes: safePlainText(notes, 2000) }),
  ...(source && { source }),
  ...(engagementStatus && { engagementStatus }),
});

// Cria várias atividades em adminCrm/activities numa única escrita atómica; devolve as chaves.
export const createActivities = async activities => {
  const now = Date.now();
  const updates = {};
  const keys = activities.map(activity => {
    const key = push(ref(db, 'adminCrm/activities')).key;
    updates[`adminCrm/activities/${key}`] = buildActivity(activity, now);
    return key;
  });
  if (keys.length) await update(ref(db), updates);
  return keys;
};

export const createActivity = async activity => (await createActivities([activity]))[0];
