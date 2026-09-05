import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../fb';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmation) {
      setMessage({ type: 'error', text: 'A confirmação não corresponde à nova senha.' });
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      setMessage({ type: 'error', text: 'Não foi possível identificar a conta autenticada.' });
      return;
    }

    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await update(ref(db, `utilizadores/${user.uid}`), {
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: 'Senha alterada com sucesso.' });
      setTimeout(() => navigate('/'), 800);
    } catch (error) {
      const invalidPassword = ['auth/invalid-credential', 'auth/wrong-password'].includes(error.code);
      setMessage({
        type: 'error',
        text: invalidPassword ? 'A senha atual está incorreta.' : 'Não foi possível alterar a senha. Tente novamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Alterar senha</h1>
      <p className="mt-2 text-sm text-gray-600">Use uma senha exclusiva com pelo menos oito caracteres.</p>

      {message && (
        <div className={`mt-5 rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Senha atual
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Nova senha
          <input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" minLength={8} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Confirmar nova senha
          <input type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" minLength={8} required />
        </label>
        <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'A alterar...' : 'Alterar senha'}
        </button>
      </form>
    </section>
  );
}
