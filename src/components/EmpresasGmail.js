import React, { useEffect, useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db2 } from '../fb';
import { FiMail, FiPhone, FiFilter, FiSearch, FiDownload, FiUser, FiUserPlus, FiCheck, FiList } from 'react-icons/fi';
import { FaUserTie } from 'react-icons/fa';

const EmpresasDashboard = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [contactedEmpresas, setContactedEmpresas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('uncontacted');

  const emailDomains = [
    { value: 'all', label: 'Todos os domínios' },
    { value: 'gmail.com', label: 'Gmail' },
    { value: 'yahoo.com', label: 'Yahoo' },
    { value: 'hotmail.com', label: 'Hotmail' },
    { value: 'outlook.com', label: 'Outlook' },
    { value: 'custom', label: 'Outros domínios' }
  ];

  const registrationTypes = [
    { value: 'all', label: 'Todos os registros' },
    { value: 'withReferrer', label: 'Cadastro interno' },
    { value: 'withoutReferrer', label: 'Cadastro próprio' }
  ];

  const filterEmpresas = (empresasList, domain, registrationType, search) => {
    return empresasList.filter((empresa) => {
      // Domain filter
      const domainMatch = 
        domain === 'all' || 
        (domain === 'custom' && !emailDomains.some(d => d.value !== 'all' && d.value !== 'custom' && empresa.email && empresa.email.includes(`@${d.value}`))) ||
        (empresa.email && empresa.email.includes(`@${domain}`));
      
      // Registration type filter
      const registrationMatch = 
        registrationType === 'all' ||
        (registrationType === 'withReferrer' && empresa.hasReferrer) ||
        (registrationType === 'withoutReferrer' && !empresa.hasReferrer);
      
      // Search filter
      const searchMatch = search === '' || 
        (empresa.nome && empresa.nome.toLowerCase().includes(search.toLowerCase())) ||
        (empresa.email && empresa.email.toLowerCase().includes(search.toLowerCase())) ||
        (empresa.contacto && empresa.contacto.includes(search));
      
      return domainMatch && registrationMatch && searchMatch;
    });
  };

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const snapshot = await get(ref(db2, 'company'));
        const data = snapshot.val();
        if (data) {
          const empresasArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            domain: data[key].email ? data[key].email.split('@')[1] : 'no-email',
            hasReferrer: !!data[key].referer,
            contacted: data[key].contacted || false
          }));
          
          setEmpresas(empresasArray);
          const filtered = filterEmpresas(empresasArray, domainFilter, registrationFilter, searchTerm);
          setFilteredEmpresas(filtered);
          
          const contacted = empresasArray.filter(e => e.contacted);
          setContactedEmpresas(contacted);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  useEffect(() => {
    const filtered = empresas.filter(empresa => {
      if (activeTab === 'contacted') return empresa.contacted;
      if (empresa.contacted) return false;
      
      const domainMatch = 
        domainFilter === 'all' || 
        (domainFilter === 'custom' && !emailDomains.some(d => d.value !== 'all' && d.value !== 'custom' && empresa.email && empresa.email.includes(`@${d.value}`))) ||
        (empresa.email && empresa.email.includes(`@${domainFilter}`));
      
      const registrationMatch = 
        registrationFilter === 'all' ||
        (registrationFilter === 'withReferrer' && empresa.hasReferrer) ||
        (registrationFilter === 'withoutReferrer' && !empresa.hasReferrer);
      
      const searchMatch = searchTerm === '' || 
        (empresa.nome && empresa.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (empresa.email && empresa.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (empresa.contacto && empresa.contacto.includes(searchTerm));
      
      return domainMatch && registrationMatch && searchMatch;
    });
    
    setFilteredEmpresas(filtered);
  }, [domainFilter, registrationFilter, searchTerm, empresas, activeTab]);

  const markAsContacted = async (empresaId) => {
    try {
      await update(ref(db2, `company/${empresaId}`), {
        contacted: true,
        contactedAt: new Date().toISOString()
      });
      
      setEmpresas(prev => prev.map(e => 
        e.id === empresaId ? {...e, contacted: true} : e
      ));
      
      const empresa = empresas.find(e => e.id === empresaId);
      if (empresa) {
        setContactedEmpresas(prev => [...prev, {...empresa, contacted: true}]);
      }
    } catch (error) {
      console.error('Error marking as contacted:', error);
    }
  };

  const handleSendEmail = (email) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const handleCall = (phone) => {
    if (phone) {
      window.open(`tel:${phone}`, '_blank');
    }
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Contacto', 'Domínio', 'Tipo Cadastro', 'Referrer Email', 'Contactada'];
    const csvContent = [
      headers.join(','),
      ...filteredEmpresas.map(empresa => 
        `"${empresa.nome || ''}","${empresa.email || ''}","${empresa.contacto || ''}","${empresa.domain || ''}","${empresa.hasReferrer ? 'Interno' : 'Próprio'}","${empresa.referer?.email || ''}","${empresa.contacted ? 'Sim' : 'Não'}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `empresas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Gestão de Empresas</h1>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm sm:text-base"
          >
            <FiFilter className="text-sm sm:text-base" /> 
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg text-sm sm:text-base"
          >
            <FiDownload className="text-sm sm:text-base" /> 
            Exportar
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400 text-sm sm:text-base" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                className="pl-9 pr-3 py-1 sm:pl-10 sm:py-2 border rounded-lg w-full text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400 text-sm sm:text-base" />
              </div>
              <select
                className="pl-9 pr-3 py-1 sm:pl-10 sm:py-2 border rounded-lg bg-white w-full text-sm sm:text-base"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
              >
                {emailDomains.map((domain) => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUserTie className="text-gray-400 text-sm sm:text-base" />
              </div>
              <select
                className="pl-9 pr-3 py-1 sm:pl-10 sm:py-2 border rounded-lg bg-white w-full text-sm sm:text-base"
                value={registrationFilter}
                onChange={(e) => setRegistrationFilter(e.target.value)}
              >
                {registrationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end sm:justify-start text-sm sm:text-base">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {filteredEmpresas.length} resultados
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'uncontacted' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('uncontacted')}
        >
          <FiList /> Não contactadas
        </button>
        <button
          className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'contacted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('contacted')}
        >
          <FiCheck /> Contactadas ({contactedEmpresas.length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Domínio</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmpresas.length > 0 ? (
                filteredEmpresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sm:px-6 sm:py-4">
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{empresa.nome || 'N/A'}</div>
                        <div className="text-gray-500 text-xs sm:text-sm">{empresa.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-500">
                      {empresa.contacto || 'N/A'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {empresa.domain || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4">
                      <div className="flex items-center">
                        {empresa.hasReferrer ? (
                          <>
                            <FiUser className="text-green-500 mr-1" />
                            <span className="text-xs sm:text-sm">Interno</span>
                            {empresa.referer?.email && (
                              <span className="ml-2 text-xs text-gray-500 hidden sm:inline">({empresa.referer.email})</span>
                            )}
                          </>
                        ) : (
                          <>
                            <FiUserPlus className="text-blue-500 mr-1" />
                            <span className="text-xs sm:text-sm">Próprio</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleSendEmail(empresa.email)}
                          disabled={!empresa.email}
                          className={`p-1 sm:p-2 rounded-full ${empresa.email ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Enviar email"
                        >
                          <FiMail size={16} />
                        </button>
                        <button
                          onClick={() => handleCall(empresa.contacto)}
                          disabled={!empresa.contacto}
                          className={`p-1 sm:p-2 rounded-full ${empresa.contacto ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Ligar"
                        >
                          <FiPhone size={16} />
                        </button>
                        {activeTab === 'uncontacted' && (
                          <button
                            onClick={() => markAsContacted(empresa.id)}
                            className="p-1 sm:p-2 rounded-full text-purple-500 hover:bg-purple-50"
                            title="Marcar como contactada"
                          >
                            <FiCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {activeTab === 'uncontacted' ? (
                      <>
                        Nenhuma empresa não contactada encontrada
                        {domainFilter !== 'all' && ` com email @${domainFilter}`}
                        {registrationFilter !== 'all' && 
                          ` (${registrationFilter === 'withReferrer' ? 'cadastro interno' : 'cadastro próprio'})`}
                        {searchTerm && ` contendo "${searchTerm}"`}.
                      </>
                    ) : (
                      'Nenhuma empresa contactada encontrada'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmpresasDashboard;