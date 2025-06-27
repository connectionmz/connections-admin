import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, get, update, remove, push } from 'firebase/database';
import { db, auth } from '../../fb';

// Status colors mapping
const STATUS_COLORS = {
  Aprovada: 'bg-green-100 text-green-800',
  Bloqueada: 'bg-gray-100 text-gray-800',
  Expirada: 'bg-orange-100 text-orange-800',
  Activa: 'bg-blue-100 text-blue-800',
  Erro: 'bg-red-100 text-red-800',
  Indefinido: 'bg-gray-100 text-gray-800'
};

function checkCotacaoStatus(cotacao) {
  if (!cotacao || typeof cotacao !== 'object') return 'Indefinido';
  
  // Manual status has priority
  if (cotacao.status === 'Bloqueada') return 'Bloqueada';
  if (cotacao.status === 'Recusada') return 'Recusada';
  
  try {
    const now = new Date();
    const deadline = cotacao.datalimite ? new Date(cotacao.datalimite) : null;
    
    if (deadline && now > deadline) return 'Expirada';
    
    return cotacao.verified ? 'Aprovada' : 'Activa';
  } catch (error) {
    console.error('Error checking status:', error, cotacao);
    return 'Erro';
  }
}

const CotacoesDashboard = () => {
  // States
  const [cotacoes, setCotacoes] = useState([]);
  const [filteredCotacoes, setFilteredCotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    verification: 'all',
    sector: 'all',
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 5
  });
  const [actionLog, setActionLog] = useState([]);
  const [selectedCotacao, setSelectedCotacao] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Memoized values
  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(cotacoes.map(c => c.sector).filter(Boolean))];
    return uniqueSectors.sort();
  }, [cotacoes]);

