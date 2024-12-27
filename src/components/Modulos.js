import React, { useEffect, useState } from 'react';
import { getDatabase, ref, set, get, child, push, update } from "firebase/database";

const Modulos = () => {
  const [planos, setPlanos] = useState({});
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [moduloName, setModuloName] = useState('');
  const [moduloLimit, setModuloLimit] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingModule, setEditingModule] = useState(null);

  const db = getDatabase();

  useEffect(() => {
    const fetchPlanos = async () => {
      const dbRef = ref(db);
      try {
        const snapshot = await get(child(dbRef, 'planos'));
        if (snapshot.exists()) {
          setPlanos(snapshot.val());
        } else {
          console.log("Nenhum plano encontrado. Adicione novos planos.");
        }
      } catch (error) {
        console.error("Erro ao buscar planos: ", error);
      }
    };
    fetchPlanos();
  }, [db]);

  const handleAddOrUpdatePlan = async (e) => {
    e.preventDefault();
    if (newPlanName.trim() === '' || newPlanPrice.trim() === '') {
      alert('Por favor, preencha todos os campos do plano.');
      return;
    }

    if (editingPlan) {
      const planRef = ref(db, `planos/${editingPlan}`);
      try {
        await update(planRef, { name: newPlanName, price: newPlanPrice });
        setPlanos((prevPlanos) => ({
          ...prevPlanos,
          [editingPlan]: { ...prevPlanos[editingPlan], name: newPlanName, price: newPlanPrice }
        }));
        closePlanModal();
        alert('Plano atualizado com sucesso!');
      } catch (error) {
        console.error("Erro ao atualizar plano: ", error);
      }
    } else {
      const newPlanRef = push(ref(db, 'planos'));
      const newPlan = { name: newPlanName, price: newPlanPrice, modules: {} };

      try {
        await set(newPlanRef, newPlan);
        setPlanos((prevPlanos) => ({
          ...prevPlanos,
          [newPlanRef.key]: newPlan
        }));
        closePlanModal();
        alert('Plano adicionado com sucesso!');
      } catch (error) {
        console.error("Erro ao salvar plano: ", error);
      }
    }
  };

  const handleAddOrUpdateModulo = async (e) => {
    e.preventDefault();
    if (!selectedPlan || moduloName.trim() === '' || moduloLimit.trim() === '') {
      alert('Por favor, preencha todos os campos do módulo.');
      return;
    }

    const newModulo = { [moduloName]: { limit: moduloLimit } };
    const updatedPlanos = {
      ...planos,
      [selectedPlan]: {
        ...planos[selectedPlan],
        modules: {
          ...planos[selectedPlan].modules,
          ...newModulo
        }
      }
    };

    try {
      await set(ref(db, `planos/${selectedPlan}/modules`), updatedPlanos[selectedPlan].modules);
      setPlanos(updatedPlanos);
      closeModuleModal();
      alert('Módulo adicionado com sucesso!');
    } catch (error) {
      console.error("Erro ao salvar módulo: ", error);
    }
  };

  const handleEditPlan = (planId) => {
    setEditingPlan(planId);
    setNewPlanName(planos[planId].name);
    setNewPlanPrice(planos[planId].price);
    openPlanModal();
  };

  const handleEditModulo = (planId, moduleName) => {
    setEditingModule(moduleName);
    setSelectedPlan(planId);
    setModuloName(moduleName);
    setModuloLimit(planos[planId].modules[moduleName].limit);
    openModuleModal();
  };

  const openPlanModal = () => setIsPlanModalOpen(true);
  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    setNewPlanName('');
    setNewPlanPrice('');
    setEditingPlan(null);
  };

  const openModuleModal = () => setIsModuleModalOpen(true);
  const closeModuleModal = () => {
    setIsModuleModalOpen(false);
    setModuloName('');
    setModuloLimit('');
    setEditingModule(null);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestão de Planos e Módulos</h1>
      
      <button onClick={openPlanModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-700">
        Adicionar Novo Plano
      </button>

      {/* Lista de planos e módulos */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-4 mb-4">Planos Cadastrados</h2>
      <div className="space-y-6">
        {Object.entries(planos).map(([planId, plan]) => (
          <div key={planId} className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-700">{plan.name} - <span className="text-gray-500">Preço: {plan.price}</span></h3>
              <button onClick={() => handleEditPlan(planId)} className="text-blue-500 hover:underline">Editar Plano</button>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-700">Módulos:</h4>
              {plan.modules && Object.entries(plan.modules).map(([moduleName, module]) => (
                <div key={moduleName} className="flex justify-between items-center mt-2">
                  <p className="text-gray-600">{moduleName} - Limite: {module.limit}</p>
                  <button onClick={() => handleEditModulo(planId, moduleName)} className="text-green-500 hover:underline">Editar Módulo</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal para adicionar/editar plano */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-semibold mb-4">{editingPlan ? 'Editar Plano' : 'Adicionar Plano'}</h2>
            <form onSubmit={handleAddOrUpdatePlan}>
              <div className="mb-4">
                <label className="block text-gray-600 font-medium">Nome do Plano:</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="mt-1 border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Plano Básico"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-600 font-medium">Preço do Plano:</label>
                <input
                  type="text"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  className="mt-1 border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 50"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={closePlanModal} className="bg-gray-400 text-white px-4 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                  {editingPlan ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para adicionar/editar módulo */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-semibold mb-4">{editingModule ? 'Editar Módulo' : 'Adicionar Módulo'}</h2>
            <form onSubmit={handleAddOrUpdateModulo}>
              <div className="mb-4">
                <label className="block text-gray-600 font-medium">Nome do Módulo:</label>
                <input
                  type="text"
                  value={moduloName}
                  onChange={(e) => setModuloName(e.target.value)}
                  className="mt-1 border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Módulo de Vendas"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-600 font-medium">Limite do Módulo:</label>
                <input
                  type="text"
                  value={moduloLimit}
                  onChange={(e) => setModuloLimit(e.target.value)}
                  className="mt-1 border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 100"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={closeModuleModal} className="bg-gray-400 text-white px-4 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                  {editingModule ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modulos;
