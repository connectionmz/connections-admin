import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../fb';
import { 
  FaSearch, FaTrash, FaCheck, FaTimes, FaFileAlt, FaBuilding, 
  FaPhone, FaEnvelope, FaUser, FaCalendarAlt, FaMoneyBillWave, 
  FaFileInvoice, FaSms, FaStore, FaIdCard, FaClock,
  FaGift, FaChartBar, FaFileCsv
} from 'react-icons/fa';
import moment from 'moment';
import jsPDF from 'jspdf';
import 'moment/locale/pt';
import { buildActiveModuleFromPayment, isActiveModule, normalizePaymentStatus, PAYMENT_STATUS } from '../domain/subscriptions';
import { AdminPage, AdminPageHeader, ConfirmDialog, InlineAlert } from './admin/ui/AdminUI';
import { safeFileSegment, safePlainText } from '../utils/safeText';
import { isCollectedRevenuePayment, isNonRevenuePayment } from '../domain/crm';

moment.locale('pt');

const downloadPaymentReceipt = payment => {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text('Comprovativo interno de pagamento', 14, 20);
  pdf.setFontSize(9);
  pdf.text('Documento interno — não substitui documento fiscal certificado.', 14, 27);
  pdf.setFontSize(11);
  pdf.text(`Recibo: ${payment.receiptNumber || 'LEGADO-' + payment.id}`, 14, 40);
  pdf.text(`Documento: ${payment.invoiceNumber || 'Não associado'}`, 14, 48);
  pdf.text(`Empresa: ${safePlainText(payment.nome || payment.userName || 'Empresa', 150)}`, 14, 56);
  pdf.text(`Módulo: ${safePlainText(payment.moduleName || payment.moduleKey || 'Não informado')}`, 14, 64);
  pdf.text(`Valor recebido: ${Number(payment.amount || payment.valor || 0).toLocaleString('pt-MZ')} MZN`, 14, 72);
  pdf.text(`Método: ${payment.paymentMethod === 'cash' ? 'Numerário' : safePlainText(payment.paymentMethod || 'Não informado')}`, 14, 80);
  pdf.text(`Data: ${new Date(Number(payment.timestamp || payment.paidAt || Date.now())).toLocaleString('pt-MZ')}`, 14, 88);
  pdf.save(`${safeFileSegment(payment.receiptNumber || `comprovativo_${payment.id}`)}.pdf`);
};

