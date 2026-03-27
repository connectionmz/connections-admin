import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ref, get, onValue, remove, update } from 'firebase/database';
import { db } from '../fb';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Lojas = () => {
  // Estados para dados e filtros
  const [lojas, setLojas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [filters, setFilters] = useState({
    sector: '',
    provincia: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedLoja, setSelectedLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [showProdutosModal, setShowProdutosModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lojaToDelete, setLojaToDelete] = useState(null);
  const [showProdutoDeleteConfirm, setShowProdutoDeleteConfirm] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState(null);
  const [showLojaDetails, setShowLojaDetails] = useState(false);
  const [selectedLojaDetails, setSelectedLojaDetails] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ lojaId: null, newStatus: false });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Filtragem otimizada com useMemo
  const filteredLojas = useMemo(() => {
    return lojas.filter((loja) => {
      const nome = loja.company?.nome || loja.name || '';
      const nuit = loja.company?.nuit || '';
      
      const matchesSearch = 
        nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nuit.includes(searchTerm);

      const matchesSector = !filters.sector || loja.company?.sector === filters.sector;
      const matchesProvince = !filters.provincia || loja.company?.provincia === filters.provincia;

      return matchesSearch && matchesSector && matchesProvince;
    });
  }, [lojas, searchTerm, filters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar todas as lojas
        const lojasSnapshot = await get(ref(db, 'stores'));
        const lojasData = lojasSnapshot.val();
        
        const lojasList = lojasData ? 
          Object.entries(lojasData)
            .map(([id, data]) => ({ 
              id, 
              ...data,
              company: data.company || {},
              // Contar produtos se existirem
              productsCount: data.products ? Object.keys(data.products).length : 0,
              // Verificar se a loja está ativa (isActive pode não existir, considerar como ativa por padrão)
              isActive: data.isActive !== undefined ? data.isActive : true
            }))
            .filter(loja => loja.company?.type !== 'singular') : 
          [];
        
        setLojas(lojasList);

        // Buscar províncias
        const provinciasRef = ref(db, 'provincias');
        onValue(provinciasRef, (snapshot) => {
          const data = snapshot.val();
          setProvincias(data ? Object.values(data) : []);
        });

        // Buscar setores de atividade
        const sectoresRef = ref(db, 'sectores_de_atividade');
        onValue(sectoresRef, (snapshot) => {
          const data = snapshot.val();
          setSectores(data ? Object.values(data) : []);
        });

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setErrorMessage('Erro ao carregar dados das lojas');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Carregar produtos de uma loja
  const loadProdutos = async (lojaId) => {
    try {
      const produtosSnapshot = await get(ref(db, `stores/${lojaId}/products`));
      const produtosData = produtosSnapshot.val();
      const produtosList = produtosData ? 
        Object.entries(produtosData)
          .map(([id, data]) => ({ 
            id, 
            ...data,
            type: data.type || 'product'
          })) : 
        [];
      setProdutos(produtosList);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setErrorMessage('Erro ao carregar produtos da loja');
    }
  };

  // Visualizar produtos da loja
  const handleViewProdutos = async (loja) => {
    setSelectedLoja(loja);
    await loadProdutos(loja.id);
    setShowProdutosModal(true);
  };

  // Visualizar detalhes da loja
  const handleViewDetails = (loja) => {
    setSelectedLojaDetails(loja);
    setShowLojaDetails(true);
  };

  // Excluir loja
  const handleDeleteLoja = (loja) => {
    setLojaToDelete(loja);
    setShowDeleteConfirm(true);
  };

  // Excluir loja com todos os seus produtos
  const confirmDeleteLoja = async () => {
    if (!lojaToDelete) return;
    
    try {
      setDeleting(true);
      
      // 1. Buscar todos os produtos da loja
      const produtosSnapshot = await get(ref(db, `stores/${lojaToDelete.id}/products`));
      const produtosData = produtosSnapshot.val();
      
      // 2. Excluir todos os produtos individualmente
      if (produtosData) {
        const produtosIds = Object.keys(produtosData);
        console.log(`Excluindo ${produtosIds.length} produtos da loja...`);
        
        // Criar um array de promessas para excluir todos os produtos
        const deletePromises = produtosIds.map(produtoId => 
          remove(ref(db, `stores/${lojaToDelete.id}/products/${produtoId}`))
        );
        
        // Aguardar todas as exclusões de produtos
        await Promise.all(deletePromises);
        console.log(`${produtosIds.length} produtos excluídos com sucesso.`);
      }
      
      // 3. Excluir a loja (depois de excluir todos os produtos)
      await remove(ref(db, `stores/${lojaToDelete.id}`));
      console.log(`Loja ${lojaToDelete.id} excluída com sucesso.`);
      
      // 4. Atualizar a lista de lojas no estado
      setLojas(prev => prev.filter(l => l.id !== lojaToDelete.id));
      
      // 5. Mostrar mensagem de sucesso com detalhes
      const nomeLoja = lojaToDelete.name || lojaToDelete.company?.nome || 'Loja';
      const totalProdutos = produtosData ? Object.keys(produtosData).length : 0;
      setSuccessMessage(
        `Loja "${nomeLoja}" excluída com sucesso! ${totalProdutos > 0 ? `Foram removidos ${totalProdutos} produto(s).` : ''}`
      );
      
      // 6. Fechar modais e limpar estado
      setShowDeleteConfirm(false);
      setLojaToDelete(null);
      
      // 7. Limpar mensagem após 5 segundos
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('Erro ao excluir loja:', error);
      setErrorMessage(`Erro ao excluir loja: ${error.message || 'Tente novamente.'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDeleting(false);
    }
  };

  // Excluir produto individual
  const handleDeleteProduto = (produto) => {
    setProdutoToDelete(produto);
    setShowProdutoDeleteConfirm(true);
  };

  const confirmDeleteProduto = async () => {
    if (!produtoToDelete || !selectedLoja) return;
    
    try {
      await remove(ref(db, `stores/${selectedLoja.id}/products/${produtoToDelete.id}`));
      
      // Atualizar lista de produtos
      setProdutos(prev => prev.filter(p => p.id !== produtoToDelete.id));
      setSuccessMessage(`Produto "${produtoToDelete.name}" excluído com sucesso!`);
      setShowProdutoDeleteConfirm(false);
      setProdutoToDelete(null);
      
      // Atualizar contagem de produtos na loja
      setLojas(prev => prev.map(loja => 
        loja.id === selectedLoja.id 
          ? { ...loja, productsCount: loja.productsCount - 1 }
          : loja
      ));
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      setErrorMessage('Erro ao excluir produto. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Ativar/Desativar loja
  const handleToggleStatus = (lojaId, currentStatus) => {
    setStatusUpdate({ lojaId, newStatus: !currentStatus });
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    try {
      const newStatus = statusUpdate.newStatus;
      await update(ref(db, `stores/${statusUpdate.lojaId}`), {
        isActive: newStatus
      });
      
      setLojas(prev => prev.map(loja => 
        loja.id === statusUpdate.lojaId 
          ? { ...loja, isActive: newStatus }
          : loja
      ));
      
      setSuccessMessage(`Loja ${newStatus ? 'ativada' : 'desativada'} com sucesso!`);
      setShowStatusModal(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setErrorMessage('Erro ao atualizar status da loja.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Gerar relatório PDF
  const generateReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Relatório de Lojas', 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 22);
    doc.text(`Total de Lojas: ${filteredLojas.length}`, 14, 28);
    
    const headers = [['#', 'Nome da Loja', 'Empresa', 'NUIT', 'Província', 'Status', 'Produtos']];
    
    const data = filteredLojas.map((loja, index) => [
      index + 1,
      loja.name || loja.company?.nome || 'N/A',
      loja.company?.nome || 'N/A',
      loja.company?.nuit || 'N/A',
      loja.company?.provincia || 'N/A',
      loja.isActive ? 'Ativa' : 'Inativa',
      loja.productsCount || 0
    ]);

    doc.autoTable({
      head: headers,
      body: data,
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 15 },
        6: { cellWidth: 20 }
      }
    });

    doc.save(`relatorio_lojas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const stats = useMemo(() => {
    const totalLojas = lojas.length;
    const lojasAtivas = lojas.filter(l => l.isActive).length;
    const lojasInativas = lojas.filter(l => !l.isActive).length;
    const totalProdutos = lojas.reduce((sum, loja) => sum + (loja.productsCount || 0), 0);
    const lojasComProdutos = lojas.filter(l => (l.productsCount || 0) > 0).length;
    
    const lojasPorProvincia = provincias.map(p => ({
      provincia: p.provincia,
      count: lojas.filter(l => l.company?.provincia === p.provincia).length
    })).sort((a, b) => b.count - a.count).slice(0, 3);

    return { totalLojas, lojasAtivas, lojasInativas, totalProdutos, lojasComProdutos, lojasPorProvincia };
  }, [lojas, provincias]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Lojas</h1>
              <p className="text-sm text-gray-500 mt-1">Gerencie lojas, produtos e status das lojas cadastradas</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/lojas/nova"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Loja
              </Link>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Relatório
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mensagens de Feedback */}
      {successMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total de Lojas</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalLojas}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Lojas Ativas</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.lojasAtivas}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Lojas Inativas</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.lojasInativas}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Produtos</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalProdutos}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Lojas com Produtos</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.lojasComProdutos}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtrar Lojas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Pesquisar
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Nome da loja ou NUIT"
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
          </div>
        </div>

        {/* Lista de Lojas */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Lista de Lojas
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {filteredLojas.length} registros
              </span>
            </h3>
          </div>
          
          {filteredLojas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NUIT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Província</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produtos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLojas.map((loja) => (
                    <tr key={loja.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={loja.company?.logo || 'https://via.placeholder.com/40'} 
                              alt={loja.company?.nome}
                              onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {loja.name || loja.company?.nome || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {loja.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{loja.company?.nome || 'N/A'}</div>
                        {loja.company?.sector && (
                          <div className="text-xs text-gray-500">{loja.company.sector}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {loja.company?.nuit || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {loja.company?.provincia || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {loja.productsCount || 0} produtos
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loja.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {loja.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(loja)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Ver detalhes"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleViewProdutos(loja)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver produtos"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(loja.id, loja.isActive)}
                            className={`${loja.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                            title={loja.isActive ? 'Desativar' : 'Ativar'}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLoja(loja)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir loja"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma loja encontrada</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? "Tente ajustar seus filtros de pesquisa" 
                  : "Nenhuma loja cadastrada no sistema"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Produtos */}
      {showProdutosModal && selectedLoja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Produtos da Loja</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedLoja.name || selectedLoja.company?.nome}</p>
                </div>
                <button
                  onClick={() => setShowProdutosModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {produtos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {produtos.map((produto) => (
                    <div key={produto.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            {produto.imageUrl && (
                              <img 
                                src={produto.imageUrl} 
                                alt={produto.name}
                                className="w-12 h-12 rounded object-cover mr-3"
                                onError={(e) => e.target.src = 'https://via.placeholder.com/50'}
                              />
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">{produto.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  produto.type === 'service' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {produto.type === 'service' ? 'Serviço' : 'Produto'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{produto.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            {produto.price && (
                              <span className="text-green-600 font-medium">
                                {parseFloat(produto.price).toLocaleString('pt-PT')} MT
                              </span>
                            )}
                            {produto.qtd !== undefined && produto.type === 'product' && (
                              <span className={`${parseInt(produto.qtd) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                Stock: {produto.qtd}
                              </span>
                            )}
                            {produto.views !== undefined && (
                              <span className="text-gray-500">👁️ {produto.views}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProduto(produto)}
                          className="text-red-600 hover:text-red-800 ml-2"
                          title="Excluir produto"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum produto encontrado</h3>
                  <p className="mt-1 text-gray-500">Esta loja ainda não possui produtos cadastrados.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowProdutosModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Loja */}
      {showLojaDetails && selectedLojaDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes da Loja</h2>
                <button
                  onClick={() => setShowLojaDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <img 
                  src={selectedLojaDetails.company?.logo || 'https://via.placeholder.com/80'} 
                  alt={selectedLojaDetails.company?.nome}
                  className="w-20 h-20 rounded-full object-cover mr-4"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedLojaDetails.company?.nome || selectedLojaDetails.name}</h3>
                  <p className="text-gray-600">Loja ID: {selectedLojaDetails.id}</p>
                  {selectedLojaDetails.description && (
                    <p className="text-sm text-gray-500 mt-1">{selectedLojaDetails.description}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nome da Loja</label>
                  <p className="text-gray-900">{selectedLojaDetails.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">NUIT</label>
                  <p className="text-gray-900">{selectedLojaDetails.company?.nuit || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{selectedLojaDetails.contact?.email || selectedLojaDetails.company?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-gray-900">{selectedLojaDetails.contact?.phone || selectedLojaDetails.company?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">WhatsApp</label>
                  <p className="text-gray-900">{selectedLojaDetails.contact?.whatsapp || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Setor</label>
                  <p className="text-gray-900">{selectedLojaDetails.company?.sector || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Província</label>
                  <p className="text-gray-900">{selectedLojaDetails.company?.provincia || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Distrito</label>
                  <p className="text-gray-900">{selectedLojaDetails.company?.distrito || 'N/A'}</p>
                </div>
                {selectedLojaDetails.location?.address && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Endereço</label>
                    <p className="text-gray-900">{selectedLojaDetails.location.address}</p>
                  </div>
                )}
                {selectedLojaDetails.policies && (
                  <>
                    {selectedLojaDetails.policies.delivery && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-500">Política de Entrega</label>
                        <p className="text-gray-900 text-sm">{selectedLojaDetails.policies.delivery}</p>
                      </div>
                    )}
                    {selectedLojaDetails.policies.returns && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-500">Política de Devolução</label>
                        <p className="text-gray-900 text-sm">{selectedLojaDetails.policies.returns}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex space-x-3">
                <Link
                  to={`/loja/${selectedLojaDetails.id}`}
                  target="_blank"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-center"
                >
                  Ver Loja
                </Link>
                <button
                  onClick={() => setShowLojaDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Excluir Loja */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  {deleting ? (
                    <svg className="animate-spin h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {deleting ? 'Excluindo...' : 'Excluir Loja'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {deleting ? (
                    `Excluindo loja "${lojaToDelete?.name || lojaToDelete?.company?.nome}" e todos os seus produtos...`
                  ) : (
                    <>
                      Tem certeza que deseja excluir a loja "{lojaToDelete?.name || lojaToDelete?.company?.nome}"? 
                      <br />
                      <strong className="text-red-600">
                        Esta ação também excluirá todos os produtos associados ({lojaToDelete?.productsCount || 0} produtos) e não poderá ser desfeita.
                      </strong>
                    </>
                  )}
                </p>
                {!deleting && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDeleteLoja}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Excluir Produto */}
      {showProdutoDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Excluir Produto</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tem certeza que deseja excluir o produto "{produtoToDelete?.name}"? 
                  Esta ação não poderá ser desfeita.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowProdutoDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteProduto}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Alterar Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {statusUpdate.newStatus ? 'Ativar Loja' : 'Desativar Loja'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tem certeza que deseja {statusUpdate.newStatus ? 'ativar' : 'desativar'} esta loja?
                  {!statusUpdate.newStatus && ' Produtos ficarão indisponíveis para visualização.'}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmStatusUpdate}
                    className={`flex-1 px-4 py-2 text-white rounded-md transition-colors ${
                      statusUpdate.newStatus 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lojas;