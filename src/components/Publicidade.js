import React, { useEffect, useState } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { db } from '../fb';
import UploadBanner from './UploadBanner';

const Publicidade = () => {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const snapshot = await get(ref(db, `banners`));
        const data = snapshot.val();
        if (data) {
          const bannersArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
          setBanners(bannersArray);
          console.log('Banners:', bannersArray);
        } else {
          console.log('Nenhum banner encontrado.');
          setError('Nenhum banner encontrado.');
        }
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
        setError('Erro ao buscar banners.');
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'eliminar') {
        await remove(ref(db, `banners/${id}`));
        setBanners((prev) => prev.filter((banner) => banner.id !== id));
        alert('Banner eliminado com sucesso.');
      } else if (action === 'desativar') {
        await update(ref(db, `banners/${id}`), { status: 'desativado' });
        setBanners((prev) =>
          prev.map((banner) =>
            banner.id === id ? { ...banner, status: 'desativado' } : banner
          )
        );
        alert('Banner desativado com sucesso.');
      } else if (action === 'reactivar') {
        await update(ref(db, `banners/${id}`), { status: 'ativo' });
        setBanners((prev) =>
          prev.map((banner) =>
            banner.id === id ? { ...banner, status: 'ativo' } : banner
          )
        );
        alert('Banner reativado com sucesso.');
      }
    } catch (error) {
      console.error('Erro ao realizar a ação:', error);
      alert('Erro ao realizar a ação.');
    } finally {
      setMenuOpen(null);
    }
  };

  const toggleMenu = (index) => {
    setMenuOpen((prev) => (prev === index ? null : index));
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Lista de Banners</h2>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded-md mb-4"
        onClick={() => setShowModal(true)}
      >
        Cadastrar Publicidade
      </button>
      {banners.length === 0 ? (
        <p className="text-gray-500">Nenhum banner disponível.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Imagem</th>
              <th className="py-2">Link</th>
              <th className="py-2">Tamanho do Ficheiro</th>
              <th className="py-2">Tipo de Ficheiro</th>
              <th className="py-2">Data de Upload</th>
              <th className="py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner, index) => (
              <tr key={index} className="border-t">
                <td className="py-2">
                  <a href={banner.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={banner.imageUrl}
                      alt="Banner"
                      className="h-16 w-16 object-cover"
                    />
                  </a>
                </td>
                <td className="py-2">
                  <a href={`https://${banner.link}`} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                    {banner.link}
                  </a>
                </td>
                <td className="py-2">{banner.fileSize} bytes</td>
                <td className="py-2">{banner.fileType}</td>
                <td className="py-2">{new Date(banner.uploadedAt).toLocaleDateString()}</td>
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
                        <button
                          onClick={() => handleAction(banner.id, 'eliminar')}
                          className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => handleAction(banner.id, 'desativar')}
                          className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                          disabled={banner.status === 'desativado'}
                        >
                          Desativar
                        </button>
                        <button
                          onClick={() => handleAction(banner.id, 'reactivar')}
                          className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                          disabled={banner.status === 'ativo'}
                        >
                          Reativar
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
            <UploadBanner />
            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md"
              onClick={() => setShowModal(false)} // Botão para fechar o modal
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publicidade;
