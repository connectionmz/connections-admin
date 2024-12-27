import React, { useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; 
import { db, storage } from '../fb'; 
import { set, push, ref as dbRef, onValue } from "firebase/database";

const UploadBanner = () => {
  const [image, setImage] = useState(null);
  const [link, setLink] = useState(''); // State for banner link
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [companies, setCompanies] = useState([]); // List of companies
  const [selectedCompany, setSelectedCompany] = useState(''); // Selected company ID

  // Fetch the list of companies from Firebase when the component loads
  useEffect(() => {
    const companiesRef = dbRef(db, 'company');
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const companyList = Object.entries(data).map(([id, company]) => ({
          id,
          ...company
        }));
        setCompanies(companyList);
      }
    });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Validate that the file is an image
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem.');
        return;
      }
      setImage(file);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      alert('Por favor, selecione uma imagem para carregar.');
      return;
    }
    if (!selectedCompany) {
      alert('Por favor, selecione uma empresa para associar o banner.');
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    const storageRef = ref(storage, `banners/${image.name}`);

    // Upload the image with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress); // Update progress
      },
      (error) => {
        console.error('Erro ao carregar o banner: ', error);
        setLoading(false);
      },
      async () => {
        // Get the download URL and metadata after upload
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          // Save the URL, additional data, and selected company to Firebase Realtime Database
          const bannerRef = dbRef(db, 'banners');
          const metadata = {
            imageUrl: url,
            link: link || null, // Optional link to the banner
            fileSize: image.size,
            fileType: image.type,
            uploadedAt: new Date().toISOString(),
            companyId: selectedCompany // Associate banner with selected company
          };
          await push(bannerRef, metadata);

          setSuccessMessage('Banner carregado com sucesso!');
        } catch (error) {
          console.error('Erro ao obter a URL do banner: ', error);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Anunciar Serviço</h2>
      
      <input
        type="file"
        accept="image/*" // Accept only image files
        onChange={handleImageChange}
        className="mb-4"
      />

      {/* Dropdown to select a company */}
      <select
        value={selectedCompany}
        onChange={(e) => setSelectedCompany(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      >
        <option value="">Selecione uma empresa</option>
        {companies.map(company => (
          <option key={company.id} value={company.id}>
            {company.nome} {/* Assuming "nome" is the company name */}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Opcional: Adicione um link para o banner"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      />

      <button
        onClick={handleUpload}
        className={`mt-2 bg-blue-600 text-white py-2 px-4 rounded ${loading ? 'opacity-50' : ''}`}
        disabled={loading}
      >
        {loading ? 'Carregando...' : 'Carregar Banner'}
      </button>

      {progress > 0 && (
        <div className="mt-4">
          <p className="text-gray-700">Progresso do upload: {Math.round(progress)}%</p>
          <progress value={progress} max="100" className="w-full"></progress>
        </div>
      )}

      {successMessage && (
        <p className="text-green-500 mt-4">{successMessage}</p>
      )}
    </div>
  );
};

export default UploadBanner;
