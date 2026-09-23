import axios from 'axios';
import { auth } from '../fb';

const ENDPOINT = 'https://mohvi-sendmail.vercel.app/send-email';

export const sendAuthenticatedEmail = async ({ to, subject, text }) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Sessão expirada. Entre novamente.');
  const token = await currentUser.getIdToken();
  try {
    const response = await axios.post(ENDPOINT, { to, subject, text }, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.error || error.response?.data?.message;
    throw new Error(detail ? `Servidor de email: ${detail}` : error.message);
  }
};

export const sendEmailBatch = async ({ recipients, subject, text }) => {
  const results = [];
  for (let index = 0; index < recipients.length; index += 5) {
    const batch = recipients.slice(index, index + 5);
    const settled = await Promise.allSettled(batch.map(recipient => sendAuthenticatedEmail({ to: recipient.email, subject, text })));
    settled.forEach((result, offset) => results.push({ recipient: batch[offset], ok: result.status === 'fulfilled', error: result.status === 'rejected' ? result.reason?.message : null }));
  }
  return results;
};
