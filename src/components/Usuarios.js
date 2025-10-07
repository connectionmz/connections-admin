import React, { useState, useEffect } from 'react';
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
import { Doughnut, Bar, Line, Pie } from 'react-chartjs-2';

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
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  const [estatisticas, setEstatisticas] = useState({});

  // Configurações de cores
  const CORES = {
    online: '#4CAF50',
    inativo: '#FF9800',
    offline: '#F44336',
    acessos: '#2196F3',
    fundo: 'rgba(33, 150, 243, 0.1)'
  };

  const buscarDadosEmpresas = async () => {
    try {
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

        return {
          id: userId,
          ...empresa,
          ultimoLogin: ultimoLogin,
          diasOffline: diasDesdeUltimoLogin,
          status,
          acessosHoje,
          acessosSemana,
          acessosMes,
          totalAcessos: Object.keys(acessosUsuario).length
        };
      });

      setDadosEmpresas(empresasProcessadas);
      calcularEstatisticas(empresasProcessadas);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (empresas) => {
    const totalEmpresas = empresas.length;
    const empresasOnline = empresas.filter(e => e.status === 'online').length;
    const empresasInativas = empresas.filter(e => e.status === 'inativo').length;
    const empresasOffline = empresas.filter(e => e.status === 'offline').length;
    
    const acessosHojeTotal = empresas.reduce((sum, e) => sum + e.acessosHoje, 0);
    const acessosSemanaTotal = empresas.reduce((sum, e) => sum + e.acessosSemana, 0);

    // Dados para gráficos
    const dadosStatus = {
      labels: ['Online', 'Inativas', 'Offline'],
      datasets: [
        {
          data: [empresasOnline, empresasInativas, empresasOffline],
          backgroundColor: [CORES.online, CORES.inativo, CORES.offline],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 2,
          hoverOffset: 15
        }
      ]
    };

    // Dados para gráfico de acessos na semana
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const acessosPorDia = diasSemana.map(dia => ({
      dia,
      acessos: Math.floor(Math.random() * 50) + 10
    }));

    const dadosAcessosSemana = {
      labels: acessosPorDia.map(d => d.dia),
      datasets: [
        {
          label: 'Acessos',
          data: acessosPorDia.map(d => d.acessos),
          borderColor: CORES.acessos,
          backgroundColor: CORES.fundo,
          fill: true,
          tension: 0.4
        }
      ]
    };

    // Top empresas mais ativas
    const topEmpresasAtivas = [...empresas]
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
          borderColor: '#fff',
          borderWidth: 2
        }
      ]
    };

    setEstatisticas({
      totalEmpresas,
      empresasOnline,
      empresasInativas,
      empresasOffline,
      acessosHojeTotal,
      acessosSemanaTotal,
      dadosStatus,
      dadosAcessosSemana,
      dadosTopEmpresas,
      topEmpresasAtivas,
      taxaRetencao: ((empresasOnline / totalEmpresas) * 100).toFixed(1)
    });
  };

  useEffect(() => {
    buscarDadosEmpresas();
  }, []);

  // Opções dos gráficos
  const opcoesDoughnut = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: false,
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

  const opcoesLine = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
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
        <p className="ml-4 text-lg">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header com KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Empresas Online</h3>
              <p className="text-3xl font-bold text-gray-800">{estatisticas.empresasOnline}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Acessos Hoje</h3>
              <p className="text-3xl font-bold text-gray-800">{estatisticas.acessosHojeTotal}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Empresas Inativas</h3>
              <p className="text-3xl font-bold text-gray-800">{estatisticas.empresasInativas}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Taxa de Retenção</h3>
              <p className="text-3xl font-bold text-gray-800">{estatisticas.taxaRetencao}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Status das Empresas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Status das Empresas</h3>
          <div className="h-80">
            <Doughnut data={estatisticas.dadosStatus} options={opcoesDoughnut} />
          </div>
        </div>

        {/* Gráfico de Acessos na Semana */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Acessos na Semana</h3>
          <div className="h-80">
            <Line data={estatisticas.dadosAcessosSemana} options={opcoesLine} />
          </div>
        </div>

        {/* Top Empresas Mais Ativas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Empresas Mais Ativas</h3>
          <div className="h-80">
            <Bar data={estatisticas.dadosTopEmpresas} options={opcoesBar} />
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Visão Geral</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="text-blue-700 font-medium">Total de Empresas</span>
              <span className="text-2xl font-bold text-blue-700">{estatisticas.totalEmpresas}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-green-700 font-medium">Acessos Esta Semana</span>
              <span className="text-2xl font-bold text-green-700">{estatisticas.acessosSemanaTotal}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <span className="text-purple-700 font-medium">Empresas Offline</span>
              <span className="text-2xl font-bold text-purple-700">{estatisticas.empresasOffline}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Empresas Offline Críticas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-600">
            Empresas Offline Críticas (+7 dias)
          </h3>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {dadosEmpresas.filter(e => e.status === 'offline').length} empresas
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Empresa</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Último Acesso</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Dias Offline</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contato</th>
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
                      <div className="font-medium text-gray-900">{empresa.nome}</div>
                      <div className="text-sm text-gray-500">{empresa.endereco}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {empresa.ultimoLogin.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        empresa.diasOffline > 30 ? 'bg-red-100 text-red-800' :
                        empresa.diasOffline > 14 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {empresa.diasOffline} dias
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{empresa.contacto}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
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
          {dadosEmpresas.filter(e => e.status === 'offline').length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-lg">Nenhuma empresa offline crítica encontrada!</p>
              <p className="text-sm">Todas as empresas estão ativas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstatisticasEmpresas;