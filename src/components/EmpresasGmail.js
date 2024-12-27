import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../fb';

const EmpresasGmail = () => {
  const [empresasGmail, setEmpresasGmail] = useState([]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const snapshot = await get(ref(db, 'company'));
        const data = snapshot.val();
        if (data) {
          const filteredEmpresas = Object.keys(data)
            .map((key) => ({
              id: key,
              ...data[key],
            }))
            .filter((empresa) => empresa.email && empresa.email.includes('@gmail.com'));
          setEmpresasGmail(filteredEmpresas);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas com email @gmail.com:', error);
      }
    };

    fetchEmpresas();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empresas com Email @gmail.com</h1>
      <ul>
        {empresasGmail.length > 0 ? (
          empresasGmail.map((empresa) => (
            <li key={empresa.id} className="mb-2 p-4 bg-gray-100 rounded-lg shadow hover:bg-gray-200">
              <p className="font-semibold">{empresa.nome || 'Nome não disponível'}</p>
              <p className="text-sm text-gray-500">Email: {empresa.email}</p>
              <p className="text-sm text-gray-500">Contacto: {empresa.contacto || 'Não disponível'}</p>
            </li>
          ))
        ) : (
          <p>Nenhuma empresa encontrada com email @gmail.com.</p>
        )}
      </ul>
    </div>
  );
};

export default EmpresasGmail;
