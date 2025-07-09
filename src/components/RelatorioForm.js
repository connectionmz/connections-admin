import React, { useState, useEffect } from 'react';
import { ref, get, push, set, update, remove } from 'firebase/database';
import { db, auth } from '../fb';
import { onAuthStateChanged } from 'firebase/auth';
import { PencilSquareIcon, TrashIcon, DocumentTextIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';

const RelatorioForm = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activities: '',
    results: '',
    challenges: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    edited: false
  });
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('create');

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Buscar relatórios do usuário
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserReports = async () => {
      try {
        setLoading(true);
        const reportsRef = ref(db, 'reports');
        const snapshot = await get(reportsRef);
        
        if (snapshot.exists()) {
          const userReports = [];
          snapshot.forEach((childSnapshot) => {
            const report = childSnapshot.val();
            if (report.userId === currentUser.uid) {
              userReports.push({
                id: childSnapshot.key,
                ...report
              });
            }
          });
          // Ordenar por data mais recente primeiro
          userReports.sort((a, b) => new Date(b.date) - new Date(a.date));
          setReports(userReports);
        }
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar seus relatórios');
        console.error(err);
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      edited: editingId ? true : false
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.description || !formData.activities) {
      setError('Preencha todos os campos obrigatórios (*)');
      return;
    }

    try {
      setLoading(true);
      const reportsRef = ref(db, 'reports');
      
      const reportData = {
        ...formData,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        // Atualizar relatório existente
        await update(ref(db, `reports/${editingId}`), reportData);
        setSuccess('Relatório atualizado com sucesso!');
      } else {
        // Criar novo relatório
        reportData.createdAt = new Date().toISOString();
        reportData.edited = false;
        const newReportRef = push(reportsRef);
        await set(newReportRef, reportData);
        setSuccess('Relatório enviado com sucesso!');
      }

      // Resetar e recarregar
      resetForm();
      await fetchUserReports();
      
      // Mudar para a aba de visualização após envio
      setActiveTab('view');
    } catch (err) {
      setError('Erro ao salvar relatório');
      console.error(err);
      setLoading(false);
    }
  };

  const fetchUserReports = async () => {
    try {
      const reportsRef = ref(db, 'reports');
      const snapshot = await get(reportsRef);
      
      if (snapshot.exists()) {
        const updatedReports = [];
        snapshot.forEach((childSnapshot) => {
          const report = childSnapshot.val();
          if (report.userId === currentUser.uid) {
            updatedReports.push({
              id: childSnapshot.key,
              ...report
            });
          }
        });
        updatedReports.sort((a, b) => new Date(b.date) - new Date(a.date));
        setReports(updatedReports);
      }
      setLoading(false);
    } catch (err) {
      setError('Erro ao recarregar relatórios');
      console.error(err);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      activities: '',
      results: '',
      challenges: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      edited: false
    });
    setEditingId(null);
    setLoading(false);
  };

  const handleEdit = (report) => {
    setFormData({
      title: report.title,
      description: report.description,
      activities: report.activities,
      results: report.results,
      challenges: report.challenges,
      date: report.date,
      status: report.status,
      edited: report.edited
    });
    setEditingId(report.id);
    setActiveTab('create');
    setSuccess('');
    setError('');
  };

  const handleDelete = async (reportId) => {
    try {
      setLoading(true);
      await remove(ref(db, `reports/${reportId}`));
      setSuccess('Relatório excluído com sucesso!');
      setConfirmDelete(null);
      await fetchUserReports();
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      setError('Erro ao excluir relatório');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aprovado</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Rejeitado</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pendente</span>;
    }
  };

  if (loading && !currentUser) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen">Faça login para enviar relatórios</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Meus Relatórios</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Abas de navegação */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'create' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <DocumentPlusIcon className="h-5 w-5 mr-2" />
            {editingId ? 'Editar Relatório' : 'Novo Relatório'}
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'view' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Meus Relatórios ({reports.length})
          </button>
        </nav>
      </div>

      {/* Conteúdo das abas */}
      <div>
        {activeTab === 'create' ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {editingId ? (
                <>
                  <PencilSquareIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Editando Relatório
                  {formData.edited && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                      Editado
                    </span>
                  )}
                </>
              ) : (
                <>
                  <DocumentPlusIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Criar Novo Relatório
                </>
              )}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título * <span className="text-xs text-gray-500">(obrigatório)</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Título do relatório"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição * <span className="text-xs text-gray-500">(obrigatório)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o propósito deste relatório"
                  required
                />
              </div>

              <div>
                <label htmlFor="activities" className="block text-sm font-medium text-gray-700 mb-1">
                  Atividades Realizadas * <span className="text-xs text-gray-500">(obrigatório)</span>
                </label>
                <textarea
                  id="activities"
                  name="activities"
                  value={formData.activities}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva as atividades realizadas"
                  required
                />
              </div>

              <div>
                <label htmlFor="results" className="block text-sm font-medium text-gray-700 mb-1">
                  Resultados Obtidos
                </label>
                <textarea
                  id="results"
                  name="results"
                  value={formData.results}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva os resultados alcançados"
                />
              </div>

              <div>
                <label htmlFor="challenges" className="block text-sm font-medium text-gray-700 mb-1">
                  Desafios Encontrados
                </label>
                <textarea
                  id="challenges"
                  name="challenges"
                  value={formData.challenges}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva os desafios enfrentados"
                />
              </div>

              <div className="flex space-x-4 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : editingId ? (
                    'Atualizar Relatório'
                  ) : (
                    'Enviar Relatório'
                  )}
                </button>
                
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('view');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                Meus Relatórios
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {reports.length} {reports.length === 1 ? 'relatório encontrado' : 'relatórios encontrados'}
              </p>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum relatório enviado ainda
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center mx-auto"
                >
                  <DocumentPlusIcon className="h-4 w-4 mr-2" />
                  Criar Primeiro Relatório
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                          {report.edited && (
                            <span className="text-xs text-yellow-600">(editado)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(report.date).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(report)}
                              className={`text-blue-600 hover:text-blue-900 flex items-center ${report.status !== 'pending' ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={report.status !== 'pending'}
                              title={report.status !== 'pending' ? 'Só é possível editar relatórios pendentes' : 'Editar'}
                            >
                              <PencilSquareIcon className="h-4 w-4 mr-1" />
                              Editar
                            </button>
                            
                            <button
                              onClick={() => setConfirmDelete(report.id)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                              title="Excluir"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Excluir
                            </button>
                          </div>
                          
                          {confirmDelete === report.id && (
                            <div className="mt-2 p-2 bg-red-50 rounded-md">
                              <p className="text-sm text-red-700">Confirmar exclusão deste relatório?</p>
                              <div className="flex space-x-2 mt-1">
                                <button
                                  onClick={() => handleDelete(report.id)}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded flex items-center"
                                >
                                  <TrashIcon className="h-3 w-3 mr-1" />
                                  Sim, excluir
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatorioForm;