import React, { useState, useEffect } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { db } from '../fb';

const Denuncias = () => {
  const [denuncias, setDenuncias] = useState([]);
  const [selectedDenuncia, setSelectedDenuncia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const denunciasPerPage = 10;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    const fetchDenuncias = async () => {
      try {
        const snapshot = await get(ref(db, 'denuncias'));
        if (snapshot.exists()) {
          const denunciasData = [];
          
          // Processar denúncias de cotações
          if (snapshot.val().cotacao) {
            Object.entries(snapshot.val().cotacao).forEach(([cotacaoId, denunciasCotacao]) => {
              Object.values(denunciasCotacao).forEach(userDenuncias => {
                Object.entries(userDenuncias).forEach(([denunciaId, denuncia]) => {
                  denunciasData.push({
                    id: denunciaId,
                    tipo: 'cotacao',
                    cotacaoId,
                    motivo: denuncia.motivo,
                    timestamp: denuncia.timestamp,
                    userId: denuncia.userId,
                    status: denuncia.status || 'pendente'
                  });
                });
              });
            });
          }

          // Processar denúncias de posts
          if (snapshot.val().posts) {
            Object.entries(snapshot.val().posts).forEach(([postId, denunciasPost]) => {
              Object.values(denunciasPost).forEach(userDenuncias => {
                Object.entries(userDenuncias).forEach(([denunciaId, denuncia]) => {
                  denunciasData.push({
                    id: denunciaId,
                    tipo: 'post',
                    postId,
                    motivo: denuncia.motivo,
                    timestamp: denuncia.timestamp,
                    userId: denuncia.userId,
                    status: denuncia.status || 'pendente'
                  });
                });
              });
            });
          }

          setDenuncias(denunciasData);
        }
      } catch (error) {
        console.error('Erro ao carregar denúncias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDenuncias();
  }, []);

  const handleUpdateStatus = async (id, novoStatus) => {
    try {
      // Encontrar a denúncia para saber seu tipo (cotacao ou post)
      const denuncia = denuncias.find(d => d.id === id);
      if (!denuncia) return;

      // Construir o caminho correto para atualização
      const path = `denuncias/${denuncia.tipo}/${denuncia.tipo === 'cotacao' ? denuncia.cotacaoId : denuncia.postId}/${denuncia.userId}/${id}`;
      
      await update(ref(db, path), {
        status: novoStatus,
        atualizadoEm: new Date().toISOString()
      });

      setDenuncias(denuncias.map(d => 
        d.id === id ? {...d, status: novoStatus} : d
      ));
      setSelectedDenuncia(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDelete = async (denuncia) => {
    if (window.confirm('Tem certeza que deseja excluir esta denúncia?')) {
      try {
        const path = `denuncias/${denuncia.tipo}/${denuncia.tipo === 'cotacao' ? denuncia.cotacaoId : denuncia.postId}/${denuncia.userId}/${denuncia.id}`;
        await remove(ref(db, path));
        setDenuncias(denuncias.filter(d => d.id !== denuncia.id));
      } catch (error) {
        console.error('Erro ao excluir denúncia:', error);
      }
    }
  };

  const filteredDenuncias = denuncias.filter(denuncia => {
    const matchesSearch = 
      denuncia.motivo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'todos' || denuncia.tipo === tipoFilter;
    
    return matchesSearch && matchesTipo;
  });

  // Paginação
  const indexOfLastDenuncia = currentPage * denunciasPerPage;
  const indexOfFirstDenuncia = indexOfLastDenuncia - denunciasPerPage;
  const currentDenuncias = filteredDenuncias.slice(indexOfFirstDenuncia, indexOfLastDenuncia);
  const totalPages = Math.ceil(filteredDenuncias.length / denunciasPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const tipoOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'cotacao', label: 'Cotações' },
    { value: 'post', label: 'Posts' }
  ];

  const statusOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'em_analise', label: 'Em Análise' },
    { value: 'resolvida', label: 'Resolvida' },
    { value: 'arquivada', label: 'Arquivada' }
  ];

  const statusColors = {
    pendente: 'bg-yellow-100 text-yellow-800',
    em_analise: 'bg-blue-100 text-blue-800',
    resolvida: 'bg-green-100 text-green-800',
    arquivada: 'bg-gray-100 text-gray-800'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestão de Denúncias</h1>
      
      {/* Filtros e Busca */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <input
              type="text"
              placeholder="Pesquisar denúncias..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {tipoOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setTipoFilter('todos');
                setCurrentPage(1);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Listagem de Denúncias */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {currentDenuncias.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentDenuncias.map((denuncia) => (
                    <tr key={denuncia.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{denuncia.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {denuncia.tipo === 'cotacao' ? 'Cotação' : 'Post'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">{denuncia.motivo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(denuncia.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[denuncia.status]}`}>
                          {statusOptions.find(opt => opt.value === denuncia.status)?.label || denuncia.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedDenuncia(denuncia)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => handleDelete(denuncia)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação (mesmo código anterior) */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                {/* ... (código de paginação mantido igual) ... */}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            {/* ... (código de nenhum resultado mantido igual) ... */}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedDenuncia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Detalhes da Denúncia</h2>
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[selectedDenuncia.status]}`}>
                      {statusOptions.find(opt => opt.value === selectedDenuncia.status)?.label || selectedDenuncia.status}
                    </span>
                    <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {selectedDenuncia.tipo === 'cotacao' ? 'Cotação' : 'Post'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDenuncia(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Informações Básicas</h3>
                  <p><span className="font-medium">ID:</span> {selectedDenuncia.id}</p>
                  <p><span className="font-medium">Data:</span> {formatDate(selectedDenuncia.timestamp)}</p>
                  <p><span className="font-medium">Tipo:</span> {selectedDenuncia.tipo === 'cotacao' ? 'Cotação' : 'Post'}</p>
                  <p><span className="font-medium">ID do {selectedDenuncia.tipo === 'cotacao' ? 'Cotação' : 'Post'}:</span> {selectedDenuncia.tipo === 'cotacao' ? selectedDenuncia.cotacaoId : selectedDenuncia.postId}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Denunciante</h3>
                  <p><span className="font-medium">ID do Usuário:</span> {selectedDenuncia.userId}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Motivo da Denúncia</h3>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                  {selectedDenuncia.motivo}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Atualizar Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUpdateStatus(selectedDenuncia.id, option.value)}
                      disabled={selectedDenuncia.status === option.value}
                      className={`px-3 py-2 rounded-md text-sm ${
                        selectedDenuncia.status === option.value
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => handleDelete(selectedDenuncia)}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Excluir Denúncia
                </button>
                <button
                  onClick={() => setSelectedDenuncia(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Denuncias;