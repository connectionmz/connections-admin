import React, { useState, useEffect, useCallback } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import sendEmail from "./SendMail";

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

      alert("Empresa validada com sucesso!");

      sendEmail(selectedEmpresa.email, selectedEmpresa.nome);

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

      alert("Empresa invalidada com sucesso!");

      // Enviar email com o motivo e a nota
      sendEmail(
        selectedEmpresa.email,
        `Sua empresa foi invalidada. Motivo: ${invalidateReason}. Nota: ${invalidateNote}`
      );

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

      {/* Indicador de Carregamento */}
      {loading && (
        <div className="flex justify-center mt-8">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
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
              className="bg-white p-4 rounded shadow cursor-pointer hover:bg-gray-50"
              onClick={() => handleEmpresaClick(empresa)}
              role="button"
              aria-label={`Detalhes da empresa ${empresa.nome}`}
            >
              <div className="text-lg font-semibold">{empresa.nome}</div>
              <div className="text-gray-600">Sigla: {empresa.sigla || "N/A"}</div>
              <div className="text-gray-600">Telefone: {empresa.contacto || "Não disponível"}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de Detalhes da Empresa */}
      {dialogOpen && selectedEmpresa && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white w-full max-w-md rounded shadow-lg p-6">
            <h2 id="modal-title" className="text-xl font-bold mb-4">
              {selectedEmpresa.nome}
            </h2>
            <p className="text-gray-700 mb-2">Email: {selectedEmpresa.email || "Não disponível"}</p>
            <p className="text-gray-700 mb-2">Telefone: {selectedEmpresa.contacto || "Não disponível"}</p>
            <p className="text-gray-700 mb-2">Nuit: {selectedEmpresa.nuit || "Não disponível"}</p>
            <p className="text-gray-700 mb-2">Nuel: {selectedEmpresa.nuel || "Não disponível"}</p>
            <p className="text-gray-700 mb-2">Nr Contribuinte: {selectedEmpresa.nrContribuinte || "Não disponível"}</p>

            {selectedEmpresa.subscriptions.validadoPor && (
              <>
                <p className="text-gray-700 mb-2">Validado por: {selectedEmpresa.subscriptions.validadoPor}</p>
                <p className="text-gray-700 mb-2">
                  Data da Validação:{" "}
                  {selectedEmpresa.subscriptions.dataValidacao
                    ? new Date(selectedEmpresa.subscriptions.dataValidacao).toLocaleString()
                    : "Não disponível"}
                </p>
              </>
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={handleLigar}
                className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
                aria-label="Ligar para a empresa"
              >
                Ligar
              </button>
              <button
                onClick={() => setInvalidateDialogOpen(true)}
                className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600"
                aria-label="Invalidar empresa"
              >
                Invalidar
              </button>
              <button
                onClick={handleValidar}
                className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600"
                aria-label="Validar empresa"
              >
                Validar
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded shadow hover:bg-gray-400"
                aria-label="Fechar modal"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invalidar Empresa */}
      {invalidateDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invalidate-modal-title"
        >
          <div className="bg-white w-full max-w-md rounded shadow-lg p-6">
            <h2 id="invalidate-modal-title" className="text-xl font-bold mb-4">
              Invalidar Empresa
            </h2>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Motivo da Invalidação:</label>
              <select
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={invalidateReason}
                onChange={(e) => setInvalidateReason(e.target.value)}
              >
                <option value="">Selecione um motivo</option>
                <option value="Dados da empresa inválidos">Dados da empresa inválidos</option>
                <option value="Empresa inexistente">Empresa inexistente</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Nota:</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                rows="3"
                value={invalidateNote}
                onChange={(e) => setInvalidateNote(e.target.value)}
                placeholder="Adicione uma nota..."
              />
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={handleInvalidar}
                className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600"
                aria-label="Confirmar invalidação"
              >
                Confirmar
              </button>
              <button
                onClick={() => setInvalidateDialogOpen(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded shadow hover:bg-gray-400"
                aria-label="Cancelar invalidação"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Validacoes;