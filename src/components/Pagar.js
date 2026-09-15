import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../fb';
import { 
  FaSearch, FaTrash, FaCheck, FaTimes, FaFileAlt, FaBuilding, 
  FaPhone, FaEnvelope, FaUser, FaCalendarAlt, FaMoneyBillWave, 
  FaSms, FaStore, FaIdCard, FaClock,
  FaGift, FaChartBar, FaFileCsv, FaBolt, FaBan
} from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/pt';

moment.locale('pt');

// ────────────────────────────────────────────────────────────────
// Módulos disponíveis hoje (mantido em sincronia com ModuleGrid.jsx)
// ────────────────────────────────────────────────────────────────
const MODULOS_DISPONIVEIS = {
  moduloMarket: { label: 'Mercado (Produtos & Serviços)', icon: <FaStore className="text-purple-500" /> },
  moduloSMS: { label: 'Cotações', icon: <FaSms className="text-green-500" /> },
};

const DIAS_POR_VALIDADE = {
  Mensal: 30,
  Anual: 365,
};

/**
 * Grava a ativação de um módulo diretamente na empresa — este é o node que
 * o app (via ActiveModulesContext) e o ModuleGrid realmente leem para
 * liberar/bloquear acesso. Aprovar um pagamento ou ativar um trial aqui
 * só tem efeito real se isto for chamado.
 */
const ativarModuloNaEmpresa = async ({ companyId, moduleKey, moduleName, expiresAt, origem }) => {
  if (!companyId || !moduleKey) {
    throw new Error('companyId e moduleKey são obrigatórios para ativar um módulo.');
  }
  await update(ref(db, `company/${companyId}/activeModules/${moduleKey}`), {
    status: 'active',
    moduleName: moduleName || MODULOS_DISPONIVEIS[moduleKey]?.label || moduleKey,
    expiresAt,
    paidAt: Date.now(),
    origem: origem || 'manual', // 'pagamento' | 'trial' | 'manual'
  });
};

/**
 * Contraparte da ativação: remove o módulo de company/{id}/activeModules.
 * Reflete imediatamente no ModuleGrid e em qualquer rota protegida, pois
 * ambos leem o mesmo node via ActiveModulesContext.
 *
 * Atenção: isto remove o módulo incondicionalmente. Se a mesma empresa
 * tiver ganho o mesmo módulo por mais de uma via (ex: pagamento + trial
 * simultâneos), revogar por um dos registros derruba o acesso mesmo que
 * o outro ainda devesse valer. Para este produto, com um único módulo
 * de cotações/mercado por empresa, isso não costuma ser um problema na
 * prática — mas vale ter em mente se o modelo crescer.
 */
const revogarModuloDaEmpresa = async ({ companyId, moduleKey }) => {
  if (!companyId || !moduleKey) return;
  await remove(ref(db, `company/${companyId}/activeModules/${moduleKey}`));
};

