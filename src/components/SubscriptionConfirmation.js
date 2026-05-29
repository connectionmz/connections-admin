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
  FaExclamationTriangle,
  FaUsers,
  FaFilter,
  FaMapMarkerAlt,
  FaIndustry,
  FaEye,
  FaEyeSlash,
  FaCreditCard,
  FaStore,
  FaBox,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaGift,
  FaClock,
  FaCrown,
  FaStar
} from 'react-icons/fa';
import sendEmail from './utils/sendMail';

const SubscriptionConfirmation = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
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
  const [provinces, setProvinces] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  const navigate = useNavigate();

  // Load companies, modules, subscriptions, provinces and sectors
  useEffect(() => {
    const companiesRef = ref(db, 'company');
    const modulesRef = ref(db, 'modules/modulos');
    const subscriptionsRef = ref(db, 'subscriptions');
    const provinciasRef = ref(db, 'provincias');
    const sectoresRef = ref(db, 'sectores_de_atividade');

    const unsubscribeCompanies = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      const companiesArray = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setCompanies(companiesArray);
    });

    const unsubscribeModules = onValue(modulesRef, (snapshot) => {
      const data = snapshot.val();
      setModules(data ? Object.keys(data).map(key => ({
        key,
        ...data[key]
      })) : []);
    });

    const unsubscribeSubscriptions = onValue(subscriptionsRef, (snapshot) => {
      setSubscriptions(snapshot.val() || {});
    });

    const unsubscribeProvinces = onValue(provinciasRef, (snapshot) => {
      const data = snapshot.val();
      const provincesArray = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setProvinces(provincesArray);
    });

    const unsubscribeSectors = onValue(sectoresRef, (snapshot) => {
      const data = snapshot.val();
      const sectorsArray = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setSectors(sectorsArray);
    });

    return () => {
      unsubscribeCompanies();
      unsubscribeModules();
      unsubscribeSubscriptions();
      unsubscribeProvinces();
      unsubscribeSectors();
    };
  }, []);

  // Check if company already has the module active
  const companyHasModule = (companyId, moduleKey) => {
    if (!subscriptions[companyId] || !subscriptions[companyId][moduleKey]) {
      return false;
    }
    
    const subscription = subscriptions[companyId][moduleKey];
    const now = Date.now();
    
    return subscription.isActive && subscription.end > now;
  };

  // Check if company already has trial for this module
  const companyHasTrial = (companyId, moduleKey) => {
    if (!subscriptions[companyId] || !subscriptions[companyId][moduleKey]) {
      return false;
    }
    
    const subscription = subscriptions[companyId][moduleKey];
    return subscription.subscriptionType === 'trial';
  };

  // Toggle company selection
  const toggleCompanySelection = (companyId) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
    setError('');
  };

  const selectAllFilteredCompanies = () => {
    setSelectedCompanies(filteredCompanies.map(company => company.id));
  };

  const selectCompaniesByFilter = (filterType, value) => {
    let companiesToSelect = [];
    
    switch (filterType) {
      case 'province':
        companiesToSelect = companies
          .filter(company => company.province === value)
          .map(company => company.id);
        break;
      case 'sector':
        companiesToSelect = companies
          .filter(company => company.sector === value)
          .map(company => company.id);
        break;
      case 'all':
        companiesToSelect = companies.map(company => company.id);
        break;
      default:
        return;
    }
    
    setSelectedCompanies(companiesToSelect);
  };

  const deselectAllCompanies = () => {
    setSelectedCompanies([]);
  };

  const filteredCompanies = companies.filter(company => {
    const companyName = company.nome || '';
    const companySector = company.sector || '';
    const companyProvince = company.province || '';
    
    const matchesSearch = companyName.toLowerCase().includes(companySearch.toLowerCase()) ||
                         companySector.toLowerCase().includes(companySearch.toLowerCase());
    
    const matchesProvince = !selectedProvince || companyProvince === selectedProvince;
    const matchesSector = !selectedSector || companySector === selectedSector;
    
    return matchesSearch && matchesProvince && matchesSector;
  });

  // Filter modules
  const filteredModules = modules.filter(module => {
    const moduleName = module.name || '';
    return moduleName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const clearFilters = () => {
    setSelectedProvince('');
    setSelectedSector('');
    setCompanySearch('');
  };

  const availableProvinces = [...new Set(
    companies
      .map(company => company.province)
      .filter(province => province && province.trim() !== '')
  )];

  const availableSectors = [...new Set(
    companies
      .map(company => company.sector)
      .filter(sector => sector && sector.trim() !== '')
  )];

  const handleAddToCart = (module, subscriptionType) => {
    if (selectedCompanies.length === 0) {
      setError('Selecione pelo menos uma empresa antes de adicionar módulos');
      return;
    }

    // Check if any selected company already has this module
    const companiesWithExisting = selectedCompanies.filter(companyId => 
      subscriptionType === 'paid' ? companyHasModule(companyId, module.key) : companyHasTrial(companyId, module.key)
    );

    if (companiesWithExisting.length > 0) {
      const companyNames = companiesWithExisting.map(companyId => {
        const company = companies.find(c => c.id === companyId);
        return company?.nome || `Empresa ${companyId}`;
      }).join(', ');
      
      setError(`Algumas empresas já possuem este módulo ${subscriptionType === 'trial' ? 'em trial' : 'ativo'}: ${companyNames}`);
      return;
    }

    const existingItem = cart.find(item => 
      item.moduleKey === module.key && item.subscriptionType === subscriptionType
    );
    
    if (existingItem) {
      if (subscriptionType === 'trial') {
        setError('Não é possível aumentar a quantidade para trials.');
        return;
      }
      setCart(cart.map(item => 
        item.moduleKey === module.key && item.subscriptionType === subscriptionType
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        moduleKey: module.key,
        moduleName: module.name || 'Módulo sem nome',
        price: subscriptionType === 'paid' ? (module.price || 0) : 0,
        validade: module.validade || 'Mensal',
        quantity: 1,
        subscriptionType: subscriptionType,
        forAllSelected: true
      }]);
    }
    setError('');
  };

  const handleRemoveFromCart = (moduleKey, itemSubscriptionType) => {
    setCart(cart.filter(item => !(item.moduleKey === moduleKey && item.subscriptionType === itemSubscriptionType)));
  };

  const handleQuantityChange = (moduleKey, itemSubscriptionType, newQuantity) => {
    if (newQuantity < 1) return;
    
    const item = cart.find(i => i.moduleKey === moduleKey && i.subscriptionType === itemSubscriptionType);
    if (item && item.subscriptionType === 'trial' && newQuantity > 1) return;
    
    setCart(cart.map(item => 
      item.moduleKey === moduleKey && item.subscriptionType === itemSubscriptionType
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const calculateTotal = () => {
    const totalPerCompany = cart.reduce((total, item) => {
      if (item.subscriptionType === 'paid') {
        return total + ((item.price || 0) * item.quantity);
      }
      return total;
    }, 0);
    return totalPerCompany * selectedCompanies.length;
  };

  const calculateSubscriptionEnd = (validade, type, quantity) => {
    const now = Date.now();
    
    if (type === 'trial') {
      // 7 dias em milissegundos
      return now + (7 * 24 * 60 * 60 * 1000);
    }
    
    const durationInMs = {
      Mensal: 30 * 24 * 60 * 60 * 1000, 
      Anual: 365 * 24 * 60 * 60 * 1000,
    };
    return now + ((durationInMs[validade] || durationInMs.Mensal) * quantity);
  };

  const updateSubscription = async (companyId, item, newPaymentRef, now, subscriptionEnd) => {
    const subscriptionData = {
      isActive: true,
      start: now,
      end: subscriptionEnd,
      durationDays: item.subscriptionType === 'trial' ? 7 : (item.validade === 'Anual' ? 365 : 30) * item.quantity,
      moduleKey: item.moduleKey,
      moduleName: item.moduleName,
      subscriptionType: item.subscriptionType,
      paymentId: item.subscriptionType === 'paid' ? newPaymentRef.key : null,
      validade: item.validade,
      isTrial: item.subscriptionType === 'trial',
      trialConverted: false
    };

    const subscriptionRef = ref(db, `subscriptions/${companyId}/${item.moduleKey}`);
    await update(subscriptionRef, subscriptionData);
  };

const handleConfirmSubscription = async () => {
    if (selectedCompanies.length === 0) {
      setError('Por favor, selecione pelo menos uma empresa');
      return;
    }

    if (cart.length === 0) {
      setError('Por favor, adicione pelo menos um módulo ao carrinho');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = Date.now();

      // Verify again if any module is already active for any selected company
      const companiesWithExistingSubscriptions = [];
      
      selectedCompanies.forEach(companyId => {
        cart.forEach(item => {
          if (item.subscriptionType === 'paid' && companyHasModule(companyId, item.moduleKey)) {
            const company = companies.find(c => c.id === companyId);
            const companyName = company?.nome || `Empresa ${companyId}`;
            if (!companiesWithExistingSubscriptions.includes(companyName)) {
              companiesWithExistingSubscriptions.push(companyName);
            }
          }
          if (item.subscriptionType === 'trial' && companyHasTrial(companyId, item.moduleKey)) {
            const company = companies.find(c => c.id === companyId);
            const companyName = company?.nome || `Empresa ${companyId}`;
            if (!companiesWithExistingSubscriptions.includes(companyName)) {
              companiesWithExistingSubscriptions.push(companyName);
            }
          }
        });
      });

      if (companiesWithExistingSubscriptions.length > 0) {
        throw new Error(`Algumas empresas já possuem subscrições ativas: ${companiesWithExistingSubscriptions.join(', ')}`);
      }

      // Array to store created subscriptions for email
      const createdSubscriptions = [];

      // Create payments and subscriptions for each company and each item
      for (const companyId of selectedCompanies) {
        const company = companies.find(c => c.id === companyId);
        
        if (!company) {
          console.warn(`Empresa com ID ${companyId} não encontrada, continuando...`);
          continue;
        }

        const companySubscriptions = [];

        for (const item of cart) {
          const subscriptionEnd = calculateSubscriptionEnd(item.validade, item.subscriptionType, item.quantity);

          // Only create payment record for paid subscriptions
          let newPaymentRef = null;
          if (item.subscriptionType === 'paid') {
            const companyName = company.nome || `Empresa ${company.id}`;
            const companyEmail = company.email || '';
            const companyPhone = company.phone || '';
            const companyDisplayName = company.displayName || '';

            const paymentData = {
              userId: company.id,
              userName: companyDisplayName,
              userEmail: companyEmail,
              nome: companyName,
              telefone: companyPhone,
              moduleKey: item.moduleKey,
              moduleName: item.moduleName,
              moduleType: 'standard',
              amount: (item.price || 0) * item.quantity,
              reference: companyName,
              status: 'pago',
              timestamp: now,
              updatedAt: now,
              notes: `${notes} | Aplicado a múltiplas empresas`,
              paymentMethod: 'manual',
              subscription: {
                isActive: true,
                start: now,
                end: subscriptionEnd,
                durationDays: item.validade === 'Anual' ? 365 * item.quantity : 30 * item.quantity,
                moduleKey: item.moduleKey,
                moduleName: item.moduleName,
                subscriptionType: item.subscriptionType,
              }
            };

            const paymentsRef = ref(db, 'payments');
            newPaymentRef = push(paymentsRef);
            await update(newPaymentRef, paymentData);
          }

          // Update subscription for both paid and trial
          await updateSubscription(company.id, item, newPaymentRef, now, subscriptionEnd);

          // Create trial record if it's a trial
          if (item.subscriptionType === 'trial') {
            const companyName = company.nome || `Empresa ${company.id}`;
            const trialData = {
              companyId: company.id,
              companyName: companyName,
              moduleKey: item.moduleKey,
              moduleName: item.moduleName,
              startDate: now,
              endDate: subscriptionEnd,
              status: 'active',
              createdAt: now,
              notes: notes
            };

            const trialsRef = ref(db, 'trials');
            const newTrialRef = push(trialsRef);
            await update(newTrialRef, trialData);
          }

          // Store subscription info for email
          companySubscriptions.push({
            moduleName: item.moduleName,
            moduleKey: item.moduleKey,
            subscriptionType: item.subscriptionType === 'paid' ? 'Paga' : 'Trial',
            startDate: new Date(now).toLocaleDateString('pt-PT'),
            endDate: new Date(subscriptionEnd).toLocaleDateString('pt-PT'),
            quantity: item.quantity,
            validity: item.validade,
            price: item.price
          });
        }

        createdSubscriptions.push({
          company: company,
          subscriptions: companySubscriptions
        });
      }

      // ENVIAR EMAILS PARA CADA EMPRESA
      for (const subscriptionInfo of createdSubscriptions) {
        const company = subscriptionInfo.company;
        const companyEmail = company.email;
        
        if (!companyEmail) {
          console.warn(`Empresa ${company.nome} não tem email configurado`);
          continue;
        }

        // Preparar conteúdo do email
        const emailSubject = `Confirmação de Subscrição - ${company.nome}`;
        
        let emailText = `Prezado(a) ${company.nome},\n\n`;
        emailText += `Confirmamos a ativação da(s) seguinte(s) subscrição(ões):\n\n`;
        
        for (const sub of subscriptionInfo.subscriptions) {
          emailText += `📦 Módulo: ${sub.moduleName}\n`;
          emailText += `   Tipo: ${sub.subscriptionType}\n`;
          emailText += `   Data de Início: ${sub.startDate}\n`;
          emailText += `   Data de Fim: ${sub.endDate}\n`;
          if (sub.subscriptionType === 'Paga') {
            emailText += `   Período: ${sub.validity}\n`;
            emailText += `   Quantidade: ${sub.quantity}\n`;
            emailText += `   Valor: €${(sub.price * sub.quantity).toFixed(2)}\n`;
          }
          emailText += `\n`;
        }
        
        if (notes) {
          emailText += `Observações: ${notes}\n\n`;
        }
        
        emailText += `Para mais informações, por favor contacte o nosso suporte.\n\n`;
        emailText += `Atenciosamente,\nEquipa de Suporte`;

        // HTML version
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Confirmação de Subscrição</h2>
            <p>Prezado(a) <strong>${company.nome}</strong>,</p>
            <p>Confirmamos a ativação da(s) seguinte(s) subscrição(ões):</p>
            
            ${subscriptionInfo.subscriptions.map(sub => `
              <div style="background-color: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4F46E5;">
                <h3 style="margin: 0 0 10px 0; color: #1f2937;">📦 ${sub.moduleName}</h3>
                <p style="margin: 5px 0;"><strong>Tipo:</strong> ${sub.subscriptionType}</p>
                <p style="margin: 5px 0;"><strong>Data de Início:</strong> ${sub.startDate}</p>
                <p style="margin: 5px 0;"><strong>Data de Fim:</strong> ${sub.endDate}</p>
                ${sub.subscriptionType === 'Paga' ? `
                  <p style="margin: 5px 0;"><strong>Período:</strong> ${sub.validity}</p>
                  <p style="margin: 5px 0;"><strong>Quantidade:</strong> ${sub.quantity}</p>
                  <p style="margin: 5px 0;"><strong>Valor Total:</strong> €${(sub.price * sub.quantity).toFixed(2)}</p>
                ` : ''}
              </div>
            `).join('')}
            
            ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ''}
            
            <p>Para mais informações, por favor contacte o nosso suporte.</p>
            <br>
            <p>Atenciosamente,<br><strong>Equipa de Suporte</strong></p>
          </div>
        `;


        // Enviar email
        const emailSent = await sendEmail({
          to: companyEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml
        });

        if (emailSent) {
          console.log(`✅ Email enviado para ${companyEmail}`);
        } else {
          console.warn(`⚠️ Falha no email para ${companyEmail}`);
        }
      }

      setSuccess(true);
      setConfirmOpen(false);
      
      setTimeout(() => {
        setCart([]);
        setSelectedCompanies([]);
        setNotes('');
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Erro ao confirmar subscrições:', err);
      setError(err.message || 'Ocorreu um erro ao confirmar as subscrições');
    } finally {
      setLoading(false);
    }
  };

  // Stats for dashboard
  const stats = {
    totalCompanies: companies.length,
    selectedCompanies: selectedCompanies.length,
    totalModules: modules.length,
    cartItems: cart.length,
    totalAmount: calculateTotal(),
    trialItems: cart.filter(item => item.subscriptionType === 'trial').length,
    paidItems: cart.filter(item => item.subscriptionType === 'paid').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Ativação em Massa de Subscrições
              </h1>
              <p className="text-gray-600 text-lg">
                Gerencie subscrições pagas e trials para múltiplas empresas
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.selectedCompanies}</div>
              <div className="text-sm text-gray-500">Empresas Selecionadas</div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
              <div className="flex items-center">
                <FaStore className="text-blue-500 text-xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">{stats.totalCompanies}</div>
                  <div className="text-sm text-gray-500">Total Empresas</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
              <div className="flex items-center">
                <FaBox className="text-green-500 text-xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">{stats.totalModules}</div>
                  <div className="text-sm text-gray-500">Módulos</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
              <div className="flex items-center">
                <FaShoppingCart className="text-purple-500 text-xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">{stats.cartItems}</div>
                  <div className="text-sm text-gray-500">Itens no Carrinho</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
              <div className="flex items-center">
                <FaGift className="text-orange-500 text-xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">{stats.trialItems}</div>
                  <div className="text-sm text-gray-500">Trials</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
              <div className="flex items-center">
                <FaMoneyBillWave className="text-red-500 text-xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {stats.totalAmount.toLocaleString('pt-PT')} MT
                  </div>
                  <div className="text-sm text-gray-500">Valor Total</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Panel - Companies & Modules */}
          <div className="xl:col-span-2 space-y-6">
            {/* Companies Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaUsers className="text-white text-2xl mr-3" />
                    <h2 className="text-xl font-bold text-white">Seleção de Empresas</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {selectedCompanies.length} selecionadas
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Filters */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Pesquisar empresa..."
                        className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                      />
                    </div>
                    
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Todas as províncias</option>
                      {availableProvinces.map(province => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Todos os setores</option>
                      {availableSectors.map(sector => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={selectAllFilteredCompanies}
                      className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center bg-blue-500 hover:bg-blue-600"
                    >
                      <FaPlus className="mr-2" />
                      Selecionar Todas ({filteredCompanies.length})
                    </button>
                    <button
                      onClick={deselectAllCompanies}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
                    >
                      <FaTimes className="mr-2" />
                      Limpar Seleção
                    </button>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center"
                    >
                      <FaFilter className="mr-2" />
                      Limpar Filtros
                    </button>
                  </div>
                </div>

                {/* Companies List */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl">
                  {filteredCompanies.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {filteredCompanies.map(company => {
                        const hasActiveSubscription = cart.some(item => 
                          companyHasModule(company.id, item.moduleKey)
                        );
                        const hasActiveTrial = cart.some(item => 
                          companyHasTrial(company.id, item.moduleKey)
                        );

                        return (
                          <div 
                            key={company.id}
                            className={`p-4 cursor-pointer transition-all hover:bg-blue-50 ${
                              selectedCompanies.includes(company.id) 
                                ? 'bg-blue-50 border-l-4 border-blue-500' 
                                : 'border-l-4 border-transparent'
                            }`}
                            onClick={() => toggleCompanySelection(company.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  selectedCompanies.includes(company.id)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedCompanies.includes(company.id) && (
                                    <FaCheck className="text-white text-xs" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-800">{company.nome || 'Nome não disponível'}</h3>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <span className="flex items-center text-sm text-gray-600">
                                      <FaIndustry className="mr-1 text-gray-400" />
                                      {company.sector || 'Setor não definido'}
                                    </span>
                                    <span className="flex items-center text-sm text-gray-600">
                                      <FaMapMarkerAlt className="mr-1 text-gray-400" />
                                      {company.province || 'Província não definida'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                {hasActiveSubscription && (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                    Módulo Ativo
                                  </span>
                                )}
                                {hasActiveTrial && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                    Trial Utilizado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <FaBuilding className="text-gray-300 text-4xl mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma empresa encontrada</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Tente ajustar os filtros de pesquisa
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modules Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaBox className="text-white text-2xl mr-3" />
                    <h2 className="text-xl font-bold text-white">Módulos Disponíveis</h2>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-blue-200" />
                    </div>
                    <input
                      type="text"
                      placeholder="Pesquisar módulo..."
                      className="pl-10 pr-4 py-2 w-64 bg-blue-500 bg-opacity-20 text-white placeholder-blue-200 border border-blue-400 rounded-lg focus:ring-2 focus:ring-white focus:border-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredModules.length > 0 ? (
                    filteredModules.map(module => {
                      const companiesWithExistingModule = selectedCompanies.filter(companyId => 
                        companyHasModule(companyId, module.key)
                      );
                      const companiesWithExistingTrial = selectedCompanies.filter(companyId => 
                        companyHasTrial(companyId, module.key)
                      );
                      
                      return (
                        <div 
                          key={module.key}
                          className={`border-2 rounded-xl p-4 transition-all hover:shadow-md border-gray-200 hover:border-blue-300`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg">{module.name || 'Módulo sem nome'}</h3>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  module.validade === 'Anual'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  <FaCalendarAlt className="mr-1" />
                                  {module.validade === 'Anual' ? '1 Ano' : '1 Mês'}
                                </span>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                  <FaMoneyBillWave className="inline mr-1" />
                                  {(module.price || 0).toLocaleString('pt-PT')} MT
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {companiesWithExistingModule.length > 0 && (
                            <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center">
                                <FaExclamationTriangle className="text-yellow-600 mr-2" />
                                <span className="text-yellow-700 text-sm">
                                  Módulo ativo em {companiesWithExistingModule.length} empresa(s)
                                </span>
                              </div>
                            </div>
                          )}
                          {companiesWithExistingTrial.length > 0 && (
                            <div className="bg-green-100 border border-green-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center">
                                <FaExclamationTriangle className="text-green-600 mr-2" />
                                <span className="text-green-700 text-sm">
                                  Trial já utilizado em {companiesWithExistingTrial.length} empresa(s)
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                                selectedCompanies.length === 0 || companiesWithExistingModule.length > 0
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                              }`}
                              onClick={() => handleAddToCart(module, 'paid')}
                              disabled={selectedCompanies.length === 0 || companiesWithExistingModule.length > 0}
                            >
                              <FaCreditCard className="mr-2" />
                              Adicionar Pago
                            </button>
                            <button
                              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                                selectedCompanies.length === 0 || companiesWithExistingTrial.length > 0
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                              }`}
                              onClick={() => handleAddToCart(module, 'trial')}
                              disabled={selectedCompanies.length === 0 || companiesWithExistingTrial.length > 0}
                            >
                              <FaGift className="mr-2" />
                              Adicionar Trial (7 Dias)
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 p-8 text-center">
                      <FaBox className="text-gray-300 text-4xl mx-auto mb-3" />
                      <p className="text-gray-500">Nenhum módulo encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-fit sticky top-6">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaShoppingCart className="text-white text-2xl mr-3" />
                  <h2 className="text-xl font-bold text-white">Carrinho</h2>
                </div>
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {cart.length} itens
                </span>
              </div>
            </div>

            <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <FaShoppingCart className="text-gray-300 text-4xl mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">Seu carrinho está vazio</p>
                  <p className="text-sm text-gray-400">
                    Selecione empresas e adicione módulos para começar
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={`${item.moduleKey}-${item.subscriptionType}`} className={`rounded-xl p-4 border ${
                        item.subscriptionType === 'trial' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-800">{item.moduleName}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                item.subscriptionType === 'trial'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.subscriptionType === 'trial' ? 'Trial 7 Dias' : `${item.validade === 'Anual' ? 'Anual' : 'Mensal'}`}
                              </span>
                              {item.subscriptionType === 'paid' && (
                                <span className="text-sm font-medium text-green-600">
                                  {(item.price || 0).toLocaleString('pt-PT')} MT
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(item.moduleKey, item.subscriptionType)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                              onClick={() => handleQuantityChange(item.moduleKey, item.subscriptionType, item.quantity - 1)}
                              disabled={item.subscriptionType === 'trial'}
                            >
                              <FaMinus className="text-gray-600 text-xs" />
                            </button>
                            <span className="font-semibold text-gray-800 w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                              onClick={() => handleQuantityChange(item.moduleKey, item.subscriptionType, item.quantity + 1)}
                              disabled={item.subscriptionType === 'trial'}
                            >
                              <FaPlus className="text-gray-600 text-xs" />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">
                              {item.subscriptionType === 'paid' 
                                ? `${((item.price || 0) * item.quantity).toLocaleString('pt-PT')} MT`
                                : 'Grátis'
                              }
                            </div>
                            <div className="text-xs text-gray-500">por empresa</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl p-4 mb-6 border bg-blue-50 border-blue-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal por empresa:</span>
                        <span className="font-medium">
                          {cart.reduce((total, item) => {
                            if (item.subscriptionType === 'paid') {
                              return total + ((item.price || 0) * item.quantity);
                            }
                            return total;
                          }, 0).toLocaleString('pt-PT')} MT
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Número de empresas:</span>
                        <span className="font-medium">{selectedCompanies.length}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">Total Geral:</span>
                          <span className="text-xl font-bold text-blue-600">
                            {calculateTotal().toLocaleString('pt-PT')} MT
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adicione observações sobre estas subscrições e trials..."
                    />
                  </div>

                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center">
                        <FaExclamationTriangle className="text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center">
                        <FaCheck className="text-green-500 mr-2" />
                        <span className="text-green-700">
                          Subscrições e trials confirmados com sucesso para {selectedCompanies.length} empresa(s)!
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                      selectedCompanies.length === 0 || cart.length === 0 || loading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                    onClick={() => setConfirmOpen(true)}
                    disabled={selectedCompanies.length === 0 || cart.length === 0 || loading}
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
                      <span className="flex items-center justify-center">
                        <FaCreditCard className="mr-2" />
                        Confirmar para {selectedCompanies.length} Empresa(s)
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-100">
                  <FaCreditCard className="text-blue-600 text-2xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Confirmar Subscrições e Trials
                </h3>
                <p className="text-gray-600">
                  Você está prestes a confirmar subscrições e/ou trials em massa
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Empresas:</span>
                    <div className="font-semibold text-gray-800">{selectedCompanies.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Módulos:</span>
                    <div className="font-semibold text-gray-800">{cart.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Trials:</span>
                    <div className="font-semibold text-gray-800">{cart.filter(item => item.subscriptionType === 'trial').length * selectedCompanies.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Subscrições Pagas:</span>
                    <div className="font-semibold text-gray-800">{cart.filter(item => item.subscriptionType === 'paid').length * selectedCompanies.length}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Valor Total:</span>
                    <div className="font-semibold text-blue-600">
                      {calculateTotal().toLocaleString('pt-PT')} MT
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center mb-6">
                Esta ação criará {selectedCompanies.length * cart.length} ativações individuais e não pode ser desfeita.
              </p>

              <div className="flex space-x-3">
                <button
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                >
                  <FaTimes className="mr-2" />
                  Cancelar
                </button>
                <button
                  className={`flex-1 px-4 py-3 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800`}
                  onClick={handleConfirmSubscription}
                  disabled={loading}
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FaCheck className="mr-2" />
                  )}
                  {loading ? 'Processando...' : 'Confirmar'}
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