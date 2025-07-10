import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update, remove } from 'firebase/database'; 
import { db } from '../fb'; 
import jsPDF from 'jspdf';
import { Alert, Snackbar, Chip, Avatar, Divider, Typography, Button } from '@mui/material';
import { 
  Business, 
  Email, 
  Phone, 
  LocationOn, 
  Description, 
  Event, 
  VerifiedUser,
  Block,
  CheckCircle,
  AccessTime,
  MonetizationOn,
  Receipt,
  People,
  Public,
  Category,
  CorporateFare,
  Engineering
} from '@mui/icons-material';
import ModulosComponent from './ModulosComponent';


const navigate = useNavigate

// Componentes de UI reutilizáveis
const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center mb-4">
    {icon && <span className="mr-2 text-blue-500">{icon}</span>}
    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
  </div>
);

const InfoCard = ({ title, value, icon, className = '' }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${className}`}>
    <div className="flex items-center">
      {icon && <span className="mr-2 text-blue-500">{icon}</span>}
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    </div>
    <p className="mt-1 text-lg font-semibold text-gray-800 break-words">
      {value || 'Não disponível'}
    </p>
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

const StatusBadge = ({ status }) => {
  const statusConfig = {
    ativo: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="!h-4 !w-4" /> },
    bloqueado: { color: 'bg-red-100 text-red-800', icon: <Block className="!h-4 !w-4" /> },
    verificado: { color: 'bg-blue-100 text-blue-800', icon: <VerifiedUser className="!h-4 !w-4" /> },
    default: { color: 'bg-gray-100 text-gray-800', icon: <AccessTime className="!h-4 !w-4" /> }
  };

  const config = statusConfig[status] || statusConfig.default;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.icon}
      <span className="ml-1 capitalize">{status || 'Sem status'}</span>
    </span>
  );
};

const EmpresaDetalhes = () => {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [userModules, setUserModules] = useState({});
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
  const [visits, setVisits] = useState([]);

  // Buscar dados da empresa
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar empresa
        const empresaSnapshot = await get(ref(db, `company/${id}`));
        const empresaData = empresaSnapshot.val();

        console.log('Dados da empresa:', empresaData);  
        
        if (empresaData) {
          setEmpresa(empresaData);
          setUserModules(empresaData.activeModules || {});
          setStatus(empresaData.status || '');
          setSelectedSector(empresaData.categoriaExterna || '');
          
          // Processar visitas
          if (empresaData.visitas) {
            const visitsArray = Object.values(empresaData.visitas);
            visitsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setVisits(visitsArray);
          }
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

  const handleDeleteCompany = async () => {
  if (window.confirm('Tem certeza que deseja eliminar permanentemente esta empresa? Esta ação não pode ser desfeita.')) {
    try {
      await remove(ref(db, `company/${id}`));
      setSnackbar({
        open: true,
        message: 'Empresa eliminada com sucesso',
        severity: 'success'
      });
     navigate('/')
    } catch (error) {
      console.error('Erro ao eliminar empresa:', error);
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'Erro ao eliminar empresa'
      });
    }
  }
};

  const gerarFatura = (sub) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fatura: ${sub.plan?.name || 'Plano'}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Empresa: ${empresa.nome}`, 10, 25);
    doc.text(`NUIT: ${empresa.nuit || 'Não informado'}`, 10, 35);
    doc.text(`Valor: ${sub.payment?.amount || '0'} MT`, 10, 45);
    doc.text(`Método: ${sub.payment?.method || 'Não especificado'}`, 10, 55);
    doc.text(`Data: ${sub.payment?.date ? new Date(sub.payment.date).toLocaleDateString() : 'Não especificada'}`, 10, 65);
    doc.text(`Expira em: ${sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'Não especificada'}`, 10, 75);
    doc.save(`fatura_${empresa.nome}_${sub.plan?.name || 'plano'}.pdf`);
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

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard 
                title="Nome" 
                value={empresa.nome} 
                icon={<Business className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Sigla" 
                value={empresa.sigla} 
                icon={<CorporateFare className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Setor" 
                value={empresa.sector} 
                icon={<Category className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Tipo de Entidade" 
                value={empresa.tipoEntidade} 
                icon={<Engineering className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Província" 
                value={empresa.provincia} 
                icon={<LocationOn className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Distrito" 
                value={empresa.distrito} 
                icon={<LocationOn className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="NUIT" 
                value={empresa.nuit} 
                icon={<Description className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Número de Contribuinte" 
                value={empresa.nrContriuinte} 
                icon={<Description className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Contacto" 
                value={empresa.contacto} 
                icon={<Phone className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Email" 
                value={empresa.email} 
                icon={<Email className="!h-5 !w-5" />} 
              />
                <InfoCard 
                title="Password" 
                value={empresa.password} 
                icon={<Email className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Endereço" 
                value={empresa.endereco} 
                icon={<LocationOn className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Data de Criação" 
                value={empresa.createdAt ? new Date(empresa.createdAt).toLocaleDateString() : 'Não disponível'} 
                icon={<Event className="!h-5 !w-5" />} 
              />
              <InfoCard 
                title="Capacidade de Produção" 
                value={empresa.capacidadeDeProducao || empresa.capacidadeProducao || 'Não informado'} 
                icon={<Engineering className="!h-5 !w-5" />} 
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <SectionHeader title="Sobre" icon={<Description className="!h-5 !w-5" />} />
              <div className="text-gray-700 whitespace-pre-line" dangerouslySetInnerHTML={{ 
                __html: empresa.bio || '<p>Nenhuma informação disponível</p>' 
              }} />
            </div>

            {empresa.missaoVisaoValores && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="Missão, Visão e Valores" icon={<VerifiedUser className="!h-5 !w-5" />} />
                <div dangerouslySetInnerHTML={{ __html: empresa.missaoVisaoValores }} />
              </div>
            )}

            {empresa.subsectores && empresa.subsectores.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="Subsectores" icon={<Category className="!h-5 !w-5" />} />
                <div className="flex flex-wrap gap-2">
                  {empresa.subsectores.map((subsector, index) => (
                    <Chip key={index} label={subsector} className="m-1" />
                  ))}
                </div>
              </div>
            )}

            {empresa.social && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="Redes Sociais" icon={<Public className="!h-5 !w-5" />} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard 
                    title="Website" 
                    value={empresa.social.website ? (
                      <a href={empresa.social.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.website}
                      </a>
                    ) : 'Não informado'}
                  />
                  <InfoCard 
                    title="WhatsApp" 
                    value={empresa.social.whatsapp ? (
                      <a href={empresa.social.whatsapp} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.whatsapp}
                      </a>
                    ) : 'Não informado'}
                  />
                  <InfoCard 
                    title="Facebook" 
                    value={empresa.social.facebook ? (
                      <a href={empresa.social.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.facebook}
                      </a>
                    ) : 'Não informado'}
                  />
                  <InfoCard 
                    title="Instagram" 
                    value={empresa.social.instagram ? (
                      <a href={empresa.social.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.instagram}
                      </a>
                    ) : 'Não informado'}
                  />
                  <InfoCard 
                    title="LinkedIn" 
                    value={empresa.social.linkedin ? (
                      <a href={empresa.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.linkedin}
                      </a>
                    ) : 'Não informado'}
                  />
                  <InfoCard 
                    title="Twitter/X" 
                    value={empresa.social.x ? (
                      <a href={empresa.social.x} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {empresa.social.x}
                      </a>
                    ) : 'Não informado'}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'modulos':
        return (
          <div className="space-y-6">
            <SectionHeader title="Módulos Ativos" icon={<CheckCircle className="!h-5 !w-5" />} />
            
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
                        <div>
                          <h3 className="font-medium text-gray-800 capitalize">
                            {key.replace('modulo', 'Módulo ')}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {module.expiresAt ? `Expira em: ${new Date(module.expiresAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>
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
                            <span className="font-medium">Pago em:</span> {module.paidAt ? new Date(module.paidAt).toLocaleDateString() : 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Expira em:</span> {module.expiresAt ? new Date(module.expiresAt).toLocaleDateString() : 'Não informado'}
                          </p>
                          {module.smsCount !== undefined && (
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
              <SectionHeader title="Configurações da Empresa" icon={<Engineering className="!h-5 !w-5" />} />
                <Divider sx={{ my: 3 }} />
      
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <SectionHeader 
                  title="Área de Risco" 
                  icon={<Block color="error" className="!h-5 !w-5" />} 
                />
                <Typography variant="body2" color="text.secondary" paragraph>
                  Esta ação eliminará permanentemente todos os dados da empresa. Tenha certeza antes de prosseguir.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Block />}
                  onClick={handleDeleteCompany}
                  sx={{ mt: 2 }}
                >
                  Eliminar Empresa
                </Button>
              </div>

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
            <SectionHeader title="Histórico de Pagamentos" icon={<Receipt className="!h-5 !w-5" />} />
            
            {subscriptions.length > 0 ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira em</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((sub, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {sub.plan?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {sub.payment?.amount || '0'} MT
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 capitalize">
                          {sub.payment?.method || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {sub.payment?.date ? new Date(sub.payment.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'N/A'}
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
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Receipt className="!h-4 !w-4 mr-1" />
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

      case 'visitas':
        return (
          <div className="space-y-6">
            <SectionHeader title="Histórico de Visitas" icon={<People className="!h-5 !w-5" />} />
            
            {visits.length > 0 ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitante</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visits.map((visit, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar className="!h-10 !w-10">
                                {visit.visitorName.charAt(0)}
                              </Avatar>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {visit.visitorName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {visit.visitorId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(visit.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Nenhum registro de visita encontrado</p>
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
            <p className="text-gray-500">{empresa.sector} • {empresa.distrito}, {empresa.provincia}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusBadge status={empresa.status} />
          {empresa.subscriptions?.isverify === "true" && (
            <Chip 
              icon={<VerifiedUser className="!h-4 !w-4" />}
              label="Verificada" 
              color="success" 
              size="small" 
              className="!ml-2" 
            />
          )}
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
            active={activeTab === 'historico'} 
            onClick={() => setActiveTab('historico')}
          >
            Pagamentos
          </TabButton>
          <TabButton 
            active={activeTab === 'visitas'} 
            onClick={() => setActiveTab('visitas')}
          >
            Visitas ({visits.length})
          </TabButton>
          <TabButton 
            active={activeTab === 'configuracoes'} 
            onClick={() => setActiveTab('configuracoes')}
          >
            Configurações
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