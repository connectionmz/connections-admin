import React, { useState, useEffect } from 'react';
import { ref, get, remove, update } from 'firebase/database';
import { db } from '../fb';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { AdminPage, AdminPageHeader, InlineAlert, LoadingState, PrimaryButton } from './admin/ui/AdminUI';

export default function Relatorios() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Buscar relatórios
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const reportsRef = ref(db, 'reports');
        const snapshot = await get(reportsRef);
        
        if (snapshot.exists()) {
          const reportsData = [];
          snapshot.forEach((childSnapshot) => {
            reportsData.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          // Ordenar por data mais recente primeiro
          reportsData.sort((a, b) => new Date(b.date) - new Date(a.date));
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
  }, []);

  // Filtrar relatórios
  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(report => report.status === filter);

  // Visualizar detalhes do relatório
  const viewReportDetails = (report) => {
    setSelectedReport(report);
  };

  // Excluir relatório
  const handleDeleteReport = async (reportId) => {
    try {
      setLoading(true);
      await remove(ref(db, `reports/${reportId}`));
      setReports(reports.filter(report => report.id !== reportId));
      setSuccess('Relatório excluído com sucesso!');
      setConfirmDelete(null);
      setLoading(false);
    } catch (error) {
      setError('Erro ao excluir relatório');
      console.error(error);
      setLoading(false);
    }
  };

  // Alterar status do relatório
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await update(ref(db, `reports/${reportId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setReports(reports.map(report => 
        report.id === reportId ? {...report, status: newStatus} : report
      ));
      setSuccess(`Status alterado para ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}`);
    } catch (error) {
      setError('Erro ao atualizar status');
      console.error(error);
    }
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const dataToExport = filteredReports.map(report => ({
      Título: report.title,
      Descrição: report.description,
      Atividades: report.activities,
      Resultados: report.results,
      Desafios: report.challenges,
      Data: report.date,
      Status: report.status === 'approved' ? 'Aprovado' : report.status === 'rejected' ? 'Rejeitado' : 'Pendente',
      Autor: report.userName,
      'Data de Criação': report.createdAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatórios");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `relatorios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Componente de badge de status
  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aprovado</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Rejeitado</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pendente</span>;
    }
  };

  if (loading && reports.length === 0) {
    return <LoadingState label="A carregar relatórios..." />;
  }

  return (
    <AdminPage>
      <AdminPageHeader title="Relatórios dos utilizadores" description="Analise, valide e exporte os relatórios submetidos." actions={
        <PrimaryButton
          onClick={exportToExcel}
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Exportar para Excel
        </PrimaryButton>
      } />

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {success && <InlineAlert type="success">{success}</InlineAlert>}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-lg shadow-sm">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
        >
          Todos ({reports.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-md text-sm ${filter === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}
        >
          Pendentes ({reports.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-3 py-1 rounded-md text-sm ${filter === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
        >
          Aprovados ({reports.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-3 py-1 rounded-md text-sm ${filter === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}
        >
          Rejeitados ({reports.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Modal de detalhes */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Autor</p>
                  <p>{selectedReport.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p>{new Date(selectedReport.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p><StatusBadge status={selectedReport.status} /></p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Enviado em</p>
                  <p>{new Date(selectedReport.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Descrição</h3>
                  <p className="whitespace-pre-line bg-gray-50 p-3 rounded">
                    {selectedReport.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Atividades Realizadas</h3>
                  <p className="whitespace-pre-line bg-gray-50 p-3 rounded">
                    {selectedReport.activities}
                  </p>
                </div>

                {selectedReport.results && (
                  <div>
                    <h3 className="font-medium mb-2">Resultados Obtidos</h3>
                    <p className="whitespace-pre-line bg-gray-50 p-3 rounded">
                      {selectedReport.results}
                    </p>
                  </div>
                )}

                {selectedReport.challenges && (
                  <div>
                    <h3 className="font-medium mb-2">Desafios Encontrados</h3>
                    <p className="whitespace-pre-line bg-gray-50 p-3 rounded">
                      {selectedReport.challenges}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de relatórios */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum relatório encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{report.title}</div>
                      {report.edited && (
                        <span className="text-xs text-yellow-600">(editado)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{report.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(report.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewReportDetails(report)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Visualizar"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(report.id, 'approved')}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Aprovar"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(report.id, 'rejected')}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Rejeitar"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setConfirmDelete(report.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Excluir"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>

                        {confirmDelete === report.id && (
                          <div className="absolute bg-white p-2 shadow-lg rounded border border-gray-200 z-10">
                            <p className="text-sm mb-2">Confirmar exclusão?</p>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded"
                              >
                                Sim
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
