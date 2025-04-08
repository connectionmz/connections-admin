import React, { useEffect, useState } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { db } from '../fb';
import UploadBanner from './UploadBanner';

const Anuncios = () => {
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [anuncios, setAnuncios] = useState([]);
  const [error, setError] = useState(null);
  
  // Estados para UI
  const [menuOpen, setMenuOpen] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState(null);
  const [notificationReason, setNotificationReason] = useState('');
  const [activeTab, setActiveTab] = useState('pendentes'); // Tab padrão agora é "pendentes"
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar anúncios
  useEffect(() => {
    const fetchAnuncios = async () => {
      try {
        const snapshot = await get(ref(db, `banners`));
        const data = snapshot.val();

        if (data) {
          const anunciosArray = await Promise.all(
            Object.entries(data).map(async ([id, value]) => {
              let empresa = null;
              if (value.companyId) {
                const empresaSnap = await get(ref(db, `company/${value.companyId}`));
                empresa = empresaSnap.exists() ? empresaSnap.val() : null;
              }

              return {
                id,
                ...value,
                empresa: empresa,
                status: value.status || 'pendente',
                createdAt: value.createdAt || Date.now()
              };
            })
          );

          setAnuncios(anunciosArray);
        } else {
          setError('Nenhum anúncio encontrado.');
        }
      } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
        setError('Erro ao buscar anúncios.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnuncios();
  }, []);

  // Filtrar anúncios
  const filteredAnuncios = anuncios.filter(anuncio => {
    const matchesTab = 
      activeTab === 'todos' || 
      anuncio.status === activeTab ||
      (activeTab === 'pendentes' && anuncio.status === 'pendente');
    
    const matchesSearch = 
      searchTerm === '' ||
      anuncio.link?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (anuncio.empresa?.nome && anuncio.empresa.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (anuncio.motivoBloqueio && anuncio.motivoBloqueio.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

  // Ações disponíveis
  const handleAction = async (id, action, reason = '') => {
    try {
      const updates = {};
      let successMessage = '';
      let shouldReload = false;
      
      switch(action) {
        case 'eliminar':
          await remove(ref(db, `banners/${id}`));
          setAnuncios(prev => prev.filter(anuncio => anuncio.id !== id));
          successMessage = 'Anúncio eliminado com sucesso.';
          break;
          
        case 'verificar':
          updates.status = 'ativo';
          updates.verificadoEm = new Date().toISOString();
          updates.verificadoPor = 'user123';
          successMessage = 'Anúncio verificado e ativado.';
          break;
          
        case 'aprovar_arquivar':
          updates.status = 'arquivado';
          updates.aprovadoEm = new Date().toISOString();
          updates.aprovadoPor = 'user123';
          successMessage = 'Anúncio aprovado e arquivado.';
          shouldReload = true;
          break;
          
        case 'notificar':
          updates.status = 'notificado';
          updates.motivoNotificacao = reason;
          updates.notificadoEm = new Date().toISOString();
          successMessage = 'Empresa notificada sobre o problema.';
          break;
          
        case 'bloquear':
          updates.status = 'bloqueado';
          updates.motivoBloqueio = reason;
          updates.bloqueadoEm = new Date().toISOString();
          successMessage = 'Anúncio bloqueado com sucesso.';
          break;
          
        case 'desbloquear':
          updates.status = 'ativo';
          updates.desbloqueadoEm = new Date().toISOString();
          updates.desbloqueadoPor = 'user123';
          delete updates.motivoBloqueio;
          successMessage = 'Anúncio desbloqueado e ativado.';
          break;
          
        default:
          break;
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(db, `banners/${id}`), updates);
        
        if (shouldReload) {
          // Recarregar a lista para atualizar a exibição
          const snapshot = await get(ref(db, `banners`));
          const data = snapshot.val();
          if (data) {
            const anunciosArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
            setAnuncios(anunciosArray);
          }
        } else {
          setAnuncios(prev =>
            prev.map(anuncio =>
              anuncio.id === id ? { ...anuncio, ...updates } : anuncio
            )
          );
        }
        
        alert(successMessage);
      }

    } catch (error) {
      console.error('Erro ao realizar a ação:', error);
      alert('Erro ao realizar a ação.');
    } finally {
      setMenuOpen(null);
      setSelectedAnuncio(null);
      setNotificationReason('');
    }
  };

  // Cores para os status
  const statusColors = {
    pendente: 'bg-yellow-100 text-yellow-800',
    ativo: 'bg-green-100 text-green-800',
    notificado: 'bg-blue-100 text-blue-800',
    bloqueado: 'bg-red-100 text-red-800',
    arquivado: 'bg-gray-100 text-gray-800'
  };

  // Tabs disponíveis
  const tabs = [
    { id: 'pendentes', label: 'Pendentes' },
    { id: 'ativo', label: 'Ativos' },
    { id: 'notificado', label: 'Notificados' },
    { id: 'bloqueado', label: 'Bloqueados' },
    { id: 'arquivado', label: 'Arquivados' },
    { id: 'todos', label: 'Todos' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center p-4">{error}</p>;
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Gestão de Anúncios</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Pesquisar anúncios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          />
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md whitespace-nowrap"
            onClick={() => setShowModal(true)}
          >
            + Novo Anúncio
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Lista de Anúncios */}
      {filteredAnuncios.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum anúncio encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anúncio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnuncios.map((anuncio, index) => (
                  <tr key={anuncio.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16">
                          <img
                            src={anuncio.imageUrl}
                            alt="Anúncio"
                            className="h-16 w-16 object-cover rounded"
                          />
                        </div>
                        <div className="ml-4">
                          <a 
                            href={`https://${anuncio.link}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            {anuncio.link}
                          </a>
                          <div className="text-sm text-gray-500">
                            {anuncio.fileSize ? `${(anuncio.fileSize / 1024).toFixed(2)} KB` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {anuncio.empresa?.id ? (
                        <a 
                          href={`/empresas/${anuncio.empresa.id}`} 
                          className="text-blue-600 hover:underline"
                        >
                          {anuncio.empresa.nome || 'Não informado'}
                        </a>
                      ) : (
                        <span className="text-gray-500">Empresa não identificada</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {anuncio.empresa?.contacto && (
                        <a 
                          href={`tel:${anuncio.empresa.contacto}`} 
                          className="flex items-center text-sm text-blue-600 hover:underline"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {anuncio.empresa.contacto}
                        </a>
                      )}
                      {anuncio.empresa?.email && (
                        <a 
                          href={`mailto:${anuncio.empresa.email}`} 
                          className="flex items-center text-sm text-blue-600 hover:underline mt-1"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {anuncio.empresa.email}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[anuncio.status]}`}>
                        {anuncio.status === 'ativo' && 'Ativo'}
                        {anuncio.status === 'pendente' && 'Pendente'}
                        {anuncio.status === 'notificado' && 'Notificado'}
                        {anuncio.status === 'bloqueado' && 'Bloqueado'}
                        {anuncio.status === 'arquivado' && 'Arquivado'}
                      </span>
                      {anuncio.motivoBloqueio && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={anuncio.motivoBloqueio}>
                          {anuncio.motivoBloqueio}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(anuncio.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setMenuOpen(menuOpen === index ? null : index)}
                          className="inline-flex justify-center items-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none"
                        >
                          <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {menuOpen === index && (
                          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              {anuncio.status === 'pendente' && (
                                <>
                                  <button
                                    onClick={() => handleAction(anuncio.id, 'verificar')}
                                    className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                                  >
                                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Aprovar e Ativar
                                  </button>
                                  <button
                                    onClick={() => handleAction(anuncio.id, 'aprovar_arquivar')}
                                    className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                                  >
                                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    Aprovar e Arquivar
                                  </button>
                                </>
                              )}
                              
                              {anuncio.status !== 'bloqueado' && (
                                <button
                                  onClick={() => {
                                    setSelectedAnuncio(anuncio);
                                    setNotificationReason(anuncio.motivoNotificacao || '');
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                                >
                                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  {anuncio.status === 'notificado' ? 'Editar Notificação' : 'Notificar Problema'}
                                </button>
                              )}
                              
                              {anuncio.status === 'bloqueado' ? (
                                <button
                                  onClick={() => handleAction(anuncio.id, 'desbloquear')}
                                  className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                                >
                                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Desbloquear
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedAnuncio(anuncio);
                                    setNotificationReason('');
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                                >
                                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  Bloquear
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleAction(anuncio.id, 'eliminar')}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                              >
                                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para notificar/bloquear */}
      {selectedAnuncio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium">
                  {selectedAnuncio.status === 'bloqueado' ? 'Desbloquear Anúncio' : 
                   selectedAnuncio.status === 'notificado' ? 'Editar Notificação' : 
                   'Notificar/Bloquear Anúncio'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedAnuncio(null);
                    setNotificationReason('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedAnuncio.status === 'bloqueado' ? 'Motivo do bloqueio anterior:' : 'Motivo:'}
                </label>
                <textarea
                  value={notificationReason}
                  onChange={(e) => setNotificationReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows="4"
                  placeholder="Descreva o problema encontrado..."
                  disabled={selectedAnuncio.status === 'bloqueado'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {selectedAnuncio.status === 'bloqueado' ? (
                  <button
                    onClick={() => handleAction(selectedAnuncio.id, 'desbloquear')}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
                  >
                    Desbloquear
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleAction(selectedAnuncio.id, 'notificar', notificationReason)}
                      disabled={!notificationReason}
                      className={`px-4 py-2 rounded-md ${
                        !notificationReason 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Notificar Empresa
                    </button>
                    <button
                      onClick={() => handleAction(selectedAnuncio.id, 'bloquear', notificationReason)}
                      disabled={!notificationReason}
                      className={`px-4 py-2 rounded-md ${
                        !notificationReason 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      Bloquear Anúncio
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para novo anúncio */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium">Cadastrar Novo Anúncio</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <UploadBanner 
                onSuccess={() => {
                  setShowModal(false);
                  // Recarregar a lista
                  const fetchAnuncios = async () => {
                    const snapshot = await get(ref(db, `banners`));
                    const data = snapshot.val();
                    if (data) {
                      const anunciosArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                      setAnuncios(anunciosArray);
                    }
                  };
                  fetchAnuncios();
                }} 
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anuncios;