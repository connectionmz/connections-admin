import React, { useState, useEffect, useCallback } from "react";
import { ref, onValue, push, update } from "firebase/database";
import sendEmail from "./utils/sendMail";
import { auth, db } from '../fb';
import { isCompanyPendingValidation } from '../domain/moderation';
import { AdminPage, AdminPageHeader, EmptyState, InlineAlert, LoadingState } from './admin/ui/AdminUI';

const Validacoes = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
  const [invalidateReason, setInvalidateReason] = useState("");
  const [invalidateNote, setInvalidateNote] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchEmpresas = useCallback(() => {
    const empresasRef = ref(db, "company");

    return onValue(
      empresasRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const empresasList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setEmpresas(empresasList);
          setFilteredEmpresas(
            empresasList.filter(
              (empresa) => 
                isCompanyPendingValidation(empresa)
            )
          );
        } else {
          setEmpresas([]);
          setFilteredEmpresas([]);
        }
        setLoading(false);
      },
      (error) => {
        setError("Erro ao carregar as empresas.");
        console.error("Erro ao buscar empresas:", error);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    return fetchEmpresas();
  }, [fetchEmpresas]);

  const sendValidationEmail = async (email, companyName, action) => {
    setEmailStatus('sending');
    setIsProcessing(true);
    try {
      const subject = action === "validar" 
        ? "Empresa validada!" 
        : "Invalidação da Empresa";
    
      const text = action === "validar"
        ? `A sua conta na Connection Mozambique foi validada com sucesso! 🎉 Parabéns, ${companyName}!

Agora é o momento ideal para melhorar o seu perfil e destacar a sua empresa na nossa plataforma.

Por que completar o seu perfil?
✔ Credibilidade: Um perfil completo transmite profissionalismo e confiança.  
✔ Visibilidade: Aumenta as chances de ser encontrado por clientes e parceiros.  
✔ Oportunidades: Empresas com perfis completos recebem mais conexões e negócios.

O que deve incluir?
📌 Visão, Missão e Valores: Mostre a identidade da sua empresa.  
🌐 Links das redes sociais (Facebook, LinkedIn, Instagram, site, etc.).  
🖼 Logotipo e imagem de capa: Reforce a sua marca visualmente.  
📢 Publicações no feed: Partilhe projetos, serviços e depoimentos para engajar a comunidade.

Como fazer?
Aceda ao seu perfil: https://www.connectionmozambique.com/perfil
Clique em "Editar Perfil" e preencha todas as secções.  

Publique conteúdos relevantes no seu feed para aumentar o alcance.

Se precisar de ajuda, estamos por aqui.  
Atenciosamente,  
Equipe Connection Mozambique  
suporte@connectionmozambique.com`
        : `Lamentamos informar que a sua empresa ${companyName} não foi validada.

Motivo: ${invalidateReason}  
Observações: ${invalidateNote}

Sugerimos que reveja os dados da sua empresa e tente novamente.

Para mais informações, entre em contato com o nosso suporte: suporte@connectionmozambique.com

Atenciosamente,  
Equipe Connection Mozambique`;

      const emailData = {
        to: email,
        subject: subject,
        text: text
      };

      const success = await sendEmail(emailData);
      if (success) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
      return success;
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      setEmailStatus('error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidar = async () => {
    if (!selectedEmpresa || isProcessing) return;

    try {
      setIsProcessing(true);
      const now = new Date().toISOString();
      const decisionRef = push(ref(db, 'moderation/companyValidations'));
      await update(ref(db), {
        [`company/${selectedEmpresa.id}/subscriptions/isverify`]: 'true',
        [`company/${selectedEmpresa.id}/subscriptions/validadoPor`]: auth.currentUser?.uid || 'admin',
        [`company/${selectedEmpresa.id}/subscriptions/dataValidacao`]: now,
        [`company/${selectedEmpresa.id}/verificationStatus`]: 'aprovado',
        [`company/${selectedEmpresa.id}/subscriptions/motivoInvalidacao`]: null,
        [`company/${selectedEmpresa.id}/subscriptions/notaInvalidacao`]: null,
        [`moderation/companyValidations/${decisionRef.key}`]: {
          companyId: selectedEmpresa.id,
          status: 'aprovado',
          decidedAt: now,
          decidedBy: auth.currentUser?.uid || 'admin'
        }
      });

      await sendValidationEmail(selectedEmpresa.email, selectedEmpresa.nome, "validar");

      setDialogOpen(false);
      setSelectedEmpresa(null);
      setFilteredEmpresas(
        filteredEmpresas.filter((empresa) => empresa.id !== selectedEmpresa.id)
      );
    } catch (error) {
      setError("Erro ao validar a empresa.");
      console.error("Erro ao validar empresa:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInvalidar = async () => {
    if (!selectedEmpresa || !invalidateReason || isProcessing) return;
    try {
      setIsProcessing(true);
      const now = new Date().toISOString();
      const decisionRef = push(ref(db, 'moderation/companyValidations'));
      await update(ref(db), {
        [`company/${selectedEmpresa.id}/subscriptions/isverify`]: 'false',
        [`company/${selectedEmpresa.id}/subscriptions/motivoInvalidacao`]: invalidateReason,
        [`company/${selectedEmpresa.id}/subscriptions/notaInvalidacao`]: invalidateNote || null,
        [`company/${selectedEmpresa.id}/subscriptions/invalidadoPor`]: auth.currentUser?.uid || 'admin',
        [`company/${selectedEmpresa.id}/subscriptions/dataInvalidacao`]: now,
        [`company/${selectedEmpresa.id}/verificationStatus`]: 'rejeitado',
        [`moderation/companyValidations/${decisionRef.key}`]: {
          companyId: selectedEmpresa.id,
          status: 'rejeitado',
          reason: invalidateReason,
          note: invalidateNote || null,
          decidedAt: now,
          decidedBy: auth.currentUser?.uid || 'admin'
        }
      });

      await sendValidationEmail(selectedEmpresa.email, selectedEmpresa.nome, "invalidar");

      setInvalidateDialogOpen(false);
      setDialogOpen(false);
      setSelectedEmpresa(null);
      setInvalidateReason("");
      setInvalidateNote("");
      setFilteredEmpresas(
        filteredEmpresas.filter((empresa) => empresa.id !== selectedEmpresa.id)
      );
    } catch (error) {
      setError("Erro ao invalidar a empresa.");
      console.error("Erro ao invalidar empresa:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmpresaClick = (empresa) => {
    if (isProcessing) return;
    setSelectedEmpresa(empresa);
    setDialogOpen(true);
    setEmailStatus(null);
  };

  const handleLigar = () => {
    if (isProcessing) return;
    if (selectedEmpresa?.contacto) {
      window.open(`tel:${selectedEmpresa.contacto}`, "_self");
    } else {
      setError('Número de telefone não disponível.');
    }
  };

  const handleSearchChange = (e) => {
    if (isProcessing) return;
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredEmpresas(
        empresas.filter(
          (empresa) => isCompanyPendingValidation(empresa)
        )
      );
    } else {
      setFilteredEmpresas(
        empresas.filter(
          (empresa) =>
            isCompanyPendingValidation(empresa) &&
            ((empresa.nome || '').toLowerCase().includes(term) ||
            (empresa.sigla && empresa.sigla.toLowerCase().includes(term)))
        )
      );
    }
  };

  const handleClearSearch = () => {
    if (isProcessing) return;
    setSearchTerm("");
    setFilteredEmpresas(
      empresas.filter(
        (empresa) => isCompanyPendingValidation(empresa)
      )
    );
  };

  return (
    <AdminPage>
        {/* Header */}
        <AdminPageHeader title="Validação de empresas" description="Analise os dados submetidos e registe decisões verificáveis sobre cada empresa." actions={
          <div className="w-full md:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou sigla..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isProcessing}
              />
              {searchTerm && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                  onClick={handleClearSearch}
                  aria-label="Limpar pesquisa"
                  disabled={isProcessing}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        } />

        {/* Status Indicators */}
        {emailStatus === 'sending' && (
          <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-3 rounded-lg mb-6 border border-blue-200">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enviando notificação por email...
          </div>
        )}
        {emailStatus === 'success' && (
          <div className="flex items-center bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-6 border border-green-200">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Email enviado com sucesso!
          </div>
        )}
        {emailStatus === 'error' && (
          <div className="flex items-center bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 border border-red-200">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Erro ao enviar email. Por favor, tente novamente.
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <LoadingState label="A carregar empresas..." />
        )}

        {/* Error Message */}
        {error && (
          <InlineAlert type="error" onClose={() => setError(null)}>{error}</InlineAlert>
        )}

        {/* List of Companies Pending Validation */}
        {!loading && filteredEmpresas.length === 0 ? (
          <EmptyState title="Nenhuma empresa pendente" description="Todas as empresas foram analisadas ou não existem solicitações neste momento." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmpresas.map((empresa) => (
              <div
                key={empresa.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 ${
                  isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                }`}
                onClick={() => !isProcessing && handleEmpresaClick(empresa)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{empresa.nome}</h3>
                      {empresa.sigla && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                          {empresa.sigla}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pendente
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {empresa.email || "Email não disponível"}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {empresa.contacto || "Telefone não disponível"}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(empresa.createdAt).toLocaleDateString('pt-MZ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Details Modal */}
        {dialogOpen && selectedEmpresa && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => !isProcessing && setDialogOpen(false)}></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl leading-6 font-bold text-gray-900 mb-1">
                            {selectedEmpresa.nome}
                          </h3>
                          {selectedEmpresa.sigla && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {selectedEmpresa.sigla}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => !isProcessing && setDialogOpen(false)}
                          disabled={isProcessing}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900 break-all">
                            {selectedEmpresa.email || "Não disponível"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedEmpresa.contacto || "Não disponível"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">NUIT</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedEmpresa.nuit || "Não disponível"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">NUEL</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedEmpresa.nuel || "Não disponível"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedEmpresa.endereco || "Não disponível"}, {selectedEmpresa.distrito || ""}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Data de Registro</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(selectedEmpresa.createdAt).toLocaleString('pt-MZ')}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleValidar}
                    disabled={isProcessing}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm transition ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Validar
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => !isProcessing && setInvalidateDialogOpen(true)}
                    disabled={isProcessing}
                    className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Invalidar
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleLigar}
                    disabled={isProcessing || !selectedEmpresa?.contacto}
                    className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition ${
                      isProcessing || !selectedEmpresa?.contacto ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Ligar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invalidate Company Modal */}
        {invalidateDialogOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => !isProcessing && setInvalidateDialogOpen(false)}></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Invalidar empresa
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Por favor, informe o motivo da invalidação para {selectedEmpresa?.nome}.
                        </p>
                      </div>
                      
                      <div className="mt-4">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 text-left">
                          Motivo*
                        </label>
                        <select
                          id="reason"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          value={invalidateReason}
                          onChange={(e) => !isProcessing && setInvalidateReason(e.target.value)}
                          required
                          disabled={isProcessing}
                        >
                          <option value="">Selecione um motivo</option>
                          <option value="Documentação incompleta">Documentação incompleta</option>
                          <option value="Informações inconsistentes">Informações inconsistentes</option>
                          <option value="Empresa não encontrada">Empresa não encontrada</option>
                          <option value="Dados inválidos">Dados inválidos</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      
                      <div className="mt-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 text-left">
                          Observações
                        </label>
                        <textarea
                          id="notes"
                          rows={3}
                          className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                          placeholder="Descreva os detalhes do problema..."
                          value={invalidateNote}
                          onChange={(e) => !isProcessing && setInvalidateNote(e.target.value)}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleInvalidar}
                    disabled={!invalidateReason || isProcessing}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition ${
                      !invalidateReason || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      'Confirmar Invalidação'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => !isProcessing && setInvalidateDialogOpen(false)}
                    disabled={isProcessing}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </AdminPage>
  );
};

export default Validacoes;
