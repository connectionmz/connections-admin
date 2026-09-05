import { normalizeEmail, selectFollowUpRecipients } from './followUps';

test('normaliza e rejeita emails inválidos', () => {
  expect(normalizeEmail(' TEST@EXAMPLE.COM ')).toBe('test@example.com');
  expect(normalizeEmail('inválido')).toBe('');
});

test('combina empresas explícitas com segmento e remove emails repetidos', () => {
  const companies = [
    { id: '1', email: 'a@test.com', sector: 'Saúde', provincia: 'Maputo' },
    { id: '2', email: 'b@test.com', sector: 'Saúde', provincia: 'Gaza' },
    { id: '3', email: 'A@test.com', sector: 'Construção', provincia: 'Sofala' },
  ];
  const result = selectFollowUpRecipients(companies, { companyIds: ['3'], sectors: ['Saúde'], provinces: ['Maputo'] });
  expect(result.map(item => item.email)).toEqual(['a@test.com']);
});
