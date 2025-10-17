import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../fb';

const AdminEventos = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const eventosRef = ref(db, 'eventos');
    
    const unsubscribe = onValue(eventosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventosArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setEventos(eventosArray);
      } else {
        setEventos([]);
      }
      setLoading(false);
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    const matchStatus = filtroStatus === 'todos' || evento.status === filtroStatus;
    const matchBusca = evento.titulo.toLowerCase().includes(busca.toLowerCase()) ||
                      evento.criadoPor.nome.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  // Alterar status do evento
  const alterarStatus = async (eventoId, novoStatus) => {
    try {
      const eventoRef = ref(db, `eventos/${eventoId}`);
      await update(eventoRef, { status: novoStatus });
      
      // Feedback opcional
      console.log(`Status do evento ${eventoId} alterado para: ${novoStatus}`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do evento');
    }
  };

  // Excluir evento
  const excluirEvento = async (eventoId, titulo) => {
    if (window.confirm(`Tem certeza que deseja excluir o evento "${titulo}"?`)) {
      try {
        const eventoRef = ref(db, `eventos/${eventoId}`);
        await remove(eventoRef);
        
        console.log(`Evento ${eventoId} excluído com sucesso`);
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento');
      }
    }
  };

  // Salvar edições
  const salvarEdicoes = async () => {
    if (!eventoEditando) return;

    try {
      const eventoRef = ref(db, `eventos/${eventoEditando.id}`);
      const dadosAtualizados = {
        titulo: eventoEditando.titulo,
        status: eventoEditando.status,
        ...(eventoEditando.descricao && { descricao: eventoEditando.descricao })
      };

      await update(eventoRef, dadosAtualizados);
      setEventoEditando(null);
      
      console.log('Evento atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      alert('Erro ao atualizar evento');
    }
  };

  // Formatar data
  const formatarData = (dataString) => {
    if (!dataString) return 'Data não informada';
    
    try {
      return new Date(dataString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Formatar data e hora
  const formatarDataHora = (dataString) => {
    if (!dataString) return 'Data não informada';
    
    try {
      return new Date(dataString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Obter classe do status
  const getStatusClass = (status) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'expirado':
        return 'bg-red-100 text-red-800';
      case 'rascunho':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter badge do tipo de cadastro
  const getTipoCadastroBadge = (tipo) => {
    switch (tipo) {
      case 'completo':
        return 'bg-blue-100 text-blue-800';
      case 'simples':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Administração de Eventos</h1>
          <p className="text-gray-600 mt-2">Gerencie todos os eventos do sistema - {eventos.length} evento(s) encontrado(s)</p>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Eventos
              </label>
              <input
                type="text"
                placeholder="Buscar por título ou criador..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="Ativo">Ativos</option>
                <option value="expirado">Expirados</option>
                <option value="rascunho">Rascunhos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-gray-900">{eventos.length}</div>
            <div className="text-xs md:text-sm text-gray-600">Total de Eventos</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {eventos.filter(e => e.status === 'Ativo').length}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Eventos Ativos</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {eventos.filter(e => e.status === 'expirado').length}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Eventos Expirados</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-blue-600">
              {eventos.filter(e => e.tipoCadastro === 'completo').length}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Cadastro Completo</div>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {eventosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl md:text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum evento encontrado
              </h3>
              <p className="text-gray-600">
                {busca || filtroStatus !== 'todos' 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Ainda não há eventos cadastrados'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criador
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventosFiltrados.map((evento) => (
                    <tr key={evento.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                            <img
                              className="h-8 w-8 md:h-10 md:w-10 rounded-lg object-cover"
                              src={evento.imagemDestaqueURL}
                              alt={evento.titulo}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/40?text=EV';
                              }}
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {evento.titulo}
                            </div>
                            <div className="text-xs text-gray-500">
                              Criado: {formatarDataHora(evento.criadoEm)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm text-gray-900">{evento.criadoPor?.nome || 'N/A'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                          {evento.criadoPor?.email || 'Email não informado'}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500">
                        {evento.dataInicio ? (
                          <>
                            <div>Início: {formatarData(evento.dataInicio)}</div>
                            {evento.dataFim && (
                              <div className="text-xs text-gray-400">
                                Fim: {formatarData(evento.dataFim)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-400">Data não definida</div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoCadastroBadge(evento.tipoCadastro)}`}>
                          {evento.tipoCadastro}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <select
                          value={evento.status || 'rascunho'}
                          onChange={(e) => alterarStatus(evento.id, e.target.value)}
                          className={`text-xs md:text-sm font-medium rounded-md border-0 focus:ring-2 focus:ring-blue-500 ${getStatusClass(evento.status)}`}
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="expirado">Expirado</option>
                          <option value="rascunho">Rascunho</option>
                        </select>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col md:flex-row md:space-x-2 space-y-1 md:space-y-0">
                          <button
                            onClick={() => setEventoEditando(evento)}
                            className="text-blue-600 hover:text-blue-900 text-left text-xs md:text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => excluirEvento(evento.id, evento.titulo)}
                            className="text-red-600 hover:text-red-900 text-left text-xs md:text-sm"
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
          )}
        </div>

        {/* Modal de Edição */}
        {eventoEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Editar Evento</h2>
                  <button
                    onClick={() => setEventoEditando(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={eventoEditando.titulo || ''}
                      onChange={(e) => setEventoEditando({
                        ...eventoEditando,
                        titulo: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      value={eventoEditando.status || 'rascunho'}
                      onChange={(e) => setEventoEditando({
                        ...eventoEditando,
                        status: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="expirado">Expirado</option>
                      <option value="rascunho">Rascunho</option>
                    </select>
                  </div>

                  {eventoEditando.descricao && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={eventoEditando.descricao}
                        onChange={(e) => setEventoEditando({
                          ...eventoEditando,
                          descricao: e.target.value
                        })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Informações do Criador</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Nome:</strong> {eventoEditando.criadoPor?.nome || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> {eventoEditando.criadoPor?.email || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Criado em:</strong> {formatarDataHora(eventoEditando.criadoEm)}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEventoEditando(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={salvarEdicoes}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEventos;