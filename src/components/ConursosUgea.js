// components/ConcursosUgea.js
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update, query, orderByChild } from 'firebase/database';
import { db } from '../fb';

const ConcursosUgea = ({ onPreencherFormulario }) => {
  const [concursos, setConcursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [selectedConcurso, setSelectedConcurso] = useState(null);
  const [concursosPublicados, setConcursosPublicados] = useState({});

  useEffect(() => {
    carregarConcursos();
    carregarConcursosPublicados();
  }, []);

  const carregarConcursos = async () => {
    try {
      const concursosRef = ref(db, 'concursos-ugea');
      const snapshot = await get(concursosRef);
      
      if (snapshot.exists()) {
        const dados = snapshot.val();
        const concursosArray = Object.entries(dados).map(([id, concurso]) => ({
          id,
          ...concurso
        }));
        
        // Ordenar por data de atualização (mais recentes primeiro)
        concursosArray.sort((a, b) => 
          new Date(b.timestamp_atualizacao) - new Date(a.timestamp_atualizacao)
        );
        
        setConcursos(concursosArray);
      } else {
        setConcursos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar concursos:', err);
      setError('Erro ao carregar concursos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const carregarConcursosPublicados = async () => {
    try {
      // Usar localStorage como fallback, ou criar uma tabela geral no Firebase
      const publicadosLocal = localStorage.getItem('concursosPublicados');
      if (publicadosLocal) {
        setConcursosPublicados(JSON.parse(publicadosLocal));
      }
    } catch (err) {
      console.error('Erro ao carregar concursos publicados:', err);
    }
  };

  const marcarComoPublicado = async (concursoId) => {
    try {
      const concurso = concursos.find(c => c.id === concursoId);
      const dadosPublicado = {
        publicado: true,
        dataPublicacao: new Date().toISOString(),
        referencia: concurso?.referencia || '',
        ugea: concurso?.ugea_detalhada || concurso?.ugea || ''
      };

      // Atualizar localStorage
      const novosPublicados = {
        ...concursosPublicados,
        [concursoId]: dadosPublicado
      };
      
      localStorage.setItem('concursosPublicados', JSON.stringify(novosPublicados));
      setConcursosPublicados(novosPublicados);

      showSnackbar('Concurso marcado como publicado!', 'success');
    } catch (err) {
      console.error('Erro ao marcar como publicado:', err);
      showSnackbar('Erro ao marcar como publicado', 'error');
    }
  };

  const desmarcarComoPublicado = async (concursoId) => {
    try {
      // Atualizar localStorage
      const novosPublicados = { ...concursosPublicados };
      delete novosPublicados[concursoId];
      
      localStorage.setItem('concursosPublicados', JSON.stringify(novosPublicados));
      setConcursosPublicados(novosPublicados);

      showSnackbar('Concurso desmarcado como publicado!', 'success');
    } catch (err) {
      console.error('Erro ao desmarcar como publicado:', err);
      showSnackbar('Erro ao desmarcar como publicado', 'error');
    }
  };

  const limparTodosPublicados = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os concursos marcados como publicados?')) {
      localStorage.removeItem('concursosPublicados');
      setConcursosPublicados({});
      showSnackbar('Todos os concursos foram desmarcados!', 'success');
    }
  };

  const concursoNaoExpirado = (concurso) => {
    if (!concurso.data_abertura) return false;
    
    try {
      const dataAbertura = new Date(concurso.data_abertura);
      
      // Adiciona hora se disponível
      if (concurso.hora_abertura) {
        const [horas, minutos] = concurso.hora_abertura.replace('H', ':').split(':');
        dataAbertura.setHours(parseInt(horas), parseInt(minutos || 0));
      }
      
      return dataAbertura > new Date();
    } catch (error) {
      return false;
    }
  };

  const formatarData = (dataString) => {
    try {
      return new Date(dataString).toLocaleDateString('pt-MZ');
    } catch {
      return dataString;
    }
  };

  const formatarDataHora = (dataString) => {
    try {
      return new Date(dataString).toLocaleString('pt-MZ');
    } catch {
      return dataString;
    }
  };

  const prepararDadosParaFormulario = (concurso) => {
    // Mapear classe para setor de atividade
    const mapearClasseParaSetor = (classe) => {
      const mapeamento = {
        'BENS': 'Fornecimento de Bens',
        'SERVICO': 'Prestação de Serviços',
        'EMPREITADAS': 'Empreitadas de Obras',
        'BENS E SERVICOS': 'Bens e Serviços',
        'SERVICOS DE CONSULTORIA': 'Consultoria',
        'CONSULTORIAS': 'Consultoria'
      };
      return mapeamento[classe] || 'Outros';
    };

    // Mapear tipo para modalidade
    const mapearTipoParaModalidade = (tipo) => {
      const mapeamento = {
        'CONCURSO PUBLICO': 'Concurso Público',
        'CONCURSO LIMITADO': 'Concurso Limitado',
        'CONCURSO POR COTACOES': 'Concurso por Cotações',
        'CONCURSO DE PEQUENA DIMENSAO': 'Concurso de Pequena Dimensão',
        'SELECCAO BASEADA NA QUALIDADE E NO PRECO': 'Seleção Baseada na Qualidade e Preço',
        'SELECCAO BASEADA NAS QUALIFICACOES DO CONSULTOR': 'Seleção Baseada nas Qualificações',
        'REGIME ESPECIAL': 'Regime Especial'
      };
      return mapeamento[tipo] || 'Concurso Público';
    };

    // Formatar valor estimado
    const formatarValorEstimado = (valor, moeda) => {
      if (!valor || valor === '0.00') return 'Não especificado';
      
      const valorNumerico = parseFloat(valor);
      if (isNaN(valorNumerico)) return 'Não especificado';
      
      // Formatar para melhor legibilidade
      if (valorNumerico >= 1000000) {
        return `${(valorNumerico / 1000000).toFixed(2)} milhões ${moeda || 'MZN'}`;
      } else if (valorNumerico >= 1000) {
        return `${(valorNumerico / 1000).toFixed(2)} mil ${moeda || 'MZN'}`;
      } else {
        return `${valorNumerico.toLocaleString('pt-MZ')} ${moeda || 'MZN'}`;
      }
    };

    // Preparar descrição detalhada do objeto
    const prepararObjetoDetalhado = (concurso) => {
      let objeto = concurso.objeto_geral || concurso.objeto || '';
      
      // Adicionar informações adicionais se disponíveis
      const partes = [];
      
      if (objeto) partes.push(objeto);
      if (concurso.numero_lotes && concurso.numero_lotes !== 'LOTE UNICO') {
        partes.push(`Número de lotes: ${concurso.numero_lotes}`);
      }
      if (concurso.observacoes && concurso.observacoes !== 'NENHUMA OBSERVACAO' && 
          concurso.observacoes !== 'NADA A ACRESCENTAR' && concurso.observacoes !== 'OK') {
        partes.push(`Observações: ${concurso.observacoes}`);
      }

      return partes.join('\n\n');
    };

    // Preparar condições de participação baseadas nos dados disponíveis
    const prepararCondicoes = (concurso) => {
      const condicoes = [];
      
      // Condições básicas
      condicoes.push('Condições gerais de participação definidas no documento do concurso.');
      
      // Adicionar condições específicas se disponíveis
      if (concurso.observacoes && concurso.observacoes.includes('SITUAçãO CONTRIBUITIVA')) {
        condicoes.push('É obrigatória a regularidade da situação contributiva perante a Segurança Social.');
      }
      
      if (concurso.observacoes && concurso.observacoes.includes('VISITA AO LOCAL')) {
        condicoes.push('A visita ao local é de carácter obrigatório e constitui elemento de classificação.');
      }
      
      if (concurso.garantia_provisoria && concurso.garantia_provisoria !== '0.00') {
        condicoes.push(`Garantia provisória: ${concurso.garantia_provisoria} ${concurso.moeda || 'MZN'}`);
      }

      return condicoes.join('\n\n');
    };

    // Preparar documentação necessária
    const prepararDocumentacao = (concurso) => {
      const documentacao = [
        'Documentação geral exigida por lei:',
        '- Certidão de registo comercial',
        '- Certidão fiscal atualizada',
        '- Certidão da Segurança Social',
        '- Balanços e demonstrações financeiras dos últimos 2-3 anos',
        '- Curriculum vitae da empresa',
        '- Declaração de inexistência de impedimentos'
      ];

      // Adicionar documentação específica baseada no tipo de concurso
      if (concurso.classe === 'EMPREITADAS') {
        documentacao.push('- Certificado de registo como construtor civil');
        documentacao.push('- Comprovação de experiência em obras similares');
      }

      if (concurso.classe === 'SERVICOS DE CONSULTORIA' || concurso.tipo.includes('CONSULTOR')) {
        documentacao.push('- Curriculum vitae detalhado da equipa técnica');
        documentacao.push('- Comprovação de experiência em consultorias similares');
        documentacao.push('- Metodologia proposta');
      }

      return documentacao.join('\n');
    };

    // Preparar critérios de avaliação
    const prepararCriterios = (concurso) => {
      const criterios = [];
      
      // Critério principal baseado no campo criterio_adjudicacao
      if (concurso.criterio_adjudicacao === 'MENOR PRECO AVALIADO') {
        criterios.push('Critério principal: Menor preço avaliado');
        criterios.push('A avaliação considerará a relação preço-qualidade das propostas.');
      } else if (concurso.criterio_adjudicacao === 'CONJUGADO') {
        criterios.push('Critério principal: Conjugado (técnico e preço)');
        criterios.push('Avaliação baseada na combinação de aspectos técnicos e proposta financeira.');
      } else if (concurso.criterio_adjudicacao === 'SELECCAO BASEADA NA QUALIDADE E NO PRECO') {
        criterios.push('Critério principal: Seleção baseada na qualidade e preço');
        criterios.push('Ênfase na qualidade técnica da proposta em conjugação com o preço.');
      }

      // Critérios adicionais baseados no tipo de concurso
      if (concurso.classe === 'SERVICOS DE CONSULTORIA') {
        criterios.push('Experiência da equipa técnica: 40%');
        criterios.push('Metodologia proposta: 30%');
        criterios.push('Proposta financeira: 30%');
      } else if (concurso.classe === 'EMPREITADAS') {
        criterios.push('Proposta técnica: 60%');
        criterios.push('Proposta financeira: 40%');
      } else {
        criterios.push('Preço: 70%');
        criterios.push('Aspectos técnicos: 30%');
      }

      return criterios.join('\n');
    };

    // Preparar requisitos técnicos
    const prepararRequisitosTecnicos = (concurso) => {
      const requisitos = [];
      
      if (concurso.objeto_geral || concurso.objeto) {
        requisitos.push(`Especificações técnicas detalhadas no documento do concurso.`);
      }
      
      if (concurso.classe === 'BENS') {
        requisitos.push('Especificações técnicas dos bens a fornecer conforme descrito no caderno de encargos.');
      } else if (concurso.classe === 'SERVICO') {
        requisitos.push('Qualificações técnicas e experiência comprovada na prestação de serviços similares.');
      } else if (concurso.classe === 'EMPREITADAS') {
        requisitos.push('Capacidade técnica e experiência em obras de construção civil.');
        requisitos.push('Equipamento adequado para a execução da empreitada.');
      }

      return requisitos.join('\n\n');
    };

    return {
      // Informações básicas
      titulo: `${concurso.referencia} - ${concurso.ugea_detalhada || concurso.ugea || 'UGEA'}`,
      entidade: concurso.ugea_detalhada || concurso.ugea || 'Unidade de Gestão de Empreendimentos e Aquisições',
      objeto: prepararObjetoDetalhado(concurso),
      
      // Condições e documentação
      condicoes: prepararCondicoes(concurso),
      documentacao: prepararDocumentacao(concurso),
      criterios: prepararCriterios(concurso),
      
      // Prazos e local
      prazo: concurso.data_abertura || '',
      localEntrega: concurso.local_entrega || concurso.ugea_detalhada || concurso.ugea || 'Local a definir',
      dataAbertura: concurso.data_abertura || '',
      
      // Valores e condições
      valorEstimado: formatarValorEstimado(concurso.valor_estimado, concurso.moeda),
      condicoesPagamento: 'Condições de pagamento definidas no documento do concurso e de acordo com a legislação em vigor.',
      
      // Observações
      observacoes: `Concurso ${concurso.tipo || 'Público'} - ${concurso.provincia || 'Província não especificada'}
${concurso.observacoes && concurso.observacoes !== 'NENHUMA OBSERVACAO' && concurso.observacoes !== 'NADA A ACRESCENTAR' && concurso.observacoes !== 'OK' ? `\nObservações: ${concurso.observacoes}` : ''}`,
      
      // Classificação
      provincia: [concurso.provincia] || [],
      setor: mapearClasseParaSetor(concurso.classe),
      linkDeSubmissao: concurso.links_download?.download_anuncio || concurso.link || '',
      tipoEntidade: ['Empresas Nacionais', 'Empresas Internacionais'],
      modalidade: mapearTipoParaModalidade(concurso.tipo),
      numeroReferencia: concurso.referencia || 'Não especificado',
      
      // Anexos e requisitos
      anexos: [],
      requisitosTecnicos: prepararRequisitosTecnicos(concurso),
      
      // Status e contactos
      status: 'Aberta',
      contacto: '', // Será preenchido pelo usuário
      email: '', // Será preenchido pelo usuário
      
      // Campos adicionais para melhor mapeamento
      classe: concurso.classe || '',
      criterioAdjudicacao: concurso.criterio_adjudicacao || '',
      garantiaProvisoria: concurso.garantia_provisoria || '0.00',
      moeda: concurso.moeda || 'MZN',
      numeroLotes: concurso.numero_lotes || 'LOTE UNICO',
      horaAbertura: concurso.hora_abertura || '',
      horaEntrega: concurso.hora_entrega || ''
    };
  };

  const handlePreencherFormulario = (concurso) => {
    const dadosFormatados = prepararDadosParaFormulario(concurso);
    
    if (onPreencherFormulario) {
      onPreencherFormulario(dadosFormatados);
      showSnackbar(`Dados do concurso ${concurso.referencia} copiados para o formulário!`, 'success');
    } else {
      copiarParaAreaTransferencia(dadosFormatados);
    }
  };

  const copiarParaAreaTransferencia = (dados) => {
    const textoFormatado = `
CONCURSO UGEA - DADOS PARA FORMULÁRIO

Título: ${dados.titulo}
Entidade: ${dados.entidade}
Referência: ${dados.numeroReferencia}
Modalidade: ${dados.modalidade}
Classe: ${dados.classe}

OBJETO:
${dados.objeto}

INFORMAÇÕES:
• Prazo de submissão: ${dados.prazo}
• Local de entrega: ${dados.localEntrega}
• Valor estimado: ${dados.valorEstimado}
• Província: ${dados.provincia.join(', ')}
• Setor: ${dados.setor}

CRITÉRIOS DE AVALIAÇÃO:
${dados.criterios}

DOCUMENTAÇÃO NECESSÁRIA:
${dados.documentacao}

CONDIÇÕES:
${dados.condicoes}

LINK PARA DOCUMENTOS: ${dados.linkDeSubmissao}
    `.trim();

    navigator.clipboard.writeText(textoFormatado)
      .then(() => {
        showSnackbar('Dados copiados para a área de transferência!', 'success');
      })
      .catch(() => {
        showSnackbar('Erro ao copiar dados', 'error');
      });
  };

  const showSnackbar = (message, severity = 'info') => {
    const snackbar = document.createElement('div');
    snackbar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      background-color: ${severity === 'success' ? '#10B981' : severity === 'error' ? '#EF4444' : '#3B82F6'};
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;
    snackbar.textContent = message;
    document.body.appendChild(snackbar);

    setTimeout(() => {
      document.body.removeChild(snackbar);
    }, 3000);
  };

  const concursosFiltrados = concursos.filter(concurso => {
    if (filter === 'ativos') return concursoNaoExpirado(concurso);
    if (filter === 'expirados') return !concursoNaoExpirado(concurso);
    if (filter === 'nao-publicados') return !concursosPublicados[concurso.id];
    if (filter === 'publicados') return concursosPublicados[concurso.id];
    return true;
  });

  const getEstatisticas = () => {
    const totais = {
      todos: concursos.length,
      ativos: concursos.filter(concursoNaoExpirado).length,
      expirados: concursos.filter(c => !concursoNaoExpirado(c)).length,
      publicados: Object.keys(concursosPublicados).length,
      'nao-publicados': concursos.length - Object.keys(concursosPublicados).length
    };
    return totais;
  };

  const estatisticas = getEstatisticas();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando concursos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={carregarConcursos}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Concursos UGEA
          </h1>
          <p className="text-gray-600">
            Lista de concursos públicos extraídos automaticamente
          </p>
          {onPreencherFormulario && (
            <p className="text-sm text-blue-600 mt-2">
              Clique em "Preencher Formulário" para copiar os dados para o formulário de publicação
            </p>
          )}
        </div>

        {/* Filtros e Controles */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-2 flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setFilter('todos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({estatisticas.todos})
            </button>
            <button
              onClick={() => setFilter('ativos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === 'ativos'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ativos ({estatisticas.ativos})
            </button>
            <button
              onClick={() => setFilter('expirados')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === 'expirados'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Expirados ({estatisticas.expirados})
            </button>
            <button
              onClick={() => setFilter('nao-publicados')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === 'nao-publicados'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Não Publicados ({estatisticas['nao-publicados']})
            </button>
            <button
              onClick={() => setFilter('publicados')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === 'publicados'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Publicados ({estatisticas.publicados})
            </button>
          </div>

          {estatisticas.publicados > 0 && (
            <button
              onClick={limparTodosPublicados}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition"
            >
              Limrar Todos Publicados
            </button>
          )}
        </div>

        {/* Lista de Concursos */}
        {concursosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum concurso encontrado
            </h3>
            <p className="text-gray-500">
              {filter === 'ativos' 
                ? 'Não há concursos ativos no momento.'
                : filter === 'publicados'
                ? 'Você ainda não marcou nenhum concurso como publicado.'
                : filter === 'nao-publicados'
                ? 'Todos os concursos foram marcados como publicados.'
                : 'Não há concursos para exibir.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {concursosFiltrados.map((concurso) => {
              const publicado = concursosPublicados[concurso.id];
              return (
                <div
                  key={concurso.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 ${
                    publicado 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : concursoNaoExpirado(concurso)
                      ? 'border-green-500'
                      : 'border-red-500'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="p-6">
                    {/* Cabeçalho do Cartão */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          publicado 
                            ? 'bg-indigo-100 text-indigo-800'
                            : concursoNaoExpirado(concurso)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {publicado ? '✅ Publicado' : concursoNaoExpirado(concurso) ? '🟢 Ativo' : '🔴 Expirado'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {concurso.tipo || 'Concurso'}
                        </span>
                      </div>
                    </div>

                    {/* Referência */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {concurso.referencia}
                    </h3>

                    {/* Objeto */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {concurso.objeto_geral || concurso.objeto || 'Sem descrição disponível'}
                    </p>

                    {/* Informações */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">UGEA:</span>
                        <span className="text-gray-900 font-medium">
                          {concurso.ugea_detalhada || concurso.ugea || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500">Província:</span>
                        <span className="text-gray-900 font-medium">
                          {concurso.provincia || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500">Data Abertura:</span>
                        <span className={`font-medium ${
                          concursoNaoExpirado(concurso)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatarData(concurso.data_abertura)}
                        </span>
                      </div>

                      {concurso.hora_abertura && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hora:</span>
                          <span className="text-gray-900 font-medium">
                            {concurso.hora_abertura}
                          </span>
                        </div>
                      )}

                      {concurso.valor_estimado && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valor Estimado:</span>
                          <span className="text-gray-900 font-medium">
                            {concurso.valor_estimado} {concurso.moeda || ''}
                          </span>
                        </div>
                      )}

                      {publicado && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Publicado em:</span>
                          <span className="text-indigo-600 font-medium">
                            {formatarDataHora(publicado.dataPublicacao)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handlePreencherFormulario(concurso)}
                        disabled={publicado}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                          publicado
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {publicado ? 'Já Publicado' : 'Preencher Formulário'}
                      </button>
                      
                      <button
                        onClick={() => publicado ? desmarcarComoPublicado(concurso.id) : marcarComoPublicado(concurso.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                          publicado
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {publicado ? (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Desmarcar
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Publicado
                          </>
                        )}
                      </button>
                    </div>

                    {/* Links de Download */}
                    {(concurso.links_download?.download_anuncio || concurso.links_download?.download_documento) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Documentos:</p>
                        <div className="flex space-x-2">
                          {concurso.links_download.download_anuncio && (
                            <a
                              href={concurso.links_download.download_anuncio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition"
                            >
                              📄 Anúncio
                            </a>
                          )}
                          {concurso.links_download.download_documento && (
                            <a
                              href={concurso.links_download.download_documento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition"
                            >
                              📋 Documento
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Criado: {formatarData(concurso.timestamp_criacao)}</span>
                        <span>Atualizado: {formatarData(concurso.timestamp_atualizacao)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Última atualização: {new Date().toLocaleDateString('pt-MZ')} às {new Date().toLocaleTimeString('pt-MZ')}
          </p>
          <p className="mt-1">
            Dados extraídos automaticamente do portal UFSA
          </p>
          <p className="mt-1 text-indigo-600">
            {estatisticas.publicados} concursos marcados como publicados
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConcursosUgea;