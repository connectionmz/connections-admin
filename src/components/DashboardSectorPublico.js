import React, { useState, useEffect } from 'react';
import { ref, push, get, set, remove } from 'firebase/database';
import { db, storage } from '../fb';
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage';

const DashboardSectorPublico = () => {
  const [activeTab, setActiveTab] = useState('publish');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [company, setCompany] = useState(''); // Novo estado para a empresa
  const [announcements, setAnnouncements] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showModal, setShowModal] = useState(false); 
  const [modalAction, setModalAction] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let fileUrl = '';
      if (file) {
        const storageReference = storageRef(storage, `announcements/${file.name}`);
        await uploadBytes(storageReference, file);
        fileUrl = await getDownloadURL(storageReference);
      }

      const newAnnouncement = {
        title,
        content,
        fileUrl,
        company, // Incluir a empresa nos dados do anúncio
        date: new Date().toISOString(),
      };

      await push(ref(db, 'publicAnnouncements'), newAnnouncement);
      setTitle('');
      setContent('');
      setCompany(''); // Limpar o campo de empresa após o envio
      setFile(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao publicar anúncio:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const snapshot = await get(ref(db, 'publicAnnouncements'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAnnouncements(
          Object.entries(data).map(([id, value]) => ({ id, ...value }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
    }
  };

  const confirmAction = (action, announcement) => {
    setModalAction(action);
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (selectedAnnouncement) {
      try {
        await remove(ref(db, `publicAnnouncements/${selectedAnnouncement.id}`));
        fetchAnnouncements();
        closeModal();
      } catch (error) {
        console.error('Erro ao deletar anúncio:', error);
      }
    }
  };

  const handleEdit = () => {
    if (selectedAnnouncement) {
      setEditingId(selectedAnnouncement.id);
      setEditingData({
        title: selectedAnnouncement.title,
        content: selectedAnnouncement.content,
        fileUrl: selectedAnnouncement.fileUrl,
        company: selectedAnnouncement.company, // Preencher com a empresa durante a edição
      });
      setActiveTab('edit');
      closeModal();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      let fileUrl = editingData.fileUrl;

      if (file) {
        const storageReference = storageRef(storage, `announcements/${file.name}`);
        await uploadBytes(storageReference, file);
        fileUrl = await getDownloadURL(storageReference);
      }

      const updatedAnnouncement = {
        ...editingData,
        fileUrl,
        date: new Date().toISOString(),
      };

      await set(ref(db, `publicAnnouncements/${editingId}`), updatedAnnouncement);
      setEditingId(null);
      setEditingData({});
      setFile(null);
      setActiveTab('view');
      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao atualizar anúncio:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
    setModalAction(null);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Setor Público - Anúncios</h1>
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 text-lg font-semibold ${activeTab === 'publish' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('publish')}
        >
          Publicar Anúncio
        </button>
        <button
          className={`px-4 py-2 text-lg font-semibold ${activeTab === 'view' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('view')}
        >
          Ver Anúncios
        </button>
      </div>
      {activeTab === 'publish' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título do Anúncio</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Título"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Conteúdo (Opcional)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              rows="4"
              placeholder="Descrição ou conteúdo do anúncio"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Carregar Arquivo (Opcional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500"
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Publicar Anúncio
          </button>
        </form>
      )}

      {activeTab === 'view' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Anúncios Publicados</h2>
          {announcements.length > 0 ? (
            <ul className="space-y-4">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="p-4 bg-gray-100 rounded-lg shadow-md">
                  <h3 className="font-medium text-lg">{announcement.title}</h3>
                  <p className="text-gray-700">{announcement.content}</p>
                  <p className="text-gray-700">Empresa: {announcement.company}</p> {/* Exibir o nome da empresa */}
                  {announcement.fileUrl && (
                    <a
                      href={announcement.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline mt-2 inline-block"
                    >
                      Ver Arquivo
                    </a>
                  )}
                  <p className="text-sm text-gray-500">Publicado em: {new Date(announcement.date).toLocaleDateString()}</p>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => confirmAction('edit', announcement)}
                      className="text-white bg-yellow-500 px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => confirmAction('delete', announcement)}
                      className="text-white bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhum anúncio publicado.</p>
          )}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-lg font-semibold mb-4">Confirmação</h2>
            <p className="text-gray-700 mb-4">
              Você tem certeza que deseja {modalAction === 'delete' ? 'excluir' : 'editar'} este anúncio?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={modalAction === 'delete' ? handleDelete : handleEdit}
                className={`px-4 py-2 rounded text-white ${
                  modalAction === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSectorPublico;
