import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Singulares = () => {
  const [singulares, setSingulares] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    provincia: '',
    genero: ''
  });

  // Filtragem otimizada
  const filteredSingulares = useMemo(() => {
    return singulares.filter((singular) => {
      const matchesSearch = 
        (singular.nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (singular.contacto?.includes(searchTerm)) ||
        (singular.email?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesProvince = !filters.provincia || 
        singular.provincia === filters.provincia;
      
      const matchesGender = !filters.genero || 
        singular.genero === filters.genero;

      return matchesSearch && matchesProvince && matchesGender;
    });
  }, [singulares, searchTerm, filters]);

  useEffect(() => {
    const singularesRef = ref(db, 'company');
    const provinciasRef = ref(db, 'provincias');
    
    // Buscar lista de províncias
    onValue(provinciasRef, (snapshot) => {
      const data = snapshot.val();
      setProvincias(data ? Object.values(data) : []);
    });

    // Buscar singulares
    const unsubscribe = onValue(singularesRef, (snapshot) => {
      try {
        const data = snapshot.val();
        const singularesList = data ? 
          Object.entries(data)
            .map(([id, data]) => ({ id, ...data }))
            .filter(item => item.type === 'singular') : 
          [];

        setSingulares(singularesList);
        setLoading(false);

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const generateReport = () => {
    if (filteredSingulares.length === 0) {
      alert('Nenhum singular encontrado para gerar relatório.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Singulares', 14, 15);
    
    const headers = [['#', 'Nome', 'Contacto', 'Gênero', 'Província', 'Data Registro']];
    
    const data = filteredSingulares.map((singular, index) => [
      index + 1,
      singular.nome || 'N/A',
      singular.contacto || 'N/A',
      singular.genero || 'N/A',
      singular.provincia || 'N/A',
      singular.createdAt ? new Date(singular.createdAt).toLocaleDateString() : 'N/A'
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
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 }
      }
    });

    doc.save(`singulares_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const stats = useMemo(() => {
    const total = singulares.length;
    const masculino = singulares.filter(s => s.genero === 'Masculino').length;
    const feminino = singulares.filter(s => s.genero === 'Feminino').length;
    
    const provinciasCount = provincias.map(p => ({
      provincia: p.provincia,
      count: singulares.filter(s => s.provincia === p.provincia).length
    })).sort((a, b) => b.count - a.count);

    return { total, masculino, feminino, provinciasCount };
  }, [singulares, provincias]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Singulares</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total de Singulares</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Distribuição por Gênero</dt>
                  <dd className="text-sm text-gray-900">
                    <div className="flex justify-between">
                      <span>Masculino</span>
                      <span className="font-medium">{stats.masculino}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Feminino</span>
                      <span className="font-medium">{stats.feminino}</span>
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Top Províncias</dt>
                  <dd className="text-sm text-gray-900">
                    {stats.provinciasCount.slice(0, 3).map((p, i) => (
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
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Pesquisar
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Nome, contacto ou email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                  Província
                </label>
                <select 
                  id="provincia"
                  value={filters.provincia}
                  onChange={(e) => setFilters({...filters, provincia: e.target.value})}
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

              <div>
                <label htmlFor="genero" className="block text-sm font-medium text-gray-700 mb-1">
                  Gênero
                </label>
                <select 
                  id="genero"
                  value={filters.genero}
                  onChange={(e) => setFilters({...filters, genero: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end mb-4">
          <button
            onClick={generateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Gerar Relatório PDF
          </button>
        </div>

        {/* Lista de Singulares */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Lista de Singulares
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {filteredSingulares.length} registros
              </span>
            </h3>
          </div>
          
          {filteredSingulares.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredSingulares.map((singular) => (
                <li key={singular.id} className="hover:bg-gray-50 transition-colors">
                  <Link 
                    to={`/versingulares/${singular.id}`} 
                    className="block px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate mr-2">
                            {singular.nome || 'Nome não informado'}
                          </p>
                          {singular.genero && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              singular.genero === 'Feminino' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {singular.genero}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {singular.contacto || 'Contacto não informado'}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {singular.email || 'Email não informado'}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {singular.provincia || 'Província não informada'}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum singular encontrado</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? "Tente ajustar seus filtros de pesquisa" 
                  : "Nenhum singular cadastrado no sistema"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Singulares;