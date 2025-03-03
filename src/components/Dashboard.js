import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb'; // Importe a configuração do Firebase

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [salesData, setSalesData] = useState({
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Vendas Mensais',
        data: [5000, 7000, 8000, 12000, 15000, 18000],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  });

  const [funnelData, setFunnelData] = useState({
    labels: ['Leads', 'Contato', 'Propostas', 'Fechamento'],
    datasets: [
      {
        label: 'Sales Funnel',
        data: [100, 80, 50, 30],
        backgroundColor: ['#FF0000', '#FF7F00', '#FFC107', '#4CAF50'],
        borderColor: ['#FF0000', '#FF7F00', '#FFC107', '#4CAF50'],
        borderWidth: 1,
      },
    ],
  });

  const [summary, setSummary] = useState([
    { title: 'Pagamentos de planos', value: '$12,000', bgColor: 'bg-black', textColor: 'text-white' },
    { title: 'Pagamentos de Publicidades', value: '$5,000', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    { title: 'Empresas Cadastradas', value: '120', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  ]);

  return (
    <>
      <div className="flex-1 p-6">
        <div className="max-w-screen-xl mx-auto bg-white rounded-xl p-8 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Estatísticas Gerais</h1>
              <p className="text-sm text-gray-400">2024</p>
            </div>
            <div>
              <button className="bg-black text-white py-2 px-4 rounded-lg">
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {summary.map((item, index) => (
              <div key={index} className={`${item.bgColor} ${item.textColor} p-6 rounded-lg`}>
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="text-3xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Vendas Mensais</h2>
              <Line data={salesData} options={{ responsive: true, plugins: { title: { display: true, text: 'Vendas por Mês' } } }} />
            </div>

            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Funil de Vendas</h2>
              <Bar data={funnelData} options={{ responsive: true, plugins: { title: { display: true, text: 'Funil de Vendas' } } }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-400 p-4 rounded-lg">3 Cotações</div>
            <div className="bg-green-500 p-4 rounded-lg">15 Publicidades</div>
            <div className="bg-gray-400 p-4 rounded-lg">12 Concursos</div>
            <div className="bg-gray-400 p-4 rounded-lg">WhatsApp</div>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Total de Transações</h2>
            <p className="text-3xl font-bold">$35.0K</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