const stats = useMemo(() => {
  const total = cotacoes.length;
  const activas = cotacoes.filter(c => checkCotacaoStatus(c) === 'Activa').length;
  const verificadas = cotacoes.filter(c => c.verified).length;
  const bloqueadas = cotacoes.filter(c => c.status === 'Bloqueada').length;
  const expiradas = cotacoes.filter(c => checkCotacaoStatus(c) === 'Expirada').length;
  
  return { total, activas, verificadas, bloqueadas, expiradas };
}, [cotacoes, checkCotacaoStatus]); // Add checkCotacaoStatus to dependencies

  const totalPages = useMemo(() => 
    Math.ceil(filteredCotacoes.length / pagination.itemsPerPage), 
    [filteredCotacoes.length, pagination.itemsPerPage]
  );

  const paginatedCotacoes = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredCotacoes.slice(startIndex, endIndex);
  }, [filteredCotacoes, pagination]);


  const logAction = useCallback(async (action, cotacao, additionalData = {}) => {
    const safeCotacao = {
      id: cotacao?.id || 'ID-NÃO-DISPONÍVEL',
      title: cotacao?.title || 'Sem título',
      ...cotacao
    };

    const newLog = {
      action,
      cotacaoId: safeCotacao.id,
      cotacaoTitle: safeCotacao.title,
      userId: auth.currentUser?.uid || 'USUÁRIO-NÃO-AUTENTICADO',
      userEmail: auth.currentUser?.email || 'email@nao.disponivel',
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    setActionLog(prev => [newLog, ...prev.slice(0, 100)]);
    
    try {
      await push(ref(db, 'actionLogs'), newLog);
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }, []);

  // Data fetching
  const fetchCotacoes = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, 'cotacoes'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const cotacoesList = Object.entries(data).map(([id, value]) => ({ 
          id, 
          ...value,
          createdAt: value.timestamp || new Date().toISOString(),
          verified: value.verified || false
        }));
        setCotacoes(cotacoesList);
        applyFilters(cotacoesList);
      } else {
        setCotacoes([]);
        setFilteredCotacoes([]);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActionLog = useCallback(async () => {
    try {
      const snapshot = await get(ref(db, 'actionLogs'));
      if (snapshot.exists()) {
        setActionLog(Object.values(snapshot.val()).reverse());
      }
    } catch (error) {
      console.error('Error loading action log:', error);
    }
  }, []);

  // Filtering
  const applyFilters = useCallback((data = cotacoes) => {
    let filtered = [...data];
    
    const { status, verification, sector, searchTerm } = filters;

    if (status !== 'all') {
      filtered = filtered.filter(cotacao => 
        checkCotacaoStatus(cotacao) === status
      );
    }
    
    if (verification !== 'all') {
      filtered = filtered.filter(cotacao => 
        verification === 'verified' ? cotacao.verified : !cotacao.verified
      );
    }
    
    if (sector !== 'all') {
      filtered = filtered.filter(cotacao => 
        cotacao.sector && cotacao.sector === sector
      );
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cotacao => {
        const company = cotacao.company || {};
        return (
          (cotacao.title?.toLowerCase().includes(term)) ||
          (company.nome?.toLowerCase().includes(term)) ||
          (company.contacto?.toLowerCase().includes(term))
        );
      });
    }
    
    setFilteredCotacoes(filtered);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [cotacoes, filters, checkCotacaoStatus]);

  // CRUD operations
  const updateCotacao = useCallback(async (id, updates) => {
    try {
      await update(ref(db, `cotacoes/${id}`), updates);
      return true;
    } catch (error) {
      console.error('Error updating quote:', error);
      return false;
    }
  }, []);

  const verifyCotacao = useCallback(async (id) => {
    const success = await updateCotacao(id, { 
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: auth.currentUser.email
    });
    
    if (success) {
      const cotacao = cotacoes.find(c => c.id === id);
      logAction('Verificada', cotacao);
      fetchCotacoes();
    }
  }, [cotacoes, updateCotacao, logAction, fetchCotacoes]);

  const blockCotacao = useCallback(async (id) => {
    const success = await updateCotacao(id, { 
      status: 'Bloqueada',
      blockedAt: new Date().toISOString(),
      blockedBy: auth.currentUser.email
    });
    
    if (success) {
      const cotacao = cotacoes.find(c => c.id === id);
      logAction('Bloqueada', cotacao);
      fetchCotacoes();
    }
  }, [cotacoes, updateCotacao, logAction, fetchCotacoes]);

  const unverifyCotacao = useCallback(async (id) => {
    const success = await updateCotacao(id, { 
      verified: false,
      verifiedAt: null,
      verifiedBy: null
    });
    
    if (success) {
      const cotacao = cotacoes.find(c => c.id === id);
      logAction('Desverificada', cotacao);
      fetchCotacoes();
    }
  }, [cotacoes, updateCotacao, logAction, fetchCotacoes]);

  const deleteCotacao = useCallback(async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta cotação?')) return;
    
    try {
      await remove(ref(db, `cotacoes/${id}`));
      const cotacao = cotacoes.find(c => c.id === id);
      logAction('Eliminada', cotacao);
      fetchCotacoes();
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  }, [cotacoes, logAction, fetchCotacoes]);

  // Effects
  useEffect(() => {
    fetchCotacoes();
    fetchActionLog();
  }, [fetchCotacoes, fetchActionLog]);

  useEffect(() => {
    applyFilters();
  }, [filters, applyFilters]);

  // Components
  const StatCard = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-sm ${color}`}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );

  const DetailsModal = ({ cotacao, onClose }) => {
    const status = checkCotacaoStatus(cotacao);
    const hasProposals = cotacao.proposals && Object.keys(cotacao.proposals).length > 0;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{cotacao.title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              &times;
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Informações da Empresa</h4>
              <div className="bg-gray-50 p-4 rounded">
                {Object.entries(cotacao.company || {}).map(([key, value]) => (
                  <p key={key}>
                    <span className="font-medium">{key}:</span> {value || 'Não informado'}
                  </p>
                ))}
              </div>
              
              <h4 className="font-medium mt-4 mb-2">Detalhes da Cotação</h4>
              <div className="bg-gray-50 p-4 rounded">
                <p><span className="font-medium">Valor:</span> {cotacao.valor} MT</p>
                <p><span className="font-medium">Data Limite:</span> {new Date(cotacao.datalimite).toLocaleString()}</p>
                <p>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${STATUS_COLORS[status]}`}>
                    {status}
                  </span>
                </p>
                {cotacao.verified && (
                  <>
                    <p className="mt-2">
                      <span className="font-medium">Verificada em:</span> {new Date(cotacao.verifiedAt).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Por:</span> {cotacao.verifiedBy}
                    </p>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Descrição</h4>
              <div 
                className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: cotacao.description }}
              />
              
              {hasProposals && (
                <>
                  <h4 className="font-medium mt-4 mb-2">Propostas Recebidas</h4>
                  <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto">
                    {Object.values(cotacao.proposals).map((proposal, i) => (
                      <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
                        <div className="flex items-center mb-2">
                          {proposal.from?.logo && (
                            <img 
                              src={proposal.from.logo} 
                              alt={proposal.from.nome} 
                              className="w-10 h-10 rounded-full mr-2"
                            />
                          )}
                          <div>
                            <p className="font-medium">{proposal.from?.nome || 'Anônimo'}</p>
                            <p className="text-sm text-gray-600">{proposal.from?.contacto || ''}</p>
                          </div>
                        </div>
                        <p className="text-sm mb-2">
                          <span className="font-medium">Valor:</span> {proposal.proposal.match(/Valor Total Estimado: (.*?) –/)?.[1] || 'Não especificado'}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            {!cotacao.verified && status !== 'Bloqueada' && status !== 'Expirada' && (
              <button
                onClick={() => {
                  verifyCotacao(cotacao.id);
                  onClose();
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Marcar como Verificada
              </button>
            )}
            
            {cotacao.verified && (
              <button
                onClick={() => {
                  unverifyCotacao(cotacao.id);
                  onClose();
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Desverificar
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Gestão de Cotações</h1>
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard 
          title="Total" 
          value={stats.total} 
          color="bg-blue-100 text-blue-800" 
        />
        <StatCard 
          title="Activas" 
          value={stats.activas} 
          color="bg-green-100 text-green-800" 
        />
        <StatCard 
          title="Verificadas" 
          value={stats.verificadas} 
          color="bg-purple-100 text-purple-800" 
        />
        <StatCard 
          title="Bloqueadas" 
          value={stats.bloqueadas} 
          color="bg-gray-100 text-gray-800" 
        />
        <StatCard 
          title="Expiradas" 
          value={stats.expiradas} 
          color="bg-orange-100 text-orange-800" 
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md text-sm"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Título, empresa ou contacto"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="Activa">Activas</option>
              <option value="Aprovada">Aprovadas</option>
              <option value="Bloqueada">Bloqueadas</option>
              <option value="Expirada">Expiradas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verificação</label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={filters.verification}
              onChange={(e) => handleFilterChange('verification', e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="verified">Verificadas</option>
              <option value="unverified">Não verificadas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
            >
              <option value="all">Todos</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Quotes List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Carregando cotações...</p>
        </div>
      ) : filteredCotacoes.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhuma cotação encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedCotacoes.map((cotacao) => {
            const company = cotacao.company || {};
            const status = checkCotacaoStatus(cotacao);
            const hasProposals = cotacao.proposals && Object.keys(cotacao.proposals).length > 0;
            
            return (
              <div
                key={cotacao.id}
                className={`p-4 border rounded-lg shadow-sm ${
                  cotacao.verified ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-semibold">{cotacao.title}</h2>
                      <div className="flex items-center">
                        {cotacao.verified && (
                          <span className="mr-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Verificada
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[status]}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <p><span className="font-medium">Empresa:</span> {company.nome || 'Não informada'}</p>
                        <p><span className="font-medium">Contacto:</span> {company.contacto || ''}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Valor:</span> {cotacao.valor} MT</p>
                        <p><span className="font-medium">Sector:</span> {cotacao.sector}</p>
                      </div>
                    </div>
                    
                    {hasProposals && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Propostas:</span> {Object.keys(cotacao.proposals).length}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <p className="text-sm text-gray-500">
                      {new Date(cotacao.datalimite).toLocaleDateString()}
                    </p>
                    {cotacao.link && (
                      <a
                        href={cotacao.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm mt-1"
                      >
                        Ver no site
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    onClick={() => {
                      setSelectedCotacao(cotacao);
                      setShowDetailsModal(true);
                    }}
                  >
                    Detalhes
                  </button>
                  
                  {status !== 'Bloqueada' && (
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                      onClick={() => blockCotacao(cotacao.id)}
                    >
                      Bloquear
                    </button>
                  )}
                  
                  {status === 'Bloqueada' && (
                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      onClick={() => verifyCotacao(cotacao.id)}
                    >
                      Desbloquear
                    </button>
                  )}
                  
                  {!cotacao.verified && status !== 'Expirada' && (
                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      onClick={() => verifyCotacao(cotacao.id)}
                    >
                      Verificar
                    </button>
                  )}
                  
                  {cotacao.verified && (
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                      onClick={() => unverifyCotacao(cotacao.id)}
                    >
                      Desverificar
                    </button>
                  )}
                  
                  <button
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                    onClick={() => deleteCotacao(cotacao.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Pagination */}
      {filteredCotacoes.length > pagination.itemsPerPage && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={pagination.currentPage === 1}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
          >
            &lt;
          </button>
          
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = index + 1;
            } else if (pagination.currentPage <= 3) {
              pageNum = index + 1;
            } else if (pagination.currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + index;
            } else {
              pageNum = pagination.currentPage - 2 + index;
            }
            
            return (
              <button
                key={pageNum}
                className={`px-3 py-1 rounded ${
                  pagination.currentPage === pageNum ? 'bg-blue-500 text-white' : 'border'
                }`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={pagination.currentPage === totalPages}
            onClick={() => handlePageChange(pagination.currentPage + 1)}
          >
            &gt;
          </button>
        </div>
      )}
      
      {/* Action History */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Histórico de Ações Recentes</h2>
        
        {actionLog.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma ação registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cotação</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actionLog.slice(0, 5).map((log, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{log.action}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {log.cotacaoTitle || log.cotacaoId}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{log.userEmail}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Details Modal */}
      {showDetailsModal && selectedCotacao && (
        <DetailsModal 
          cotacao={selectedCotacao} 
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCotacao(null);
          }} 
        />
      )}
    </div>
  );
};

export default CotacoesDashboard;