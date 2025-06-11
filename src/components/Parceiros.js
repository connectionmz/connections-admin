import { useState, useEffect } from 'react';
import { db } from '../fb';
import { set, push, ref as dbRef, onValue, update, remove } from "firebase/database";

const Parceiros = () => {
  const [parceiros, setParceiros] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [activeTab, setActiveTab] = useState('lista');
  const [formData, setFormData] = useState({
    id: null,
    nome: '',
    email: '',
    telefone: '',
    tipo: '', // "Parceiro" ou "Investidor"
    companyId: '',
    logo: ''
  });
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', success: true });

  useEffect(() => {
    const parceirosRef = dbRef(db, 'parceiros');
    onValue(parceirosRef, (snapshot) => {
      const data = snapshot.val();
      const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setParceiros(lista);
    });
    
const empresasRef = dbRef(db, 'company');
onValue(empresasRef, (snapshot) => {
  const data = snapshot.val();
  const lista = data 
    ? Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter(emp => emp.type !== "singular")
    : [];
  setEmpresas(lista);
});

  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (formData.companyId) {
        const empresaJaCadastrada = parceiros.some(
          (parceiro) => parceiro.companyId === formData.companyId && parceiro.id !== formData.id
        );

        if (empresaJaCadastrada && !editing) {
          setFeedback({
            message: 'Esta empresa já está cadastrada como parceiro/investidor!',
            success: false,
          });
          return;
        }
      }

      if (editing) {
        await update(dbRef(db, `parceiros/${formData.id}`), { ...formData });
        setFeedback({ message: 'Parceiro/Investidor atualizado com sucesso!', success: true });
      } else {
        await push(dbRef(db, 'parceiros'), { ...formData });
        setFeedback({ message: 'Parceiro/Investidor cadastrado com sucesso!', success: true });
      }

      resetForm();
      setActiveTab('lista');
    } catch (error) {
      setFeedback({ message: 'Erro ao salvar. Tente novamente.', success: false });
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      nome: '',
      email: '',
      telefone: '',
      tipo: '',
      companyId: '',
      logo: ''
    });
    setEditing(false);
  };

  const handleEdit = (parceiro) => {
    setFormData(parceiro);
    setEditing(true);
    setActiveTab('adicionar');
  };

  const handleDelete = async (parceiroId) => {
    if (window.confirm('Tem certeza que deseja excluir este parceiro/investidor?')) {
      try {
        await remove(dbRef(db, `parceiros/${parceiroId}`));
        setFeedback({ message: 'Parceiro/Investidor excluído com sucesso!', success: true });
      } catch (error) {
        setFeedback({ message: 'Erro ao excluir. Tente novamente.', success: false });
        console.error(error);
      }
    }
  };

  const handleCompanySelect = (e) => {
    const companyId = e.target.value;
    const company = empresas.find((c) => c.id === companyId);
    setFormData((prev) => ({
      ...prev,
      companyId,
      nome: company?.nome || '',
      email: company?.email || '',
      telefone: company?.telefone || '',
      logo: company?.logoUrl || ''
    }));
  };

  return (
    <div className="p-2 md:p-4 lg:p-6">
      {/* Header and Tabs */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Parceiros e Investidores</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'lista'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('adicionar');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'adicionar'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {editing ? 'Editar' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'lista' ? (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Lista de Parceiros/Investidores</h2>
          
          {parceiros.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {parceiros.map((parceiro) => (
                <div key={parceiro.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    {parceiro.logo && (
                      <div className="flex justify-center mb-3">
                        <img 
                          src={parceiro.logo} 
                          alt={`Logo ${parceiro.nome}`}
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                    
                    <h3 className="text-lg font-medium text-center mb-1">
                      <a 
                        href={`company/${parceiro.id}`} 
                        className="hover:text-blue-600 transition-colors"
                      >
                        {parceiro.nome}
                      </a>
                    </h3>
                    
                    
                    <div className="flex justify-center mb-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        parceiro.tipo === 'Parceiro' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {parceiro.tipo}
                      </span>
                    </div>
                    
                    <div className="flex justify-center gap-2 mt-3">
                      <button 
                        onClick={() => handleEdit(parceiro)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(parceiro.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum parceiro ou investidor cadastrado.</p>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('adicionar');
                }}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Adicionar Novo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-4 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            {editing ? 'Editar Parceiro/Investidor' : 'Adicionar Novo Parceiro/Investidor'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <select
                onChange={handleCompanySelect}
                value={formData.companyId}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione uma empresa</option>
                {empresas.map((company) => {
                  const empresaJaCadastrada = parceiros.some(p => p.companyId === company.id && p.id !== formData.id);
                  return (
                    <option 
                      key={company.id} 
                      value={company.id}
                      disabled={empresaJaCadastrada}
                      className={empresaJaCadastrada ? 'text-gray-400' : ''}
                    >
                      {company.nome} {empresaJaCadastrada && '(já cadastrada)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Investidor">Investidor</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex-1"
              >
                {editing ? 'Atualizar' : 'Cadastrar'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('lista');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback Message */}
      {feedback.message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          feedback.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {feedback.success ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>{feedback.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parceiros;