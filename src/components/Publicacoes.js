import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update, remove } from 'firebase/database';
import { ExclamationTriangleIcon, CheckCircleIcon, TrashIcon, EyeIcon, PencilSquareIcon, ClockIcon } from '@heroicons/react/24/outline';

const Publicacoes = () => {
  const [publicacoes, setPublicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPub, setSelectedPub] = useState(null);
  const [emailMessage, setEmailMessage] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const database = getDatabase();

  useEffect(() => {
    const publicacoesRef = ref(database, 'posts');
    onValue(publicacoesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const publicacoesArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
          createdAt: data[key].createdAt || 0 // Garante que tenha timestamp
        }));
        setPublicacoes(publicacoesArray);
      } else {
        setPublicacoes([]);
      }
      setLoading(false);
    });
  }, [database]);

  const handleStatusChange = async (id, status, motivo = '') => {
    const postRef = ref(database, `posts/${id}`);
    try {
      await update(postRef, { 
        status,
        ...(motivo && { motivoRemocao: motivo }),
        updatedAt: Date.now() 
      });
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
      await handleStatusChange(selectedPub.id, 'bloqueado', emailMessage);
      
      // 2. Envia o email (função simulada)
      await sendMailToClient(
        selectedPub.company?.email, 
        'Publicação removida', 
        `Sua publicação foi removida por conter conteúdo inadequado. Motivo: ${emailMessage}`
      );
      
      // 3. Fecha o modal e limpa os estados
      setShowModal(false);
      setSelectedPub(null);
      setEmailMessage('');
      
    } catch (error) {
      console.error('Erro ao processar remoção:', error);
    }
  };

  const handleDeletePermanently = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir permanentemente esta publicação?')) {
      try {
        await remove(ref(database, `posts/${id}`));
      } catch (error) {
        console.error('Erro ao excluir publicação:', error);
      }
    }
  };

  // Função simulada para enviar email
  const sendMailToClient = async (to, subject, message) => {
    console.log(`Enviando email para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Mensagem: ${message}`);
    
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'bloqueado':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const filteredPublicacoes = publicacoes
    .filter(pub => {
      // Filtro por status
      if (filtro !== 'todas' && pub.status !== filtro) return false;
      
      // Filtro por busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          pub.company?.name?.toLowerCase().includes(term) ||
          pub.company?.sector?.toLowerCase().includes(term) ||
          pub.description?.toLowerCase().includes(term) ||
          pub.status?.toLowerCase().includes(term)
        );
      }
      
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt); // Ordena por data mais recente

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
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Confirmar remoção</h3>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Você está prestes a remover a publicação de <strong>{selectedPub?.company?.name}</strong>.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Por favor, adicione uma mensagem explicando o motivo da remoção:
                  </p>
                  
                  <textarea
                    className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    placeholder="Ex: Conteúdo inapropriado, violação de termos, etc..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestão de Publicações</h1>
            <p className="text-sm text-gray-500 mt-1">
              Moderação de conteúdo publicado pelas empresas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar publicações..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todas">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="bloqueado">Bloqueadas</option>
            </select>
          </div>
        </div>

        {filteredPublicacoes.length === 0 ? (
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
            <p className="mt-1 text-gray-500">Nenhuma publicação corresponde aos critérios de busca.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPublicacoes.map((pub) => (
              <div
                key={pub.id}
                className={`border rounded-lg overflow-hidden transition-shadow duration-200 ${
                  pub.status === 'bloqueado' 
                    ? 'border-red-200 bg-red-50' 
                    : pub.status === 'aprovado'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:shadow-lg'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <img
                        src={pub.company?.logo || '/placeholder-company.png'}
                        alt={`Logo de ${pub.company?.name}`}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{pub.company?.name}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              pub.status
                            )}`}
                          >
                            {getStatusIcon(pub.status || 'pendente')}
                            <span className="ml-1">{pub.status || 'pendente'}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {pub.company?.provincia} • {pub.company?.sector}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Publicado em: {new Date(pub.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {pub.status === 'bloqueado' && (
                      <button
                        onClick={() => handleDeletePermanently(pub.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Excluir permanentemente"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-gray-700" dangerouslySetInnerHTML={{ __html: pub.description }} />

                  {pub.url && (
                    <div className="mt-4">
                      <img
                        src={pub.url}
                        alt="Publicação"
                        className="w-full h-auto max-h-64 object-contain rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                  
                  {pub.status === 'bloqueado' && pub.motivoRemocao && (
                    <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Motivo da remoção</h3>
                          <div className="mt-1 text-sm text-red-700">
                            <p>{pub.motivoRemocao}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-5 py-3 flex flex-wrap justify-end gap-2 border-t border-gray-200">
                  {pub.status !== 'bloqueado' && (
                    <>
                      <button
                        onClick={() => handleRemoveClick(pub)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <ExclamationTriangleIcon className="-ml-0.5 mr-2 h-4 w-4" />
                        Remover
                      </button>
                      
                      {pub.status !== 'aprovado' && (
                        <button
                          onClick={() => handleStatusChange(pub.id, 'aprovado')}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircleIcon className="-ml-0.5 mr-2 h-4 w-4" />
                          Aprovar
                        </button>
                      )}
                    </>
                  )}
                  
                  {pub.status === 'bloqueado' && (
                    <button
                      onClick={() => handleStatusChange(pub.id, 'aprovado')}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PencilSquareIcon className="-ml-0.5 mr-2 h-4 w-4" />
                      Reativar
                    </button>
                  )}
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