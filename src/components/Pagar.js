import React, { useState, useEffect } from 'react';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { db, storage } from '../fb';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FaSearch, FaUpload, FaTrash, FaCheck, FaTimes, FaFilePdf, FaFileImage, FaFileAlt, FaBuilding, FaPhone, FaEnvelope, FaUser, FaCalendarAlt, FaMoneyBillWave } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import moment from 'moment';
import 'moment/locale/pt'; // Configura moment.js para português

moment.locale('pt'); // Define o idioma como português

const Pagar = ({ user }) => {
  const [metodo, setMetodo] = useState('M-pesa');
  const [comprovativo, setComprovativo] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [contactoOpcional, setContactoOpcional] = useState('');

  // Carregar pagamentos do banco de dados
  useEffect(() => {
    const paymentsRef = ref(db, 'payments');
    const unsubscribe = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const paymentsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Ordenar por data (mais recente primeiro)
        paymentsArray.sort((a, b) => b.timestamp - a.timestamp);
        setPayments(paymentsArray);
      } else {
        setPayments([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filtrar pagamentos
  useEffect(() => {
    let result = payments;
    
    // Filtrar por status
    if (selectedStatus !== 'todos') {
      result = result.filter(payment => payment.status === selectedStatus);
    }
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(payment => 
        (payment.nome && payment.nome.toLowerCase().includes(term)) || 
        (payment.referencia && payment.referencia.toLowerCase().includes(term)) ||
        (payment.telefone && payment.telefone.toLowerCase().includes(term)) ||
        (payment.userEmail && payment.userEmail.toLowerCase().includes(term)) ||
        (payment.userName && payment.userName.toLowerCase().includes(term))
      );
    }
    
    setFilteredPayments(result);
  }, [payments, searchTerm, selectedStatus]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificar tamanho do arquivo (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
        return;
      }
      
      setComprovativo(file);
      setSelectedFileType(file.type);
      
      // Criar preview para imagens
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewUrl(event.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };


  const resetForm = () => {
    setReferencia('');
    setContactoOpcional('');
    setComprovativo(null);
    setPreviewUrl(null);
    setSelectedFileType(null);
    // Limpar o input de arquivo
    document.getElementById('fileInput').value = '';
  };

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      await update(ref(db, `payments/${paymentId}`), {
        status: newStatus,
        updatedAt: Date.now()
      });
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const deletePayment = async (payment) => {
    if (!window.confirm('Tem certeza que deseja excluir este comprovativo permanentemente?')) return;
    
    try {
      // Excluir arquivo do Storage
      if (payment.comprovativoUrl) {
        const fileRef = storageRef(storage, `comprovativos/${payment.userId}/${payment.fileName}`);
        await deleteObject(fileRef);
      }
      
      // Excluir do banco de dados
      await remove(ref(db, `payments/${payment.id}`));
      alert('Comprovativo excluído com sucesso!');
      setSelectedPayment(null); // Fechar detalhes se estiver aberto
    } catch (error) {
      console.error('Erro ao excluir comprovativo:', error);
      alert('Erro ao excluir comprovativo.');
    }
  };

  const downloadFile = async (payment) => {
    try {
      const url = payment.comprovativoUrl;
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, payment.fileName || `comprovativo_${payment.id}`);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar comprovativo.');
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFileAlt className="text-gray-500" />;
    if (fileType.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (fileType.startsWith('image/')) return <FaFileImage className="text-blue-500" />;
    return <FaFileAlt className="text-gray-500" />;
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
  };

  const closePaymentDetails = () => {
    setSelectedPayment(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestão de Comprovativos de Pagamento</h1>
        
        {/* Lista de comprovativos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 md:mb-0">Comprovativos Submetidos</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por empresa, referência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="todos">Todos os Status</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovado">Aprovados</option>
                <option value="rejeitado">Rejeitados</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referência</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprovativo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openPaymentDetails(payment)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {moment(payment.timestamp).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment.nome || payment.userName}</div>
                        <div className="text-sm text-gray-500">{payment.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.referencia || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(payment);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {getFileIcon(payment.comprovativoUrl?.split('.').pop())}
                          <span className="ml-2">Baixar</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${payment.status === 'aprovado' ? 'bg-green-100 text-green-800' : 
                            payment.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {payment.status === 'aprovado' ? 'Aprovado' : 
                           payment.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {payment.status === 'pendente' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(payment.id, 'aprovado');
                                }}
                                className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50"
                                title="Aprovar"
                              >
                                <FaCheck />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStatus(payment.id, 'rejeitado');
                                }}
                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                title="Rejeitar"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePayment(payment);
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-50"
                            title="Excluir"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum comprovativo encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">Detalhes do Comprovativo</h3>
                <button 
                  onClick={closePaymentDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Informações da Empresa */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaBuilding className="mr-2" /> Informações da Empresa
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{selectedPayment.nome || selectedPayment.userName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Submetido por</p>
                      <p className="font-medium">{selectedPayment.userName || selectedPayment.nome || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedPayment.userEmail || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefone</p>
                      <p className="font-medium">{selectedPayment.telefone || 'Não informado'}</p>
                    </div>
                    {selectedPayment.contactoOpcional && (
                      <div>
                        <p className="text-sm text-gray-500">Contacto Opcional</p>
                        <p className="font-medium">{selectedPayment.contactoOpcional}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações do Pagamento */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg text-gray-700 mb-3 flex items-center">
                    <FaMoneyBillWave className="mr-2" /> Informações do Pagamento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Data de Submissão</p>
                      <p className="font-medium">{moment(selectedPayment.timestamp).format('LLL')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Referência</p>
                      <p className="font-medium">{selectedPayment.referencia || 'Não informada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Método de Pagamento</p>
                      <p className="font-medium">{selectedPayment.method || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`font-medium inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        selectedPayment.status === 'aprovado' ? 'bg-green-100 text-green-800' : 
                        selectedPayment.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedPayment.status === 'aprovado' ? 'Aprovado' : 
                         selectedPayment.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                      </p>
                    </div>
                    {selectedPayment.updatedAt && (
                      <div>
                        <p className="text-sm text-gray-500">Última Atualização</p>
                        <p className="font-medium">{moment(selectedPayment.updatedAt).format('LLL')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visualização do Comprovativo */}
              <div className="mt-6">
                <h4 className="font-semibold text-lg text-gray-700 mb-3">Comprovativo</h4>
                <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                  {selectedPayment.comprovativoUrl?.includes('.pdf') ? (
                    <div className="text-center py-8">
                      <FaFilePdf className="mx-auto h-12 w-12 text-red-500" />
                      <p className="mt-2 text-sm text-gray-600">Arquivo PDF</p>
                      <button
                        onClick={() => downloadFile(selectedPayment)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Baixar Comprovativo
                      </button>
                    </div>
                  ) : (
                    <img 
                      src={selectedPayment.comprovativoUrl} 
                      alt="Comprovativo de pagamento" 
                      className="max-h-96 mx-auto border border-gray-200 rounded"
                    />
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => downloadFile(selectedPayment)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <FaFileAlt className="mr-2" /> Baixar Comprovativo
                </button>
                {selectedPayment.status === 'pendente' && (
                  <>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedPayment.id, 'aprovado');
                        closePaymentDetails();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <FaCheck className="mr-2" /> Aprovar
                    </button>
                    <button
                      onClick={() => {
                        updatePaymentStatus(selectedPayment.id, 'rejeitado');
                        closePaymentDetails();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                    >
                      <FaTimes className="mr-2" /> Rejeitar
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    deletePayment(selectedPayment);
                    closePaymentDetails();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center"
                >
                  <FaTrash className="mr-2" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagar;