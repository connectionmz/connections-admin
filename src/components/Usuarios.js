import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../fb';
import { ref, get } from 'firebase/database';
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

const EstatisticasEmpresas = () => {
  const [dadosEmpresas, setDadosEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [erro, setErro] = useState(null);

  // Configurações de cores
  const CORES = {
    online: '#4CAF50',
    inativo: '#FF9800',
    offline: '#F44336',
    acessos: '#2196F3',
    fundo: 'rgba(33, 150, 243, 0.1)',
    gradiente: {
      inicio: 'rgba(33, 150, 243, 0.2)',
      fim: 'rgba(33, 150, 243, 0.05)'
    }
  };

  const buscarDadosEmpresas = async () => {
    try {
      setLoading(true);
      setErro(null);
      
      const empresasRef = ref(db, 'company');
      const accessLogsRef = ref(db, 'accessLogs');

      const [empresasSnapshot, accessSnapshot] = await Promise.all([
        get(empresasRef),
        get(accessLogsRef)
      ]);

      const empresas = empresasSnapshot.exists() ? empresasSnapshot.val() : {};
      const accessLogs = accessSnapshot.exists() ? accessSnapshot.val() : {};

      const agora = new Date();
      const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      const umMesAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const empresasProcessadas = Object.keys(empresas).map(userId => {
        const empresa = empresas[userId];
        const ultimoLogin = new Date(empresa.lastLogin || 0);
        
        // Tentar obter data de criação de diferentes fontes
        let dataCriacao = new Date(0);
        if (empresa.createdAt) {
          // Se for timestamp do Firebase
          if (empresa.createdAt.seconds) {
            dataCriacao = new Date(empresa.createdAt.seconds * 1000);
          } else {
            dataCriacao = new Date(empresa.createdAt);
          }
        } else if (empresa.criadoEm) {
          dataCriacao = new Date(empresa.criadoEm);
        } else if (empresa.dataCadastro) {
          dataCriacao = new Date(empresa.dataCadastro);
        } else {
          // Fallback: usar a data do primeiro acesso ou data atual
          dataCriacao = ultimoLogin.getFullYear() > 1970 ? ultimoLogin : new Date();
        }
        
        const acessosUsuario = accessLogs[userId] || {};

        // Contar acessos por período
        const acessosHoje = Object.values(acessosUsuario).filter(acesso => {
          const dataAcesso = new Date(acesso.accessedAt || acesso.timestamp);
          return dataAcesso >= hoje;
        }).length;

        const acessosSemana = Object.values(acessosUsuario).filter(acesso => {
          const dataAcesso = new Date(acesso.accessedAt || acesso.timestamp);
          return dataAcesso >= umaSemanaAtras;
        }).length;

        const acessosMes = Object.values(acessosUsuario).filter(acesso => {
          const dataAcesso = new Date(acesso.accessedAt || acesso.timestamp);
          return dataAcesso >= umMesAtras;
        }).length;

        // Determinar status
        let status = 'online';
        const diasDesdeUltimoLogin = Math.floor((agora - ultimoLogin) / (1000 * 60 * 60 * 24));

        if (diasDesdeUltimoLogin > 7) {
          status = 'offline';
        } else if (diasDesdeUltimoLogin > 1) {
          status = 'inativo';
        }

        // Calcular frequência de uso
        const frequenciaUso = acessosMes > 0 ? (acessosSemana / acessosMes) * 100 : 0;

        return {
          id: userId,
          ...empresa,
          ultimoLogin: ultimoLogin,
          dataCriacao: dataCriacao,
          diasOffline: diasDesdeUltimoLogin,
          status,
          acessosHoje,
          acessosSemana,
          acessosMes,
          totalAcessos: Object.keys(acessosUsuario).length,
          frequenciaUso,
          ultimosAcessos: Object.values(acessosUsuario)
            .sort((a, b) => new Date(b.accessedAt || b.timestamp) - new Date(a.accessedAt || a.timestamp))
            .slice(0, 5)
        };
      });

      setDadosEmpresas(empresasProcessadas);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setErro('Falha ao carregar dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (dadosEmpresas.length === 0) {
      return {
        totalEmpresas: 0,
        empresasOnline: 0,
        empresasInativas: 0,
        empresasOffline: 0,
        acessosHojeTotal: 0,
        acessosSemanaTotal: 0,
        acessosMesTotal: 0,
        taxaRetencao: 0,
        mediaAcessosPorEmpresa: 0,
        dadosStatus: { labels: [], datasets: [] },
        dadosAcessosSemana: { labels: [], datasets: [] },
        dadosTopEmpresas: { labels: [], datasets: [] },
        topEmpresasAtivas: []
      };
    }

    const totalEmpresas = dadosEmpresas.length;
    const empresasOnline = dadosEmpresas.filter(e => e.status === 'online').length;
    const empresasInativas = dadosEmpresas.filter(e => e.status === 'inativo').length;
    const empresasOffline = dadosEmpresas.filter(e => e.status === 'offline').length;

    const acessosHojeTotal = dadosEmpresas.reduce((sum, e) => sum + e.acessosHoje, 0);
    const acessosSemanaTotal = dadosEmpresas.reduce((sum, e) => sum + e.acessosSemana, 0);
    const acessosMesTotal = dadosEmpresas.reduce((sum, e) => sum + e.acessosMes, 0);

    // Dados para gráfico de status
    const dadosStatus = {
      labels: ['Online', 'Inativas', 'Offline'],
      datasets: [
        {
          data: [empresasOnline, empresasInativas, empresasOffline],
          backgroundColor: [CORES.online, CORES.inativo, CORES.offline],
          borderColor: ['#ffffff', '#ffffff', '#ffffff'],
          borderWidth: 2,
          hoverOffset: 15
        }
      ]
    };

    // Dados para gráfico de acessos na semana (dados reais)
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1);
    
    const acessosPorDia = diasSemana.map((_, index) => {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + index);
      const inicioDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
      const fimDia = new Date(inicioDia.getTime() + 86400000);
      
      const total = dadosEmpresas.reduce((sum, empresa) => {
        const acessos = empresa.ultimosAcessos.filter(acesso => {
          const data = new Date(acesso.accessedAt || acesso.timestamp);
          return data >= inicioDia && data < fimDia;
        });
        return sum + acessos.length;
      }, 0);
      
      return { dia: diasSemana[index], acessos: total };
    });

    const dadosAcessosSemana = {
      labels: acessosPorDia.map(d => d.dia),
      datasets: [
        {
          label: 'Acessos',
          data: acessosPorDia.map(d => d.acessos),
          borderColor: CORES.acessos,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, CORES.gradiente.inicio);
            gradient.addColorStop(1, CORES.gradiente.fim);
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointBackgroundColor: CORES.acessos,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    // Top empresas mais ativas
    const topEmpresasAtivas = [...dadosEmpresas]
      .sort((a, b) => b.totalAcessos - a.totalAcessos)
      .slice(0, 5);

    const dadosTopEmpresas = {
      labels: topEmpresasAtivas.map(e =>
        e.nome?.substring(0, 15) + (e.nome?.length > 15 ? '...' : '')
      ),
      datasets: [
        {
          label: 'Total de Acessos',
          data: topEmpresasAtivas.map(e => e.totalAcessos),
          backgroundColor: [
            '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 4,
          hoverBackgroundColor: [
            '#0066CC', '#00997A', '#CC9900', '#CC6633', '#6A5ACD'
          ]
        }
      ]
    };

    return {
      totalEmpresas,
      empresasOnline,
      empresasInativas,
      empresasOffline,
      acessosHojeTotal,
      acessosSemanaTotal,
      acessosMesTotal,
      dadosStatus,
      dadosAcessosSemana,
      dadosTopEmpresas,
      topEmpresasAtivas,
      taxaRetencao: totalEmpresas > 0 ? ((empresasOnline / totalEmpresas) * 100).toFixed(1) : 0,
      mediaAcessosPorEmpresa: totalEmpresas > 0 ? (acessosMesTotal / totalEmpresas).toFixed(1) : 0
    };
  }, [dadosEmpresas]);

  // Filtrar empresas baseado no status
  const empresasFiltradas = useMemo(() => {
    if (filtroStatus === 'todos') return dadosEmpresas;
    return dadosEmpresas.filter(empresa => empresa.status === filtroStatus);
  }, [dadosEmpresas, filtroStatus]);

  // Empresas que nunca acessaram
  const empresasNuncaAcessaram = useMemo(() => 
    dadosEmpresas
      .filter(empresa => empresa.totalAcessos === 0)
      .sort((a, b) => {
        // Ordenar por data de criação (mais antigas primeiro)
        if (a.dataCriacao && b.dataCriacao) {
          return a.dataCriacao - b.dataCriacao;
        }
        return 0;
      }),
    [dadosEmpresas]
  );

  // Empresas com alta frequência
  const empresasAltaFrequencia = useMemo(() => 
    dadosEmpresas
      .filter(empresa => empresa.frequenciaUso > 80)
      .sort((a, b) => b.frequenciaUso - a.frequenciaUso),
    [dadosEmpresas]
  );

  useEffect(() => {
    buscarDadosEmpresas();
  }, []);

  // Opções dos gráficos
  const opcoesDoughnut = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%'
  };

  const opcoesLine = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  const opcoesBar = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Total de acessos: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Componente de loading
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        <p className="mt-4 text-lg text-gray-600">Carregando estatísticas...</p>
      </div>
    );
  }

  // Componente de erro
  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-700 mb-2">{erro}</h3>
        <button 
          onClick={buscarDadosEmpresas}
          className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Componente de Detalhes da Empresa
  const DetalhesEmpresa = ({ empresa }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{empresa.nome || 'Empresa sem nome'}</h2>
            <button
              onClick={() => setEmpresaSelecionada(null)}
              className="text-gray-500 hover:text-gray-700 text-3xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">Status</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                empresa.status === 'online' ? 'bg-green-100 text-green-800' :
                empresa.status === 'inativo' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {empresa.status}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">Total de Acessos</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">{empresa.totalAcessos}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Últimos Acessos</h3>
            <div className="space-y-2">
              {empresa.ultimosAcessos.map((acesso, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">
                    {new Date(acesso.accessedAt || acesso.timestamp).toLocaleString('pt-BR')}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    Acesso
                  </span>
                </div>
              ))}
              {empresa.ultimosAcessos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum acesso registrado</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm text-gray-600">Hoje</h3>
              <p className="text-xl font-bold text-green-600">{empresa.acessosHoje}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm text-gray-600">Esta Semana</h3>
              <p className="text-xl font-bold text-blue-600">{empresa.acessosSemana}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm text-gray-600">Este Mês</h3>
              <p className="text-xl font-bold text-purple-600">{empresa.acessosMes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Abas do sistema
  const abas = [
    { id: 'dashboard', nome: 'Dashboard', icone: '📊' },
    { id: 'todas', nome: 'Todas Empresas', icone: '🏢' },
    { id: 'acessos', nome: 'Acessos Recentes', icone: '🕒' },
    { id: 'offline', nome: 'Empresas Offline', icone: '🔴' },
    { id: 'nunca', nome: 'Nunca Acessaram', icone: '❓' },
    { id: 'top', nome: 'Top Performers', icone: '⭐' }
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      {/* Modal de Detalhes */}
      {empresaSelecionada && <DetalhesEmpresa empresa={empresaSelecionada} />}

      {/* Header com Tabs - Responsivo */}
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <div className="border-b min-w-max">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6">
            {abas.map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                  abaAtiva === aba.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{aba.icone}</span>
                <span className="hidden sm:inline">{aba.nome}</span>
                <span className="sm:hidden">{aba.nome.substring(0, 4)}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {abaAtiva === 'dashboard' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-3 md:ml-4">
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium">Empresas Online</h3>
                  <p className="text-xl md:text-3xl font-bold text-gray-800">{estatisticas.empresasOnline}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <div className="ml-3 md:ml-4">
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium">Acessos Hoje</h3>
                  <p className="text-xl md:text-3xl font-bold text-gray-800">{estatisticas.acessosHojeTotal}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-l-4 border-orange-500">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                </div>
                <div className="ml-3 md:ml-4">
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium">Empresas Inativas</h3>
                  <p className="text-xl md:text-3xl font-bold text-gray-800">{estatisticas.empresasInativas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                </div>
                <div className="ml-3 md:ml-4">
                  <h3 className="text-gray-500 text-xs md:text-sm font-medium">Taxa de Retenção</h3>
                  <p className="text-xl md:text-3xl font-bold text-gray-800">{estatisticas.taxaRetencao}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Status das Empresas</h3>
              <div className="h-72 md:h-80">
                <Doughnut data={estatisticas.dadosStatus} options={opcoesDoughnut} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Acessos na Semana</h3>
              <div className="h-72 md:h-80">
                <Line data={estatisticas.dadosAcessosSemana} options={opcoesLine} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Empresas Mais Ativas</h3>
              <div className="h-72 md:h-80">
                <Bar data={estatisticas.dadosTopEmpresas} options={opcoesBar} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Visão Geral</h3>
              <div className="space-y-4 md:space-y-6">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">Total de Empresas</span>
                  <span className="text-2xl font-bold text-blue-700">{estatisticas.totalEmpresas}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Acessos Esta Semana</span>
                  <span className="text-2xl font-bold text-green-700">{estatisticas.acessosSemanaTotal}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                  <span className="text-purple-700 font-medium">Média de Acessos/Empresa</span>
                  <span className="text-2xl font-bold text-purple-700">{estatisticas.mediaAcessosPorEmpresa}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {abaAtiva === 'todas' && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold">Todas as Empresas</h3>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="todos">Todos os Status</option>
              <option value="online">Online</option>
              <option value="inativo">Inativo</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {empresasFiltradas.map(empresa => (
              <div
                key={empresa.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setEmpresaSelecionada(empresa)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-800 truncate">{empresa.nome || 'Sem nome'}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    empresa.status === 'online' ? 'bg-green-100 text-green-800' :
                    empresa.status === 'inativo' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {empresa.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Último acesso:</span>
                    <span>{empresa.ultimoLogin.getFullYear() > 1970 
                      ? empresa.ultimoLogin.toLocaleDateString('pt-BR') 
                      : 'Nunca acessou'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de acessos:</span>
                    <span className="font-semibold">{empresa.totalAcessos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acessos hoje:</span>
                    <span className={empresa.acessosHoje > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                      {empresa.acessosHoje}
                    </span>
                  </div>
                </div>

                <button className="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  Ver Detalhes
                </button>
              </div>
            ))}
          </div>

          {empresasFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg">Nenhuma empresa encontrada com o filtro selecionado</p>
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'acessos' && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-6">Acessos Recentes (Últimas 24h)</h3>

          <div className="space-y-4">
            {dadosEmpresas
              .filter(empresa => empresa.acessosHoje > 0)
              .sort((a, b) => b.acessosHoje - a.acessosHoje)
              .map(empresa => (
                <div key={empresa.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 w-full sm:w-auto mb-3 sm:mb-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {empresa.nome?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{empresa.nome || 'Sem nome'}</h4>
                      <p className="text-sm text-gray-600">{empresa.contacto || 'Sem contato'}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="text-2xl font-bold text-blue-600">{empresa.acessosHoje}</div>
                    <div className="text-sm text-gray-500">acessos hoje</div>
                  </div>
                </div>
              ))}

            {dadosEmpresas.filter(empresa => empresa.acessosHoje > 0).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">😴</div>
                <p className="text-lg">Nenhum acesso registrado hoje</p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'offline' && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-red-600">
              Empresas Offline Críticas (+7 dias)
            </h3>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {estatisticas.empresasOffline} empresas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Empresa</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden md:table-cell">Último Acesso</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden lg:table-cell">Contato</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosEmpresas
                  .filter(empresa => empresa.status === 'offline')
                  .sort((a, b) => b.diasOffline - a.diasOffline)
                  .map(empresa => (
                    <tr key={empresa.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{empresa.nome || 'Sem nome'}</div>
                        <div className="text-sm text-gray-500 hidden sm:block">{empresa.endereco}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                        {empresa.ultimoLogin.getFullYear() > 1970 
                          ? empresa.ultimoLogin.toLocaleDateString('pt-BR') 
                          : 'Nunca acessou'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-sm text-gray-700">{empresa.contacto}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                            Email
                          </button>
                          <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                            SMS
                          </button>
                          <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors">
                            Ligar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {estatisticas.empresasOffline === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg">Nenhuma empresa offline crítica encontrada!</p>
                <p className="text-sm">Todas as empresas estão ativas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'nunca' && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-orange-600">
              Empresas que Nunca Acessaram
            </h3>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {empresasNuncaAcessaram.length} empresas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {empresasNuncaAcessaram.map(empresa => (
              <div key={empresa.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {empresa.nome?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{empresa.nome || 'Sem nome'}</h4>
                    <p className="text-sm text-orange-600 font-medium">
                      🆕 Nunca acessou o sistema
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {empresa.dataCriacao && empresa.dataCriacao.getFullYear() > 1970 
                        ? `Cadastrada em ${empresa.dataCriacao.toLocaleDateString('pt-BR')}`
                        : 'Cadastro recente'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600 font-medium">Status:</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Nunca acessou</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600 font-medium">Contato:</span>
                    <span>{empresa.contacto || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600 font-medium">Tempo sem acesso:</span>
                    <span className="text-red-600 font-medium">Desde o cadastro</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button className="flex-1 bg-orange-500 text-white py-2 rounded text-sm hover:bg-orange-600 transition-colors">
                    📧 Enviar Tutorial
                  </button>
                  <button className="flex-1 bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600 transition-colors">
                    📞 Contatar
                  </button>
                </div>
              </div>
            ))}

            {empresasNuncaAcessaram.length === 0 && (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg">Todas as empresas já acessaram o sistema!</p>
                <p className="text-sm">Excelente taxa de adoção.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'top' && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-6">Top Performers</h3>

          <div className="space-y-4">
            {empresasAltaFrequencia.map((empresa, index) => (
              <div key={empresa.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4 w-full sm:w-auto mb-3 sm:mb-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{empresa.nome || 'Sem nome'}</h4>
                    <p className="text-sm text-gray-600">{empresa.contacto}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="text-2xl font-bold text-green-600">{empresa.frequenciaUso.toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">frequência de uso</div>
                  <div className="text-sm text-gray-500 mt-1">{empresa.totalAcessos} acessos totais</div>
                </div>
              </div>
            ))}

            {empresasAltaFrequencia.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg">Nenhuma empresa com alta frequência encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstatisticasEmpresas;