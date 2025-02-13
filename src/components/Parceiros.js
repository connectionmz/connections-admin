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
    companyId:'',
    logo:''
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

    const empresasRef = dbRef(db, 'company'); // Assume que as empresas estão em "company"
    onValue(empresasRef, (snapshot) => {
      const data = snapshot.val();
      const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
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
      if (editing) {
        await update(dbRef(db, `parceiros/${formData.id}`), { ...formData });
        setFeedback({ message: 'Parceiro/Investidor atualizado com sucesso!', success: true });
      } else {
        await push(dbRef(db, 'parceiros'), { ...formData });
        setFeedback({ message: 'Parceiro/Investidor cadastrado com sucesso!', success: true });
      }

      resetForm();
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
    });
    setEditing(false);
  };

  const handleEdit = (parceiro) => {
    setFormData(parceiro);
    setEditing(true);
    setActiveTab('adicionar');
  };

  const handleDelete = async (parceiroId) => {
    try {
      await remove(dbRef(db, `parceiros/${parceiroId}`));
      setFeedback({ message: 'Parceiro/Investidor excluído com sucesso!', success: true });
    } catch (error) {
      setFeedback({ message: 'Erro ao excluir. Tente novamente.', success: false });
      console.error(error);
    }
  };

  const handleCompanySelect = (e) => {
    const companyId = e.target.value; // Obtém o ID da empresa selecionada
    const company = empresas.find((c) => c.id === companyId);
    setFormData((prev) => ({
      ...prev,
      companyId, // Salva o ID da empresa no estado
      nome: company?.nome || '',
      email: company?.email || '',
      telefone: company?.telefone || '',
      logo:company?.logoUrl
    }));
  };
  

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('lista')}
          className={`p-2 rounded ${activeTab === 'lista' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Lista de Parceiros/Investidores
        </button>
        <button
          onClick={() => {
            resetForm();
            setActiveTab('adicionar');
          }}
          className={`p-2 rounded ${activeTab === 'adicionar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Adicionar Parceiro/Investidor
        </button>
      </div>

      {/* Tab Conteúdo */}
      {activeTab === 'lista' ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Lista de Parceiros/Investidores</h2>
          {parceiros.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parceiros.map((parceiro) => (
                <li key={parceiro.id} className="border p-4 rounded-lg shadow-md">
                  <strong>{parceiro.nome}</strong>
                  <p>{parceiro.email}</p>
                  <p>{parceiro.telefone}</p>
                  <p><strong>Tipo:</strong> {parceiro.tipo}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(parceiro)} className="bg-blue-500 text-white px-2 py-1 rounded">
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(parceiro.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum parceiro ou investidor cadastrado.</p>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">{editing ? 'Editar Parceiro' : 'Adicionar Parceiro/Investidor'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Buscar Empresa</label>
              <select onChange={handleCompanySelect} className="border p-2 w-full">
                <option value="">Selecionar Empresa</option>
                {empresas.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nome}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Nome"
              className="border p-2 w-full"
              required
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="E-mail"
              className="border p-2 w-full"
              required
            />
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleInputChange}
              placeholder="Telefone"
              className="border p-2 w-full"
            />
            <div>
              <label>Tipo</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                className="border p-2 w-full"
                required
              >
                <option value="">Selecionar Tipo</option>
                <option value="Parceiro">Parceiro</option>
                <option value="Investidor">Investidor</option>
              </select>
            </div>
            <button className="bg-green-500 text-white px-4 py-2 rounded">
              {editing ? 'Atualizar' : 'Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {feedback.message && (
        <div className={`mt-4 p-2 rounded ${feedback.success ? 'bg-green-200' : 'bg-red-200'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default Parceiros;
