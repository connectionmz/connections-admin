import React, { useState, useEffect } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { db } from '../../fb';

const Cotacoes = () => {
  const [cotacoes, setCotacoes] = useState([]);
  const [filteredCotacoes, setFilteredCotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [actionLog, setActionLog] = useState([]);

  const fetchCotacoes = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, 'cotacoes'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const cotacoesList = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setCotacoes(cotacoesList);
        setFilteredCotacoes(cotacoesList);
      } else {
        setCotacoes([]);
        setFilteredCotacoes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (status) => {
    setStatusFilter(status);
    if (status === 'all') {
      setFilteredCotacoes(cotacoes);
    } else {
      setFilteredCotacoes(cotacoes.filter((cotacao) => cotacao.status === status));
    }
    setCurrentPage(1); // Resetar a página ao aplicar filtro
  };

  const logAction = (action, cotacao) => {
    setActionLog((prevLog) => [
      ...prevLog,
      { action, cotacaoId: cotacao.id, timestamp: new Date().toISOString() },
    ]);
  };

  const notifyEmpresa = (cotacao) => {
    alert(`Notificando a empresa: ${cotacao.company.nome}`);
    logAction('Notificado', cotacao);
  };

  const callEmpresa = (cotacao) => {
    alert(`Ligando para: ${cotacao.company.contacto}`);
    logAction('Ligação Realizada', cotacao);
  };

  const blockCotacao = async (id) => {
    try {
      await update(ref(db, `cotacoes/${id}`), { status: 'bloqueado' });
      alert('Cotação bloqueada com sucesso.');
      fetchCotacoes();
      logAction('Bloqueado', { id });
    } catch (error) {
      console.error('Erro ao bloquear cotação:', error);
    }
  };

  const deleteCotacao = async (id) => {
    try {
      await remove(ref(db, `cotacoes/${id}`));
      alert('Cotação eliminada com sucesso.');
      fetchCotacoes();
      logAction('Eliminado', { id });
    } catch (error) {
      console.error('Erro ao eliminar cotação:', error);
    }
  };

  const getPaginatedCotacoes = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCotacoes.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCotacoes.length / itemsPerPage);

  useEffect(() => {
    fetchCotacoes();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestão de Cotações</h1>
      {/* Filtros */}
      <div className="flex space-x-4 mb-6">
        {['all', 'open', 'bloqueado'].map((status) => (
          <button
            key={status}
            className={`px-4 py-2 rounded ${
              statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => applyFilter(status)}
          >
            {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
      {/* Lista de Cotações */}
      {loading ? (
        <p className="text-center text-gray-500">Carregando cotações...</p>
      ) : filteredCotacoes.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma cotação encontrada.</p>
      ) : (
        <div className="space-y-4">
          {getPaginatedCotacoes().map((cotacao) => (
            <div
              key={cotacao.id}
              className="p-4 border rounded-lg bg-gray-100 shadow-sm hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{cotacao.title}</h2>
                  <p className="text-sm text-gray-600">Empresa: {cotacao.company.nome}</p>
                  <p className="text-sm text-gray-600">Contacto: {cotacao.company.contacto}</p>
                  <p className="text-sm text-gray-600">
                    Data Limite: {new Date(cotacao.datalimite).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">Status: {cotacao.status}</p>
                </div>
                <a
                  href={cotacao.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Ver Detalhes
                </a>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  onClick={() => notifyEmpresa(cotacao)}
                >
                  Notificar Empresa
                </button>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={() => callEmpresa(cotacao)}
                >
                  Ligar para Empresa
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={() => blockCotacao(cotacao.id)}
                >
                  Bloquear
                </button>
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={() => deleteCotacao(cotacao.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Paginação */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            className={`px-3 py-1 rounded ${
              currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {/* Histórico de Ações */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Histórico de Ações</h2>
        <ul className="space-y-2">
          {actionLog.map((log, index) => (
            <li key={index} className="p-2 bg-gray-100 rounded shadow-sm">
              Ação: {log.action} - Cotação ID: {log.cotacaoId} - Data: {new Date(log.timestamp).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Cotacoes;
