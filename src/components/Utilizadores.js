import React, { useState, useEffect } from 'react';
import { ref, push, get, set, remove } from 'firebase/database';
import { auth, db } from '../fb';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const Utilizadores = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  const predefinedRoles = [
    'admin',
    'contabilista',
    'gestor de cotações',
    'gestor de concursos',
    'gestor de empresas',
    'cadastrador',
  ];

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const generateDefaultEmail = (name) => {
    if (!name) return '';
    return `${name.trim().toLowerCase().replace(/\s+/g, '.') + '@connection.com'}`;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const password = '@connection';
  
      // Criar utilizador na Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
      // Criar objeto do novo utilizador
      const newUser = {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        date: new Date().toISOString(),
      };
  
      // Salvar o utilizador no Realtime Database
      await set(ref(db, `utilizadores/${userCredential.user.uid}`), newUser);
  
      // Limpar os campos do formulário
      setName('');
      setRole('');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao cadastrar utilizador:', error);
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

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditingData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setActiveTab('edit');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = {
        ...editingData,
        date: new Date().toISOString(),
      };

      await set(ref(db, `utilizadores/${editingId}`), updatedUser);
      setEditingId(null);
      setEditingData({});
      setActiveTab('list');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar utilizador:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(ref(db, `utilizadores/${id}`));
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir utilizador:', error);
    }
  };


  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestão de Utilizadores</h1>
      <div className="flex border-b mb-6">
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
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nome do utilizador"
              required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Email do utilizador"
              required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Função</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required>
              <option value="" disabled>Selecione uma função</option>
              {roles.map((role, index) => (
                <option key={index} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Cadastrar Utilizador
          </button>
        </form>
      )}

      {activeTab === 'list' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Lista de Utilizadores</h2>
          {users.length > 0 ? (
            <ul className="space-y-4">
              {users.map((user) => (
                <li key={user.id} className="p-4 bg-gray-100 rounded-lg shadow-md">
                  <h3 className="font-medium text-lg">{user.name}</h3>
                  <p className="text-gray-700">Email: {user.email}</p>
                  <p className="text-gray-700">Função: {user.role}</p>
                  <p className="text-sm text-gray-500">Cadastrado em: {new Date(user.date).toLocaleDateString()}</p>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-white bg-yellow-500 px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-white bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhum utilizador encontrado.</p>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Gerir Roles</h2>
          <ul className="space-y-2">
            {roles.map((role, index) => (
              <li key={index} className="p-2 bg-gray-100 rounded-md">{role}</li>
            ))}
          </ul>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Adicionar Nova Role</label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-md"
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
    </div>
  );
};

export default Utilizadores;
