import React, { useState } from 'react';

const Cotacoes = ({ cotacoes }) => {
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    const isAscending = sortField === field && sortDirection === 'asc';
    setSortField(field);
    setSortDirection(isAscending ? 'desc' : 'asc');
  };

  const sortedCotacoes = Object.entries(cotacoes).sort(([idA, cotA], [idB, cotB]) => {
    const valA = cotA[sortField] || '';
    const valB = cotB[sortField] || '';
    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'text-green-600';
      case 'encerrado':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Cotações da Empresa</h2>
      {Object.keys(cotacoes).length > 0 ? (
        <table className="min-w-full border-collapse border border-gray-200 mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th
                className="border border-gray-200 px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('title')}
              >
                Título {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border border-gray-200 px-4 py-2 text-left">Descrição</th>
              <th
                className="border border-gray-200 px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('sector')}
              >
                Setor {sortField === 'sector' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="border border-gray-200 px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="border border-gray-200 px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSort('datalimite')}
              >
                Data Limite {sortField === 'datalimite' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border border-gray-200 px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedCotacoes.map(([cotacaoId, cotacao]) => (
              <tr key={cotacaoId} className="border-b hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2">{cotacao.title}</td>
                <td className="border border-gray-200 px-4 py-2">
                  <div dangerouslySetInnerHTML={{ __html: cotacao.description }} />
                </td>
                <td className="border border-gray-200 px-4 py-2">{cotacao.sector}</td>
                <td className={`border border-gray-200 px-4 py-2 ${getStatusColor(cotacao.status)}`}>
                  {cotacao.status}
                </td>
                <td className="border border-gray-200 px-4 py-2">
                  {new Date(cotacao.datalimite).toLocaleDateString()}
                </td>
                <td className="border border-gray-200 px-4 py-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    onClick={() => console.log('Visualizar/Editar:', cotacaoId)}
                  >
                    Ver/Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500 mt-4">Nenhuma cotação encontrada.</p>
      )}
    </div>
  );
};

export default Cotacoes;
