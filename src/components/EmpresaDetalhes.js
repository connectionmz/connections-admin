import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, get, push, orderByChild, equalTo, query, update } from 'firebase/database'; 
import { db } from '../fb'; 
import jsPDF from 'jspdf';
import { Alert, Snackbar } from '@mui/material';
import ModulosComponent from './ModulosComponent';

const EmpresaDetalhes = () => {
  const { id } = useParams(); 
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [showModal, setShowModal] = useState(false); 
  const [selectedPlan, setSelectedPlan] = useState('basico'); 
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedMetodo, setSelectedMetodo] = useState('cash'); 
  const [recorrente, setRecorrente] = useState(false); 
  const [userModules, setUserModules] = useState([])
  const [cotacoes, setCotacoes] = useState([]);
  const [concurso, setConcursos] = useState([]);
  const [publicacoes, setPublicacoes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [categories, setCategories] = useState([]); 
  const [documentLinks, setDocumentLinks] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // 'info', 'success', 'error', etc.
  const [accessAction, setAccessAction] = useState(""); // Variável para armazenar a ação (Dar ou Remover acesso)


  useEffect(() => {

    const modulesRef = ref(db, `modules/modulos`);

    const fetchEmpresa = async () => {
      setLoading(true); 
      try {
        const snapshot = await get(ref(db, `company/${id}`));
        const data = snapshot.val();

        if (data) {
          setEmpresa(data);
          setUserModules(data.activeModules || []); 
        } else {
          console.log('Empresa não encontrada.');
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    
    const fetchCategories = async () => {
      const categoriesRef = ref(db, 'categoriasExternas');
      const categorySnapshot = await get(categoriesRef);
      const categoryList = categorySnapshot.val() ? Object.values(categorySnapshot.val()) : [];
      setCategories(categoryList);
    };

// Função para buscar subscrições da empresa específica com ID passado
const fetchSubscriptions = async (companyId) => {
  setLoading(true);
  try {
    const snapshot = await get(ref(db, `subscriptions/`));
    const data = snapshot.val();

    if (data) {
      // Filtra subscrições apenas da empresa com o ID especificado
      const filteredSubscriptions = Object.values(data).filter(
        (sub) => sub.companyId === companyId
      );
      
      setSubscriptions(filteredSubscriptions);
      console.log(filteredSubscriptions);
    } else {
      console.log('Empresa não encontrada.');
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes da empresa:', error);
  } finally {
    setLoading(false);
  }
};
const fetchCotacoes = async () => {
      const cotacoesRef = ref(db, 'cotacoes');
      setLoading(true);
  
      try {
          const cotacoesSnapshot = await get(cotacoesRef);
          const cotacoesData = cotacoesSnapshot.val();
  
          if (cotacoesData) {
              const filteredCotacoes = Object.keys(cotacoesData)
                  .filter((cotacaoId) => cotacoesData[cotacaoId].company.id === id)
                  .reduce((acc, cotacaoId) => {
                      acc[cotacaoId] = cotacoesData[cotacaoId];
                      return acc;
                  }, {});
  
              if (Object.keys(filteredCotacoes).length > 0) {
                  setCotacoes(filteredCotacoes);
                  console.log(cotacoes)
              } else {
                  console.log("Nenhuma cotação encontrada para a empresa especificada.");
              }
          } else {
              console.log("Nenhuma cotação encontrada.");
          }
      } catch (error) {
          setError('Erro ao carregar as cotações. Por favor, tente novamente.');
          console.error("Erro ao obter as cotações:", error);
      } finally {
          setLoading(false);
      }
}


  const publicacoes = async () => {
    const postsRef = ref(db, `company/${id}/publishedPhotos`);
    setLoading(true);

    try {
        const postsSnapshot = await get(postsRef);
        const postsData = postsSnapshot.val();

        if (postsData) {
            console.log("Fotos publicadas:", postsData);
            setPublicacoes(postsData);
        } else {
            console.log("Nenhuma foto publicada encontrada.");
        }
    } catch (error) {
        setError('Erro ao carregar as fotos publicadas. Por favor, tente novamente.');
        console.error("Erro ao obter as fotos publicadas:", error);
    } finally {
        setLoading(false);
    }
  }

  fetchSubscriptions(id)
  publicacoes()
  fetchEmpresa()
  fetchCategories()
  }, [id]);

  

  const handleSectorChange = async (e) => {
    const selected = e.target.value;
    setSelectedSector(selected);

    if (selected) {
      try {
        await update(ref(db, `company/${id}`), { categoriaExterna: selected });
        alert(`Setor "${selected}" definido com sucesso como setor público.`);
      } catch (error) {
        console.error('Erro ao definir o setor público:', error);
        alert('Erro ao definir o setor público. Tente novamente.');
      }
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);

    // Define mensagens e severidade com base no estado selecionado
    switch (newStatus) {
      case 'verificado':
        setSnackbarMessage('O estado agora é "Verificado".');
        setSnackbarSeverity('success');
        handleCancelarPlano(newStatus)
        break;
      case 'bloqueado':
        setSnackbarMessage('A empresa foi marcada como "Bloqueada".');
        setSnackbarSeverity('error');
        handleCancelarPlano(newStatus)

        break;
      case 'ativo':
        setSnackbarMessage('A empresa está agora "Ativa".');
        setSnackbarSeverity('info');
        handleCancelarPlano(newStatus)
        break;
      default:
        setSnackbarMessage('Estado desconhecido selecionado.');
        setSnackbarSeverity('warning');
    }

    // Exibe o Snackbar
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const handleAccessActionChange = (e) => {
    const selectedAction = e.target.value;
    setAccessAction(selectedAction);
  
    // Supondo que 'id' seja o identificador único da empresa
    const accessActionRef = ref(db, `company/${id}/`);
  
    // Atualizar a propriedade 'publicPainel' no banco de dados com base na ação selecionada
    update(accessActionRef, {
      publicPainel: selectedAction === "grant" ? true : false,  // "grant" dá acesso, "revoke" remove
    })
    .then(() => {
      console.log(`Ação "${selectedAction}" aplicada com sucesso!`);
    })
    .catch((error) => {
      console.error("Erro ao atualizar o banco de dados:", error);
    });
  };

  const handleCancelarPlano = async (status) => {
    try {
      const subscriptionRef = ref(db, `company/${id}/subscriptions`);
      await update(subscriptionRef, { status:status });
      alert('Assinatura cancelada com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar a assinatura:', error);
    }
  };

  const gerarFatura = (sub) => {
    const doc = new jsPDF();
    doc.text(`Fatura: Plano ${sub.plan.name}`, 10, 10);
    doc.text(`Valor: ${sub.payment.amount} MT`, 10, 20);
    doc.text(`Método de Pagamento: ${sub.payment.method}`, 10, 30);
    doc.text(`Data de Pagamento: ${new Date(sub.payment.date).toLocaleDateString()}`, 10, 40);
    doc.text(`Expira em: ${new Date(sub.expiryDate).toLocaleDateString()}`, 10, 50);
    doc.save(`fatura_${sub.plan.name}.pdf`);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Carregando...</p>;
  }

  if (!empresa) {
    return <p className="text-center text-red-500">Empresa não encontrada.</p>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
                  <div className="container mx-auto p-6">
                      <div className="mb-6">
                          <img src={empresa.coverUrl} alt="Capa" className="w-full h-64 object-cover rounded-lg" />
                      </div>
                      <div className="flex justify-center mb-4">
                          <img src={empresa.logoUrl} alt="Logo" className="w-32 h-32 object-cover rounded-full border-2 border-gray-300" />
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                          <div className="bg-gray-100 p-6 rounded-lg">
                              <p className="text-xl font-semibold text-gray-800">
                                  <strong>Nome:</strong> {empresa.nome || 'Não disponível'}<br />
                                  <strong>Setor:</strong> {empresa.sector || 'Não disponível'}<br />
                                  <strong>Província:</strong> {empresa.provincia || 'Não disponível'}<br />
                                  <strong>NUIT:</strong> {empresa.nuit || 'Não disponível'}<br />
                                  <strong>Contacto:</strong> {empresa.contacto || 'Não disponível'}<br />
                                  <strong>Endereço:</strong> {empresa.endereco || 'Não disponível'}<br />
                                  <strong>Bio:</strong> {empresa.bio || 'Não disponível'}<br />
                                  <strong>Email:</strong> {empresa.email || 'Não disponível'}<br />
                                  <strong>Palavra-passe:</strong> {empresa.password || 'Não disponível'}<br />
                                  <strong>Referencia:</strong> {empresa?.referer?.email || 'Não disponível'}<br />
                                  <div dangerouslySetInnerHTML={{ __html: empresa.missaoVisaoValores }} />                              </p>
                          </div>
                      </div>                    
                  </div>
        );
      case 'cotacoes':
        return  (<div>
                  
                </div>
        )
      case 'concursos':
        return <p className="text-gray-500">Aqui você verá os concursos da empresa.</p>;
        case 'configuracoes':
          return <div className="text-gray-500">
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Estado:</label>
        <select
          className="bg-gray-300 text-black py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="estado" disabled>Estado</option>
          <option value="verificado">Verificado</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="ativo">Ativo</option>
        </select>
      </div>

      {/* Seletor de Setor Público */}
      <div className="my-4">
        <label className="block text-gray-700 mb-2">Definir Setor Público:</label>
        <select
          id="category"
          className="w-full p-2 border border-gray-300 rounded-lg"
          value={selectedSector}
          onChange={handleSectorChange}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
        <div className="mt-4">
          <label className="block text-gray-700 mb-2">PAINEL PUBLICO:</label>
          <select
            id="action"
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={accessAction}
            onChange={handleAccessActionChange}>
            <option value="">Selecione uma ação</option>
            <option value="grant">DAR ACESSO</option>
            <option value="revoke">REMOVER ACESSO</option>
          </select>
        </div>
      { accessAction && (
        <div className="mt-4 text-green-600">
          Você selecionou <strong>{selectedSector}</strong> para <strong>{accessAction === 'grant' ? 'Dar Acesso' : 'Remover Acesso'}</strong>.
        </div>
      )}
        </div>;
        case 'modulos':
          return (
            <div>
            <h2 className="text-xl font-semibold">Módulos</h2>
                <ModulosComponent empresa ={empresa} activeModules={userModules || []}/>
          </div>
          );
              case 'publicacoes':
        return <p className="text-gray-500">
            <div className="mt-6">
                          <h2 className="text-2xl font-bold mb-4">Publicações</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {Object.entries(empresa.publishedPhotos).map(([key, photo]) => (
                                  <div key={key} className="bg-white p-4 rounded-lg shadow">
                                      <img src={photo.url} alt={photo.description} className="w-full h-32 object-cover rounded" />
                                      <p className="mt-2 text-gray-700">{photo.description}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
        </p>;
        case 'historico':
          return (
            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Histórico de Pagamentos</h2>
              {subscriptions.length === 0 ? (
                <p className="text-gray-500">Nenhum pagamento encontrado.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2">Plano</th>
                      <th className="py-2">Valor</th>
                      <th className="py-2">Método</th>
                      <th className="py-2">Data de Pagamento</th>
                      <th className="py-2">Proximo pagamento</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">#</th>
                    </tr>
                  </thead>
                  <tbody>
                  {subscriptions.map((sub, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">{sub?.plan?.name || 'N/A'}</td>
                      <td className="py-2">{sub.payment.amount} MT</td>
                      <td className="py-2">{sub.payment.method}</td>
                      <td className="py-2">{new Date(sub.startDate).toLocaleDateString()}</td>
                      <td className="py-2">{new Date(sub.expiryDate).toLocaleDateString()}</td>
                      <td className="py-2">{sub.status}</td>
                      <td className="py-2">
                        <button 
                          onClick={() => gerarFatura(sub)} 
                          className="bg-blue-500 text-white py-1 px-2 rounded">
                          Download Fatura
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        ;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6">
        <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <div className="max-w-screen-xl mx-auto bg-white rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6 p-6 bg-gray-100 rounded-t-xl">
          <div className="flex items-center">
            {empresa.logo && (
              <img
                src={empresa.logo}
                alt="Logotipo"
                className="w-12 h-12 mr-4 rounded-full"
              />
            )}{' '}
            <h1 className="text-2xl font-bold text-gray-800">{empresa.nome}</h1>{' '}
          </div>
          <div>

           
    </div>     </div>

        <div className="mb-6 p-6">
          <ul className="flex border-b">
            <li className={`mr-6 ${activeTab === 'inicio' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('inicio')} className="text-gray-800 font-semibold">
                Início
              </button>
            </li>
            <li className={`mr-6 ${activeTab === 'cotacoes' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('cotacoes')} className="text-gray-800 font-semibold">
                Cotações
              </button>
            </li>
            <li className={`mr-6 ${activeTab === 'concursos' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('concursos')} className="text-gray-800 font-semibold">
                Concursos
              </button>
            </li>
            <li className={`mr-6 ${activeTab === 'modulos' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('modulos')} className="text-gray-800 font-semibold">
                Módulos
              </button>
            </li>
            <li className={`mr-6 ${activeTab === 'publicacoes' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('publicacoes')} className="text-gray-800 font-semibold">
                Publicações
              </button>
            </li>
            <li className={`mr-6 ${activeTab === 'configuracoes' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('configuracoes')} className="text-gray-800 font-semibold">
                Configuracoes
              </button>
            </li>
            
            <li className={`mr-6 ${activeTab === 'historico' ? 'border-b-2 border-black' : ''}`}>
              <button onClick={() => setActiveTab('historico')} className="text-gray-800 font-semibold">
                Historico de pagamentos
              </button>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-gray-50 rounded-b-xl">{renderTabContent()}</div>
      </div>

     
    </div>
    
  );
};

export default EmpresaDetalhes;
