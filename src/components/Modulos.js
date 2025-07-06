import { useState, useEffect } from 'react';
import { ref, onValue, set, push, get } from 'firebase/database';
import { db } from '../fb';

const Modulos = () => {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentModulo, setCurrentModulo] = useState(null);
  const [newModulo, setNewModulo] = useState({
    name: '',
    description: '',
    price: '',
    validade: '',
    benefits: [''],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const modulosRef = ref(db, 'modules/modulos');
    const unsubscribe = onValue(modulosRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data && Array.isArray(data)) {
        // Filter out null/undefined and sort by name
        const filteredModulos = data
          .filter(modulo => modulo !== null && modulo !== undefined)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setModulos(filteredModulos);
      } else {
        setModulos([]);
      }
      setLoading(false);
    }, (error) => {
      setError('Erro ao carregar módulos');
      console.error('Firebase error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewModulo(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleBenefitChange = (index, value) => {
    const updatedBenefits = [...newModulo.benefits];
    updatedBenefits[index] = value;
    setNewModulo(prev => ({ ...prev, benefits: updatedBenefits }));
  };

  const addBenefitField = () => {
    setNewModulo(prev => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const removeBenefitField = (index) => {
    if (newModulo.benefits.length <= 1) return;
    const updatedBenefits = newModulo.benefits.filter((_, i) => i !== index);
    setNewModulo(prev => ({ ...prev, benefits: updatedBenefits }));
  };

  const resetForm = () => {
    setNewModulo({
      name: '',
      description: '',
      price: '',
      validade: '',
      benefits: [''],
    });
    setCurrentModulo(null);
    setEditMode(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newModulo.name.trim() || !newModulo.description.trim()) {
      setError('Nome e descrição são obrigatórios');
      return;
    }

    const priceNumber = parseFloat(newModulo.price);
    if (isNaN(priceNumber)) {
      setError('Preço deve ser um número válido');
      return;
    }

    // Prepare module data
    const moduloData = {
      name: newModulo.name.trim(),
      description: newModulo.description.trim(),
      price: priceNumber.toString(),
      validade: newModulo.validade.trim(),
      benefits: newModulo.benefits.filter(b => b.trim() !== ''),
      key: currentModulo?.key || push(ref(db, 'modules/modulos')).key,
    };

    try {
      const modulosRef = ref(db, 'modules/modulos');
      const snapshot = await get(modulosRef);
      let currentModulos = snapshot.val() || [];
      
      // Ensure we're working with an array
      if (!Array.isArray(currentModulos)) {
        currentModulos = [];
      }

      if (editMode && currentModulo) {
        // Update existing module
        const index = currentModulos.findIndex(m => m?.key === currentModulo.key);
        if (index !== -1) {
          currentModulos[index] = moduloData;
        } else {
          currentModulos.push(moduloData);
        }
      } else {
        // Add new module
        currentModulos.push(moduloData);
      }

      // Clean the array before saving (replace undefined with null)
      const cleanModulos = currentModulos.map(modulo => modulo || null);
      
      await set(modulosRef, cleanModulos);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar módulo:', error);
      setError('Erro ao salvar módulo. Tente novamente.');
    }
  };

  const handleEdit = (modulo) => {
    setCurrentModulo(modulo);
    setNewModulo({
      name: modulo.name,
      description: modulo.description,
      price: modulo.price,
      validade: modulo.validade,
      benefits: modulo.benefits?.length > 0 ? [...modulo.benefits] : [''],
    });
    setEditMode(true);
    setError('');
  };

  const handleDelete = async (moduloKey) => {
    if (window.confirm('Tem certeza que deseja excluir este módulo?')) {
      try {
        const modulosRef = ref(db, 'modules/modulos');
        const snapshot = await get(modulosRef);
        let currentModulos = snapshot.val() || [];
        
        // Replace the module with null to preserve array structure
        const updatedModulos = currentModulos.map(modulo => 
          modulo?.key === moduloKey ? null : modulo
        );
        
        // Remove trailing nulls
        while (updatedModulos.length > 0 && updatedModulos[updatedModulos.length - 1] === null) {
          updatedModulos.pop();
        }
        
        await set(modulosRef, updatedModulos);
      } catch (error) {
        console.error('Erro ao excluir módulo:', error);
        setError('Erro ao excluir módulo');
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestão de Módulos</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            {editMode ? 'Editar Módulo' : 'Adicionar Novo Módulo'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="name">
                Nome do Módulo
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newModulo.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={newModulo.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="price">
                  Preço (MT)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={newModulo.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="validade">
                  Validade
                </label>
                <input
                  type="text"
                  id="validade"
                  name="validade"
                  value={newModulo.validade}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Mensal, Anual, Diária"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Benefícios
              </label>
              {newModulo.benefits.map((benefit, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {newModulo.benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBenefitField(index)}
                      className="ml-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addBenefitField}
                className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                + Adicionar Benefício
              </button>
            </div>
            
            <div className="flex justify-end space-x-3">
              {editMode && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editMode ? 'Atualizar Módulo' : 'Adicionar Módulo'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Modules List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Módulos Disponíveis</h2>
          
          {modulos.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
              Nenhum módulo cadastrado
            </div>
          ) : (
            <div className="space-y-4">
              {modulos.map((modulo) => (
                <div key={modulo.key} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{modulo.name}</h3>
                      <p className="text-gray-600 mb-2">{modulo.description}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-blue-600 font-medium">Preço: {modulo.price} MT</span>
                        <span className="text-green-600">Validade: {modulo.validade}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(modulo)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(modulo.key)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  
                  {modulo.benefits?.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Benefícios:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {modulo.benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modulos;