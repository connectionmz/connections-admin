import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../fb';

const useEmpresasCount = () => {
  const [empresasCount, setEmpresasCount] = useState(0);

  useEffect(() => {
    const empresasRef = ref(db, 'company');
    const unsubscribe = onValue(empresasRef, (snapshot) => {
      const data = snapshot.val();
      setEmpresasCount(data ? Object.keys(data).length : 0);
    });

    return () => unsubscribe(); // Cleanup na desmontagem
  }, []);

  return empresasCount;
};

export default useEmpresasCount;
