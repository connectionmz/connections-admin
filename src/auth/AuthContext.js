import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../fb';
import { normalizeRoles } from './permissions';

const AuthContext = createContext(null);

const formatAdminUser = (firebaseUser, profile) => ({
  id: firebaseUser.uid,
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName || profile.name || '',
  roles: normalizeRoles(profile),
  mustChangePassword: profile.mustChangePassword === true,
  blocked: profile.blocked === true,
});

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let unsubscribeProfile;

    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (!firebaseUser) {
        sessionStorage.removeItem('user');
        setState({ user: null, loading: false, error: null });
        return;
      }

      setState(previous => ({ ...previous, loading: true, error: null }));
      unsubscribeProfile = onValue(
        ref(db, `utilizadores/${firebaseUser.uid}`),
        snapshot => {
          if (!snapshot.exists()) {
            setState({ user: null, loading: false, error: new Error('Perfil administrativo não encontrado.') });
            signOut(auth).catch(() => undefined);
            return;
          }

          const user = formatAdminUser(firebaseUser, snapshot.val());
          sessionStorage.setItem('user', JSON.stringify(user));
          setState({ user, loading: false, error: null });
        },
        error => {
          console.error('Erro ao acompanhar o perfil administrativo:', error);
          setState({ user: null, loading: false, error });
          signOut(auth).catch(() => undefined);
        }
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(() => ({
    ...state,
    logout: async () => {
      await signOut(auth);
      sessionStorage.removeItem('user');
    },
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
};
