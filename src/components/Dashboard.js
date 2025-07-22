import React, { useEffect, useState } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';
import { FiTrendingUp, FiMapPin, FiBriefcase, FiUsers, FiCalendar } from 'react-icons/fi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Summary Card Component
const SummaryCard = ({ title, value, description, icon, color }) => {
  const iconColors = {
    blue: 'text-blue-500 bg-blue-100',
    green: 'text-green-500 bg-green-100',
    purple: 'text-purple-500 bg-purple-100',
    orange: 'text-orange-500 bg-orange-100'
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-gray-800">{value}</h3>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Chart Card Component
const ChartCard = ({ title, children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="h-72">
      {children}
    </div>
  </div>
);

const CompanyTable = ({ empresas }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sort companies by createdAt date (newest first)
  const sortedEmpresas = [...empresas].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA; // Descending order
  });

  const totalPages = Math.ceil(sortedEmpresas.length / itemsPerPage);

  // Get data for current page
  const paginatedData = sortedEmpresas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper function to check if company is new (registered in last 7 days)
  const isNew = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Table header with title and pagination controls */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Últimas Empresas Registradas</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            &lt;
          </button>
          <span className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>
      
      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table headers */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Província</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registro</th>
            </tr>
          </thead>
          
          {/* Table body with company data */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((empresa, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {/* Name column with avatar */}
                <td className="px-6 py-4 whitespace-nowrap">
             <div className="flex items-center">
  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
    <a href={`/empresas/${empresa.id}`} className="flex items-center justify-center w-full h-full">
      <span className="text-blue-600 font-medium hover:text-blue-800">
        {empresa.nome?.charAt(0)?.toUpperCase() || 'E'}
      </span>
    </a>
  </div>
  
  <div className="ml-4">
    <a 
      href={`/empresas/${empresa.id}`}
      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
    >
      {empresa.nome}
    </a>
    <div className="text-sm text-gray-500">{empresa.email}</div>
  </div>
</div>
                </td>
                
                {/* Sector column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{empresa.sector || 'Não especificado'}</div>
                </td>
                
                {/* Province column with badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {empresa.provincia || 'Não especificado'}
                  </span>
                </td>
                
                {/* Contact column */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {empresa.contacto || 'Não disponível'}
                </td>
                
                {/* Registration date column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(empresa.createdAt || Date.now()).toLocaleDateString()}
                    {isNew(empresa.createdAt) && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Novo
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Filters Component (with native date inputs)
const Filters = ({ onFilter }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sector, setSector] = useState('');

  const handleFilter = () => {
    const filters = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      sector
    };
    onFilter(filters);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSector('');
    onFilter({ startDate: null, endDate: null, sector: '' });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
          >
            <option value="">Todos os Setores</option>
            <option value="Tecnologia">Tecnologia</option>
            <option value="Comércio">Comércio</option>
            <option value="Serviços">Serviços</option>
            <option value="Indústria">Indústria</option>
            <option value="Agricultura">Agricultura</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleFilter}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Aplicar Filtros
          </button>
          <button 
            onClick={handleReset}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    porProvincia: {},
    porSetor: {},
    crescimento: []
  });

  useEffect(() => {
    const empresasRef = ref(db, 'company');
    
const unsubscribe = onValue(empresasRef, (snapshot) => {
  try {
    const data = snapshot.val();
    let empresasArray = [];

    if (data) {
      empresasArray = Object.values(data).filter(empresa => 
        empresa.type !== 'singular'
      );
    }

    setEmpresas(empresasArray);
    setFilteredEmpresas(empresasArray);
    calcularEstatisticas(empresasArray);
    setLoading(false);
  } catch (err) {
    setError('Erro ao carregar os dados das empresas.');
    setLoading(false);
  }
});

    return () => unsubscribe();
  }, []);

  const handleFilter = ({ startDate, endDate, sector }) => {
    let filtered = [...empresas];
    
    if (sector) {
      filtered = filtered.filter(emp => emp.sector === sector);
    }
    
    if (startDate && endDate) {
      filtered = filtered.filter(emp => {
        const empDate = new Date(emp.createdAt || Date.now());
        return empDate >= startDate && empDate <= endDate;
      });
    }
    
    setFilteredEmpresas(filtered);
    calcularEstatisticas(filtered);
  };

  const calcularEstatisticas = (empresas) => {
    const total = empresas.length;
    const porProvincia = {};
    const porSetor = {};

    empresas.forEach(emp => {
      const provincia = emp.provincia || 'Não especificado';
      const setor = emp.sector || 'Não especificado';
      porProvincia[provincia] = (porProvincia[provincia] || 0) + 1;
      porSetor[setor] = (porSetor[setor] || 0) + 1;
    });

    const crescimento = [
      { mes: 'Jan', total: Math.floor(total * 0.3) },
      { mes: 'Fev', total: Math.floor(total * 0.4) },
      { mes: 'Mar', total: Math.floor(total * 0.5) },
      { mes: 'Abr', total: Math.floor(total * 0.6) },
      { mes: 'Mai', total: Math.floor(total * 0.8) },
      { mes: 'Jun', total: Math.floor(total * 0.9) },
      { mes: 'Jul', total: total },
    ];

    setStats({ total, porProvincia, porSetor, crescimento });
  };

  // Chart data
  const crescimentoData = {
    labels: stats.crescimento.map(item => item.mes),
    datasets: [
      {
        label: 'Empresas Cadastradas',
        data: stats.crescimento.map(item => item.total),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(99, 102, 241)',
        pointHoverBorderColor: '#fff',
        pointHitRadius: 10,
        pointBorderWidth: 2
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
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(20, 184, 166, 0.7)',
        ],
        borderWidth: 0,
      }
    ]
  };

  const setoresData = {
    labels: Object.keys(stats.porSetor),
    datasets: [
      {
        label: 'Empresas por Setor',
        data: Object.values(stats.porSetor),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const topProvincias = Object.entries(stats.porProvincia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 p-6 rounded-lg max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Empresarial</h1>
            <p className="text-gray-500">Visão geral das empresas cadastradas</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Atualizado em: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <Filters onFilter={handleFilter} />
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard 
            title="Total de Empresas" 
            value={stats.total} 
            description="+5% em relação ao mês passado" 
            icon={<FiTrendingUp size={20} />} 
            color="blue" 
          />
          <SummaryCard 
            title="Províncias" 
            value={Object.keys(stats.porProvincia).length} 
            description="Diversidade geográfica" 
            icon={<FiMapPin size={20} />} 
            color="green" 
          />
          <SummaryCard 
            title="Setores" 
            value={Object.keys(stats.porSetor).length} 
            description="Diversidade econômica" 
            icon={<FiBriefcase size={20} />} 
            color="purple" 
          />
          <SummaryCard 
            title="Novas Empresas" 
            value={stats.crescimento[stats.crescimento.length - 1].total - stats.crescimento[stats.crescimento.length - 2].total} 
            description="Último mês" 
            icon={<FiUsers size={20} />} 
            color="orange" 
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ChartCard title="Crescimento Mensal">
            <Line 
              data={crescimentoData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      drawBorder: false
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }} 
            />
          </ChartCard>
          
          <ChartCard title="Distribuição por Província">
            <div className="flex h-full">
              <div className="w-2/3">
                <Doughnut 
                  data={provinciasData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'right',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                    },
                    cutout: '70%',
                  }} 
                />
              </div>
              <div className="w-1/3 pl-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Top Províncias</h4>
                <ul className="space-y-3">
                  {topProvincias.map(([provincia, count], index) => (
                    <li key={index} className="flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        index === 0 ? 'bg-indigo-500' : 
                        index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></span>
                      <span className="text-sm font-medium text-gray-700">{provincia}</span>
                      <span className="ml-auto text-sm font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ChartCard>
        </div>
        
        <div className="grid grid-cols-1 gap-8 mb-8">
          <ChartCard title="Empresas por Setor de Atuação">
            <Bar 
              data={setoresData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    display: false
                  },
                },
                scales: { 
                  y: { 
                    beginAtZero: true, 
                    ticks: { 
                      stepSize: 1,
                      precision: 0
                    },
                    grid: {
                      drawBorder: false
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
              }} 
            />
          </ChartCard>
        </div>
        
        {/* Company Table */}
        <CompanyTable empresas={filteredEmpresas} />
      </div>
    </div>
  );
};

export default Dashboard;