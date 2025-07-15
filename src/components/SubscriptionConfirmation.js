import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../fb';
import { ref, onValue, update, push } from 'firebase/database';
import { 
  FaCheck, 
  FaTimes, 
  FaBuilding, 
  FaShoppingCart, 
  FaTrash,
  FaPlus,
  FaMinus,
  FaSearch,
  FaExclamationTriangle
} from 'react-icons/fa';

const SubscriptionConfirmation = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [modules, setModules] = useState([]);
  const [cart, setCart] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const navigate = useNavigate();

  // Carregar empresas, módulos e subscrições
  useEffect(() => {
    const companiesRef = ref(db, 'company');
    const modulesRef = ref(db, 'modules/modulos');
    const subscriptionsRef = ref(db, 'subscriptions');

    const unsubscribeCompanies = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCompanies(Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })));
      }
    });

    const unsubscribeModules = onValue(modulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setModules(Object.keys(data).map(key => ({
          key,
          ...data[key]
        })));
      }
    });

    const unsubscribeSubscriptions = onValue(subscriptionsRef, (snapshot) => {
      const data = snapshot.val();
      setSubscriptions(data || {});
    });

    return () => {
      unsubscribeCompanies();
      unsubscribeModules();
      unsubscribeSubscriptions();
    };
  }, []);

  // Verificar se a empresa já tem o módulo ativo
  const companyHasModule = (companyId, moduleKey) => {
    if (!subscriptions[companyId] || !subscriptions[companyId][moduleKey]) {
      return false;
    }
    
    const subscription = subscriptions[companyId][moduleKey];
    const now = Date.now();
    
    // Verifica se a subscrição está ativa e não expirada
    return subscription.isActive && subscription.end > now;
  };

  // Filtrar módulos
  const filteredModules = modules.filter(module => 
    module.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar empresas
  const filteredCompanies = companies.filter(company => 
    company.nome.toLowerCase().includes(companySearch.toLowerCase()) ||
    company.sector.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleAddToCart = (module) => {
    if (!selectedCompany) {
      setError('Selecione uma empresa antes de adicionar módulos');
      return;
    }

    if (companyHasModule(selectedCompany, module.key)) {
      setError('Esta empresa já possui uma subscrição ativa para este módulo');
      return;
    }

    const existingItem = cart.find(item => item.moduleKey === module.key);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.moduleKey === module.key 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        moduleKey: module.key,
        moduleName: module.name,
        price: module.price,
        validade: module.validade,
        quantity: 1
      }]);
    }
    setError('');
  };

  const handleRemoveFromCart = (moduleKey) => {
    setCart(cart.filter(item => item.moduleKey !== moduleKey));
  };

  const handleQuantityChange = (moduleKey, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCart(cart.map(item => 
      item.moduleKey === moduleKey 
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateSubscriptionEnd = (validade) => {
    const now = Date.now();
    const durationInMs = {
      Mensal: 30 * 24 * 60 * 60 * 1000, 
      Anual: 365 * 24 * 60 * 60 * 1000,
    };
    return now + (durationInMs[validade] || durationInMs.Mensal);
  };

  const updateSubscription = async (companyId, item, newPaymentRef, now, subscriptionEnd) => {
    const subscriptionData = {
      isActive: true,
      start: now,
      end: subscriptionEnd,
      durationDays: item.validade === 'Anual' ? 365 : 30,
      moduleKey: item.moduleKey,
      moduleName: item.moduleName,
      subscriptionType: item.validade.toLowerCase(),
      paymentId: newPaymentRef.key,
      validade: item.validade,
    };

    const subscriptionRef = ref(db, `subscriptions/${companyId}/${item.moduleKey}`);
    await update(subscriptionRef, subscriptionData);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedCompany) {
      setError('Por favor, selecione uma empresa');
      return;
    }

    if (cart.length === 0) {
      setError('Por favor, adicione pelo menos um módulo ao carrinho');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const company = companies.find(c => c.id === selectedCompany);
      const now = Date.now();

      // Verificar novamente se algum módulo já está ativo antes de confirmar
      const hasExistingSubscriptions = cart.some(item => 
        companyHasModule(company.id, item.moduleKey)
      );

      if (hasExistingSubscriptions) {
        throw new Error('Um ou mais módulos selecionados já estão ativos para esta empresa');
      }

      // Criar pagamento para cada item no carrinho
      for (const item of cart) {
        const subscriptionEnd = calculateSubscriptionEnd(item.validade);

        const paymentData = {
          userId: user.id,
          userName: user.displayName || '',
          userEmail: user.email || '',
          nome: company.nome,
          telefone: company.phone || '',
          moduleKey: item.moduleKey,
          moduleName: item.moduleName,
          moduleType: 'standard',
          amount: item.price * item.quantity,
          reference: company.nome,
          status: 'pago',
          timestamp: now,
          updatedAt: now,
          notes,
          paymentMethod: 'manual',
          subscription: {
            isActive: true,
            start: now,
            end: subscriptionEnd,
            durationDays: item.validade === 'Anual' ? 365 : 30,
            moduleKey: item.moduleKey,
            moduleName: item.moduleName,
            subscriptionType: item.validade.toLowerCase(),
          }
        };

        // Criar registro de pagamento
        const paymentsRef = ref(db, 'payments');
        const newPaymentRef = push(paymentsRef);
        await update(newPaymentRef, paymentData);

        // Atualizar subscrição
        await updateSubscription(company.id, item, newPaymentRef, now, subscriptionEnd);
      }

      setSuccess(true);
      setConfirmOpen(false);
      setTimeout(() => {
        setCart([]);
        setSelectedCompany('');
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Erro ao confirmar subscrição:', err);
      setError(err.message || 'Ocorreu um erro ao confirmar a subscrição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8">
          Confirmação Manual de Subscrições
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel de Seleção */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center mb-4">
              <FaBuilding className="text-blue-500 mr-2" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-700">Seleção de Empresa</h2>
            </div>

            {/* Busca de Empresas */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar empresa..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
            </div>

            {/* Lista de Empresas */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecione uma empresa:</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map(company => (
                    <div 
                      key={company.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedCompany === company.id ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        setSelectedCompany(company.id);
                        setError('');
                      }}
                    >
                      <div className="font-medium">{company.nome}</div>
                      <div className="text-sm text-gray-600">{company.sector}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">Nenhuma empresa encontrada</div>
                )}
              </div>
            </div>

            <div className="flex items-center mb-4">
              <FaShoppingCart className="text-green-500 mr-2" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-700">Módulos Disponíveis</h2>
            </div>

            {/* Busca de Módulos */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar módulo..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Lista de Módulos */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredModules.length > 0 ? (
                filteredModules.map(module => {
                  const isModuleActive = selectedCompany && companyHasModule(selectedCompany, module.key);
                  
                  return (
                    <div 
                      key={module.key} 
                      className={`p-3 border rounded-lg hover:shadow-md transition-shadow ${
                        isModuleActive ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{module.name}</h3>
                          <p className="text-sm text-gray-600">
                            {module.validade === 'Anual' ? '1 ano' : '1 mês'} - {module.price.toLocaleString('pt-PT')} MT
                          </p>
                          {isModuleActive && (
                            <p className="text-xs text-yellow-600 mt-1 flex items-center">
                              <FaExclamationTriangle className="mr-1" />
                              Já ativo para esta empresa
                            </p>
                          )}
                        </div>
                        <button
                          className={`px-3 py-1 rounded-md transition-colors flex items-center ${
                            isModuleActive
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                          onClick={() => handleAddToCart(module)}
                          disabled={isModuleActive}
                        >
                          <FaPlus className="mr-1" />
                          Adicionar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-gray-500">Nenhum módulo encontrado</div>
              )}
            </div>
          </div>

          {/* Painel do Carrinho */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center mb-4">
              <FaShoppingCart className="text-green-500 mr-2" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-700">Carrinho de Compras</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Seu carrinho está vazio
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cart.map((item) => (
                        <tr key={item.moduleKey}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.moduleName} <span className="text-xs text-gray-500">({item.validade === 'Anual' ? 'Anual' : 'Mensal'})</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {item.price.toLocaleString('pt-PT')} MT
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <button
                                className="p-1 text-gray-500 hover:text-gray-700"
                                onClick={() => handleQuantityChange(item.moduleKey, item.quantity - 1)}
                              >
                                <FaMinus />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.moduleKey, parseInt(e.target.value) || 1)}
                                className="w-12 mx-2 text-center border rounded"
                              />
                              <button
                                className="p-1 text-gray-500 hover:text-gray-700"
                                onClick={() => handleQuantityChange(item.moduleKey, item.quantity + 1)}
                              >
                                <FaPlus />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {(item.price * item.quantity).toLocaleString('pt-PT')} MT
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              className="p-1 text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveFromCart(item.moduleKey)}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">
                    {calculateTotal().toLocaleString('pt-PT')} MT
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações:</label>
                  <textarea
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione notas ou observações sobre esta subscrição..."
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
                    Subscrições confirmadas com sucesso!
                  </div>
                )}

                <button
                  className={`w-full py-3 px-4 rounded-lg font-medium ${
                    !selectedCompany || cart.length === 0 || loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  onClick={() => setConfirmOpen(true)}
                  disabled={!selectedCompany || cart.length === 0 || loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    'Confirmar Subscrições'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmar Subscrições</h3>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Você está prestes a confirmar {cart.length} subscrição(ões) para:
                </p>
                <p className="font-semibold">
                  Empresa: {companies.find(c => c.id === selectedCompany)?.nome || 'N/A'}
                </p>
              </div>

              <div className="border-t border-b border-gray-200 py-3 my-3 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {cart.map(item => (
                    <li key={item.moduleKey} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.moduleName} <span className="text-sm text-gray-500">({item.validade === 'Anual' ? 'Anual' : 'Mensal'})</span>
                      </span>
                      <span className="font-medium">
                        {(item.price * item.quantity).toLocaleString('pt-PT')} MT
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-lg">
                  {calculateTotal().toLocaleString('pt-PT')} MT
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Esta ação não pode ser desfeita. Deseja continuar?
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                >
                  <FaTimes className="inline mr-2" />
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  onClick={handleConfirmSubscription}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirmando...
                    </span>
                  ) : (
                    <>
                      <FaCheck className="inline mr-2" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionConfirmation;