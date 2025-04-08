import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';

const Publicacoes = () => {
  const [publicacoes, setPublicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPub, setSelectedPub] = useState(null);
  const [emailMessage, setEmailMessage] = useState('');
  const database = getDatabase();

  useEffect(() => {
    const publicacoesRef = ref(database, 'posts');
    onValue(publicacoesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const publicacoesArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setPublicacoes(publicacoesArray);
      } else {
        setPublicacoes([]);
      }
      setLoading(false);
    });
  }, [database]);

  const handleStatusChange = async (id, status) => {
    const postRef = ref(database, `posts/${id}`);
    try {
      await update(postRef, { status });
    } catch (error) {
      console.error('Erro ao atualizar a publicação:', error);
    }
  };

  const handleRemoveClick = (pub) => {
    setSelectedPub(pub);
    setShowModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedPub) return;
    
    try {
      // 1. Primeiro bloqueia a publicação
      await handleStatusChange(selectedPub.id, 'bloqueado');
      
      // 2. Envia o email (função simulada)
      await sendMailToClient(
        selectedPub.company?.email, 
        'Publicação removida', 
        emailMessage
      );
      
      // 3. Fecha o modal e limpa os estados
      setShowModal(false);
      setSelectedPub(null);
      setEmailMessage('');
      
    } catch (error) {
      console.error('Erro ao processar remoção:', error);
    }
  };

  // Função simulada para enviar email
  const sendMailToClient = async (to, subject, message) => {
    console.log(`Enviando email para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Mensagem: ${message}`);
    
    // Aqui você implementaria a chamada real para seu backend/API de email
    // Por exemplo:
    // return await fetch('/api/send-email', {
    //   method: 'POST',
    //   body: JSON.stringify({ to, subject, message }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    
    // Simulando um delay de rede
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'bloqueado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modal de Confirmação */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar remoção</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Você está prestes a remover a publicação de <strong>{selectedPub?.company?.name}</strong>.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Por favor, adicione uma mensagem para o cliente:
              </p>
              
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Explique o motivo da remoção..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEmailMessage('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={!emailMessage.trim()}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${!emailMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Publicações</h1>
          <div className="text-sm text-gray-500">
            {publicacoes.length} {publicacoes.length === 1 ? 'publicação' : 'publicações'}
          </div>
        </div>

        {publicacoes.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma publicação encontrada</h3>
            <p className="mt-1 text-gray-500">Quando novas publicações forem criadas, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {publicacoes.map((pub) => (
              <div
                key={pub.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-5">
                  <div className="flex items-start space-x-4">
                    <img
                      src={pub.company?.logo || '/placeholder-company.png'}
                      alt={`Logo de ${pub.company?.name}`}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{pub.company?.name}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            pub.status
                          )}`}
                        >
                          {pub.status || 'pendente'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {pub.company?.provincia} • {pub.company?.sector}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-gray-700" dangerouslySetInnerHTML={{ __html: pub.description }} />

                  {pub.url && (
                    <div className="mt-4">
                      <img
                        src={pub.url}
                        alt="Publicação"
                        className="w-full h-auto max-h-64 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-3 border-t border-gray-200">
                  <button
                    onClick={() => handleRemoveClick(pub)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg
                      className="-ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Remover
                  </button>
                  <button
                    onClick={() => handleStatusChange(pub.id, 'aprovado')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg
                      className="-ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Publicacoes;