const Pagar = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [companies, setCompanies] = useState({});
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filteredTrials, setFilteredTrials] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedModule, setSelectedModule] = useState('todos');
  const [selectedValidade, setSelectedValidade] = useState('todos');
  const [selectedOrigin, setSelectedOrigin] = useState('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('payments');
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [stats, setStats] = useState({
    totalPayments: 0,
    paidAmount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    paidCount: 0,
    totalTrials: 0,
    activeTrials: 0,
    activeSubscriptions: 0,
    realPayments: 0,
    manualActivations: 0
  });

  useEffect(() => {
    const paymentsRef = ref(db, 'payments');
    const trialsRef = ref(db, 'trials');
    const companiesRef = ref(db, 'company');
    
    const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const paymentsArray = Object.keys(data).map(key => {
          const payment = data[key] || {};
          return {
            ...payment,
            id: key,
            nome: safePlainText(payment.nome, 150),
            userName: safePlainText(payment.userName, 150),
            reference: safePlainText(payment.reference, 180),
            status: normalizePaymentStatus(payment.status),
          };
        });
        paymentsArray.sort((a, b) => b.timestamp - a.timestamp);
        setPayments(paymentsArray.filter(payment => payment.archived !== true));
      } else {
        setPayments([]);
      }
    });

    const unsubscribeTrials = onValue(trialsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const trialsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        trialsArray.sort((a, b) => b.createdAt - a.createdAt);
        setTrials(trialsArray.filter(trial => trial.archived !== true));
      } else {
        setTrials([]);
      }
    });

    const unsubscribeCompanies = onValue(companiesRef, (snapshot) => {
      setCompanies(snapshot.val() || {});
    });

    return () => {
      unsubscribePayments();
      unsubscribeTrials();
      unsubscribeCompanies();
    };
  }, []);

  useEffect(() => {
    // Compute stats
    const now = Date.now();
    const collectedPayments = payments.filter(isCollectedRevenuePayment);
    const paidAmount = collectedPayments.reduce((sum, p) => sum + Number(p.amount || p.valor || 0), 0);
    const pendingCount = payments.filter(p => p.status === PAYMENT_STATUS.PENDING).length;
    const rejectedCount = payments.filter(p => p.status === PAYMENT_STATUS.REJECTED).length;
    const paidCount = payments.filter(p => p.status === PAYMENT_STATUS.PAID).length;
    const activeTrials = trials.filter(t => t.status === 'active' && t.endDate > now).length;
    const activeSubs = Object.values(companies).reduce((count, company) => {
      return count + Object.values(company.activeModules || {}).filter(module => isActiveModule(module, now)).length;
    }, 0);

    setStats({
      totalPayments: payments.length,
      paidAmount,
      pendingCount,
      rejectedCount,
      paidCount,
      totalTrials: trials.length,
      activeTrials,
      activeSubscriptions: activeSubs,
      realPayments: collectedPayments.length,
      manualActivations: payments.filter(isNonRevenuePayment).length
    });
  }, [payments, trials, companies]);

  useEffect(() => {
    let result = payments;
    
    // Filtro por status
    if (selectedStatus !== 'todos') {
      result = result.filter(payment => payment.status === selectedStatus);
    }
    
    // Filtro por módulo
    if (selectedModule !== 'todos') {
      result = result.filter(payment => payment.moduleKey === selectedModule);
    }
    
    // Filtro por validade
    if (selectedValidade !== 'todos') {
      result = result.filter(payment => 
        payment.subscription?.validade?.toLowerCase() === selectedValidade.toLowerCase()
      );
    }
    if (selectedOrigin === 'real') result = result.filter(payment => !isNonRevenuePayment(payment));
    if (selectedOrigin === 'manual') result = result.filter(isNonRevenuePayment);

    // Filtro por data
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(p => p.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23,59,59,999);
      result = result.filter(p => p.timestamp <= end);
    }
    
    // Filtro por termo de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(payment => 
        (payment.nome && payment.nome.toLowerCase().includes(term)) || 
        (payment.referencia && payment.referencia.toLowerCase().includes(term)) ||
        (payment.telefone && payment.telefone.toLowerCase().includes(term)) ||
        (payment.userEmail && payment.userEmail.toLowerCase().includes(term)) ||
        (payment.userName && payment.userName.toLowerCase().includes(term)) ||
        (payment.moduleName && payment.moduleName.toLowerCase().includes(term)) ||
        (payment.mpesaResponse?.output_TransactionID && 
          payment.mpesaResponse.output_TransactionID.toLowerCase().includes(term))
      );
    }
    
    setFilteredPayments(result);
  }, [payments, searchTerm, selectedStatus, selectedModule, selectedValidade, selectedOrigin, startDate, endDate]);

  useEffect(() => {
    let result = trials;

    // Filtro por status for trials
    if (selectedStatus !== 'todos') {
      result = result.filter(trial => trial.status === selectedStatus);
    }

    // Filtro por módulo
    if (selectedModule !== 'todos') {
      result = result.filter(trial => trial.moduleKey === selectedModule);
    }

    // Filtro por data
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(t => t.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23,59,59,999);
      result = result.filter(t => t.createdAt <= end);
    }

    // Filtro por termo de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(trial => 
        (trial.companyName && trial.companyName.toLowerCase().includes(term)) ||
        (trial.moduleName && trial.moduleName.toLowerCase().includes(term)) ||
        (trial.notes && trial.notes.toLowerCase().includes(term))
      );
    }

    setFilteredTrials(result);
  }, [trials, searchTerm, selectedStatus, selectedModule, startDate, endDate]);

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      setLoading(true);
      const payment = payments.find(item => item.id === paymentId);
      const normalizedStatus = normalizePaymentStatus(newStatus);
      const now = Date.now();
      const updates = {
        [`payments/${paymentId}/status`]: normalizedStatus,
        [`payments/${paymentId}/updatedAt`]: now,
      };
      if (normalizedStatus === PAYMENT_STATUS.PAID) {
        const activeModule = buildActiveModuleFromPayment(payment, now);
        if (!activeModule) throw new Error('O pagamento não possui utilizador ou módulo associado.');
        updates[`company/${payment.userId}/activeModules/${payment.moduleKey}`] = activeModule;
      }
      await update(ref(db), updates);
      setFeedback({ type: 'success', text: normalizedStatus === PAYMENT_STATUS.PAID ? 'Pagamento aprovado e módulo ativado.' : 'Estado do pagamento atualizado.' });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setFeedback({ type: 'error', text: error.message || 'Não foi possível atualizar o pagamento.' });
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (paymentId) => {
    try {
      setLoading(true);
      await update(ref(db, `payments/${paymentId}`), { archived: true, archivedAt: Date.now() });
      setSelectedItem(null);
      setFeedback({ type: 'success', text: 'Pagamento arquivado. O histórico financeiro foi preservado.' });
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      setFeedback({ type: 'error', text: 'Não foi possível arquivar o pagamento.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteTrial = async (trialId) => {
    try {
      setLoading(true);
      await update(ref(db, `trials/${trialId}`), { archived: true, archivedAt: Date.now() });
      setSelectedItem(null);
      setFeedback({ type: 'success', text: 'Período experimental arquivado.' });
    } catch (error) {
      console.error('Erro ao excluir trial:', error);
      setFeedback({ type: 'error', text: 'Não foi possível arquivar o período experimental.' });
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (moduleKey) => {
    switch(moduleKey) {
      case 'moduloProforma':
        return <FaFileInvoice className="text-blue-500" />;
      case 'moduloSMS':
        return <FaSms className="text-green-500" />;
      case 'moduloMarket':
        return <FaStore className="text-purple-500" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pago':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'rejeitado':
        return 'Rejeitado';
      case 'active':
        return 'Ativo';
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN'
    }).format(amount || 0);
  };

  const formatDate = (timestamp) => {
    return moment(timestamp).format('LLL');
  };

  const openDetails = (item, type) => {
    setSelectedItem({ ...item, type });
  };

  const closeDetails = () => {
    setSelectedItem(null);
  };

  const exportToCSV = () => {
    let data, headers;
    if (viewMode === 'payments') {
      headers = ['Data', 'Empresa', 'Módulo', 'Valor', 'ID Transação', 'Status'];
      data = filteredPayments.map(p => [
        formatDate(p.timestamp),
        p.nome || p.userName,
        p.moduleName,
        formatCurrency(parseFloat(p.amount)),
        p.mpesaResponse?.output_TransactionID || 'N/A',
        getStatusText(p.status)
      ]);
    } else {
      headers = ['Data', 'Empresa', 'Módulo', 'Início', 'Fim', 'Status'];
      data = filteredTrials.map(t => [
        formatDate(t.createdAt),
        t.companyName,
        t.moduleName,
        formatDate(t.startDate),
        formatDate(t.endDate),
        getStatusText(t.status)
      ]);
    }

    let csv = [headers.join(',')];
    data.forEach(row => csv.push(row.join(',')));

    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${viewMode === 'payments' ? 'pagamentos' : 'trials'}.csv`;
    link.click();
  };

  return (
    <AdminPage>
        <AdminPageHeader title="Pagamentos e períodos experimentais" description="Acompanhe transações, aprove acessos e consulte os módulos efetivamente ativos no portal." />
        {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.text}</InlineAlert>}
        
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pagamentos reais</p>
                <p className="text-2xl font-bold">{stats.realPayments}</p>
              </div>
              <FaMoneyBillWave className="text-blue-500 text-3xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Receita confirmada</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <FaChartBar className="text-green-500 text-3xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-amber-200 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Registos não financeiros</p>
                <p className="text-2xl font-bold">{stats.manualActivations}</p>
                <p className="text-xs text-amber-700">Registos legados fora da receita</p>
              </div>
              <FaGift className="text-amber-500 text-3xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trials Ativos</p>
                <p className="text-2xl font-bold">{stats.activeTrials}</p>
              </div>
              <FaGift className="text-purple-500 text-3xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Subscrições Ativas</p>
                <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
              </div>
              <FaCalendarAlt className="text-orange-500 text-3xl" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setViewMode('payments')}
            className={`px-6 py-2 rounded-lg font-medium ${viewMode === 'payments' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Pagamentos
          </button>
          <button 
            onClick={() => setViewMode('trials')}
            className={`px-6 py-2 rounded-lg font-medium ${viewMode === 'trials' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Trials
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos Status</option>
              {viewMode === 'payments' ? (
                <>
                  <option value="pago">Pagos</option>
                  <option value="pendente">Pendentes</option>
                  <option value="rejeitado">Rejeitados</option>
                </>
              ) : (
                <>
                  <option value="active">Ativos</option>
                </>
              )}
            </select>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos Módulos</option>
              <option value="moduloProforma">Proforma</option>
              <option value="moduloSMS">SMS</option>
              <option value="moduloMarket">Market</option>
            </select>
            {viewMode === 'payments' && (
              <>
              <select
                value={selectedValidade}
                onChange={(e) => setSelectedValidade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todas Validades</option>
                <option value="Mensal">Mensal</option>
                <option value="Anual">Anual</option>
              </select>
              <select value={selectedOrigin} onChange={(e) => setSelectedOrigin(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
                <option value="todos">Todas as origens</option>
                <option value="real">Receita real</option>
                <option value="manual">Manual/trial — fora da receita</option>
              </select>
              </>
            )}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Data Início"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Data Fim"
            />
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              <FaFileCsv className="mr-2" /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            {viewMode === 'payments' ? 'Pagamentos Registados' : 'Trials Registados'} ({viewMode === 'payments' ? filteredPayments.length : filteredTrials.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                  {viewMode === 'payments' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Transação</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fim</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viewMode === 'payments' ? (
                  filteredPayments.length > 0 ? filteredPayments.map(payment => (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-gray-50 cursor-pointer" 
                      onClick={() => openDetails(payment, 'payment')}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.timestamp)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.nome || payment.userName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                        {getModuleIcon(payment.moduleKey)} <span className="ml-2">{payment.moduleName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(parseFloat(payment.amount))}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.mpesaResponse?.output_TransactionID || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isNonRevenuePayment(payment) && <span className="mr-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Fora da receita</span>}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                          {payment.status !== 'pago' && (
                            <>
                              <button 
                                onClick={() => updatePaymentStatus(payment.id, 'pago')}
                                className="text-green-600 hover:text-green-800"
                                disabled={loading}
                              >
                                <FaCheck />
                              </button>
                              <button 
                                onClick={() => updatePaymentStatus(payment.id, 'rejeitado')}
                                className="text-red-600 hover:text-red-800"
                                disabled={loading}
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setPendingDeletion({ type: 'payment', id: payment.id, label: payment.nome || payment.userName || payment.id })}
                            className="text-gray-600 hover:text-gray-800"
                            disabled={loading}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">Nenhum pagamento encontrado</td></tr>
                  )
                ) : (
                  filteredTrials.length > 0 ? filteredTrials.map(trial => (
                    <tr 
                      key={trial.id} 
                      className="hover:bg-gray-50 cursor-pointer" 
                      onClick={() => openDetails(trial, 'trial')}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(trial.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trial.companyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                        {getModuleIcon(trial.moduleKey)} <span className="ml-2">{trial.moduleName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(trial.startDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(trial.endDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(trial.status)}`}>
                          {getStatusText(trial.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => setPendingDeletion({ type: 'trial', id: trial.id, label: trial.companyName || trial.id })}
                            className="text-gray-600 hover:text-gray-800"
                            disabled={loading}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">Nenhum trial encontrado</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">Detalhes {selectedItem.type === 'payment' ? 'do Pagamento' : 'do Trial'}</h3>
                <button 
                  onClick={closeDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Informações da Empresa */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaBuilding className="mr-2" /> Informações da Empresa
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaUser className="mr-2" /> Nome
                      </p>
                      <p className="font-medium">{selectedItem.type === 'payment' ? (selectedItem.nome || selectedItem.userName) : selectedItem.companyName}</p>
                    </div>
                    {selectedItem.type === 'payment' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500 flex items-center">
                            <FaEnvelope className="mr-2" /> Email
                          </p>
                          <p className="font-medium">{selectedItem.userEmail || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 flex items-center">
                            <FaPhone className="mr-2" /> Telefone
                          </p>
                          <p className="font-medium">{selectedItem.telefone || 'Não informado'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaIdCard className="mr-2" /> ID
                      </p>
                      <p className="font-medium text-xs">{selectedItem.type === 'payment' ? selectedItem.userId : selectedItem.companyId}</p>
                    </div>
                  </div>
                </div>

                {/* Informações Específicas */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    {selectedItem.type === 'payment' ? <FaMoneyBillWave className="mr-2" /> : <FaGift className="mr-2" />} 
                    Informações {selectedItem.type === 'payment' ? 'do Pagamento' : 'do Trial'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaClock className="mr-2" /> Data de Criação
                      </p>
                      <p className="font-medium">{formatDate(selectedItem.type === 'payment' ? selectedItem.timestamp : selectedItem.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Módulo</p>
                      <p className="font-medium flex items-center">
                        {getModuleIcon(selectedItem.moduleKey)}
                        <span className="ml-2">{selectedItem.moduleName}</span>
                      </p>
                    </div>
                    {selectedItem.type === 'payment' ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Valor</p>
                          <p className="font-medium">{formatCurrency(parseFloat(selectedItem.amount))}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Referência</p>
                          <p className="font-medium">{selectedItem.reference || selectedItem.referencia || 'Não informada'}</p>
                        </div>
                        {selectedItem.receiptNumber && <div><p className="text-sm text-gray-500">Documentos</p><p className="font-medium">{selectedItem.invoiceNumber} · {selectedItem.receiptNumber}</p></div>}
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Início</p>
                          <p className="font-medium">{formatDate(selectedItem.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fim</p>
                          <p className="font-medium">{formatDate(selectedItem.endDate)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedItem.status)}`}>
                        {getStatusText(selectedItem.status)}
                      </span>
                    </div>
                    {selectedItem.notes && (
                      <div>
                        <p className="text-sm text-gray-500">Observações</p>
                        <p className="font-medium">{selectedItem.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedItem.type === 'payment' && selectedItem.mpesaResponse && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3">Detalhes M-Pesa</h4>
                  {/* ... similar to original ... */}
                </div>
              )}

              {selectedItem.type === 'payment' && selectedItem.subscription && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaCalendarAlt className="mr-2" /> Informações da Subscrição
                  </h4>
                  {/* ... similar to original ... */}
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {selectedItem.type === 'payment' && isCollectedRevenuePayment(selectedItem) && (
                  <button type="button" onClick={() => downloadPaymentReceipt(selectedItem)} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 flex items-center">
                    <FaFileInvoice className="mr-2" /> Baixar comprovativo
                  </button>
                )}
                {selectedItem.type === 'payment' && selectedItem.status !== 'pago' && (
                  <>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedItem.id, 'pago');
                        closeDetails();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                      disabled={loading}
                    >
                      <FaCheck className="mr-2" /> Marcar como Pago
                    </button>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedItem.id, 'rejeitado');
                        closeDetails();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                      disabled={loading}
                    >
                      <FaTimes className="mr-2" /> Rejeitar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPendingDeletion({
                    type: selectedItem.type,
                    id: selectedItem.id,
                    label: selectedItem.nome || selectedItem.userName || selectedItem.companyName || selectedItem.id
                  })}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center"
                  disabled={loading}
                >
                  <FaTrash className="mr-2" /> Arquivar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDeletion)}
        title="Arquivar registo?"
        description={`O registo de “${pendingDeletion?.label || ''}” deixará de aparecer nas listagens, mas será preservado para auditoria.`}
        confirmLabel="Arquivar"
        busy={loading}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={async () => {
          const pending = pendingDeletion;
          setPendingDeletion(null);
          if (pending?.type === 'payment') await deletePayment(pending.id);
          if (pending?.type === 'trial') await deleteTrial(pending.id);
        }}
      />
    </AdminPage>
  );
};

export default Pagar;
