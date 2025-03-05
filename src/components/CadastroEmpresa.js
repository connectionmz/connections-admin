import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, onValue, ref, set } from 'firebase/database';
import { auth, db } from '../fb';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getUserData } from './utils/utils';

const steps = ['Informações Básicas', 'Endereço & Contacto', 'Setor & Capacidade', 'Email & Senha'];

const CadastroEmpresa = () => {
  const userData = getUserData();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [subsectores, setSubsectores] = useState([]);
  const [tiposEntidades, setTiposEntidades] = useState([]);
  const [subtiposEntidade, setSubtiposEntidade] = useState([]);

  const generatePassword = () => {
    return Math.random().toString(36).slice(-6);
  };

  const [companyData, setCompanyData] = useState({
    nome: '',
    sigla: '',
    nuit: '',
    nuel: '',
    nrContriuinte: '',
    contacto: '',
    endereco: '',
    provincia: '',
    distrito: '',
    logo: null,
    sector: '',
    customSector: '',
    subsectores: [],
    tipoEntidade: '',
    subtipoEntidade: '',
    capacidadeProducao: '',
    email: '',
    password: generatePassword(),
    referer: {
      id: userData?.uid,
      email: userData?.email
    }
  });

  const sectoresComCapacidade = [
    'Recursos Naturais',
    'Indústria e Comércio',
    'Agronegócio',
    'Energia',
    'Água e Saneamento',
  ];

  useEffect(() => {
    const provinciasRef = ref(db, 'provincias');
    const sectoresRef = ref(db, 'sectores_de_atividade');
    const tipoEntidadeRef = ref(db, 'tipos_entidades');

    onValue(provinciasRef, (snapshot) => setProvincias(snapshot.val() || []));
    onValue(sectoresRef, (snapshot) => setSectores(snapshot.val() || []));
    onValue(tipoEntidadeRef, (snapshot) => setTiposEntidades(snapshot.val() || []));
  }, []);


  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'O email já está em uso.';
      case 'auth/invalid-email':
        return 'O email fornecido é inválido.';
      case 'auth/weak-password':
        return 'A senha é muito fraca.';
      default:
        return 'Ocorreu um erro ao cadastrar. Tente novamente.';
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Verifica se o email já está em uso no Firebase Authentication
      const methods = await fetchSignInMethodsForEmail(auth, companyData.email);
      let userId = null;
      if (methods.length > 0) {
        // Verifica se o email já está cadastrado na coleção "company"
        const companySnapshot = await get(ref(db, 'company'));
        let empresaExistente = false;
  
        companySnapshot.forEach((child) => {
          const data = child.val();
          if (data.email === companyData.email) {
            empresaExistente = true;
            userId = child.key; // Obtém o ID do usuário existente
          }
        });
  
        if (empresaExistente) {
          // Se a empresa já está registrada, bloqueia o cadastro
          setErrorMessage("Esta empresa já está registrada.");
          setIsLoading(false);
          return;
        } else {
          // Se o email está em uso no Firebase Authentication, mas não na coleção "company",
          // permite que o cadastro continue usando o usuário existente.
          const user = auth.currentUser; // Obtém o usuário atual (se já estiver logado)
          if (user && user.email === companyData.email) {
            userId = user.uid; // Usa o UID do usuário logado
          } else {
            // Se não estiver logado, busca o UID do usuário pelo email
            const userRecord = await auth.getUserByEmail(companyData.email);
            userId = userRecord.uid;
          }
        }
      }
  
      // Se o email não está em uso no Firebase Authentication, cria um novo usuário
      const userCredential =
        methods.length === 0
          ? await createUserWithEmailAndPassword(auth, companyData.email, companyData.password)
          : { user: { uid: userId } };
  
      // Salva os dados da empresa no Realtime Database
      await handleSubmit(userCredential.user);
    } catch (error) {
      const userFriendlyMessage = getFirebaseErrorMessage(error.code);
      setErrorMessage(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (user) => {
    setIsLoading(true);
    setErrorMessage('');
  
    try {
      if (!user || !user.uid) {
        throw new Error("ID do usuário inválido.");
      }
  
      // Verifica se já existe uma empresa com o mesmo nome ou contacto
      const companySnapshot = await get(ref(db, 'company'));
      let camposDuplicados = [];
  
      companySnapshot.forEach((child) => {
        const data = child.val();
        if (data.nome === companyData.nome) camposDuplicados.push("Nome da Empresa");
       
      });
  
      if (camposDuplicados.length > 0) {
        setErrorMessage(
          `Os seguintes dados já estão cadastrados: ${camposDuplicados.join(", ")}. ` +
          `Se você é o proprietário, contacte suporte@connectionmozambique.com.`
        );
        setIsLoading(false);
        return;
      }
  
      const dataToSave = {
        ...companyData,
        id: user.uid,
        email: user.email,
        logoUrl: null,
        subscriptions: {
          status: "active",
          isverify: false, // Corrigido para booleano
        },
        createdAt: new Date().toISOString(),
      };
  
      await set(ref(db, `company/${user.uid}`), dataToSave);
  
      alert("Empresa cadastrada com sucesso!");
      window.location.reload();
        } catch (error) {
      setErrorMessage("Ocorreu um erro ao salvar os dados. Tente novamente.");
      console.error("Erro no handleSubmit:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleProvinceChange = (e) => {
    const selectedProvince = e.target.value;
    setCompanyData((prevData) => ({
      ...prevData,
      provincia: selectedProvince,
      distrito: '',
    }));
    const foundProvince = provincias.find((prov) => prov.provincia === selectedProvince);
    setDistritos(foundProvince ? foundProvince.distritos : []);
  };

  const handleEntidadeChange = (e) => {
    const selectedTipoEntidade = e.target.value;
    setCompanyData((prevData) => ({
      ...prevData,
      tipoEntidade: selectedTipoEntidade,
      subtipoEntidade: '',
    }));
    const foundEntidade = tiposEntidades.find((ent) => ent.tipo === selectedTipoEntidade);
    setSubtiposEntidade(foundEntidade ? foundEntidade.subtipos : []);
  };

  const handleSectorChange = (e) => {
    const selectedSector = e.target.value;
    setCompanyData((prevData) => ({
      ...prevData,
      sector: selectedSector,
      subsectores: [],
      capacidadeProducao: '',
    }));

    if (selectedSector === "Outro") {
      setCompanyData((prev) => ({ ...prev, customSector: "" }));
    }

    const foundSector = sectores.find((s) => s.setor === selectedSector);
    setSubsectores(foundSector ? foundSector.subsectores : []);
  };

  const handleCustomSectorChange = (event) => {
    setCompanyData({ ...companyData, customSector: event.target.value });
  };

  const handleAddSector = () => {
    if (companyData.customSector.trim() && !sectores.includes(companyData.customSector)) {
      setSectores([...sectores, companyData.customSector]);
      setCompanyData({ ...companyData, customSector: companyData.customSector });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files, multiple, options } = e.target;

    let newValue = value;

    if (type === "file") {
      newValue = multiple ? Array.from(files) : files[0];
    } else if (multiple && options) {
      newValue = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);
    } else if (typeof value === "string" && (name === "nuit" || name === "nuel" || name === "nrContriuinte")) {
      newValue = value.replace(/\D/g, '');
    }

    setCompanyData((prevData) => ({
      ...prevData,
      [name]: newValue,
    }));
  };

  const handleNext = () => {
    setErrorMessage("");
    if (activeStep === 0 && (!companyData.nome)) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (activeStep === 1 && (!companyData.contacto || !companyData.provincia || !companyData.distrito)) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (activeStep === 2 && (!companyData.sector || !companyData.tipoEntidade)) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep - 1);



  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome da Empresa"
              name="nome"
              value={companyData.nome}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Sigla"
              name="sigla"
              value={companyData.sigla}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="NUIT"
              name="nuit"
              value={companyData.nuit}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="NUEL"
              name="nuel"
              value={companyData.nuel}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Número de Contribuinte"
              name="nrContriuinte"
              value={companyData.nrContriuinte}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Endereço"
              name="endereco"
              value={companyData.endereco}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Contacto"
              name="contacto"
              value={companyData.contacto || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <select
              name="provincia"
              value={companyData.provincia}
              onChange={handleProvinceChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecione a Província</option>
              {provincias.map((prov) => (
                <option key={prov.provincia} value={prov.provincia}>
                  {prov.provincia}
                </option>
              ))}
            </select>
            <select
              name="distrito"
              value={companyData.distrito}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecione o Distrito</option>
              {distritos.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <select
              name="sector"
              value={companyData.sector}
              onChange={handleSectorChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecione o Setor</option>
              {sectores.map((s) => (
                <option key={s.setor} value={s.setor}>
                  {s.setor}
                </option>
              ))}
              <option value="outro">Outro</option>
            </select>

            {companyData.sector === "outro" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo Setor"
                  value={companyData.customSector}
                  onChange={handleCustomSectorChange}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={handleAddSector}
                  className="p-2 bg-blue-500 text-white rounded"
                >
                  Adicionar
                </button>
              </div>
            )}

            {subsectores.length > 0 && (
              <select
                name="subsectores"
                value={companyData.subsectores}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                multiple
              >
                {subsectores.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            <select
              name="tipoEntidade"
              value={companyData.tipoEntidade}
              onChange={handleEntidadeChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecione o Tipo de Entidade</option>
              {tiposEntidades.map((ent) => (
                <option key={ent.tipo} value={ent.tipo}>
                  {ent.tipo}
                </option>
              ))}
            </select>

            {subtiposEntidade.length > 0 && (
              <select
                name="subtipoEntidade"
                value={companyData.subtipoEntidade || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione o Subtipo</option>
                {subtiposEntidade.map((sub, index) => (
                  <option key={index} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              name="email"
              value={companyData.email || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4">
      <div className="flex justify-between items-center mt-4">
        {steps.map((label, index) => (
          <div key={index} className={`flex-1 text-center ${index <= activeStep ? 'text-blue-500' : 'text-gray-500'}`}>
            {label}
          </div>
        ))}
      </div>
      <div className="mt-4">
        {renderStepContent(activeStep)}
        <div className="flex justify-between mt-4">
          <button
            onClick={handleBack}
            disabled={activeStep === 0}
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-300"
          >
            Voltar
          </button>
          {activeStep === steps.length - 1 ? (
            <button
              onClick={handleEmailSignIn}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
            >
              {isLoading ? 'Carregando...' : 'Finalizar'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
      {errorMessage && (
        <p className="mt-2 text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default CadastroEmpresa;