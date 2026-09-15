import Dashboard from '../components/Dashboard';
import CrmDashboard from '../components/CrmDashboard';
import Empresas from '../components/Empresas';
import EmpresaDetalhes from '../components/EmpresaDetalhes';
import LoginModal from '../components/LoginModal';
import Publicidade from '../components/Publicidade';
import ServicoxExternos from '../components/ServicoxExternos';
import Anuncios from '../components/Anuncios';
import UsuariosOffline from '../components/Usuarios';
import Utilizadores from '../components/Utilizadores';
import Cotacoes from '../components/roles/Cotacoes';
import DashboardSectorPublico from '../components/DashboardSectorPublico';
import Validacoes from '../components/Validacoes';
import CadastroEmpresa from '../components/CadastroEmpresa';
import Sectores from '../components/Sectores';
import Denuncias from '../components/Denuncias';
import Publicacoes from '../components/Publicacoes';
import Pagar from '../components/Pagar';
import Relatorios from '../components/Relatorios';
import ChangePassword from '../components/ChangePassword';
import Modulos from '../components/Modulos';
import RelatorioForm from '../components/RelatorioForm';
import SubscriptionConfirmation from '../components/SubscriptionConfirmation';
import Feedback from '../components/Feedback';
import Singulares from '../components/Singulares';
import VerSingular from '../components/VerSingular';
import Concursos from '../components/roles/Concursos';
import ConcursosUgea from '../components/ConursosUgea';
import AdminEventos from '../components/Eventos';
import Lojas from '../components/Lojas';
import { ADMIN_ROLES as R } from '../auth/permissions';

const adminOnly = [R.ADMIN];
const companies = [R.ADMIN, R.COMPANY_MANAGER];
const quotations = [R.ADMIN, R.QUOTATION_MANAGER];

export const adminRoutes = [
  { path: '/', label: 'Dashboard', component: Dashboard, roles: [R.ADMIN, R.ACCOUNTANT], navigation: true },
  { path: '/crm', label: 'CRM e Receita', component: CrmDashboard, roles: adminOnly, navigation: true },
  { path: '/empresas', label: 'Empresas', component: Empresas, roles: companies, navigation: true },
  { path: '/empresas/:id', component: EmpresaDetalhes, roles: companies },
  { path: '/singulares', label: 'Singulares', component: Singulares, roles: companies, navigation: true },
  { path: '/singulares/:id', component: VerSingular, roles: companies },
  { path: '/cadastro-empresa', label: 'Cadastrar empresa', component: CadastroEmpresa, roles: companies, navigation: true },
  { path: '/validacoes', label: 'Validações', component: Validacoes, roles: companies, navigation: true },
  { path: '/conteudos', label: 'Conteúdos', component: Publicidade, roles: quotations, navigation: true },
  { path: '/feedback', label: 'Feedback', component: Feedback, roles: quotations, navigation: true },
  { path: '/anuncios', label: 'Anúncios', component: Anuncios, roles: [R.ADMIN, R.ACCOUNTANT], navigation: true },
  { path: '/utilizadores-offline', label: 'Utilizadores offline', component: UsuariosOffline, roles: adminOnly, navigation: true },
  { path: '/lojas', label: 'Lojas', component: Lojas, roles: adminOnly, navigation: true },
  { path: '/cotacoes', label: 'Cotações', component: Cotacoes, roles: quotations, navigation: true },
  { path: '/concursos', label: 'Concursos', component: Concursos, roles: quotations, navigation: true },
  { path: '/concursos-ugea', label: 'Concursos UGEA', component: ConcursosUgea, roles: quotations, navigation: true },
  { path: '/eventos', label: 'Eventos', component: AdminEventos, roles: quotations, navigation: true },
  { path: '/sectores', label: 'Sectores', component: Sectores, roles: adminOnly, navigation: true },
  { path: '/equipa', label: 'Equipa e permissões', component: Utilizadores, roles: adminOnly, navigation: true },
  { path: '/modulos', label: 'Módulos', component: Modulos, roles: adminOnly, navigation: true },
  { path: '/denuncias', label: 'Denúncias', component: Denuncias, roles: adminOnly, navigation: true },
  { path: '/relatorios/novo', label: 'Adicionar relatório', component: RelatorioForm, roles: companies, navigation: true },
  { path: '/relatorios', label: 'Relatórios', component: Relatorios, roles: adminOnly, navigation: true },
  { path: '/pagamentos', label: 'Pagamentos', component: Pagar, roles: adminOnly, navigation: true },
  { path: '/subscricoes', label: 'Subscrições', component: SubscriptionConfirmation, roles: adminOnly, navigation: true },
  { path: '/publicacoes', label: 'Publicações', component: Publicacoes, roles: adminOnly, navigation: true },
  { path: '/sector-publico', label: 'Sector público', component: DashboardSectorPublico, roles: adminOnly, navigation: true },
  { path: '/servicos', label: 'Serviços externos', component: ServicoxExternos, roles: [R.ADMIN, R.SERVICES_MANAGER], navigation: true },
  { path: '/alterar-senha', component: ChangePassword, roles: [R.ADMIN, R.ACCOUNTANT, R.COMPANY_MANAGER, R.QUOTATION_MANAGER, R.SERVICES_MANAGER] },
];

export const legacyAdminRoutes = [
  ['/CadastroEmpresa', '/cadastro-empresa'],
  ['/validar', '/validacoes'],
  ['/blog', '/conteudos'],
  ['/usuarios', '/utilizadores-offline'],
  ['/utilizadores', '/equipa'],
  ['/concursosUgea', '/concursos-ugea'],
  ['/addRelatorio', '/relatorios/novo'],
  ['/pagar', '/pagamentos'],
  ['/pagarModulo', '/subscricoes'],
  ['/publico', '/sector-publico'],
  ['/change-password', '/alterar-senha'],
  ['/versingulares/:id', '/singulares/:id'],
];

export { LoginModal };
