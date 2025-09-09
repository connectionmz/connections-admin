import { useParams, useNavigate } from "react-router-dom";
import { db } from "../fb";
import { useEffect, useState } from "react";
import { onValue, ref, remove, update } from "firebase/database";

const Versingular = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const userRef = ref(db, `company/${id}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      try {
        const data = snapshot.val();
        
        if (data && data.type === 'singular') {
          const usuarioEncontrado = { id, ...data };
          setUsuario(usuarioEncontrado);
          setEditedUser(usuarioEncontrado);
        } else {
          setUsuario(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleDeleteUser = async () => {
    try {
      const userRef = ref(db, `company/${id}`);
      await remove(userRef);
      navigate('/');
    } catch (error) {
      console.error('Erro ao apagar usuário:', error);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const userRef = ref(db, `company/${id}`);
      await update(userRef, editedUser);
      setUsuario(editedUser);
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancelEdit = () => {
    setEditedUser(usuario);
    setEditMode(false);
  };

  const formatarData = (dataString) => {
    if (!dataString) return "Não informado";
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const temVisitas = usuario?.visitas && Object.keys(usuario.visitas).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Usuário não encontrado</h2>
          <p className="text-gray-600">O usuário solicitado não foi encontrado em nossa base de dados.</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          nome={usuario.nome}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteUser}
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <Header
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onDelete={() => setShowDeleteModal(true)}
          onSave={handleSaveChanges}
          onCancel={handleCancelEdit}
        />

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          
          {/* Conteúdo */}
          <div className="px-6 pb-8 -mt-16">
            {/* Perfil */}
            <ProfileSection
              usuario={usuario}
              editedUser={editedUser}
              editMode={editMode}
              onInputChange={handleInputChange}
            />

            {/* Grid de Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <ContactSection
                usuario={usuario}
                editedUser={editedUser}
                editMode={editMode}
                onInputChange={handleInputChange}
              />
              
              <LocationSection
                usuario={usuario}
                editedUser={editedUser}
                editMode={editMode}
                onInputChange={handleInputChange}
              />
              
              <PersonalInfoSection
                usuario={usuario}
                editedUser={editedUser}
                editMode={editMode}
                onInputChange={handleInputChange}
                formatarData={formatarData}
              />
              
              <ProfessionalSection
                usuario={usuario}
                editedUser={editedUser}
                editMode={editMode}
                onInputChange={handleInputChange}
              />
            </div>

            {/* Histórico de Visitas */}
            {temVisitas && (
              <VisitHistorySection
                visitas={usuario.visitas}
                formatarData={formatarData}
              />
            )}

            {/* Botão de Contato */}
            <div className="mt-8 flex justify-center">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                Contactar Utilizador
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para Modal de Deleção
const DeleteConfirmationModal = ({ nome, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar exclusão</h3>
      <p className="text-gray-600 mb-6">Tem certeza que deseja apagar o usuário <span className="font-semibold">{nome}</span>? Esta ação não pode ser desfeita.</p>
      <div className="flex justify-end space-x-4">
        <button 
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Apagar
        </button>
      </div>
    </div>
  </div>
);

// Componente para Cabeçalho
const Header = ({ editMode, onEdit, onDelete, onSave, onCancel }) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h1 className="text-3xl font-bold text-indigo-800">Detalhes do Utilizador</h1>
      <p className="text-gray-600">Informações completas do perfil</p>
    </div>
    <div className="flex space-x-3">
      {!editMode ? (
        <>
          <button 
            onClick={onEdit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Editar
          </button>
          <button 
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Apagar
          </button>
        </>
      ) : (
        <>
          <button 
            onClick={onSave}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Salvar
          </button>
          <button 
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Cancelar
          </button>
        </>
      )}
    </div>
  </div>
);

// Componente para Seção de Perfil
const ProfileSection = ({ usuario, editedUser, editMode, onInputChange }) => (
  <div className="flex flex-col items-center mb-6">
    <div className="h-24 w-24 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center shadow-lg">
      <span className="text-3xl font-bold text-indigo-600">
        {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : "U"}
      </span>
    </div>
    
    {editMode ? (
      <div className="mt-4 w-full max-w-md">
        <input
          type="text"
          value={editedUser.nome || ""}
          onChange={(e) => onInputChange('nome', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-xl font-bold text-center"
        />
      </div>
    ) : (
      <h2 className="mt-4 text-2xl font-bold text-gray-800">{usuario.nome || "Nome não informado"}</h2>
    )}
    
    {editMode ? (
      <div className="mt-2 w-full max-w-md">
        <input
          type="email"
          value={editedUser.email || ""}
          onChange={(e) => onInputChange('email', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-center"
        />
      </div>
    ) : (
      <p className="text-gray-600">{usuario.email || "Email não informado"}</p>
    )}
    
    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
      {usuario.subscriptions?.status === "active" ? "Ativo" : "Inativo"}
    </div>
  </div>
);

// Componente para Seção de Contato
const ContactSection = ({ usuario, editedUser, editMode, onInputChange }) => (
  <div className="bg-gray-50 p-5 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
      </svg>
      Contacto
    </h3>
    
    {editMode ? (
      <input
        type="text"
        value={editedUser.contacto || ""}
        onChange={(e) => onInputChange('contacto', e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg"
      />
    ) : (
      <p className="text-gray-700">{usuario.contacto || "Não informado"}</p>
    )}
    
    {usuario.social?.whatsapp && (
      <a 
        href={usuario.social.whatsapp} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center text-green-600 hover:text-green-700"
      >
        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.488"/>
        </svg>
        Contactar via WhatsApp
      </a>
    )}
  </div>
);

// Componente para Seção de Localização
const LocationSection = ({ usuario, editedUser, editMode, onInputChange }) => (
  <div className="bg-gray-50 p-5 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      Localização
    </h3>
    
    {editMode ? (
      <div className="space-y-2">
        <select
          value={editedUser.provincia || ""}
          onChange={(e) => onInputChange('provincia', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="">Selecione a província</option>
          <option value="Cabo Delgado">Cabo Delgado</option>
          <option value="Maputo">Maputo</option>
          <option value="Inhambane">Inhambane</option>
          <option value="Nampula">Nampula</option>
          <option value="Manica">Manica</option>
        </select>
        
        <input
          type="text"
          value={editedUser.distrito || ""}
          onChange={(e) => onInputChange('distrito', e.target.value)}
          placeholder="Distrito"
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
        
        <input
          type="text"
          value={editedUser.endereco || ""}
          onChange={(e) => onInputChange('endereco', e.target.value)}
          placeholder="Endereço"
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
      </div>
    ) : (
      <>
        <p className="text-gray-700">
          {usuario.provincia && <span>{usuario.provincia}</span>}
          {usuario.distrito && <span> / {usuario.distrito}</span>}
          {!usuario.provincia && !usuario.distrito && "Não informado"}
        </p>
        {usuario.endereco && <p className="text-gray-600 mt-2">{usuario.endereco}</p>}
      </>
    )}
  </div>
);

// Componente para Seção de Informações Pessoais
const PersonalInfoSection = ({ usuario, editedUser, editMode, onInputChange, formatarData }) => (
  <div className="bg-gray-50 p-5 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      Informações Pessoais
    </h3>
    
    {editMode ? (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
          <select
            value={editedUser.genero || ""}
            onChange={(e) => onInputChange('genero', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="">Selecione o género</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de entidade</label>
          <input
            type="text"
            value={editedUser.tipoEntidade || ""}
            onChange={(e) => onInputChange('tipoEntidade', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NUIT</label>
          <input
            type="text"
            value={editedUser.nuit || ""}
            onChange={(e) => onInputChange('nuit', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <p><span className="font-medium">Género:</span> {usuario.genero || "Não informado"}</p>
        <p><span className="font-medium">Tipo de entidade:</span> {usuario.tipoEntidade || "Não informado"}</p>
        <p><span className="font-medium">NUIT:</span> {usuario.nuit || "Não informado"}</p>
        <p><span className="font-medium">Registado em:</span> {formatarData(usuario.createdAt)}</p>
      </div>
    )}
  </div>
);

// Componente para Seção Profissional
const ProfessionalSection = ({ usuario, editedUser, editMode, onInputChange }) => (
  <div className="bg-gray-50 p-5 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
      </svg>
      Profissional
    </h3>
    
    {editMode ? (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
          <input
            type="text"
            value={editedUser.sector || ""}
            onChange={(e) => onInputChange('sector', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subtipo</label>
          <input
            type="text"
            value={editedUser.subtipoEntidade || ""}
            onChange={(e) => onInputChange('subtipoEntidade', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade de produção</label>
          <input
            type="text"
            value={editedUser.capacidadeProducao || ""}
            onChange={(e) => onInputChange('capacidadeProducao', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <p><span className="font-medium">Sector:</span> {usuario.sector || "Não informado"}</p>
        <p><span className="font-medium">Subtipo:</span> {usuario.subtipoEntidade || "Não informado"}</p>
        <p><span className="font-medium">Capacidade de produção:</span> {usuario.capacidadeProducao || "Não informada"}</p>
      </div>
    )}
  </div>
);

// Componente para Histórico de Visitas
const VisitHistorySection = ({ visitas, formatarData }) => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Histórico de Visitas</h3>
    <div className="bg-gray-50 p-5 rounded-lg">
      <ul className="divide-y divide-gray-200">
        {Object.entries(visitas).map(([key, visita]) => (
          <li key={key} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{visita.visitorName}</p>
                <p className="text-sm text-gray-600">{formatarData(visita.timestamp)}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Visitante
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default Versingular;