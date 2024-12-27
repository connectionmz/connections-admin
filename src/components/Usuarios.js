import React, { useState, useEffect } from 'react';
import { db } from '../fb'; 
import { ref, get } from 'firebase/database';

const UsuariosOffline = () => {
  const [usuariosOffline, setUsuariosOffline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar os usuários offline
  const fetchUsuariosOffline = async () => {
    try {
      const usuariosRef = ref(db, 'company');
      const snapshot = await get(usuariosRef);

      if (snapshot.exists()) {
        const usuarios = snapshot.val();
        const agora = new Date();
        const seteDiasAtras = new Date(agora.setDate(agora.getDate() - 7));

        const offlineUsers = Object.keys(usuarios)
          .filter(userId => {
            const lastLogin = new Date(usuarios[userId].lastLogin);
            return lastLogin < seteDiasAtras;
          })
          .map(userId => ({
            id: userId,
            ...usuarios[userId],
          }));

        setUsuariosOffline(offlineUsers);
      } else {
        console.log('Não há usuários registrados');
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para simular o envio de email
  const sendEmailNotification = (user) => {
    console.log(`Enviando email para: ${user.nome} - ${user.contacto}`);
    alert(`Notificação por email enviada para ${user.nome}`);
  };

  // Função para simular o envio de SMS
  const sendSMSNotification = (user) => {
    console.log(`Enviando SMS para: ${user.nome} - ${user.contacto}`);
    alert(`Notificação por SMS enviada para ${user.nome}`);
  };

  // Função para simular uma chamada telefônica
  const makeCall = (user) => {
    console.log(`Ligando para: ${user.contacto}`);
    alert(`Chamada realizada para ${user.nome}`);
  };

  useEffect(() => {
    fetchUsuariosOffline();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner-border animate-spin border-4 border-t-4 border-blue-500 w-16 h-16 rounded-full"></div>
        <p className="text-xl ml-4">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Empresas Offline (Último login há mais de 7 dias)</h2>
      {usuariosOffline.length > 0 ? (
        <ul className="space-y-4">
          {usuariosOffline.map(user => (
            <li key={user.id} className="p-4 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200">
              <p className="font-medium text-lg text-gray-800">Nome: {user.nome}</p>
              <p className="text-gray-600">Último login: {new Date(user.lastLogin).toLocaleDateString()}</p>
              <p className="text-gray-500">Endereço: {user.endereco}</p>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => sendEmailNotification(user)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
                >
                  Enviar E-mail
                </button>
                <button
                  onClick={() => sendSMSNotification(user)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                >
                  Enviar SMS
                </button>
                <button
                  onClick={() => makeCall(user)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700"
                >
                  Efetuar Chamada
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Nenhuma empresa offline encontrada.</p>
      )}
    </div>
  );
};

export default UsuariosOffline;
