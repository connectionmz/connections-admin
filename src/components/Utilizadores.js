import React, { useState, useEffect } from 'react';
import { ref, get, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../fb';
import { provisionUserAccount } from '../services/adminUsers';
import { normalizeRoles } from '../auth/permissions';
import { AdminPage, AdminPageHeader, ConfirmDialog, InlineAlert } from './admin/ui/AdminUI';

const UserDetailView = ({ user, onClose, onBlock, onDelete, onEdit }) => {
  const [userActivities, setUserActivities] = useState([]);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Buscar atividades do usuário (simulado)
        const activitiesSnapshot = await get(query(ref(db, 'activities'), orderByChild('userId'), equalTo(user.id)));
        if (activitiesSnapshot.exists()) {
          setUserActivities(Object.values(activitiesSnapshot.val()));
        }

        // Buscar empresas associadas (simulado)
        const companiesSnapshot = await get(query(ref(db, 'empresas'), orderByChild('createdBy'), equalTo(user.id)));
        if (companiesSnapshot.exists()) {
          setUserCompanies(Object.values(companiesSnapshot.val()));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Detalhes do Utilizador</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Informações Básicas</h3>
              <p><span className="font-medium">Nome:</span> {user.name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Funções:</span> {user.roles?.join(', ') || 'Nenhuma'}</p>
              
                            <p><span className="font-medium">Cadastrado em:</span> {new Date(user.date).toLocaleDateString()}</p>
              <p><span className="font-medium">Status:</span> {user.blocked ? 'Bloqueado' : 'Ativo'}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Estatísticas</h3>
              <p><span className="font-medium">Empresas cadastradas:</span> {userCompanies.length}</p>
              <p><span className="font-medium">Atividades registradas:</span> {userActivities.length}</p>
              <p><span className="font-medium">Última atividade:</span> {userActivities.length > 0 ? 
                new Date(userActivities[0].timestamp).toLocaleString() : 'N/A'}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Ações</h3>
              <div className="space-y-2">
                <button
                  onClick={() => onBlock(user.id, !user.blocked)}
                  className={`w-full px-3 py-2 rounded-md text-white ${user.blocked ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                >
                  {user.blocked ? 'Desbloquear Utilizador' : 'Bloquear Utilizador'}
                </button>
                <button
                  onClick={() => onEdit(user)}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Editar Utilizador
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Eliminar Utilizador
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">Empresas Cadastradas</h3>
            {loading ? (
              <p>Carregando...</p>
            ) : userCompanies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Nome</th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">NIF</th>
                      <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userCompanies.map((company, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 px-4 border-b border-gray-200">{company.nome}</td>
                        <td className="py-2 px-4 border-b border-gray-200">{company.nif}</td>
                        <td className="py-2 px-4 border-b border-gray-200">{new Date(company.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma empresa cadastrada por este utilizador.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Histórico de Atividades</h3>
            {loading ? (
              <p>Carregando...</p>
            ) : userActivities.length > 0 ? (
              <ul className="space-y-2">
                {userActivities.slice(0, 10).map((activity, index) => (
                  <li key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                    {activity.details && <p className="text-sm mt-1">{activity.details}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhuma atividade registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSave, roles }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    roles: user.roles || [] // Garantir que é um array
  });


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleRolesChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, roles: selected }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">Editar Utilizador</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Funções</label>
            <select
              multiple
              value={formData.roles} // Usar formData.roles diretamente
              onChange={handleRolesChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            >
              {roles.map((role, index) => (
                <option key={index} value={role}>{role}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Use Ctrl (Windows) ou ⌘ (Mac) para selecionar várias funções.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

const EditRoleModal = ({ role, onClose, onSave }) => {
  const [roleName, setRoleName] = useState(role);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(role, roleName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Editar Role</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome da Role</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Utilizadores = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rolesSelecionadas, setRolesSelecionadas] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState({ open: false, type: null, id: null, label: '' });

  const predefinedRoles = [
    'admin',
    'contabilista',
    'gestor de cotações',
    'gestor de concursos',
    'gestor de empresas',
    'cadastrador',
  ];

  const generateDefaultEmail = (name) => {
    if (!name) return '';
    return `${name.trim().toLowerCase().replace(/\s+/g, '.')}@connection.com`;
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    setEmail(generateDefaultEmail(e.target.value));
  };


  const handleRegister = async (e) => {
  e.preventDefault();
  
  if (rolesSelecionadas.length === 0) {
    setFeedback({ type: 'warning', text: 'Selecione pelo menos uma função para o utilizador.' });
    return;
  }

  try {
    // Verificar se email já existe
    const usersSnapshot = await get(ref(db, 'utilizadores'));
    const usersData = usersSnapshot.val() || {};
    const emailExists = Object.values(usersData).some(u => u.email === email);
    
    if (emailExists) {
      setFeedback({ type: 'warning', text: 'Este email já está cadastrado.' });
      return;
    }
    await provisionUserAccount(email, {
      name,
      email,
      roles: rolesSelecionadas,
      date: new Date().toISOString(),
      blocked: false,
      mustChangePassword: false
    });
    setName('');
    setEmail('');
    setRolesSelecionadas([]);

    setFeedback({ type: 'success', text: 'Utilizador cadastrado. Foi enviado um email para definir a senha.' });

    fetchUsers();

  } catch (error) {

    console.error('Erro ao cadastrar:', error);
    setFeedback({ type: 'error', text: `Não foi possível cadastrar o utilizador: ${error.message}` });

  }
};

  const fetchUsers = async () => {
    try {
      const snapshot = await get(ref(db, 'utilizadores'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUsers(
          Object.entries(data).map(([id, value]) => ({ id, ...value }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const snapshot = await get(ref(db, 'roles'));
      if (snapshot.exists()) {
        setRoles(snapshot.val());
      } else {
        setRoles(predefinedRoles);
      }
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
    }
  };

  const handleAddRole = async () => {
    if (newRole && !roles.includes(newRole)) {
      const updatedRoles = [...roles, newRole];
      try {
        await set(ref(db, 'roles'), updatedRoles);
        setRoles(updatedRoles);
        setNewRole('');
      } catch (error) {
        console.error('Erro ao adicionar role:', error);
      }
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
  };

  const handleUpdateRole = async (oldRole, newRole) => {
    if (newRole && newRole !== oldRole) {
      try {
        // Atualizar a lista de roles
        const updatedRoles = roles.map(r => r === oldRole ? newRole : r);
        await set(ref(db, 'roles'), updatedRoles);
        
        // Atualizar a role em todos os utilizadores que a tinham
        const updates = {};
        users.forEach(user => {
          const userRoles = normalizeRoles(user);
          if (userRoles.includes(oldRole)) {
            updates[`utilizadores/${user.id}/roles`] = userRoles.map(role =>
              role === oldRole ? newRole : role
            );
            updates[`utilizadores/${user.id}/role`] = null;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
        
        setRoles(updatedRoles);
        fetchUsers();
      } catch (error) {
        console.error('Erro ao atualizar role:', error);
      }
    }
  };

  const handleDeleteRole = async (roleToDelete) => {
    try {
        // Verificar se a role está em uso
        const isRoleInUse = users.some(user => normalizeRoles(user).includes(roleToDelete));
        
        if (isRoleInUse) {
          setFeedback({ type: 'warning', text: 'Esta função está atribuída a um ou mais utilizadores e não pode ser removida.' });
          return;
        }
        
        // Remover a role
        const updatedRoles = roles.filter(r => r !== roleToDelete);
        await set(ref(db, 'roles'), updatedRoles);
        setRoles(updatedRoles);
        setFeedback({ type: 'success', text: `A função “${roleToDelete}” foi removida.` });
      } catch (error) {
        console.error('Erro ao excluir role:', error);
        setFeedback({ type: 'error', text: 'Não foi possível remover a função.' });
      }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    // Initial snapshot only; subsequent refreshes happen after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateUser = async (userId, updatedData) => {
    try {
      await update(ref(db, `utilizadores/${userId}`), {
        ...updatedData,
        roles: normalizeRoles(updatedData),
        role: null,
        updatedAt: new Date().toISOString(),
      });
      fetchUsers();
      setFeedback({ type: 'success', text: 'Os dados do utilizador foram atualizados.' });
    } catch (error) {
      console.error('Erro ao atualizar utilizador:', error);
      setFeedback({ type: 'error', text: 'Não foi possível atualizar o utilizador.' });
    }
  };

  const handleDelete = async (id) => {
    if (id === auth.currentUser?.uid) {
      setFeedback({ type: 'warning', text: 'Não é possível eliminar a conta atualmente autenticada.' });
      return;
    }
    try {
        await remove(ref(db, `utilizadores/${id}`));
        fetchUsers();
        setSelectedUser(null);
        setFeedback({ type: 'success', text: 'O registo do utilizador foi eliminado.' });
      } catch (error) {
        console.error('Erro ao excluir utilizador:', error);
        setFeedback({ type: 'error', text: 'Não foi possível eliminar o utilizador.' });
      }
  };

  const handleBlock = async (id, blocked) => {
    if (id === auth.currentUser?.uid) {
      setFeedback({ type: 'warning', text: 'Não é possível bloquear a conta atualmente autenticada.' });
      return;
    }
    try {
      await set(ref(db, `utilizadores/${id}/blocked`), blocked);
      fetchUsers();
      setSelectedUser(null);
      setFeedback({ type: 'success', text: blocked ? 'O utilizador foi bloqueado.' : 'O utilizador foi desbloqueado.' });
    } catch (error) {
      console.error('Erro ao bloquear/desbloquear utilizador:', error);
      setFeedback({ type: 'error', text: 'Não foi possível alterar o estado do utilizador.' });
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    normalizeRoles(user).some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminPage>
      <AdminPageHeader title="Equipa e permissões" description="Crie acessos administrativos e controle as funções atribuídas a cada utilizador." />
      {feedback && <InlineAlert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.text}</InlineAlert>}
      <div className="flex overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Gestão da equipa">
        <button
          className={`px-4 py-2 text-lg font-semibold ${activeTab === 'register' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('register')}>
          Cadastrar Utilizadores
        </button>
        <button
          className={`px-4 py-2 text-lg font-semibold ${activeTab === 'list' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('list')}>
          Listar Utilizadores
        </button>
        <button
          className={`px-4 py-2 text-lg font-semibold ${activeTab === 'roles' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('roles')}>
          Gerir Roles
        </button>
      </div>

      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nome do utilizador"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Email do utilizador"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Função</label>
            <select
                  multiple
                  value={rolesSelecionadas}
                  onChange={(e) =>
                    setRolesSelecionadas(
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  {roles.map((role, index) => (
                    <option key={index} value={role}>{role}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Use Ctrl (Windows) ou ⌘ (Mac) para selecionar várias funções.</p>

          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Cadastrar Utilizador
          </button>
        </form>
      )}

      {activeTab === 'list' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Lista de Utilizadores</h2>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Pesquisar utilizadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Nome</th>
                    <th className="py-3 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="py-3 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Função</th>
                    <th className="py-3 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="py-3 px-4 border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={user.blocked ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="py-3 px-4 border-b border-gray-200">{user.name}</td>
                      <td className="py-3 px-4 border-b border-gray-200">{user.email}</td>
                      <td className="py-3 px-4 border-b border-gray-200">{normalizeRoles(user).join(', ') || 'Sem função'}</td>
                      <td className="py-3 px-4 border-b border-gray-200">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.blocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-white bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-white bg-yellow-500 px-3 py-1 rounded hover:bg-yellow-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmation({ open: true, type: 'user', id: user.id, label: user.name || user.email })}
                            className="text-white bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Nenhum utilizador encontrado.</p>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Gerir Roles</h2>
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <h3 className="font-medium text-lg mb-3">Roles Disponíveis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((role, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-md">
                  <span>{role}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Editar role"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmation({ open: true, type: 'role', id: role, label: role })}
                      className="text-red-500 hover:text-red-700"
                      title="Remover role"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="font-medium text-lg mb-3">Adicionar Nova Role</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md"
                placeholder="Nova role"
              />
              <button
                onClick={handleAddRole}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <UserDetailView 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onBlock={handleBlock}
          onDelete={(id) => setConfirmation({ open: true, type: 'user', id, label: selectedUser.name || selectedUser.email })}
          onEdit={(user) => {
            setSelectedUser(null);
            setEditingUser(user);
          }}
        />
      )}

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={handleUpdateUser}
          roles={roles}
        />
      )}

      {editingRole && (
        <EditRoleModal 
          role={editingRole} 
          onClose={() => setEditingRole(null)} 
          onSave={handleUpdateRole}
        />
      )}
      <ConfirmDialog
        open={confirmation.open}
        title={confirmation.type === 'role' ? 'Remover função?' : 'Eliminar utilizador?'}
        description={confirmation.type === 'role' ? `A função “${confirmation.label}” será removida se não estiver em uso.` : `O registo de “${confirmation.label}” será eliminado da base de dados administrativa.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setConfirmation({ open: false, type: null, id: null, label: '' })}
        onConfirm={async () => {
          const pending = confirmation;
          setConfirmation({ open: false, type: null, id: null, label: '' });
          if (pending.type === 'role') await handleDeleteRole(pending.id);
          if (pending.type === 'user') await handleDelete(pending.id);
        }}
      />
    </AdminPage>
  );
};

export default Utilizadores;
