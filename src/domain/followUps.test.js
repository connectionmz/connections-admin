import { fillFollowUpTemplate, normalizeEmail, selectFollowUpRecipients } from './followUps';

const companies = [
  { id: '1', email: 'a@test.com', sector: 'Saúde', provincia: 'Maputo' },
  { id: '2', email: 'b@test.com', sector: 'Saúde', provincia: 'Gaza' },
  { id: '3', email: 'A@test.com', sector: 'Construção', provincia: 'Sofala' },
  { id: '4', email: 'c@test.com', sector: 'Construção', provincia: 'Maputo' },
  { id: '5', email: 'd@test.com', sector: 'Comércio', provincia: 'Maputo' },
];

test('normaliza e rejeita emails inválidos', () => {
  expect(normalizeEmail(' TEST@EXAMPLE.COM ')).toBe('test@example.com');
  expect(normalizeEmail('inválido')).toBe('');
});

test('empresas escolhidas restringem o envio mesmo com província definida', () => {
  const result = selectFollowUpRecipients(companies, { companyIds: ['1', '4'], provinces: ['Maputo'] });
  expect(result.map(item => item.id)).toEqual(['1', '4']);
});

test('só com província envia para todas as empresas dessa província', () => {
  const result = selectFollowUpRecipients(companies, { companyIds: [], provinces: ['Maputo'] });
  expect(result.map(item => item.id)).toEqual(['1', '4', '5']);
});

test('combina província e sector quando não há empresas escolhidas', () => {
  const result = selectFollowUpRecipients(companies, { sectors: ['Saúde'], provinces: ['Maputo'] });
  expect(result.map(item => item.email)).toEqual(['a@test.com']);
});

test('remove emails repetidos e ignora filtros vazios', () => {
  expect(selectFollowUpRecipients(companies, { companyIds: ['1', '3'] }).map(item => item.email)).toEqual(['a@test.com']);
  expect(selectFollowUpRecipients(companies, {})).toEqual([]);
});

test('substitui o marcador {{empresa}}', () => {
  expect(fillFollowUpTemplate('Olá {{empresa}}, {{ EMPRESA }}', { nome: 'Acme <b>Lda</b>' })).toBe('Olá Acme Lda, Acme Lda');
  expect(fillFollowUpTemplate('Olá {{empresa}},', {})).toBe('Olá Cliente,');
});
