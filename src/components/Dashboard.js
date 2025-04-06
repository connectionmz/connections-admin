import React, { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    porProvincia: {},
    porSetor: {},
    crescimento: []
  });

  useEffect(() => {
    const empresasRef = ref(db, 'company');
    
    const unsubscribe = onValue(empresasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const empresasArray = Object.values(data);
        setEmpresas(empresasArray);
        calcularEstatisticas(empresasArray);
      } else {
        setEmpresas([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const calcularEstatisticas = (empresas) => {
    // Total de empresas
    const total = empresas.length;
    
    // Por província
    const porProvincia = {};
    empresas.forEach(emp => {
      const provincia = emp.provincia || 'Não especificado';
      porProvincia[provincia] = (porProvincia[provincia] || 0) + 1;
    });
    
    // Por setor
    const porSetor = {};
    empresas.forEach(emp => {
      const setor = emp.sector || 'Não especificado';
      porSetor[setor] = (porSetor[setor] || 0) + 1;
    });
    
    // Crescimento mensal (simulado - ajuste conforme sua estrutura de dados)
    const crescimento = [
      { mes: 'Jan', total: Math.floor(total * 0.7) },
      { mes: 'Fev', total: Math.floor(total * 0.8) },
      { mes: 'Mar', total: Math.floor(total * 0.85) },
      { mes: 'Abr', total: Math.floor(total * 0.9) },
      { mes: 'Mai', total: Math.floor(total * 0.95) },
      { mes: 'Jun', total: total },
    ];

    setStats({
      total,
      porProvincia,
      porSetor,
      crescimento
    });
  };

  // Dados para os gráficos
  const crescimentoData = {
    labels: stats.crescimento.map(item => item.mes),
    datasets: [
      {
        label: 'Empresas Cadastradas',
        data: stats.crescimento.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      }
    ]
  };

  const provinciasData = {
    labels: Object.keys(stats.porProvincia),
    datasets: [
      {
        label: 'Empresas por Província',
        data: Object.values(stats.porProvincia),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }
    ]
  };

  const setoresData = {
    labels: Object.keys(stats.porSetor),
    datasets: [
      {
        label: 'Empresas por Setor',
        data: Object.values(stats.porSetor),
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard de Empresas</h1>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total de Empresas</h3>
          <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-500 mt-2">Registradas no sistema</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Províncias</h3>
          <p className="text-4xl font-bold text-green-600">{Object.keys(stats.porProvincia).length}</p>
          <p className="text-sm text-gray-500 mt-2">Províncias com empresas</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Setores</h3>
          <p className="text-4xl font-bold text-purple-600">{Object.keys(stats.porSetor).length}</p>
          <p className="text-sm text-gray-500 mt-2">Diferentes setores</p>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Crescimento Mensal</h3>
          <div className="h-80">
            <Line 
              data={crescimentoData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Novas Empresas por Mês',
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Distribuição por Província</h3>
          <div className="h-80">
            <Pie 
              data={provinciasData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Empresas por Setor de Atuação</h3>
        <div className="h-96">
          <Bar
            data={setoresData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Distribuição por Setor',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>
      </div>
      
      {/* Tabela com as últimas empresas */}
      <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Últimas Empresas Registradas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Província</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {empresas.slice(0, 5).map((empresa, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{empresa.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{empresa.sector || 'Não especificado'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{empresa.provincia || 'Não especificado'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{empresa.contacto || 'Não disponível'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;