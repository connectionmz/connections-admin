import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../fb';

const useEmpresas = (id = null) => {
  const [empresas, setEmpresas] = useState(null);

  useEffect(() => {
    const empresasRef = ref(db, 'company');
    const unsubscribe = onValue(empresasRef, (snapshot) => {
      const data = snapshot.val();

      if (id) {
        // Retorna só os dados da empresa com o ID fornecido
        setEmpresas(data?.[id] || null);
      } else {
        // Retorna todas as empresas como objeto ou array
        setEmpresas(data || {});
      }
    });

    return () => unsubscribe();
  }, [id]);

  return empresas;
};

export default useEmpresas;
