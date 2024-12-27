import React, { useState, useEffect } from 'react';
import { db } from '../fb'; 
import { ref, push, get } from 'firebase/database';

const AddExternalServices = () => {
  const [serviceName, setServiceName] = useState('');
  const [sigla, setSigla] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [newCategory, setNewCategory] = useState(''); 
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesRef = ref(db, 'categoriasExternas');
      const categorySnapshot = await get(categoriesRef);
      const categoryList = categorySnapshot.val() ? Object.values(categorySnapshot.val()) : [];
      setCategories(categoryList);
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!serviceName || !sigla || !description || !url || !category) {
      setErrorMessage('Todos os campos são obrigatórios.');
      return;
    }

    try {
      const servicesRef = ref(db, 'servicosExternos');

      const newService = {
        serviceName,
        sigla,
        description,
        url,
        category,
      };

      await push(servicesRef, newService);
      setSuccessMessage('Serviço cadastrado com sucesso!');
      setServiceName('');
      setSigla('');
      setDescription('');
      setUrl('');
      setCategory('');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Erro ao cadastrar o serviço. Tente novamente.');
      console.error('Error adding service:', error);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();

    if (!newCategory) {
      setErrorMessage('O nome da categoria é obrigatório.');
      return;
    }

    try {
      const categoriesRef = ref(db, 'categoriasExternas');

      await push(categoriesRef, { name: newCategory });

      setCategories((prevCategories) => [...prevCategories, { name: newCategory }]);

      setIsModalOpen(false);
      setNewCategory('');
    } catch (error) {
      setErrorMessage('Erro ao cadastrar a categoria. Tente novamente.');
      console.error('Error adding category:', error);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cadastro de Serviços Externos</h2>

      {successMessage && <p className="text-green-500">{successMessage}</p>}
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="serviceName" className="block text-gray-700">Nome do Serviço/Instituição</label>
          <input
            type="text"
            id="serviceName"
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Ex: Instituto de Promoção de Exportações"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="sigla" className="block text-gray-700">Sigla</label>
          <input
            type="text"
            id="sigla"
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={sigla}
            onChange={(e) => setSigla(e.target.value)}
            placeholder="Ex: IPEX"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700">Descrição</label>
          <textarea
            id="description"
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva brevemente os serviços oferecidos"
          ></textarea>
        </div>

        <div className="mb-4">
          <label htmlFor="url" className="block text-gray-700">URL do Serviço</label>
          <input
            type="text"
            id="url"
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.exemplo.com"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="category" className="block text-gray-700">Categoria</label>
          <div className="flex items-center">
            <select
              id="category"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ml-4 bg-blue-600 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition"
              onClick={() => setIsModalOpen(true)}
            >
              Categoria
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Cadastrar Serviço
        </button>
      </form>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Cadastrar Nova Categoria</h3>

            <form onSubmit={handleCategorySubmit}>
              <div className="mb-4">
                <label htmlFor="newCategory" className="block text-gray-700">Nome da Categoria</label>
                <input
                  type="text"
                  id="newCategory"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Saúde, Educação, Tecnologia..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="submit"
                  className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-700 transition"
                >
                  Cadastrar
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white py-2 px-4 rounded-lg shadow hover:bg-red-700 transition"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddExternalServices;
