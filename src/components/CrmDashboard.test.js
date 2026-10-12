import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onValue } from 'firebase/database';
import CrmDashboard from './CrmDashboard';

const NOW = Date.now();
const DATA = {
  company: {
    c1: { nome: 'Acme Lda', email: 'geral@acme.co.mz', provincia: 'Maputo', lastLogin: NOW - 20 * 86400000 },
    c2: { nome: 'Outra Lda', email: 'geral@outra.co.mz', provincia: 'Maputo', lastLogin: NOW },
    s1: { nome: 'Pessoa', email: 'pessoa@mail.co.mz', type: 'singular' },
  },
  payments: {},
  adminCrm: {},
  accessLogs: {},
};

jest.mock('../fb', () => ({ auth: {}, db: {} }));
jest.mock('../services/emailNotifications', () => ({ sendEmailBatch: jest.fn() }));
jest.mock('./crm/CrmBillingPanel', () => () => null);
jest.mock('firebase/database', () => ({
  ref: (db, path) => ({ path }),
  onValue: jest.fn(),
  push: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
}));

beforeEach(() => {
  onValue.mockImplementation((reference, onSuccess) => {
    onSuccess({ val: () => DATA[reference.path] });
    return () => {};
  });
});

const renderAt = url => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/crm" element={<CrmDashboard />} /></Routes></MemoryRouter>);

test('subscreve todas as fontes e sai do estado de carregamento', async () => {
  renderAt('/crm');
  expect(await screen.findByText('CRM e Receita')).toBeInTheDocument();
  expect(onValue.mock.calls.map(([reference]) => reference.path).sort()).toEqual(['accessLogs', 'adminCrm', 'company', 'payments']);
});

test('deep-link abre o follow-up só com a empresa escolhida e o texto do público', async () => {
  renderAt('/crm?tab=followup&companies=c1&audience=offline');
  expect(await screen.findByText('Destinatários (1)')).toBeInTheDocument();
  expect(screen.getByText('geral@acme.co.mz')).toBeInTheDocument();
  expect(screen.queryByText('geral@outra.co.mz')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Novidades à sua espera na Connection Mozambique')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Offline +7 dias (1)' })).toBeInTheDocument();
});
