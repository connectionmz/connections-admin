import React, { useState, useEffect, useMemo } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../fb';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VisualizacoesConcursos = () => {
  const [concursos, setConcursos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcurso, setSelectedConcurso] = useState(null);
  const [stats, setStats] = useState({});

  // Cores para os gráficos
  const CORES = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#8B5CF6',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: 'rgba(59, 130, 246, 0.1)'
  };

  const buscarDados = async () => {
    try {
      const [concursosSnapshot, empresasSnapshot] = await Promise.all([
        get(ref(db, 'concursos')),
        get(ref(db, 'company'))
      ]);

      const concursosData = concursosSnapshot.exists() ? concursosSnapshot.val() : {};
      const empresasData = empresasSnapshot.exists() ? empresasSnapshot.val() : {};

      // Processar concursos com views
      const concursosProcessados = Object.entries(concursosData).map(([id, concurso]) => {
        const views = concurso.views || {};
        const viewCount = Object.keys(views).length;
        const viewerIds = Object.keys(views);

        return {
          id,
          ...concurso,
          viewCount,
          viewerIds,
          status: getConcursoStatus(concurso)
        };
      });

      // Processar empresas
      const empresasProcessadas = Object.entries(empresasData).map(([id, empresa]) => ({
        id,
        ...empresa
      }));

      setConcursos(concursosProcessados);
      setEmpresas(empresasProcessadas);
      calcularEstatisticas(concursosProcessados, empresasProcessadas);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConcursoStatus = (concurso) => {
    const now = new Date();
    const prazo = new Date(concurso.prazo);
    
    if (concurso.status === 'Cancelada') return 'Cancelada';
    if (concurso.status === 'Concluída') return 'Concluída';
    if (now > prazo) return 'Expirada';
    return 'Aberta';
  };

  const calcularEstatisticas = (concursosData, empresasData) => {
    const totalConcursos = concursosData.length;
    const totalEmpresas = empresasData.length;
    
    // Empresas que visualizaram pelo menos um concurso
    const empresasComViews = new Set();
    concursosData.forEach(concurso => {
      concurso.viewerIds.forEach(viewerId => {
        empresasComViews.add(viewerId);
      });
    });

    const totalVisualizacoes = concursosData.reduce((sum, c) => sum + c.viewCount, 0);
    const mediaViewsPorConcurso = totalConcursos > 0 ? (totalVisualizacoes / totalConcursos).toFixed(1) : 0;

    // Concursos mais visualizados
    const concursosMaisVistos = [...concursosData]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Empresas mais ativas (que mais visualizaram)
    const empresasAtividade = {};
    concursosData.forEach(concurso => {
      concurso.viewerIds.forEach(empresaId => {
        empresasAtividade[empresaId] = (empresasAtividade[empresaId] || 0) + 1;
      });
    });

    const empresasMaisAtivas = Object.entries(empresasAtividade)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([empresaId, views]) => {
        const empresa = empresasData.find(e => e.id === empresaId);
        return {
          nome: empresa?.nome || 'Empresa não encontrada',
          views,
          provincia: empresa?.provincia || 'N/A'
        };
      });

    // Distribuição por status
    const statusDistribuicao = {
      Aberta: concursosData.filter(c => c.status === 'Aberta').length,
      Expirada: concursosData.filter(c => c.status === 'Expirada').length,
      Cancelada: concursosData.filter(c => c.status === 'Cancelada').length,
      Concluída: concursosData.filter(c => c.status === 'Concluída').length
    };

    // Dados para gráficos
    const dadosStatus = {
      labels: ['Abertas', 'Expiradas', 'Canceladas', 'Concluídas'],
      datasets: [
        {
          data: [
            statusDistribuicao.Aberta,
            statusDistribuicao.Expirada,
            statusDistribuicao.Cancelada,
            statusDistribuicao.Concluída
          ],
          backgroundColor: [
            CORES.primary,
            CORES.warning,
            CORES.danger,
            CORES.secondary
          ],
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 15
        }
      ]
    };

    const dadosConcursosPopulares = {
      labels: concursosMaisVistos.map(c => 
        c.titulo?.substring(0, 20) + (c.titulo?.length > 20 ? '...' : '')
      ),
      datasets: [
        {
          label: 'Visualizações',
          data: concursosMaisVistos.map(c => c.viewCount),
          backgroundColor: CORES.accent,
          borderColor: CORES.accent,
          borderWidth: 2
        }
      ]
    };

    setStats({
      totalConcursos,
      totalEmpresas,
      empresasComViews: empresasComViews.size,
      totalVisualizacoes,
      mediaViewsPorConcurso,
      concursosMaisVistos,
      empresasMaisAtivas,
      dadosStatus,
      dadosConcursosPopulares,
      taxaEngajamento: ((empresasComViews.size / totalEmpresas) * 100).toFixed(1)
    });
  };

  useEffect(() => {
    buscarDados();
  }, []);

  // Opções dos gráficos
  const opcoesDoughnut = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
  };

  const opcoesBar = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg">Carregando estatísticas de visualizações...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header com KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-blue-100 text-sm font-medium">Total Visualizações</h3>
              <p className="text-3xl font-bold">{stats.totalVisualizacoes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-green-100 text-sm font-medium">Concursos Ativos</h3>
              <p className="text-3xl font-bold">{stats.totalConcursos}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-purple-100 text-sm font-medium">Empresas Engajadas</h3>
              <p className="text-3xl font-bold">{stats.empresasComViews}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-orange-100 text-sm font-medium">Taxa de Engajamento</h3>
              <p className="text-3xl font-bold">{stats.taxaEngajamento}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status dos Concursos */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Distribuição por Status</h3>
          <div className="h-80">
            {stats.dadosStatus && <Doughnut data={stats.dadosStatus} options={opcoesDoughnut} />}
          </div>
        </div>

        {/* Concursos Mais Populares */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Concursos Mais Visualizados</h3>
          <div className="h-80">
            {stats.dadosConcursosPopulares && <Bar data={stats.dadosConcursosPopulares} options={opcoesBar} />}
          </div>
        </div>
      </div>

      {/* Lista de Concursos com Visualizações */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Concursos e suas Visualizações</h2>
          <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
            {concursos.length} concursos
          </span>
        </div>

        <div className="space-y-4">
          {concursos.map(concurso => (
            <div key={concurso.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{concurso.titulo}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        concurso.status === 'Aberta' ? 'bg-green-100 text-green-800' :
                        concurso.status === 'Expirada' ? 'bg-orange-100 text-orange-800' :
                        concurso.status === 'Cancelada' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {concurso.status}
                      </span>
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {concurso.viewCount} visualizações
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p><span className="font-medium">Referência:</span> {concurso.numeroReferencia}</p>
                      <p><span className="font-medium">Entidade:</span> {concurso.entidade}</p>
                      <p><span className="font-medium">Valor:</span> {parseFloat(concurso.valorEstimado || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Prazo:</span> {new Date(concurso.prazo).toLocaleDateString('pt-MZ')}</p>
                      <p><span className="font-medium">Setor:</span> {concurso.setor}</p>
                      <p><span className="font-medium">Modalidade:</span> {concurso.modalidade}</p>
                    </div>
                  </div>

                  {/* Empresas que visualizaram */}
                  {concurso.viewCount > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Empresas que visualizaram:</h4>
                      <div className="flex flex-wrap gap-2">
                        {concurso.viewerIds.map(viewerId => {
                          const empresa = empresas.find(e => e.id === viewerId);
                          return (
                            <span
                              key={viewerId}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              title={empresa?.provincia || 'Província não informada'}
                            >
                              {empresa?.nome || 'Empresa não encontrada'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => setSelectedConcurso(concurso)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Ver Detalhes
                  </button>
                  {concurso.anexos && concurso.anexos.length > 0 && (
                    <span className="text-sm text-gray-500 text-center">
                      {concurso.anexos.length} anexo(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empresas Mais Ativas */}
      {stats.empresasMaisAtivas && stats.empresasMaisAtivas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Empresas Mais Ativas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.empresasMaisAtivas.map((empresa, index) => (
              <div key={index} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                  {empresa.nome.charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate" title={empresa.nome}>
                  {empresa.nome}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{empresa.provincia}</p>
                <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {empresa.views} visualizações
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Concurso */}
      {selectedConcurso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{selectedConcurso.titulo}</h3>
              <button
                onClick={() => setSelectedConcurso(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">Informações do Concurso</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Número de Referência:</span>
                    <span className="text-gray-900">{selectedConcurso.numeroReferencia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Entidade:</span>
                    <span className="text-gray-900">{selectedConcurso.entidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Modalidade:</span>
                    <span className="text-gray-900">{selectedConcurso.modalidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Valor Estimado:</span>
                    <span className="text-gray-900">
                      {parseFloat(selectedConcurso.valorEstimado || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Data de Abertura:</span>
                    <span className="text-gray-900">
                      {new Date(selectedConcurso.dataAbertura).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Prazo:</span>
                    <span className="text-gray-900">
                      {new Date(selectedConcurso.prazo).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Estatísticas de Visualização</h4>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-blue-600">{selectedConcurso.viewCount}</div>
                    <div className="text-blue-600 font-medium">Total de Visualizações</div>
                  </div>
                  
                  <h5 className="font-medium text-gray-900 mb-2">Empresas que visualizaram:</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedConcurso.viewerIds.map(viewerId => {
                      const empresa = empresas.find(e => e.id === viewerId);
                      return (
                        <div key={viewerId} className="flex items-center justify-between bg-white p-2 rounded">
                          <span className="text-sm text-gray-900">
                            {empresa?.nome || 'Empresa não encontrada'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {empresa?.provincia || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {selectedConcurso.anexos && selectedConcurso.anexos.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-lg mb-3">Documentos Anexos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedConcurso.anexos.map((anexo, index) => (
                    <a
                      key={anexo.id}
                      href={anexo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-900 truncate flex-1">{anexo.nome}</span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {(anexo.tamanho / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedConcurso(null)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizacoesConcursos;