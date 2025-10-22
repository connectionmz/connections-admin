import React, { useState } from 'react';
import { db } from '../fb';
import { push, ref, set } from 'firebase/database';


const FreteManager = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Dados completos das tarifas para sistema de frete
  const tarifasFrete = [
    // ========== DE MAPUTO ==========
    {
      origem: "MAPUTO",
      destino: "BEIRA",
      precos: { "+100": 14.20, "+250": 13.10, "+500": 11.50, "+1000": 10.40 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      // Campos para sistema de frete
      tempoEntrega: "1-2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "CHIMOIO",
      precos: { "+100": 14.20, "+250": 13.10, "+500": 11.50, "+1000": 10.40 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1-2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "INHAMBANE",
      precos: { "+100": 18.20 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1 dia",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "VILANCULOS",
      precos: { "+100": 14.50 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1 dia",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "QUELIMANE",
      precos: { "+100": 27.90, "+250": 25.80, "+500": 22.60, "+1000": 20.60 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "TETE",
      precos: { "+100": 27.90, "+250": 25.80, "+500": 22.60, "+1000": 20.60 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "LICHINGA",
      precos: { "+100": 35.00, "+250": 32.30, "+500": 28.30, "+1000": 25.70 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2-3 dias",
      disponivel: true,
      tipoServico: "standard",
      prioridade: 2,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "NAMPULA",
      precos: { "+100": 35.00, "+250": 32.30, "+500": 28.30, "+1000": 25.70 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2-3 dias",
      disponivel: true,
      tipoServico: "standard",
      prioridade: 2,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "MAPUTO",
      destino: "PEMBA",
      precos: { "+100": 35.00, "+250": 32.30, "+500": 28.30, "+1000": 25.70 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2-3 dias",
      disponivel: true,
      tipoServico: "standard",
      prioridade: 2,
      transportadora: "LAM",
      modalidade: "aereo"
    },

    // ========== DE BEIRA ==========
    {
      origem: "BEIRA",
      destino: "MAPUTO",
      precos: { "+100": 21.00, "+250": 19.40, "+500": 17.00, "+1000": 15.40 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1-2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "BEIRA",
      destino: "CHIMOIO",
      precos: { "+100": 12.60, "+250": 11.60, "+500": 10.20, "+1000": 9.30 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1 dia",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "BEIRA",
      destino: "VILANCULOS",
      precos: { "+100": 14.50 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1 dia",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },

    // ========== DE CHIMOIO ==========
    {
      origem: "CHIMOIO",
      destino: "MAPUTO",
      precos: { "+100": 21.00, "+250": 19.40, "+500": 17.00, "+1000": 15.40 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "1-2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },

    // ========== DE OUTRAS CIDADES ==========
    {
      origem: "QUELIMANE",
      destino: "MAPUTO",
      precos: { "+100": 12.60, "+250": 11.60, "+500": 10.20, "+1000": 9.30 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    },
    {
      origem: "TETE",
      destino: "MAPUTO",
      precos: { "+100": 13.20, "+250": 12.20, "+500": 10.70, "+1000": 9.70 },
      tipo: "perecivel",
      dataVigencia: "2009-04-01",
      moeda: "MT",
      ivaIncluido: false,
      tempoEntrega: "2 dias",
      disponivel: true,
      tipoServico: "expresso",
      prioridade: 1,
      transportadora: "LAM",
      modalidade: "aereo"
    }
  ];

  const salvarDadosFrete = async () => {
    setLoading(true);
    setMessage('');

    try {
      // 1. Salvar Configurações do Sistema de Frete
      const configRef = ref(db, 'configuracoes/sistema_frete');
      await set(configRef, {
        moedaPadrao: "MT",
        ivaPercentual: 17,
        pesoMinimo: 1,
        pesoMaximo: 1000,
        diasUteis: ["segunda", "terca", "quarta", "quinta", "sexta"],
        horarioFuncionamento: "08:00-17:00",
        transportadoraPadrao: "LAM",
        atualizadoEm: new Date().toISOString(),
        versaoSistema: "1.0"
      });

      // 2. Salvar Catálogo de Cidades
      const cidadesRef = ref(db, 'cidades');
      const cidadesMocambique = {
        "MAPUTO": { 
          nome: "Maputo", 
          provincia: "Maputo", 
          ativa: true, 
          capital: true,
          zona: "sul",
          codigo: "MPM"
        },
        "BEIRA": { 
          nome: "Beira", 
          provincia: "Sofala", 
          ativa: true, 
          capital: false,
          zona: "centro",
          codigo: "BEW"
        },
        "CHIMOIO": { 
          nome: "Chimoio", 
          provincia: "Manica", 
          ativa: true, 
          capital: false,
          zona: "centro",
          codigo: "VPY"
        },
        "INHAMBANE": { 
          nome: "Inhambane", 
          provincia: "Inhambane", 
          ativa: true, 
          capital: false,
          zona: "sul",
          codigo: "INH"
        },
        "VILANCULOS": { 
          nome: "Vilanculos", 
          provincia: "Inhambane", 
          ativa: true, 
          capital: false,
          zona: "sul",
          codigo: "VNX"
        },
        "QUELIMANE": { 
          nome: "Quelimane", 
          provincia: "Zambézia", 
          ativa: true, 
          capital: false,
          zona: "centro",
          codigo: "UEL"
        },
        "TETE": { 
          nome: "Tete", 
          provincia: "Tete", 
          ativa: true, 
          capital: false,
          zona: "centro",
          codigo: "TET"
        },
        "LICHINGA": { 
          nome: "Lichinga", 
          provincia: "Niassa", 
          ativa: true, 
          capital: false,
          zona: "norte",
          codigo: "VXC"
        },
        "NAMPULA": { 
          nome: "Nampula", 
          provincia: "Nampula", 
          ativa: true, 
          capital: false,
          zona: "norte",
          codigo: "APL"
        },
        "PEMBA": { 
          nome: "Pemba", 
          provincia: "Cabo Delgado", 
          ativa: true, 
          capital: false,
          zona: "norte",
          codigo: "POL"
        }
      };
      
      await set(cidadesRef, cidadesMocambique);

      // 3. Salvar Tarifas de Frete
      let tarifasSalvas = 0;
      const tarifasComIds = [];

      for (const tarifa of tarifasFrete) {
        try {
          const tarifaRef = push(ref(db, 'tarifas'));
          const tarifaId = tarifaRef.key;
          
          const tarifaCompleta = {
            // Identificação
            id: tarifaId,
            codigoRota: `${tarifa.origem}_${tarifa.destino}`,
            
            // Dados básicos
            ...tarifa,
            
            // Metadados para sistema
            timestamp: new Date().toISOString(),
            pais: "Moçambique",
            servico: "domestico",
            
            // Campos para cálculo
            calculoBase: "peso",
            unidadeMedida: "kg",
            tipoCalculo: "por_kg",
            
            // Status e controle
            ativa: true,
            categoria: "perecivel",
            disponivel: true,
            
            // Auditoria
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            versao: "2009-04-01"
          };

          await set(tarifaRef, tarifaCompleta);
          tarifasSalvas++;
          tarifasComIds.push(tarifaCompleta);
        } catch (error) {
          console.error(`Erro ao salvar tarifa ${tarifa.origem}-${tarifa.destino}:`, error);
        }
      }

      // 4. Salvar Índice de Rotas para consulta rápida
      const rotasRef = ref(db, 'indices/rotas');
      const indiceRotas = {};
      
      tarifasComIds.forEach(tarifa => {
        if (!indiceRotas[tarifa.origem]) {
          indiceRotas[tarifa.origem] = {};
        }
        indiceRotas[tarifa.origem][tarifa.destino] = {
          tarifaId: tarifa.id,
          precoBase: tarifa.precos['+100'],
          tempoEntrega: tarifa.tempoEntrega,
          disponivel: tarifa.disponivel
        };
      });

      await set(rotasRef, indiceRotas);

      // 5. Salvar Estatísticas do Sistema
      const statsRef = ref(db, 'estatisticas');
      await set(statsRef, {
        totalTarifas: tarifasSalvas,
        totalCidades: Object.keys(cidadesMocambique).length,
        totalRotas: tarifasComIds.length,
        dataAtualizacao: new Date().toISOString(),
        rotasPorZona: {
          sul: tarifasComIds.filter(t => 
            cidadesMocambique[t.origem]?.zona === 'sul' || 
            cidadesMocambique[t.destino]?.zona === 'sul'
          ).length,
          centro: tarifasComIds.filter(t => 
            cidadesMocambique[t.origem]?.zona === 'centro' || 
            cidadesMocambique[t.destino]?.zona === 'centro'
          ).length,
          norte: tarifasComIds.filter(t => 
            cidadesMocambique[t.origem]?.zona === 'norte' || 
            cidadesMocambique[t.destino]?.zona === 'norte'
          ).length
        }
      });

      setMessage(`✅ Sistema de frete configurado com sucesso! 
        ${tarifasSalvas} tarifas salvas | 
        ${Object.keys(cidadesMocambique).length} cidades | 
        Estrutura completa para loja virtual`);

    } catch (error) {
      console.error('Erro geral ao salvar dados:', error);
      setMessage('❌ Erro ao configurar sistema: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const limparMensagem = () => {
    setMessage('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🚚 Configuração do Sistema de Frete - Loja Virtual</h1>
      
      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        border: '1px solid #28a745'
      }}>
        <h3>📦 Estrutura de Dados para Loja Virtual</h3>
        <p><strong>Os seguintes dados serão salvos no Firebase:</strong></p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <h4>📊 Estruturas Principais:</h4>
            <ul>
              <li><strong>configuracoes/sistema_frete</strong> - Parâmetros globais</li>
              <li><strong>cidades</strong> - Catálogo de cidades</li>
              <li><strong>tarifas</strong> - Todas as tarifas com metadados</li>
              <li><strong>indices/rotas</strong> - Índice para consulta rápida</li>
              <li><strong>estatisticas</strong> - Dados do sistema</li>
            </ul>
          </div>
          <div>
            <h4>🎯 Funcionalidades para Loja:</h4>
            <ul>
              <li>Cálculo automático de fretes</li>
              <li>Consulta por origem/destino</li>
              <li>Gestão de disponibilidade</li>
              <li>Tempos de entrega</li>
              <li>Múltiplas faixas de peso</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={salvarDadosFrete} 
          disabled={loading}
          style={{
            padding: '15px 30px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⚙️ Salvando Dados...' : '💾 Salvar Dados de Frete na Base de Dados'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          backgroundColor: message.includes('❌') ? '#f8d7da' : '#d4edda',
          color: message.includes('❌') ? '#721c24' : '#155724',
          border: '1px solid',
          borderColor: message.includes('❌') ? '#f5c6cb' : '#c3e6cb',
          borderRadius: '5px',
          marginBottom: '20px',
          whiteSpace: 'pre-line'
        }}>
          {message}
          <button 
            onClick={limparMensagem}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div>
        <h3>📋 Resumo das Tarifas ({tarifasFrete.length} rotas)</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Rota</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>+100kg</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Entrega</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {tarifasFrete.map((tarifa, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                    {tarifa.origem} → {tarifa.destino}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {tarifa.precos['+100']} MT/kg
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {tarifa.tempoEntrega}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {tarifa.tipoServico}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FreteManager;