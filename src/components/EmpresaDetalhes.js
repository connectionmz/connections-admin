import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, get, update } from 'firebase/database'; 
import { db } from '../fb'; 
import jsPDF from 'jspdf';
import { Alert, Snackbar } from '@mui/material';
import ModulosComponent from './ModulosComponent';

// Componentes de UI reutilizáveis
const SectionHeader = ({ title }) => (
  <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
);

const InfoCard = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
    <div className="flex items-center">
      {icon && <span className="mr-2 text-blue-500">{icon}</span>}
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    </div>
    <p className="mt-1 text-lg font-semibold text-gray-800">{value || 'Não disponível'}</p>
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
      active 
        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
);

const EmpresaDetalhes = () => {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [userModules, setUserModules] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [accessAction, setAccessAction] = useState("");
  const [expandedModules, setExpandedModules] = useState({});

  // Buscar dados da empresa
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar empresa
        const empresaSnapshot = await get(ref(db, `company/${id}`));
        const empresaData = empresaSnapshot.val();
        
        if (empresaData) {
          setEmpresa(empresaData);
          setUserModules(empresaData.activeModules || []);
          setStatus(empresaData.status || '');
        }

        // Buscar categorias
        const categoriesSnapshot = await get(ref(db, 'categoriasExternas'));
        const categoriesData = categoriesSnapshot.val() ? Object.values(categoriesSnapshot.val()) : [];
        setCategories(categoriesData);

        // Buscar assinaturas
        const subscriptionsSnapshot = await get(ref(db, 'subscriptions'));
        if (subscriptionsSnapshot.exists()) {
          const subscriptionsData = Object.values(subscriptionsSnapshot.val())
            .filter(sub => sub.companyId === id);
          setSubscriptions(subscriptionsData);
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar dados da empresa',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Manipuladores de eventos
  const handleSectorChange = async (e) => {
    const selected = e.target.value;
    setSelectedSector(selected);

    try {
      await update(ref(db, `company/${id}`), { categoriaExterna: selected });
      setSnackbar({
        open: true,
        message: `Setor "${selected}" definido com sucesso!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao definir setor:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao definir setor',
        severity: 'error'
      });
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    
    try {
      await update(ref(db, `company/${id}`), { status: newStatus });
      
      let message = '';
      switch (newStatus) {
        case 'verificado': message = 'Empresa verificada com sucesso'; break;
        case 'bloqueado': message = 'Empresa bloqueada'; break;
        case 'ativo': message = 'Empresa ativada'; break;
        default: message = 'Status atualizado';
      }
      
      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      });
    }
  };

  const handleAccessChange = (e) => {
    const action = e.target.value;
    setAccessAction(action);
    
    update(ref(db, `company/${id}`), {
      publicPainel: action === "grant"
    }).then(() => {
      setSnackbar({
        open: true,
        message: `Acesso ${action === "grant" ? "concedido" : "revogado"}`,
        severity: 'success'
      });
    }).catch(error => {
      console.error("Erro ao atualizar acesso:", error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar acesso',
        severity: 'error'
      });
    });
  };

  const toggleModuleDetails = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  const gerarFatura = (sub) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fatura: ${sub.plan.name}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Empresa: ${empresa.nome}`, 10, 25);
    doc.text(`Valor: ${sub.payment.amount} MT`, 10, 35);
    doc.text(`Método: ${sub.payment.method}`, 10, 45);
    doc.text(`Data: ${new Date(sub.payment.date).toLocaleDateString()}`, 10, 55);
    doc.text(`Expira em: ${new Date(sub.expiryDate).toLocaleDateString()}`, 10, 65);
    doc.save(`fatura_${empresa.nome}_${sub.plan.name}.pdf`);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Renderização condicional
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-lg">Empresa não encontrada</p>
      </div>
    );
  }

  // Conteúdo das abas
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="space-y-6">
            <div className="relative">
              <img 
                src={empresa.coverUrl || '/default-cover.jpg'} 
                alt="Capa" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute -bottom-12 left-6">
                <img 
                  src={empresa.logoUrl || '/default-logo.png'} 
                  alt="Logo" 
                  className="w-24 h-24 object-cover rounded-full border-4 border-white"
                />
              </div>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard title="Nome" value={empresa.nome} />
              <InfoCard title="Setor" value={empresa.sector} />
              <InfoCard title="Província" value={empresa.provincia} />
              <InfoCard title="NUIT" value={empresa.nuit} />
              <InfoCard title="Contacto" value={empresa.contacto} />
              <InfoCard title="Email" value={empresa.email} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <SectionHeader title="Sobre" />
              <p className="text-gray-700 whitespace-pre-line">
                {empresa.bio || 'Nenhuma informação disponível'}
              </p>
            </div>

            {empresa.missaoVisaoValores && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="Missão, Visão e Valores" />
                <div dangerouslySetInnerHTML={{ __html: empresa.missaoVisaoValores }} />
              </div>
            )}
          </div>
        );

      case 'modulos':
        return (
          <div className="space-y-6">
            <SectionHeader title="Módulos Ativos" />
            
            {Object.keys(userModules).length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(userModules)
                  .filter(([_, module]) => module.status === "active")
                  .map(([key, module]) => (
                    <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleModuleDetails(key)}
                      >
                        <h3 className="font-medium text-gray-800 capitalize">{key.replace('modulo', '')}</h3>
                        <span className="text-gray-500">
                          {expandedModules[key] ? '▲' : '▼'}
                        </span>
                      </div>
                      
                      {expandedModules[key] && (
                        <div className="mt-3 pl-2 border-l-2 border-blue-200 space-y-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Status:</span> {module.status}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Ativado em:</span> {new Date(module.activatedAt).toLocaleDateString()}
                          </p>
                          {module.smsCount && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">SMS disponíveis:</span> {module.smsCount}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum módulo ativo</p>
            )}

            <ModulosComponent empresa={empresa} activeModules={userModules} />
          </div>
        );

      case 'configuracoes':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <SectionHeader title="Configurações da Empresa" />
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status da Empresa</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um status</option>
                    <option value="verificado">Verificado</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="ativo">Ativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor Público</label>
                  <select
                    value={selectedSector}
                    onChange={handleSectorChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um setor</option>
                    {categories.map((cat, index) => (
                      <option key={index} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acesso ao Painel Público</label>
                  <select
                    value={accessAction}
                    onChange={handleAccessChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione uma ação</option>
                    <option value="grant">Conceder acesso</option>
                    <option value="revoke">Revogar acesso</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'historico':
        return (
          <div className="space-y-6">
            <SectionHeader title="Histórico de Pagamentos" />
            
            {subscriptions.length > 0 ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((sub, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sub.plan?.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sub.payment.amount} MT</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 capitalize">{sub.payment.method}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {new Date(sub.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sub.status === 'active' ? 'bg-green-100 text-green-800' :
                            sub.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => gerarFatura(sub)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Baixar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Nenhum histórico de pagamento encontrado</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-10">
            <p className="text-gray-500">Conteúdo não disponível</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <img
            src={empresa.logoUrl || '/default-logo.png'}
            alt="Logo"
            className="w-16 h-16 rounded-full mr-4 object-cover border border-gray-200"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{empresa.nome}</h1>
            <p className="text-gray-500">{empresa.sector}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            empresa.status === 'ativo' ? 'bg-green-100 text-green-800' :
            empresa.status === 'bloqueado' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {empresa.status || 'Sem status'}
          </span>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-2 overflow-x-auto">
          <TabButton 
            active={activeTab === 'inicio'} 
            onClick={() => setActiveTab('inicio')}
          >
            Visão Geral
          </TabButton>
          <TabButton 
            active={activeTab === 'modulos'} 
            onClick={() => setActiveTab('modulos')}
          >
            Módulos
          </TabButton>
          <TabButton 
            active={activeTab === 'configuracoes'} 
            onClick={() => setActiveTab('configuracoes')}
          >
            Configurações
          </TabButton>
          <TabButton 
            active={activeTab === 'historico'} 
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </TabButton>
        </nav>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {renderTabContent()}
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default EmpresaDetalhes;