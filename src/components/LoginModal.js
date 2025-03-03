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

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
  
    const auth = getAuth();
    setLoading(true);
    setError(null);
  
    try {
      // Autenticar o utilizador
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;
  
      // Obter o role do utilizador no Realtime Database
      const snapshot = await get(ref(db, `utilizadores/${user.uid}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userRole = data.role;
  
        // Criar um objeto com os dados do utilizador
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          role: userRole
        };
  
        // Armazenar os dados do utilizador no sessionStorage
        sessionStorage.setItem('user', JSON.stringify(userData));
  
        navigate('/'); // Página padrão para outros roles
      } else {
        setError('Role do utilizador não encontrado.');
        console.error('Role não encontrado no banco de dados.');
      }
    } catch (err) {
      setError('Email ou senha incorretos.');
      console.error('Erro ao fazer login:', err);
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
        <div className="mb-4">
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
