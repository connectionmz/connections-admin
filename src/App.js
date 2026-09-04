import { BrowserRouter as Router, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { adminRoutes, legacyAdminRoutes, LoginModal } from './app/adminRoutes';
import { hasAnyRole, normalizeRoles } from './auth/permissions';
import { AuthProvider, useAuth } from './auth/AuthContext';
import './App.css';

const LoadingScreen = () => <div className="admin-loading-screen" role="status" aria-live="polite"><span className="admin-spinner" aria-hidden="true" /><p>A carregar o painel...</p></div>;

const AccessDenied = ({ user }) => {
  const destination = adminRoutes.find(route => route.navigation && hasAnyRole(user, route.roles))?.path || '/login';
  return <section className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-700" aria-hidden="true">!</div><h1 className="mt-4 text-2xl font-bold text-gray-950">Acesso não autorizado</h1><p className="mt-2 text-gray-600">A sua conta não possui permissão para abrir esta área.</p><NavLink to={destination} className="admin-primary-button mt-6">Voltar a uma área permitida</NavLink></section>;
};

const BlockedAccount = ({ onLogout }) => <main className="admin-loading-screen p-6"><section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-gray-950">Conta bloqueada</h1><p className="mt-2 text-gray-600">Contacte um administrador para rever o acesso a esta conta.</p><button type="button" onClick={onLogout} className="admin-primary-button mt-6">Terminar sessão</button></section></main>;

const PrivateRoute = ({ children, allowedRoles, user }) => {
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== '/alterar-senha') return <Navigate to="/alterar-senha" replace state={{ from: location.pathname }} />;
  if (!hasAnyRole(user, allowedRoles)) return <AccessDenied user={user} />;
  return children;
};

const LegacySingularRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/singulares/${id}`} replace />;
};

const navGroup = path => {
  if (['/', '/crm', '/empresas', '/singulares', '/cadastro-empresa', '/validacoes'].includes(path)) return 'Operação';
  if (['/conteudos', '/feedback', '/anuncios', '/eventos', '/publicacoes'].includes(path)) return 'Conteúdo';
  if (['/cotacoes', '/concursos', '/concursos-ugea', '/lojas'].includes(path)) return 'Mercado';
  if (['/pagamentos', '/subscricoes', '/relatorios', '/relatorios/novo'].includes(path)) return 'Financeiro';
  return 'Configuração';
};

const Sidebar = ({ user, onLogout, open, onClose }) => {
  const groups = useMemo(() => adminRoutes.filter(route => route.navigation && hasAnyRole(user, route.roles)).reduce((result, item) => {
    const group = navGroup(item.path);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {}), [user]);
  const initial = (user.displayName || user.email || 'A').charAt(0).toUpperCase();

  return <>
    {open && <button type="button" aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" />}
    <aside className={`admin-sidebar ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Menu administrativo">
      <div className="border-b border-white/10 px-5 py-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="admin-brand-mark" aria-hidden="true">C</div><div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">Connection Mozambique</p><h1 className="mt-0.5 text-xl font-bold text-white">Administração</h1></div></div><button type="button" aria-label="Fechar menu" onClick={onClose} className="admin-icon-button-dark lg:hidden">×</button></div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação administrativa">
        {Object.entries(groups).map(([group, items]) => <section key={group} className="mb-5"><h2 className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{group}</h2><ul className="space-y-1">{items.map(item => <li key={item.path}><NavLink to={item.path} end={item.path === '/'} onClick={onClose} className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}><span className="admin-nav-dot" aria-hidden="true" /><span className="truncate">{item.label}</span></NavLink></li>)}</ul></section>)}
      </nav>
      <div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="admin-avatar" aria-hidden="true">{initial}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.displayName || 'Administrador'}</p><p className="truncate text-xs text-slate-400">{normalizeRoles(user).join(', ')}</p></div></div><button type="button" onClick={onLogout} className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200">Terminar sessão</button></div>
    </aside>
  </>;
};

const AdminShell = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const currentRoute = adminRoutes.find(route => route.path === location.pathname || (route.path.includes('/:') && location.pathname.startsWith(route.path.split('/:')[0])));
  const initial = (user.displayName || user.email || 'A').charAt(0).toUpperCase();
  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return <div className="admin-shell">
    <a href="#admin-content" className="admin-skip-link">Saltar para o conteúdo</a>
    <Sidebar user={user} onLogout={onLogout} open={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="min-w-0 flex-1">
      <header className="admin-topbar"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} className="admin-menu-button lg:hidden"><span aria-hidden="true">☰</span></button><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Painel administrativo</p><p className="truncate text-sm font-semibold text-gray-900">{currentRoute?.label || 'Visão geral'}</p></div></div><div className="ml-4 flex min-w-0 items-center gap-3"><div className="hidden min-w-0 text-right sm:block"><p className="truncate text-sm font-semibold text-gray-900">{user.displayName || 'Administrador'}</p><p className="truncate text-xs text-gray-500">{user.email}</p></div><div className="admin-avatar admin-avatar-light" aria-hidden="true">{initial}</div></div></header>
      <main id="admin-content" className="admin-content" tabIndex="-1"><Routes>
        {adminRoutes.map(({ path, component: Component, roles }) => <Route key={path} path={path} element={<PrivateRoute user={user} allowedRoles={roles}><Component /></PrivateRoute>} />)}
        {legacyAdminRoutes.map(([from, to]) => <Route key={from} path={from} element={from.includes(':id') ? <LegacySingularRedirect /> : <Navigate to={to} replace />} />)}
        <Route path="/sem-permissao" element={<AccessDenied user={user} />} /><Route path="*" element={<Navigate to="/" replace />} />
      </Routes></main>
    </div>
  </div>;
};

const AdminApplication = () => {
  const { user, loading, logout } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user?.blocked) return <BlockedAccount onLogout={logout} />;
  return user ? <AdminShell user={user} onLogout={logout} /> : <Routes><Route path="/login" element={<LoginModal />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
};

function App() { return <Router><AuthProvider><AdminApplication /></AuthProvider></Router>; }

export default App;
