import React, { useState, useEffect, useMemo } from 'react';
import { ref, get, push, set, update } from 'firebase/database';
import { db, auth } from '../fb';
import { onAuthStateChanged } from 'firebase/auth';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

const Relatorios = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    activities: '',
    results: '',
    challenges: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });
  const [viewMode, setViewMode] = useState('list');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email
        });
        
        try {
          const snapshot = await get(ref(db, `utilizadores/${firebaseUser.uid}`));
          setRole(snapshot.exists() ? snapshot.val().role : 'funcionario');
        } catch (error) {
          console.error('Erro ao buscar papel do usuário:', error);
          setRole('funcionario');
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Buscar relatórios
  useEffect(() => {
    if (!currentUser) return;

    const fetchReports = async () => {
      try {
        setLoading(true);
        const reportsRef = ref(db, 'reports');
        const snapshot = await get(reportsRef);
        
        if (snapshot.exists()) {
          const reportsData = [];
          snapshot.forEach((childSnapshot) => {
            const report = childSnapshot.val();
            // Admin vê tudo, funcionário vê apenas os seus
            if (role === 'admin' || report.userId === currentUser.uid) {
              reportsData.push({
                id: childSnapshot.key,
                ...report
              });
            }
          });
          setReports(reportsData);
        }
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar relatórios');
        console.error(err);
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentUser, role]);

  const filteredReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter(report => report.status === filter);
  }, [reports, filter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setError('');

    if (!newReport.title || !newReport.description || !newReport.activities) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const reportsRef = ref(db, 'reports');
      
      if (editingId) {
        // Atualizar relatório existente
        await update(ref(db, `reports/${editingId}`), {
          ...newReport,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Criar novo relatório
        const newReportRef = push(reportsRef);
        await set(newReportRef, {
          ...newReport,
          userId: currentUser.uid,
          userName: currentUser.displayName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Recarregar lista
      const snapshot = await get(reportsRef);
      if (snapshot.exists()) {
        const reportsData = [];
        snapshot.forEach((childSnapshot) => {
          reportsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setReports(reportsData);
      }

      // Resetar formulário
      setNewReport({
        title: '',
        description: '',
        activities: '',
        results: '',
        challenges: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      setEditingId(null);
      setViewMode('list');
      setLoading(false);
    } catch (err) {
      setError('Erro ao salvar relatório');
      console.error(err);
      setLoading(false);
    }
  };

  const handleEditReport = (report) => {
    if (report.userId !== currentUser.uid && role !== 'admin') {
      setError('Apenas o autor ou admin pode editar');
      return;
    }

    if (report.status !== 'pending' && role !== 'admin') {
      setError('Só é possível editar relatórios pendentes');
      return;
    }

    setNewReport({
      title: report.title,
      description: report.description,
      activities: report.activities,
      results: report.results,
      challenges: report.challenges,
      date: report.date,
      status: report.status
    });
    setEditingId(report.id);
    setViewMode('form');
  };

  const handleStatusChange = async (reportId, newStatus) => {
    if (role !== 'admin') {
      setError('Apenas administradores podem alterar status');
      return;
    }

    try {
      await update(ref(db, `reports/${reportId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Atualizar lista local
      setReports(reports.map(report => 
        report.id === reportId ? {...report, status: newStatus} : report
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setError('Erro ao atualizar status');
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredReports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatórios");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `relatorios_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    return <div className="flex justify-center items-center h-screen">Faça login para acessar</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {role === 'admin' ? 'Relatórios da Equipe' : 'Meus Relatórios'}
        </h1>
        {viewMode === 'list' && (
          <button
            onClick={() => {
              setEditingId(null);
              setViewMode('form');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Novo Relatório
          </button>
        )}
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {viewMode === 'form' ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Relatório' : 'Criar Novo Relatório'}
          </h2>
          
          <form onSubmit={handleSubmitReport} className="space-y-4">
            {/* Campos do formulário (mesmo do anterior) */}
            {/* ... */}
            
            <div className="flex space-x-4 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Relatório'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setViewMode('list');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex space-x-2 mb-2 sm:mb-0">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-md text-sm ${filter === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1 rounded-md text-sm ${filter === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
              >
                Aprovados
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-3 py-1 rounded-md text-sm ${filter === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}
              >
                Rejeitados
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                title="Exportar para Excel"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Exportar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">Nenhum relatório encontrado</p>
              <button
                onClick={() => setViewMode('form')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Criar Primeiro Relatório
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      {role === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(report.date).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        {role === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{report.userName}</div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditReport(report)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            
                            {role === 'admin' && report.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(report.id, 'approved')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Aprovar"
                                >
                                  <CheckIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(report.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                  title="Rejeitar"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Relatorios;