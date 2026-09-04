import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '../fb';
import UploadBanner from './UploadBanner';
import { AdminCard, AdminPage, AdminPageHeader, ConfirmDialog, EmptyState, InlineAlert, LoadingState, PrimaryButton } from './admin/ui/AdminUI';

// Status colors mapping
const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-yellow-100 text-yellow-800',
  notificado: 'bg-blue-100 text-blue-800',
  bloqueado: 'bg-red-100 text-red-800',
  arquivado: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  paid: 'Ativo e pago',
  unpaid: 'A aguardar pagamento',
  notificado: 'Notificado',
  bloqueado: 'Bloqueado',
  arquivado: 'Arquivado'
};

const Anuncios = () => {
  // States
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [filters, setFilters] = useState({
    status: 'pendentes',
    searchTerm: ''
  });
  const [actionState, setActionState] = useState({
    menuOpen: null,
    showModal: false,
    selectedAnuncio: null,
    notificationReason: ''
  });

  // Tabs configuration
  const tabs = useMemo(() => [
    { id: 'pendentes', label: 'Pendentes' },
    { id: 'paid', label: 'Ativos' },
    { id: 'notificado', label: 'Notificados' },
    { id: 'bloqueado', label: 'Bloqueados' },
    { id: 'arquivado', label: 'Arquivados' },
    { id: 'todos', label: 'Todos' }
  ], []);

  // Fetch anuncios
  const fetchAnuncios = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, 'banners'));
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
              empresa,
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
  }, []);

  // Filter anuncios
  const filteredAnuncios = useMemo(() => {
    return anuncios.filter(anuncio => {
      const matchesTab = 
        filters.status === 'todos' || 
        anuncio.status === filters.status ||
        (filters.status === 'pendentes' && anuncio.status === 'pendente');
      
      const matchesSearch = 
        filters.searchTerm === '' ||
        anuncio.link?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (anuncio.empresa?.nome && anuncio.empresa.nome.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (anuncio.motivoBloqueio && anuncio.motivoBloqueio.toLowerCase().includes(filters.searchTerm.toLowerCase()));
      
      return matchesTab && matchesSearch;
    });
  }, [anuncios, filters]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: anuncios.length,
      pendentes: anuncios.filter(a => a.status === 'pendente').length,
      ativos: anuncios.filter(a => a.status === 'paid').length,
      notificados: anuncios.filter(a => a.status === 'notificado').length,
      bloqueados: anuncios.filter(a => a.status === 'bloqueado').length,
      arquivados: anuncios.filter(a => a.status === 'arquivado').length
    };
  }, [anuncios]);

  // Handle actions
  const handleAction = useCallback(async (id, action, reason = '') => {
    try {
      const updates = {};
      let successMessage = '';
      
      switch(action) {
        case 'eliminar':
          updates.status = 'arquivado';
          updates.archivedAt = Date.now();
          updates.archivedBy = auth.currentUser?.uid || null;
          successMessage = 'Anúncio arquivado com sucesso.';
          break;
          
        case 'verificar':
          updates.status = 'paid';
          updates.verificadoEm = new Date().toISOString();
          successMessage = 'Anúncio verificado e ativado.';
          break;
          
        case 'aprovar_arquivar':
          updates.status = 'arquivado';
          updates.aprovadoEm = new Date().toISOString();
          successMessage = 'Anúncio aprovado e arquivado.';
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
          updates.status = 'paid';
          updates.desbloqueadoEm = new Date().toISOString();
          delete updates.motivoBloqueio;
          successMessage = 'Anúncio desbloqueado e ativado.';
          break;
          
        default:
          break;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = Date.now();
        updates.updatedBy = auth.currentUser?.uid || null;
        await update(ref(db, `banners/${id}`), updates);
        setAnuncios(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        setFeedback({ type: 'success', message: successMessage });
      }

    } catch (error) {
      console.error('Erro ao realizar a ação:', error);
      setFeedback({ type: 'error', message: 'Não foi possível concluir a ação.' });
    } finally {
      setActionState(prev => ({
        ...prev,
        menuOpen: null,
        selectedAnuncio: null,
        notificationReason: ''
      }));
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchAnuncios();
  }, [fetchAnuncios]);

  // Components
  const StatCard = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-sm ${color}`}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );

  const ActionMenu = ({ anuncio, index }) => (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setActionState(prev => ({
          ...prev,
          menuOpen: prev.menuOpen === index ? null : index
        }))}
        className="inline-flex justify-center items-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200"
      >
        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {actionState.menuOpen === index && (
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
                onClick={() => setActionState(prev => ({
                  ...prev,
                  selectedAnuncio: anuncio,
                  notificationReason: anuncio.motivoNotificacao || ''
                }))}
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
                onClick={() => setActionState(prev => ({
                  ...prev,
                  selectedAnuncio: anuncio,
                  notificationReason: ''
                }))}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Bloquear
              </button>
            )}
            
            <button
              onClick={() => {
                setArchiveTarget(anuncio);
                setActionState(prev => ({ ...prev, menuOpen: null }));
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Arquivar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const NotificationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium">
              {actionState.selectedAnuncio?.status === 'bloqueado' ? 'Desbloquear Anúncio' : 
               actionState.selectedAnuncio?.status === 'notificado' ? 'Editar Notificação' : 
               'Notificar/Bloquear Anúncio'}
            </h3>
            <button
              onClick={() => setActionState(prev => ({
                ...prev,
                selectedAnuncio: null,
                notificationReason: ''
              }))}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {actionState.selectedAnuncio?.status === 'bloqueado' ? 'Motivo do bloqueio anterior:' : 'Motivo:'}
            </label>
            <textarea
              value={actionState.notificationReason}
              onChange={(e) => setActionState(prev => ({
                ...prev,
                notificationReason: e.target.value
              }))}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows="4"
              placeholder="Descreva o problema encontrado..."
              disabled={actionState.selectedAnuncio?.status === 'bloqueado'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {actionState.selectedAnuncio?.status === 'bloqueado' ? (
              <button
                onClick={() => handleAction(actionState.selectedAnuncio.id, 'desbloquear')}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
              >
                Desbloquear
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction(
                    actionState.selectedAnuncio.id, 
                    'notificar', 
                    actionState.notificationReason
                  )}
                  disabled={!actionState.notificationReason}
                  className={`px-4 py-2 rounded-md ${
                    !actionState.notificationReason 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Notificar Empresa
                </button>
                <button
                  onClick={() => handleAction(
                    actionState.selectedAnuncio.id, 
                    'bloquear', 
                    actionState.notificationReason
                  )}
                  disabled={!actionState.notificationReason}
                  className={`px-4 py-2 rounded-md ${
                    !actionState.notificationReason 
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
  );

  const UploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium">Cadastrar Novo Anúncio</h3>
            <button
              onClick={() => setActionState(prev => ({ ...prev, showModal: false }))}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <UploadBanner 
            onSuccess={() => {
              setActionState(prev => ({ ...prev, showModal: false }));
              fetchAnuncios();
            }} 
            onCancel={() => setActionState(prev => ({ ...prev, showModal: false }))}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingState label="A carregar anúncios..." />;
  }

  if (error) {
    return <InlineAlert type="error">{error}</InlineAlert>;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Gestão de Anúncios"
        description="Valide campanhas e controle o conteúdo apresentado no portal."
        actions={<PrimaryButton type="button" onClick={() => setActionState(prev => ({ ...prev, showModal: true }))}>Novo anúncio</PrimaryButton>}
      />
      {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</InlineAlert>}
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <StatCard 
          title="Total" 
          value={stats.total} 
          color="bg-blue-100 text-blue-800" 
        />
        <StatCard 
          title="Pendentes" 
          value={stats.pendentes} 
          color="bg-yellow-100 text-yellow-800" 
        />
        <StatCard 
          title="Ativos" 
          value={stats.ativos} 
          color="bg-green-100 text-green-800" 
        />
        <StatCard 
          title="Notificados" 
          value={stats.notificados} 
          color="bg-blue-100 text-blue-800" 
        />
        <StatCard 
          title="Bloqueados" 
          value={stats.bloqueados} 
          color="bg-red-100 text-red-800" 
        />
        <StatCard 
          title="Arquivados" 
          value={stats.arquivados} 
          color="bg-gray-100 text-gray-800" 
        />
      </div>
      
      {/* Filters */}
      <AdminCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md text-sm"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                searchTerm: e.target.value
              }))}
              placeholder="Link, empresa ou motivo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: e.target.value
              }))}
            >
              {tabs.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Anúncios List */}
      {filteredAnuncios.length === 0 ? (
        <AdminCard><EmptyState title="Nenhum anúncio encontrado" description="Ajuste os filtros ou aguarde uma nova campanha." /></AdminCard>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anúncio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {anuncio.empresa?.nome || 'Empresa não identificada'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[anuncio.status]}`}>
                        {STATUS_LABELS[anuncio.status]}
                      </span>
                      {anuncio.motivoBloqueio && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={anuncio.motivoBloqueio}>
                          {anuncio.motivoBloqueio}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(anuncio.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ActionMenu anuncio={anuncio} index={index} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {actionState.selectedAnuncio && <NotificationModal />}
      {actionState.showModal && <UploadModal />}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Arquivar anúncio"
        description="O anúncio deixará de aparecer no portal, mas o histórico será preservado."
        confirmLabel="Arquivar"
        danger
        onCancel={() => setArchiveTarget(null)}
        onConfirm={async () => {
          const target = archiveTarget;
          setArchiveTarget(null);
          if (target) await handleAction(target.id, 'eliminar');
        }}
      />
    </AdminPage>
  );
};

export default Anuncios;
