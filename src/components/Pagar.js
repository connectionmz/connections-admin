import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../fb';
import { 
  FaSearch, FaTrash, FaCheck, FaTimes, FaFileAlt, FaBuilding, 
  FaPhone, FaEnvelope, FaUser, FaCalendarAlt, FaMoneyBillWave, 
  FaFileInvoice, FaSms, FaStore, FaIdCard, FaClock, FaExchangeAlt
} from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/pt';

moment.locale('pt');

const Pagar = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedModule, setSelectedModule] = useState('todos');
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState('todos');

  useEffect(() => {
    const paymentsRef = ref(db, 'payments');
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

    const unsubscribeSubscriptions = onValue(subscriptionsRef, (snapshot) => {
      const data = snapshot.val();
      setSubscriptions(data || {});
    });

    return () => {
      unsubscribePayments();
      unsubscribeSubscriptions();
    };
  }, []);

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
    
    // Filtro por tipo de subscrição
    if (selectedSubscriptionType !== 'todos') {
      result = result.filter(payment => 
        payment.subscription?.subscriptionType === selectedSubscriptionType
      );
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
  }, [payments, searchTerm, selectedStatus, selectedModule, selectedSubscriptionType]);

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      setLoading(true);
      await update(ref(db, `payments/${paymentId}`), {
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!window.confirm('Tem certeza que deseja excluir este pagamento permanentemente?')) return;
    
    try {
      setLoading(true);
      await remove(ref(db, `payments/${payment.id}`));
      setSelectedPayment(null);
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      alert('Erro ao excluir pagamento.');
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

  const getSubscriptionStatus = (userId, moduleKey) => {
    if (!subscriptions[userId] || !subscriptions[userId][moduleKey]) return null;
    return subscriptions[userId][moduleKey];
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
  };

  const closePaymentDetails = () => {
    setSelectedPayment(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestão de Pagamentos</h1>
        
        {/* Lista de pagamentos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 md:mb-0">
              Pagamentos Registados ({filteredPayments.length})
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por empresa, referência, transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos Status</option>
                <option value="pago">Pagos</option>
                <option value="pendente">Pendentes</option>
                <option value="rejeitado">Rejeitados</option>
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
              <select
                value={selectedSubscriptionType}
                onChange={(e) => setSelectedSubscriptionType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos Tipos</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Transação</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => {
                    const subscriptionStatus = getSubscriptionStatus(payment.userId, payment.moduleKey);
                    return (
                      <tr 
                        key={payment.id} 
                        className="hover:bg-gray-50 cursor-pointer" 
                        onClick={() => openPaymentDetails(payment)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{payment.nome || payment.userName}</div>
                          <div className="text-sm text-gray-500">{payment.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getModuleIcon(payment.moduleKey)}
                            <span className="ml-2 text-sm text-gray-900">{payment.moduleName}</span>
                          </div>
                          {payment.subscription?.subscriptionType && (
                            <span className="text-xs text-gray-500 capitalize">
                              {payment.subscription.subscriptionType}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(parseFloat(payment.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.mpesaResponse?.output_TransactionID || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                            {getStatusText(payment.status)}
                          </span>
                          {subscriptionStatus?.isActive && (
                            <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {payment.status !== 'pago' && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePaymentStatus(payment.id, 'pago');
                                  }}
                                  className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50"
                                  title="Marcar como pago"
                                  disabled={loading}
                                >
                                  <FaCheck />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePaymentStatus(payment.id, 'rejeitado');
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                  title="Rejeitar"
                                  disabled={loading}
                                >
                                  <FaTimes />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePayment(payment);
                              }}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-50"
                              title="Excluir"
                              disabled={loading}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum pagamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">Detalhes do Pagamento</h3>
                <button 
                  onClick={closePaymentDetails}
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
                      <p className="font-medium">{selectedPayment.nome || selectedPayment.userName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaEnvelope className="mr-2" /> Email
                      </p>
                      <p className="font-medium">{selectedPayment.userEmail || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaPhone className="mr-2" /> Telefone
                      </p>
                      <p className="font-medium">{selectedPayment.telefone || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaIdCard className="mr-2" /> ID do Usuário
                      </p>
                      <p className="font-medium text-xs">{selectedPayment.userId || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* Informações do Pagamento */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaMoneyBillWave className="mr-2" /> Informações do Pagamento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <FaClock className="mr-2" /> Data
                      </p>
                      <p className="font-medium">{formatDate(selectedPayment.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Módulo</p>
                      <p className="font-medium flex items-center">
                        {getModuleIcon(selectedPayment.moduleKey)}
                        <span className="ml-2">{selectedPayment.moduleName}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valor</p>
                      <p className="font-medium">{formatCurrency(parseFloat(selectedPayment.amount))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Referência</p>
                      <p className="font-medium">{selectedPayment.referencia || 'Não informada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`font-medium inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusBadge(selectedPayment.status)}`}>
                        {getStatusText(selectedPayment.status)}
                      </p>
                    </div>
                    {selectedPayment.updatedAt && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <FaExchangeAlt className="mr-2" /> Última Atualização
                        </p>
                        <p className="font-medium">{formatDate(selectedPayment.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações da Subscrição */}
              {selectedPayment.subscription && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaCalendarAlt className="mr-2" /> Informações da Subscrição
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Tipo</p>
                      <p className="font-medium capitalize">{selectedPayment.subscription.subscriptionType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Início</p>
                      <p className="font-medium">{formatDate(selectedPayment.subscription.start)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fim</p>
                      <p className="font-medium">{formatDate(selectedPayment.subscription.end)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duração</p>
                      <p className="font-medium">{selectedPayment.subscription.durationDays} dias</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`font-medium ${selectedPayment.subscription.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedPayment.subscription.isActive ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Validade</p>
                      <p className="font-medium">{selectedPayment.subscription.validade || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resposta M-Pesa */}
              {selectedPayment.mpesaResponse && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3">Detalhes da Transação M-Pesa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ID da Transação</p>
                      <p className="font-medium">{selectedPayment.mpesaResponse.output_TransactionID || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ID da Conversa</p>
                      <p className="font-medium">{selectedPayment.mpesaResponse.output_ConversationID || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Código de Resposta</p>
                      <p className="font-medium">{selectedPayment.mpesaResponse.output_ResponseCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Descrição</p>
                      <p className="font-medium">{selectedPayment.mpesaResponse.output_ResponseDesc || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Referência</p>
                      <p className="font-medium">{selectedPayment.mpesaResponse.output_ThirdPartyReference || 'N/A'}</p>
                    </div>
                    {selectedPayment.mpesaResponse.isSuccess !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500">Sucesso</p>
                        <p className={`font-medium ${selectedPayment.mpesaResponse.isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPayment.mpesaResponse.isSuccess ? 'Sim' : 'Não'}
                        </p>
                      </div>
                    )}
                    {selectedPayment.mpesaResponse.statusMessage && (
                      <div>
                        <p className="text-sm text-gray-500">Mensagem de Status</p>
                        <p className="font-medium">{selectedPayment.mpesaResponse.statusMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="mt-6 flex justify-end space-x-3">
                {selectedPayment.status !== 'pago' && (
                  <>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedPayment.id, 'pago');
                        closePaymentDetails();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                      disabled={loading}
                    >
                      <FaCheck className="mr-2" /> Marcar como Pago
                    </button>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedPayment.id, 'rejeitado');
                        closePaymentDetails();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                      disabled={loading}
                    >
                      <FaTimes className="mr-2" /> Rejeitar
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    deletePayment(selectedPayment);
                    closePaymentDetails();
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