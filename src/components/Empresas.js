import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ref, get, onValue } from 'firebase/database';
import { db } from '../fb';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AdminPage, AdminPageHeader, EmptyState, InlineAlert, LoadingState, PrimaryButton, SecondaryButton } from './admin/ui/AdminUI';
import { safePlainText } from '../utils/safeText';

const EmpresasDashboard = () => {
  // Estados para dados e filtros
  const [empresas, setEmpresas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [filters, setFilters] = useState({
    sector: '',
    provincia: ''
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  // Filtragem otimizada com useMemo
  const filteredEmpresas = useMemo(() => {
    return empresas.filter((empresa) => {
      const nome = empresa.nome || '';
      const nuit = empresa.nuit || '';
      
      const matchesSearch = 
        nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nuit.includes(searchTerm);

      const matchesSector = !filters.sector || empresa.sector === filters.sector;
      const matchesProvince = !filters.provincia || empresa.provincia === filters.provincia;
      return matchesSearch && matchesSector && matchesProvince;
    });
  }, [empresas, searchTerm, filters]);

useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const empresasSnapshot = await get(ref(db, 'company'));
        const empresasData = empresasSnapshot.val();
        const empresasList = empresasData ? 
          Object.entries(empresasData)
            .map(([id, data]) => ({ ...data, id, nome: safePlainText(data?.nome, 150) }))
            .filter(empresa => empresa.type !== 'singular') : 
          [];
        
        setEmpresas(empresasList);

        const provinciasRef = ref(db, 'provincias');
        const sectoresRef = ref(db, 'sectores_de_atividade');

        const unsubscribeProvincias = onValue(provinciasRef, (snapshot) => {
          const data = snapshot.val();
          setProvincias(data ? Object.values(data) : []);
        });

        const unsubscribeSectores = onValue(sectoresRef, (snapshot) => {
          const data = snapshot.val();
          setSectores(data ? Object.values(data) : []);
        });
        return () => {
          unsubscribeProvincias();
          unsubscribeSectores();
        };

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setNotice({ type: 'error', text: 'Não foi possível carregar as empresas.' });
      } finally {
        setLoading(false);
      }
    };

    let cleanup;
    fetchData().then(unsubscribe => { cleanup = unsubscribe; });
    return () => cleanup?.();
  }, []);

  const generateCustomSectorReport = () => {
    const empresasOutro = empresas.filter(empresa => 
      empresa.sector?.toLowerCase() === "outro"
    );

    if (empresasOutro.length === 0) {
      setNotice({ type: 'info', text: 'Não existem empresas classificadas no setor “Outro” para exportar.' });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Relatório de Empresas com Setor "Outro"', 14, 15);
    
    const headers = [['#', 'Nome', 'NUIT', 'Setor Personalizado', 'Província']];
    
    const data = empresasOutro.map((empresa, index) => [
      index + 1,
      empresa.nome || 'N/A',
      empresa.nuit || 'N/A',
      empresa.customSector || 'N/A',
      empresa.provincia || 'N/A'
    ]);

    doc.autoTable({
      head: headers,
      body: data,
      startY: 20,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 160, 133] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
        4: { cellWidth: 30 }
      }
    });

    doc.save('empresas_setor_outro.pdf');
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const stats = useMemo(() => {
    const totalEmpresas = empresas.length;
    const empresasOutro = empresas.filter(e => e.sector?.toLowerCase() === "outro").length;
    const empresasPorProvincia = provincias.map(p => ({
      provincia: p.provincia,
      count: empresas.filter(e => e.provincia === p.provincia).length
    })).sort((a, b) => b.count - a.count).slice(0, 3);

    return { totalEmpresas, empresasOutro, empresasPorProvincia };
  }, [empresas, provincias]);

  if (loading) {
    return <LoadingState label="A carregar empresas..." />;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Empresas"
        description="Consulte, filtre e acompanhe as organizações registadas na plataforma."
        actions={<>
          <Link to="/crm" className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Abrir CRM</Link>
          <PrimaryButton
              onClick={generateCustomSectorReport}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Relatório
          </PrimaryButton>
        </>}
      />
      {notice && <InlineAlert type={notice.type} onClose={() => setNotice(null)}>{notice.text}</InlineAlert>}
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total de Empresas</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalEmpresas}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Setor "Outro"</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.empresasOutro}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Top Províncias</dt>
                  <dd className="text-sm text-gray-900">
                    {stats.empresasPorProvincia.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.provincia}</span>
                        <span className="font-medium">{p.count}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtrar Empresas</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Pesquisar
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Nome ou NUIT da empresa"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <select 
                  id="sector"
                  value={filters.sector}
                  onChange={(e) => handleFilterChange('sector', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos</option>
                  {sectores.map((sector, index) => (
                    <option key={index} value={sector.setor}>
                      {sector.setor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                  Província
                </label>
                <select 
                  id="provincia"
                  value={filters.provincia}
                  onChange={(e) => handleFilterChange('provincia', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todas</option>
                  {provincias.map((provincia, index) => (
                    <option key={index} value={provincia.provincia}>
                      {provincia.provincia}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(searchTerm || Object.values(filters).some(Boolean)) && (
              <div className="mt-4 flex justify-end">
                <SecondaryButton type="button" onClick={() => { setSearchTerm(''); setFilters({ sector: '', provincia: '' }); }}>
                  Limpar filtros
                </SecondaryButton>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Empresas */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Lista de Empresas
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {filteredEmpresas.length} registros
              </span>
            </h3>
          </div>
          
          {filteredEmpresas.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredEmpresas.map((empresa) => (
                <li key={empresa.id} className="hover:bg-gray-50 transition-colors">
                  <Link 
                    to={`/empresas/${empresa.id}`} 
                    className="block px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate mr-2">
                            {empresa.nome || 'Empresa sem nome'}
                          </p>
                          {empresa.sector?.toLowerCase() === "outro" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Setor Personalizado
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {empresa.nuit || 'NUIT não informado'}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {empresa.sector || 'Setor não informado'}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {empresa.provincia || 'Província não informada'}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhuma empresa encontrada"
              description={searchTerm || Object.values(filters).some(Boolean) ? 'Ajuste ou limpe os filtros de pesquisa.' : 'Ainda não existem empresas registadas no sistema.'}
            />
          )}
        </div>
    </AdminPage>
  );
};

export default EmpresasDashboard;
