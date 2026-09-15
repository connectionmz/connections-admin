import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { ref, remove, set } from 'firebase/database';
import app, { auth, db } from '../fb';

const generateTemporaryPassword = () => {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => (byte % 36).toString(36)).join('') + 'Aa1!';
};

export const provisionUserAccount = async (email, profile) => {
  const secondaryApp = initializeApp(app.options, `admin-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      generateTemporaryPassword()
    );
    createdUser = credential.user;

    await set(ref(db, `utilizadores/${createdUser.uid}`), {
      ...profile,
      uid: createdUser.uid,
      email: createdUser.email || email,
    });

    await sendPasswordResetEmail(auth, email);
    return credential;
  } catch (error) {
    if (createdUser) {
      await remove(ref(db, `utilizadores/${createdUser.uid}`)).catch(() => undefined);
      await deleteUser(createdUser).catch(() => undefined);
    }
    throw error;
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp);
  }
};
