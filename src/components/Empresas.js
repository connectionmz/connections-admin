import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, get, remove, onValue } from 'firebase/database';
import { db } from '../fb';

const Empresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [tiposEntidades, setTiposEntidades] = useState([]);
  const [sectorFilter, setSectorFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [tipoEntidadeFilter, setTipoEntidadeFilter] = useState('');

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const snapshot = await get(ref(db, 'company'));
        const data = snapshot.val();
        if (data) {
          const empresasList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setEmpresas(empresasList);
          setFilteredEmpresas(empresasList);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };

    const provinciasRef = ref(db, 'provincias');
    const sectoresRef = ref(db, 'sectores_de_atividade');
    const tipoEntidadeRef = ref(db, 'tipos_entidades');

    onValue(provinciasRef, (snapshot) => setProvincias(snapshot.val() || []));
    onValue(sectoresRef, (snapshot) => setSectores(snapshot.val() || []));
    onValue(tipoEntidadeRef, (snapshot) => setTiposEntidades(snapshot.val() || []));

    fetchEmpresas();
  }, []);

  useEffect(() => {
    const filtered = empresas.filter((empresa) => {
      const nome = empresa.nome || '';
      const nuit = empresa.nuit || '';
      const matchesSearch =
        nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nuit.includes(searchTerm);

      const matchesSector = sectorFilter === '' || empresa.sector === sectorFilter;
      const matchesProvince = provinceFilter === '' || empresa.provincia === provinceFilter;
      const matchesEntidade = tipoEntidadeFilter === '' || empresa.tipoEntidade === tipoEntidadeFilter;

      return matchesSearch && matchesSector && matchesProvince && matchesEntidade;
    });

    setFilteredEmpresas(filtered);
  }, [searchTerm, sectorFilter, provinceFilter, tipoEntidadeFilter, empresas]);

  const handleDelete = async (id) => {
    try {
      await remove(ref(db, `company/${id}`));
      setEmpresas((prev) => prev.filter((empresa) => empresa.id !== id));
      setFilteredEmpresas((prev) => prev.filter((empresa) => empresa.id !== id));
    } catch (error) {
      console.error('Erro ao eliminar empresa:', error);
    }
  };

  const handleSectorChange = (e) => setSectorFilter(e.target.value);
const handleProvinceChange = (e) => setProvinceFilter(e.target.value);
const handleEntidadeChange = (e) => setTipoEntidadeFilter(e.target.value);


  const inputStyles = "border border-gray-300 p-2 rounded-lg";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empresas</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Pesquisar por nome ou NUIT"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputStyles}
        />

        <select value={sectorFilter} onChange={handleSectorChange} className={inputStyles}>
          <option value="">Todos os setores</option>
          {sectores.map((s, index) => (
            <option key={index} value={s.setor}>
              {s.setor}
            </option>
          ))}
        </select>

        <select value={provinceFilter} onChange={handleProvinceChange} className={inputStyles}>
          <option value="">Todas as províncias</option>
          {provincias.map((prov, index) => (
            <option key={index} value={prov.provincia}>
              {prov.provincia}
            </option>
          ))}
        </select>

        <select value={tipoEntidadeFilter} onChange={handleEntidadeChange} className={inputStyles}>
          <option value="">Todos os tipos de entidade</option>
          {tiposEntidades.map((ent, index) => (
            <option key={index} value={ent.tipo}>
              {ent.tipo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Resultados da Pesquisa</h2>
        <ul>
          {filteredEmpresas.length > 0 ? (
            filteredEmpresas.map((empresa) => (
              <li key={empresa.id} className="mb-2 p-4 bg-gray-100 rounded-lg shadow hover:bg-gray-200">
                <div className="flex justify-between items-center">
                  <Link to={`/empresas/${empresa.id}`} className="block">
                    <p className="font-semibold">{empresa.nome || 'Nome não disponível'}</p>
                    <p className="text-sm text-gray-500">NUIT: {empresa.nuit || 'Não disponível'}</p>
                  </Link>
                  <button
                    onClick={() => handleDelete(empresa.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p>Nenhuma empresa encontrada.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Empresas;