const Pagar = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filteredTrials, setFilteredTrials] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedModule, setSelectedModule] = useState('todos');
  const [selectedValidade, setSelectedValidade] = useState('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('payments');
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // { message, type: 'success' | 'error' }
  const [stats, setStats] = useState({
    totalPayments: 0,
    paidAmount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    paidCount: 0,
    totalTrials: 0,
    activeTrials: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    const paymentsRef = ref(db, 'payments');
    const trialsRef = ref(db, 'trials');
    const subscriptionsRef = ref(db, 'subscriptions');
    
    const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const paymentsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        paymentsArray.sort((a, b) => b.timestamp - a.timestamp);
        setPayments(paymentsArray);
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
        setTrials(trialsArray);
      } else {
        setTrials([]);
      }
    });

    // Nota: `subscriptions` deixou de ser lido pelo app (ver ActiveModulesContext.jsx).
    // Mantido aqui só para estatística histórica; não é mais escrito por este componente.
    const unsubscribeSubscriptions = onValue(subscriptionsRef, (snapshot) => {
      const data = snapshot.val();
      setSubscriptions(data || {});
    });

    return () => {
      unsubscribePayments();
      unsubscribeTrials();
      unsubscribeSubscriptions();
    };
  }, []);

  useEffect(() => {
    const now = Date.now();
    const paidAmount = payments.reduce((sum, p) => sum + (p.status === 'pago' ? parseFloat(p.amount || 0) : 0), 0);
    const pendingCount = payments.filter(p => p.status === 'pendente').length;
    const rejectedCount = payments.filter(p => p.status === 'rejeitado').length;
    const paidCount = payments.filter(p => p.status === 'pago').length;
    const activeTrials = trials.filter(t => t.status === 'active' && t.endDate > now).length;
    const activeSubs = Object.values(subscriptions).reduce((count, companySubs) => {
      return count + Object.values(companySubs).filter(sub => sub.isActive && sub.end > now).length;
    }, 0);

    setStats({
      totalPayments: payments.length,
      paidAmount,
      pendingCount,
      rejectedCount,
      paidCount,
      totalTrials: trials.length,
      activeTrials,
      activeSubscriptions: activeSubs
    });
  }, [payments, trials, subscriptions]);

  useEffect(() => {
    let result = payments;
    
    if (selectedStatus !== 'todos') {
      result = result.filter(payment => payment.status === selectedStatus);
    }
    
    if (selectedModule !== 'todos') {
      result = result.filter(payment => payment.moduleKey === selectedModule);
    }
    
    if (selectedValidade !== 'todos') {
      result = result.filter(payment => 
        payment.subscription?.validade?.toLowerCase() === selectedValidade.toLowerCase()
      );
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(p => p.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23,59,59,999);
      result = result.filter(p => p.timestamp <= end);
    }
    
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
  }, [payments, searchTerm, selectedStatus, selectedModule, selectedValidade, startDate, endDate]);

  useEffect(() => {
    let result = trials;

    if (selectedStatus !== 'todos') {
      result = result.filter(trial => trial.status === selectedStatus);
    }

    if (selectedModule !== 'todos') {
      result = result.filter(trial => trial.moduleKey === selectedModule);
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(t => t.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23,59,59,999);
      result = result.filter(t => t.createdAt <= end);
    }

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

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  /**
   * Aprovar pagamento agora faz DUAS coisas: atualiza o registro do
   * pagamento (histórico) E ativa o módulo de verdade na empresa.
   * Rejeitar só atualiza o registro — não mexe em módulos.
   */
  const updatePaymentStatus = async (payment, newStatus) => {
    try {
      setLoading(true);

      await update(ref(db, `payments/${payment.id}`), {
        status: newStatus,
        updatedAt: Date.now()
      });

      if (newStatus === 'pago') {
        const dias = DIAS_POR_VALIDADE[payment.subscription?.validade] || 30;
        const expiresAt = Date.now() + dias * 24 * 60 * 60 * 1000;

        await ativarModuloNaEmpresa({
          companyId: payment.userId,
          moduleKey: payment.moduleKey,
          moduleName: payment.moduleName,
          expiresAt,
          origem: 'pagamento',
        });

        showFeedback(`Pagamento aprovado e módulo "${payment.moduleName}" ativado para ${payment.nome || payment.userName}.`);
      } else {
        showFeedback('Pagamento atualizado.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showFeedback('Erro ao atualizar status do pagamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (payment) => {
    const vaiRevogar = payment.status === 'pago';
    const aviso = vaiRevogar
      ? `Tem certeza que deseja excluir este pagamento? Isto TAMBÉM vai revogar o módulo "${payment.moduleName}" da empresa, já que ele foi concedido por este pagamento.`
      : 'Tem certeza que deseja excluir este pagamento permanentemente?';

    if (!window.confirm(aviso)) return;
    
    try {
      setLoading(true);
      await remove(ref(db, `payments/${payment.id}`));

      if (vaiRevogar) {
        await revogarModuloDaEmpresa({ companyId: payment.userId, moduleKey: payment.moduleKey });
        showFeedback(`Pagamento excluído e módulo "${payment.moduleName}" revogado.`);
      }

      setSelectedItem(null);
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      showFeedback('Erro ao excluir pagamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoga o acesso concedido por um pagamento já aprovado, sem apagar
   * o registro do pagamento (mantém o histórico, útil para estorno,
   * cancelamento do cliente, etc).
   */
  const revokePayment = async (payment) => {
    if (!window.confirm(`Revogar o módulo "${payment.moduleName}" desta empresa? O registro do pagamento continua no histórico, marcado como revogado.`)) return;

    try {
      setLoading(true);
      await update(ref(db, `payments/${payment.id}`), {
        status: 'revogado',
        updatedAt: Date.now()
      });
      await revogarModuloDaEmpresa({ companyId: payment.userId, moduleKey: payment.moduleKey });
      showFeedback(`Módulo "${payment.moduleName}" revogado de ${payment.nome || payment.userName}.`);
    } catch (error) {
      console.error('Erro ao revogar módulo:', error);
      showFeedback('Erro ao revogar módulo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ativar um trial agora também grava o módulo de verdade na empresa,
   * com expiração igual ao endDate do trial.
   */
  const updateTrialStatus = async (trial, newStatus) => {
    try {
      setLoading(true);
      await update(ref(db, `trials/${trial.id}`), {
        status: newStatus,
        updatedAt: Date.now()
      });

      if (newStatus === 'active') {
        await ativarModuloNaEmpresa({
          companyId: trial.companyId,
          moduleKey: trial.moduleKey,
          moduleName: trial.moduleName,
          expiresAt: trial.endDate,
          origem: 'trial',
        });

        showFeedback(`Trial ativado — módulo "${trial.moduleName}" liberado para ${trial.companyName} até ${moment(trial.endDate).format('LL')}.`);
      } else {
        showFeedback('Trial atualizado.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status do trial:', error);
      showFeedback('Erro ao atualizar status do trial.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrial = async (trial) => {
    const vaiRevogar = trial.status === 'active';
    const aviso = vaiRevogar
      ? `Tem certeza que deseja excluir este trial? Isto TAMBÉM vai revogar o módulo "${trial.moduleName}" da empresa, já que ele foi concedido por este trial.`
      : 'Tem certeza que deseja excluir este trial permanentemente?';

    if (!window.confirm(aviso)) return;
    
    try {
      setLoading(true);
      await remove(ref(db, `trials/${trial.id}`));

      if (vaiRevogar) {
        await revogarModuloDaEmpresa({ companyId: trial.companyId, moduleKey: trial.moduleKey });
        showFeedback(`Trial excluído e módulo "${trial.moduleName}" revogado.`);
      }

      setSelectedItem(null);
    } catch (error) {
      console.error('Erro ao excluir trial:', error);
      showFeedback('Erro ao excluir trial.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoga o acesso concedido por um trial já ativo, sem apagar o
   * registro do trial (mantém o histórico).
   */
  const revokeTrial = async (trial) => {
    if (!window.confirm(`Revogar o módulo "${trial.moduleName}" desta empresa? O registro do trial continua no histórico, marcado como revogado.`)) return;

    try {
      setLoading(true);
      await update(ref(db, `trials/${trial.id}`), {
        status: 'revogado',
        updatedAt: Date.now()
      });
      await revogarModuloDaEmpresa({ companyId: trial.companyId, moduleKey: trial.moduleKey });
      showFeedback(`Módulo "${trial.moduleName}" revogado de ${trial.companyName}.`);
    } catch (error) {
      console.error('Erro ao revogar módulo:', error);
      showFeedback('Erro ao revogar módulo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (moduleKey) => {
    return MODULOS_DISPONIVEIS[moduleKey]?.icon || <FaFileAlt className="text-gray-500" />;
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pago':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado':
      case 'revogado':
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
      case 'revogado':
        return 'Revogado';
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Módulos</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8 flex items-center">
          <FaBolt className="mr-2 text-orange-400" />
          Aprovar um pagamento ou ativar um trial aqui grava direto em <code className="mx-1 bg-gray-100 px-1 rounded">company/&#123;id&#125;/activeModules</code> — a mesma fonte que o app usa para liberar ou bloquear cada módulo.
        </p>

        {feedback && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {feedback.message}
          </div>
        )}
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Pagamentos</p>
                <p className="text-2xl font-bold">{stats.totalPayments}</p>
              </div>
              <FaMoneyBillWave className="text-blue-500 text-3xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Valor Total Pago</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <FaChartBar className="text-green-500 text-3xl" />
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
                <p className="text-sm text-gray-500">Pendentes de Aprovação</p>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
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
                  <option value="revogado">Revogados</option>
                </>
              ) : (
                <>
                  <option value="active">Ativos</option>
                  <option value="revogado">Revogados</option>
                </>
              )}
            </select>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos Módulos</option>
              {Object.entries(MODULOS_DISPONIVEIS).map(([key, mod]) => (
                <option key={key} value={key}>{mod.label}</option>
              ))}
            </select>
            {viewMode === 'payments' && (
              <select
                value={selectedValidade}
                onChange={(e) => setSelectedValidade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todas Validades</option>
                <option value="Mensal">Mensal</option>
                <option value="Anual">Anual</option>
              </select>
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                          {payment.status !== 'pago' && payment.status !== 'revogado' && (
                            <>
                              <button 
                                onClick={() => updatePaymentStatus(payment, 'pago')}
                                className="text-green-600 hover:text-green-800"
                                title="Aprovar e ativar módulo"
                                disabled={loading}
                              >
                                <FaCheck />
                              </button>
                              <button 
                                onClick={() => updatePaymentStatus(payment, 'rejeitado')}
                                className="text-red-600 hover:text-red-800"
                                title="Rejeitar"
                                disabled={loading}
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {payment.status === 'pago' && (
                            <button 
                              onClick={() => revokePayment(payment)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Revogar módulo (mantém o histórico)"
                              disabled={loading}
                            >
                              <FaBan />
                            </button>
                          )}
                          <button 
                            onClick={() => deletePayment(payment)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Excluir registo"
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
                          {trial.status !== 'active' && trial.status !== 'revogado' && (
                            <button 
                              onClick={() => updateTrialStatus(trial, 'active')}
                              className="text-green-600 hover:text-green-800"
                              title="Ativar trial e módulo"
                              disabled={loading}
                            >
                              <FaCheck />
                            </button>
                          )}
                          {trial.status === 'active' && (
                            <button 
                              onClick={() => revokeTrial(trial)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Revogar módulo (mantém o histórico)"
                              disabled={loading}
                            >
                              <FaBan />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteTrial(trial)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Excluir registo"
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
                          <p className="font-medium">{selectedItem.referencia || 'Não informada'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Validade</p>
                          <p className="font-medium">{selectedItem.subscription?.validade || 'Não informada'}</p>
                        </div>
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

              <div className="mt-6 flex justify-end space-x-3">
                {selectedItem.type === 'payment' && selectedItem.status !== 'pago' && selectedItem.status !== 'revogado' && (
                  <>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedItem, 'pago');
                        closeDetails();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                      disabled={loading}
                    >
                      <FaCheck className="mr-2" /> Aprovar e Ativar Módulo
                    </button>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedItem, 'rejeitado');
                        closeDetails();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                      disabled={loading}
                    >
                      <FaTimes className="mr-2" /> Rejeitar
                    </button>
                  </>
                )}
                {selectedItem.type === 'payment' && selectedItem.status === 'pago' && (
                  <button
                    onClick={() => {
                      revokePayment(selectedItem);
                      closeDetails();
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                    disabled={loading}
                  >
                    <FaBan className="mr-2" /> Revogar Módulo
                  </button>
                )}
                {selectedItem.type === 'trial' && selectedItem.status !== 'active' && selectedItem.status !== 'revogado' && (
                  <button
                    onClick={() => {
                      updateTrialStatus(selectedItem, 'active');
                      closeDetails();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    disabled={loading}
                  >
                    <FaCheck className="mr-2" /> Ativar Trial e Módulo
                  </button>
                )}
                {selectedItem.type === 'trial' && selectedItem.status === 'active' && (
                  <button
                    onClick={() => {
                      revokeTrial(selectedItem);
                      closeDetails();
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                    disabled={loading}
                  >
                    <FaBan className="mr-2" /> Revogar Módulo
                  </button>
                )}
                <button
                  onClick={() => {
                    if (selectedItem.type === 'payment') {
                      deletePayment(selectedItem);
                    } else {
                      deleteTrial(selectedItem);
                    }
                    closeDetails();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center"
                  disabled={loading}
                >
                  <FaTrash className="mr-2" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagar;