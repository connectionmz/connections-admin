import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, get, remove, onValue } from 'firebase/database';
import { db } from '../fb';
import jsPDF from 'jspdf';

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

  const fetchEmpresasComCustomSector = async () => {
    try {
      const snapshot = await get(ref(db, "company"));
      const data = snapshot.val();
  
      if (data) {
        // Filtrar empresas cujo sector é "outro"
        const empresasFiltradas = Object.values(data).filter(
          (empresa) => empresa.sector?.toLowerCase() === "outro"
        );
  
        // Remover empresas com customSector duplicado
        const empresasUnicas = [];
        const customSectorsVistos = new Set();
  
        empresasFiltradas.forEach((empresa) => {
          if (!customSectorsVistos.has(empresa.customSector)) {
            customSectorsVistos.add(empresa.customSector);
            empresasUnicas.push(empresa);
          }
        });
  
        console.log("Empresas únicas com setor 'outro':", empresasUnicas);
  
        // Gerar PDF com a lista de empresas
        const doc = new jsPDF();
  
        // Configurações do PDF
        const pageHeight = doc.internal.pageSize.getHeight(); // Altura da página
        const margin = 10; // Margem superior e lateral
        let y = margin; // Posição inicial no eixo Y
  
        // Adicionar título ao PDF
        doc.setFontSize(18);
        doc.text("Lista de Empresas com Setor 'Outro'", margin, y);
        y += 10; // Aumentar a posição Y após o título
  
        // Adicionar lista de empresas ao PDF
        empresasUnicas.forEach((empresa, index) => {
          // Verificar se o conteúdo excede a altura da página
          if (y > pageHeight - margin) {
            doc.addPage(); // Adicionar uma nova página
            y = margin; // Reiniciar a posição Y para o topo da nova página
          }
  
          doc.setFontSize(12);
          doc.text(
            `${index + 1} - ${empresa.customSector || "N/A"}`,
            margin,
            y
          );
          y += 10; // Aumentar a posição Y para a próxima linha
        });
  
        // Salvar o PDF
        doc.save("lista_empresas_outro.pdf");
      } else {
        console.log("Nenhuma empresa encontrada.");
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes das empresas:", error);
    }
  };

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

    onValue(provinciasRef, (snapshot) => {
      const data = snapshot.val();
      setProvincias(data ? Object.values(data) : []);
    });

    onValue(sectoresRef, (snapshot) => {
      const data = snapshot.val();
      setSectores(data ? Object.values(data) : []);
    });

    onValue(tipoEntidadeRef, (snapshot) => {
      const data = snapshot.val();
      setTiposEntidades(data ? Object.values(data) : []);
    });

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

        <button
          onClick={fetchEmpresasComCustomSector}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Gerar PDF de Empresas com Setor "Outro"
        </button>
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