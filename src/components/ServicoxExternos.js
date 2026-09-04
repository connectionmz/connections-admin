import React, { useEffect, useState } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { db } from '../fb';
import AddExternalServices from './AddExternalServices';
import { AdminCard, AdminPage, AdminPageHeader, EmptyState, InlineAlert, LoadingState, PrimaryButton } from './admin/ui/AdminUI';

const ServicosExternos = () => {
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServicos = async () => {
      try {
        const snapshot = await get(ref(db, `servicosExternos`));
        const data = snapshot.val();
        if (data) {
          const servicosArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
          setServicos(servicosArray);
        } else {
          setError('Nenhum serviço encontrado.');
        }
      } catch (error) {
        setError('Erro ao buscar serviços.');
      } finally {
        setLoading(false);
      }
    };

    fetchServicos();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const path = `servicosExternos/${id}`;
      if (action === 'eliminar') {
        await remove(ref(db, path));
        setServicos((prev) => prev.filter((servico) => servico.id !== id));
        alert('Serviço eliminado com sucesso.');
      } else {
        const status = action === 'desativar' ? 'desativado' : 'ativo';
        await update(ref(db, path), { status });
        setServicos((prev) =>
          prev.map((servico) =>
            servico.id === id ? { ...servico, status } : servico
          )
        );
        alert(`Serviço ${status} com sucesso.`);
      }
    } catch (error) {
      alert('Erro ao realizar a ação.');
    } finally {
      setMenuOpen(null);
    }
  };

  const toggleMenu = (index) => {
    setMenuOpen((prev) => (prev === index ? null : index));
  };

  if (loading) {
    return <LoadingState label="A carregar serviços externos..." />;
  }

  if (error) {
    return <InlineAlert type="error">{error}</InlineAlert>;
  }

  return (
    <AdminPage>
      <AdminPageHeader title="Serviços externos" description="Administre os serviços complementares disponíveis na plataforma." actions={<PrimaryButton type="button" onClick={() => setShowModal(true)}>Adicionar serviço</PrimaryButton>} />
      <AdminCard className="overflow-x-auto p-4">

      {servicos.length === 0 ? (
        <EmptyState title="Nenhum serviço disponível" description="Adicione um serviço para começar." />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Nome</th>
              <th className="py-2">Sigla</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Descrição</th>
              <th className="py-2">Link</th>
              <th className="py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((servico, index) => (
              <tr key={servico.id} className="border-t">
                <td className="py-2">{servico.serviceName}</td>
                <td className="py-2">{servico.sigla}</td>
                <td className="py-2">{servico.category}</td>
                <td className="py-2">{servico.description}</td>
                <td className="py-2">
                  <a href={servico.url} className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">
                   Visitar
                  </a>
                </td>
                <td className="py-2">
                  <div className="relative">
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md"
                      onClick={() => toggleMenu(index)}
                    >
                      Ações
                    </button>
                    {menuOpen === index && (
                      <div className="absolute bg-white shadow-lg rounded-md mt-2 w-32">
                        <ActionMenu
                          servico={servico}
                          onAction={(action) => handleAction(servico.id, action)}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </AdminCard>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <AddExternalServices />
        </Modal>
      )}
    </AdminPage>
  );
};

// Componente isolado para o menu de ações
const ActionMenu = ({ servico, onAction }) => (
  <>
    <button
      onClick={() => onAction('eliminar')}
      className="block w-full px-4 py-2 text-left hover:bg-gray-100"
    >
      Eliminar
    </button>
    <button
      onClick={() => onAction('desativar')}
      className="block w-full px-4 py-2 text-left hover:bg-gray-100"
      disabled={servico.status === 'desativado'}
    >
      Desativar
    </button>
    <button
      onClick={() => onAction('reactivar')}
      className="block w-full px-4 py-2 text-left hover:bg-gray-100"
      disabled={servico.status === 'ativo'}
    >
      Reativar
    </button>
  </>
);

// Componente de Modal isolado para reutilização
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
      {children}
      <button
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md"
        onClick={onClose}
      >
        Fechar
      </button>
    </div>
  </div>
);

export default ServicosExternos;
