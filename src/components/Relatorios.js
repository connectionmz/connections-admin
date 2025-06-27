import React, { useState, useEffect, useMemo } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../fb';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  PrinterIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

const Relatorios = () => {
  // Data states
  const [cotacoes, setCotacoes] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Report configuration
  const [reportType, setReportType] = useState('cotacoes');
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    status: 'all',
    sector: 'all',
    verified: 'all'
  });
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cotacoesSnapshot, anunciosSnapshot] = await Promise.all([
          get(ref(db, 'cotacoes')),
          get(ref(db, 'banners'))
        ]);

        const cotacoesData = cotacoesSnapshot.exists() ? 
          Object.entries(cotacoesSnapshot.val()).map(([id, value]) => ({ id, ...value })) : [];
        
        const anunciosData = anunciosSnapshot.exists() ? 
          Object.entries(anunciosSnapshot.val()).map(([id, value]) => ({ id, ...value })) : [];

        setCotacoes(cotacoesData);
        setAnuncios(anunciosData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Available sectors for filtering
  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(cotacoes.map(c => c.sector).filter(Boolean))];
    return uniqueSectors.sort();
  }, [cotacoes]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    const data = reportType === 'cotacoes' ? cotacoes : anuncios;
    
    return data.filter(item => {
      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const itemDate = new Date(item.createdAt || item.timestamp || 0);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }
      
      // Status filter
      if (filters.status !== 'all') {
        if (reportType === 'cotacoes') {
          if (filters.status === 'active' && item.status !== 'active') return false;
          if (filters.status === 'blocked' && item.status !== 'blocked') return false;
          if (filters.status === 'expired' && !isExpired(item)) return false;
        } else {
          if (item.status !== filters.status) return false;
        }
      }
      
      // Sector filter (only for cotacoes)
      if (reportType === 'cotacoes' && filters.sector !== 'all' && item.sector !== filters.sector) {
        return false;
      }
      
      // Verification filter (only for cotacoes)
      if (reportType === 'cotacoes' && filters.verified !== 'all') {
        if (filters.verified === 'verified' && !item.verified) return false;
        if (filters.verified === 'unverified' && item.verified) return false;
      }
      
      return true;
    });
  }, [reportType, cotacoes, anuncios, filters]);

  // Helper function to check if a cotacao is expired
  const isExpired = (cotacao) => {
    if (!cotacao.datalimite) return false;
    const now = new Date();
    const deadline = new Date(cotacao.datalimite);
    return now > deadline;
  };

  // Generate CSV data
  const generateCSVData = () => {
    if (reportType === 'cotacoes') {
      return filteredData.map(item => ({
        ID: item.id,
        Título: item.title,
        Empresa: item.company?.nome || 'N/A',
        Setor: item.sector || 'N/A',
        Valor: item.valor || 'N/A',
        'Data Limite': item.datalimite || 'N/A',
        Status: item.status || (isExpired(item) ? 'Expirada' : 'Ativa'),
        Verificada: item.verified ? 'Sim' : 'Não',
        'Data Criação': item.createdAt || item.timestamp || 'N/A'
      }));
    } else {
      return filteredData.map(item => ({
        ID: item.id,
        Empresa: item.company?.name || 'N/A',
        Setor: item.company?.sector || 'N/A',
        Status: item.status || 'pendente',
        'Motivo Bloqueio': item.motivoBloqueio || 'N/A',
        'Data Criação': item.createdAt || 'N/A',
        URL: item.url || 'N/A'
      }));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    
    const data = generateCSVData();
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `relatorio_${reportType}_${new Date().toISOString().slice(0,10)}.csv`);
    
    setExporting(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    setExporting(true);
    
    const data = generateCSVData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, `relatorio_${reportType}_${new Date().toISOString().slice(0,10)}.xlsx`);
    setExporting(false);
  };

  // Export to PDF (simulated)
  const exportToPDF = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatórios Personalizados</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gere relatórios com base nos filtros selecionados
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filtros
            </button>
            
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cotacoes">Cotações</option>
                <option value="anuncios">Anúncios</option>
              </select>
              <TableCellsIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Filtros Avançados</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-grow">
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="pl-10 w-full pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <CalendarDaysIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-gray-500">até</span>
                  <div className="relative flex-grow">
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="pl-10 w-full pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <CalendarDaysIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos</option>
                  {reportType === 'cotacoes' ? (
                    <>
                      <option value="active">Ativas</option>
                      <option value="blocked">Bloqueadas</option>
                      <option value="expired">Expiradas</option>
                    </>
                  ) : (
                    <>
                      <option value="pendente">Pendentes</option>
                      <option value="aprovado">Aprovados</option>
                      <option value="bloqueado">Bloqueados</option>
                    </>
                  )}
                </select>
              </div>
              
              {/* Sector Filter (only for cotacoes) */}
              {reportType === 'cotacoes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                  <select
                    value={filters.sector}
                    onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    {sectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Verification Filter (only for cotacoes) */}
              {reportType === 'cotacoes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verificação</label>
                  <select
                    value={filters.verified}
                    onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Todas</option>
                    <option value="verified">Verificadas</option>
                    <option value="unverified">Não verificadas</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Summary */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-800">Resumo do Relatório</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-sm text-gray-500">Total de Itens</p>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-sm text-gray-500">Período</p>
              <p className="text-lg">
                {filters.dateRange.start || 'Início'} - {filters.dateRange.end || 'Fim'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="text-lg capitalize">{reportType === 'cotacoes' ? 'Cotações' : 'Anúncios'}</p>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            {exporting ? 'Preparando...' : 'Exportar PDF'}
          </button>
        </div>

        {/* Data Preview */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {reportType === 'cotacoes' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.slice(0, 10).map((item) => (
                <tr key={item.id}>
                  {reportType === 'cotacoes' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.company?.nome || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sector || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'blocked' ? 'bg-red-100 text-red-800' :
                          isExpired(item) ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.status === 'blocked' ? 'Bloqueada' : 
                           isExpired(item) ? 'Expirada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt || item.timestamp).toLocaleDateString()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.company?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'bloqueado' ? 'bg-red-100 text-red-800' :
                          item.status === 'aprovado' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'bloqueado' ? 'Bloqueado' : 
                           item.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="text-center py-8 bg-white">
              <p className="text-gray-500">Nenhum dado encontrado com os filtros atuais</p>
            </div>
          )}
          
          {filteredData.length > 10 && (
            <div className="text-center py-4 bg-gray-50 text-sm text-gray-500">
              Mostrando 10 de {filteredData.length} registros. Exporte para ver todos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Relatorios;