import React, { useState, useEffect, useCallback } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend('re_ZV2FoL6Q_8qMBKTjzQujafZxNVajSs21F'); // Replace with your actual Resend API key

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

  const fetchEmpresas = useCallback(() => {
    const db = getDatabase();
    const empresasRef = ref(db, "company");

    onValue(
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
              (empresa) => empresa?.subscriptions?.isverify === "false"
            )
          );
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
    fetchEmpresas();
  }, [fetchEmpresas]);

  const sendValidationEmail = async (email, companyName) => {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Connection Mozambique <no-reply@connectionmozambique.com>',
        to: [email],
        subject: 'Sua empresa foi validada com sucesso!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #1976d2; text-align: center;">Validação Aprovada</h1>
            <p>Prezado(a) cliente,</p>
            <p>É com satisfação que informamos que a empresa <strong>${companyName}</strong> foi validada com sucesso em nossa plataforma.</p>
            <p>Agora você tem acesso completo a todas as funcionalidades do Connection Mozambique.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;">Acesse sua conta: <a href="https://app.connectionmozambique.com" style="color: #1976d2;">https://app.connectionmozambique.com</a></p>
            </div>
            
            <p>Caso tenha alguma dúvida, nossa equipe de suporte está disponível:</p>
            <ul>
              <li>Email: suporte@connectionmozambique.com</li>
              <li>Telefone: +258 84 000 0000</li>
            </ul>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
              Esta é uma mensagem automática, por favor não responda este email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Error sending validation email:', error);
        setEmailStatus('error');
        return false;
      }

      console.log('Validation email sent successfully:', data);
      setEmailStatus('success');
      return true;
    } catch (err) {
      console.error('Error sending validation email:', err);
      setEmailStatus('error');
      return false;
    }
  };

  const sendInvalidationEmail = async (email, companyName, reason, note) => {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Connection Mozambique <no-reply@connectionmozambique.com>',
        to: [email],
        subject: 'Ajustes necessários para validação da sua empresa',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #d32f2f; text-align: center;">Validação Pendente</h1>
            <p>Prezado(a) cliente,</p>
            <p>Identificamos que a empresa <strong>${companyName}</strong> necessita de ajustes para concluir o processo de validação.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Motivo:</strong> ${reason}</p>
              ${note ? `<p style="margin: 0;"><strong>Detalhes:</strong> ${note}</p>` : ''}
            </div>
            
            <p>Por favor, faça os ajustes necessários e entre em contato conosco para reavaliarmos sua solicitação.</p>
            
            <p>Nossa equipe de suporte está disponível:</p>
            <ul>
              <li>Email: suporte@connectionmozambique.com</li>
              <li>Telefone: +258 84 000 0000</li>
            </ul>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
              Esta é uma mensagem automática, por favor não responda este email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Error sending invalidation email:', error);
        setEmailStatus('error');
        return false;
      }

      console.log('Invalidation email sent successfully:', data);
      setEmailStatus('success');
      return true;
    } catch (err) {
      console.error('Error sending invalidation email:', err);
      setEmailStatus('error');
      return false;
    }
  };

  const handleValidar = async () => {
    if (!selectedEmpresa) return;

    try {
      const db = getDatabase();
      const empresaRef = ref(db, `company/${selectedEmpresa.id}/subscriptions`);

      await update(empresaRef, {
        isverify: "true",
        validadoPor: "Admin",
        dataValidacao: new Date().toISOString(),
      });

      // Send validation email
      setEmailStatus('sending');
      const emailSent = await sendValidationEmail(
        selectedEmpresa.email, 
        selectedEmpresa.nome
      );

      if (!emailSent) {
        alert("Empresa validada, mas o email não pôde ser enviado.");
      }

      setDialogOpen(false);
      setSelectedEmpresa(null);
      setFilteredEmpresas(
        filteredEmpresas.filter((empresa) => empresa.id !== selectedEmpresa.id)
      );
    } catch (error) {
      setError("Erro ao validar a empresa.");
      console.error("Erro ao validar empresa:", error);
    }
  };

  const handleInvalidar = async () => {
    if (!selectedEmpresa || !invalidateReason) return;

    try {
      const db = getDatabase();
      const empresaRef = ref(db, `company/${selectedEmpresa.id}/subscriptions`);

      await update(empresaRef, {
        isverify: "invalidado",
        motivoInvalidacao: invalidateReason,
        notaInvalidacao: invalidateNote,
        invalidadoPor: "Admin",
        dataInvalidacao: new Date().toISOString(),
      });

      // Send invalidation email
      setEmailStatus('sending');
      const emailSent = await sendInvalidationEmail(
        selectedEmpresa.email,
        selectedEmpresa.nome,
        invalidateReason,
        invalidateNote
      );

      if (!emailSent) {
        alert("Empresa invalidada, mas o email não pôde ser enviado.");
      }

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
    }
  };

  const handleEmpresaClick = (empresa) => {
    setSelectedEmpresa(empresa);
    setDialogOpen(true);
    setEmailStatus(null);
  };

  const handleLigar = () => {
    if (selectedEmpresa?.contacto) {
      window.open(`tel:${selectedEmpresa.contacto}`, "_self");
    } else {
      alert("Número de telefone não disponível.");
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredEmpresas(
        empresas.filter((empresa) => empresa?.subscriptions?.isverify === "false")
      );
    } else {
      setFilteredEmpresas(
        empresas.filter(
          (empresa) =>
            empresa.nome.toLowerCase().includes(term) ||
            (empresa.sigla && empresa.sigla.toLowerCase().includes(term))
        )
      );
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setFilteredEmpresas(
      empresas.filter((empresa) => empresa?.subscriptions?.isverify === "false")
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Validações de Empresas</h1>

      {/* Barra de Pesquisa */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar por nome ou sigla da empresa..."
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {searchTerm && (
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500"
            onClick={handleClearSearch}
            aria-label="Limpar pesquisa"
          >
            ×
          </button>
        )}
      </div>

      {/* Status do Email */}
      {emailStatus === 'sending' && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Enviando notificação por email...
        </div>
      )}
      {emailStatus === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Email enviado com sucesso!
        </div>
      )}
      {emailStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Erro ao enviar email. Por favor, tente novamente.
        </div>
      )}

      {/* Indicador de Carregamento */}
      {loading && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Lista de Empresas Não Validadas */}
      {!loading && filteredEmpresas.length === 0 ? (
        <p className="text-gray-600 text-center">Nenhuma empresa encontrada.</p>
      ) : (
        <ul className="space-y-4">
          {filteredEmpresas.map((empresa) => (
            <li
              key={empresa.id}
              className="bg-white p-4 rounded shadow cursor-pointer hover:bg-gray-50 transition duration-150"
              onClick={() => handleEmpresaClick(empresa)}
              role="button"
              aria-label={`Detalhes da empresa ${empresa.nome}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold">{empresa.nome}</div>
                  <div className="text-gray-600">Sigla: {empresa.sigla || "N/A"}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(empresa.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-2 text-gray-600">Telefone: {empresa.contacto || "Não disponível"}</div>
              <div className="mt-1 text-gray-600">Email: {empresa.email || "Não disponível"}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de Detalhes da Empresa */}
      {dialogOpen && selectedEmpresa && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 mx-4">
            <h2 className="text-xl font-bold mb-4">{selectedEmpresa.nome}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-500 text-sm">Email</p>
                <p className="text-gray-800">{selectedEmpresa.email || "Não disponível"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Telefone</p>
                <p className="text-gray-800">{selectedEmpresa.contacto || "Não disponível"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">NUIT</p>
                <p className="text-gray-800">{selectedEmpresa.nuit || "Não disponível"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">NUEL</p>
                <p className="text-gray-800">{selectedEmpresa.nuel || "Não disponível"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-sm">Endereço</p>
                <p className="text-gray-800">
                  {selectedEmpresa.endereco || "Não disponível"}, {selectedEmpresa.distrito || ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-between mt-6">
              <button
                onClick={handleLigar}
                className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition flex-1 min-w-[120px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Ligar
              </button>
              
              <button
                onClick={() => setInvalidateDialogOpen(true)}
                className="flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition flex-1 min-w-[120px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Invalidar
              </button>
              
              <button
                onClick={handleValidar}
                className="flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition flex-1 min-w-[120px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Validar
              </button>
              
              <button
                onClick={() => setDialogOpen(false)}
                className="flex items-center justify-center bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-400 transition flex-1 min-w-[120px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invalidar Empresa */}
      {invalidateDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 mx-4">
            <h2 className="text-xl font-bold mb-4">Invalidar Empresa</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Motivo da Invalidação*</label>
              <select
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={invalidateReason}
                onChange={(e) => setInvalidateReason(e.target.value)}
                required
              >
                <option value="">Selecione um motivo</option>
                <option value="Documentação incompleta">Documentação incompleta</option>
                <option value="Informações inconsistentes">Informações inconsistentes</option>
                <option value="Empresa não encontrada">Empresa não encontrada</option>
                <option value="Dados inválidos">Dados inválidos</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Observações</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Descreva os detalhes do problema..."
                value={invalidateNote}
                onChange={(e) => setInvalidateNote(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setInvalidateDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvalidar}
                disabled={!invalidateReason}
                className={`px-4 py-2 rounded-lg text-white ${!invalidateReason ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} transition`}
              >
                Confirmar Invalidação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Validacoes;