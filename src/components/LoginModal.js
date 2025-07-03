import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { db } from '../fb';

const LoginModal = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }

    const auth = getAuth();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      // 2. Get additional user data from Database
      const userSnapshot = await get(ref(db, `utilizadores/${user.uid}`));
      
      if (!userSnapshot.exists()) {
        setError('Usuário não encontrado no sistema.');
        await auth.signOut();
        return;
      }

      const userData = userSnapshot.val();

      // 3. Check if user is blocked
      if (userData.blocked === true) {
        setError('Este usuário está bloqueado.');
        await auth.signOut();
        return;
      }

      // 4. Prepare user data for session storage
      const userToStore = {
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName || userData.name || '',
        roles: Array.isArray(userData.roles) ? userData.roles : 
              (userData.role ? [userData.role] : []),
        mustChangePassword: userData.mustChangePassword === true,
        blocked: userData.blocked === true,
        dateCreated: userData.date || new Date().toISOString()
      };

      // 5. Store user data in session
      sessionStorage.setItem('user', JSON.stringify(userToStore));
      navigate('/');
      // 6. Redirect based on user role
      {/*
              if (userToStore.mustChangePassword) {
        navigate('/change-password');
      } else if (userToStore.roles.includes('admin')) {
        navigate('/admin');
      } else if (userToStore.roles.includes('gestor de empresas')) {
        navigate('/gestor');
      } else {
        navigate('/dashboard');
      }*/}
      
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.code === 'auth/invalid-credential' 
        ? 'Email ou senha incorretos.' 
        : 'Ocorreu um erro durante o login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        {error && (
          <p className="text-red-500 text-center mb-4">
            {error}
          </p>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`border p-2 rounded-lg w-full ${
              error && !email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`border p-2 rounded-lg w-full ${
              error && !password ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`bg-blue-500 text-white p-2 rounded-lg w-full ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
};

export default LoginModal;