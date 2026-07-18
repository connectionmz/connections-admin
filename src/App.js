import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './fb';
import './App.css';

import Dashboard from './components/Dashboard';
import Empresas from './components/Empresas';
import EmpresaDetalhes from './components/EmpresaDetalhes';
import LoginModal from './components/LoginModal';
import Publicidade from './components/Publicidade';
import ServicoxExternos from './components/ServicoxExternos';
import Anuncios from './components/Anuncios';
import UsuariosOffline from './components/Usuarios';
import Utilizadores from './components/Utilizadores';
import Cotacoes from './components/roles/Cotacoes';
import DashboardSectorPublico from './components/DashboardSectorPublico';
import Validacoes from './components/Validacoes';
import CadastroEmpresa from './components/CadastroEmpresa';
import Sectores from './components/Sectores';
import Denuncias from './components/Denuncias';
import Publicacoes from './components/Publicacoes';
import Pagar from './components/Pagar';
import Relatorios from './components/Relatorios';
import ChangePassword from './components/ChangePassword';
import Modulos from './components/Modulos';
import RelatorioForm from './components/RelatorioForm';
import SubscriptionConfirmation from './components/SubscriptionConfirmation';
import Feedback from './components/Feedback';
import Singulares from './components/Singulares';
import Versingular from './components/VerSingular';
import Concursos from './components/roles/Concursos';
import ConcursosUgea from './components/ConursosUgea';
import AdminEventos from './components/Eventos';
import Lojas from './components/Lojas';

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-gray-200">
    <div className="text-xl font-semibold text-gray-700">Carregando...</div>
  </div>
);

const SidebarLink = ({ to, label }) => (
  <li>
    <Link to={to} className="block p-3 rounded-lg text-lg font-medium bg-gray-800 hover:bg-gray-700 transition">
      {label}
    </Link>
  </li>
);

const PrivateRoute = ({ children, allowedRoles, user }) => {
  if (!user) return <Navigate to="/login" />;
  if (user.blocked) return <div className="p-8 text-center">Esta conta está bloqueada.</div>;
  //if (user.mustChangePassword) return <Navigate to="/change-password" />;

  const hasAccess = allowedRoles.some(role => user.roles.includes(role));
  return hasAccess ? children : <Navigate to="/" />;
};

const Sidebar = ({ user, handleLogout }) => {
  const menuItems = [
    { to: "/", label: "Dashboard", roles: ["admin", "contabilista"] },
    { to: "/empresas", label: "Empresas", roles: ["admin", "gestor de empresas"] },
    { to: "/singulares", label: "Singulares", roles: ["admin", "gestor de empresas"] },
    { to: "/CadastroEmpresa", label: "Cadastrar Empresa", roles: ["admin", "gestor de empresas"] },
    { to: "/validar", label: "Validações", roles: ["admin", "gestor de empresas"] },
    { to: "/blog", label: "Blog", roles: ["admin", "gestor de cotações"] },
    { to: "/feedback", label: "Feebacks", roles: ["admin", "gestor de cotações"] },
    { to: "/anuncios", label: "Anúncios", roles: ["admin", "contabilista"] },
    { to: "/usuarios", label: "Usuários", roles: ["admin"] },
    { to: "/lojas", label: "Lojas", roles: ["admin"] },
    { to: "/cotacoes", label: "Cotações", roles: ["admin", "gestor de cotações"] },
    { to: "/concursos", label: "concursos", roles: ["admin", "gestor de cotações"] },
    { to: "/concursosUgea", label: "concursos Ugea", roles: ["admin", "gestor de cotações"] },
    { to: "/eventos", label: "Eventos", roles: ["admin", "gestor de cotações"] },
    { to: "/sectores", label: "Sectores", roles: ["admin", "gestor de cotações"] },
    { to: "/utilizadores", label: "Utilizadores", roles: ["admin"] },
    { to: "/modulos", label: "Modulos", roles: ["admin"] },
    { to: "/denuncias", label: "Denuncias", roles: ["admin"] },
    { to: "/addRelatorio", label: "Relatorio", roles: ["admin", "gestor de empresas"] },
    { to: "/relatorio", label: "Relatorio", roles: ["admin"] },
    { to: "/pagar", label: "Pagamentos", roles: ["admin"] },
    { to: "/pagarModulo", label: "Pagar", roles: ["admin"] },
    { to: "/publicacoes", label: "Publicacoes", roles: ["admin"] },
    { to: "/publico", label: "Setor Público", roles: ["admin"] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <aside className="bg-black text-white w-72 min-h-screen p-6">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Admin Panel</h2>
        <p className="text-sm text-gray-500">
          {user?.roles?.join(', ')}
        </p>
      </div>
      <nav>
        <ul className="space-y-6">
          {filteredItems.map((item) => (
            <SidebarLink key={item.to} to={item.to} label={item.label} />
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="w-full text-left p-3 rounded-lg text-lg font-medium bg-red-800 text-white hover:bg-gray-700 transition mt-4"
            >
              SAIR
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snapshot = await get(ref(db, `utilizadores/${firebaseUser.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const formattedUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.name || '',
              roles: Array.isArray(userData.roles) ? userData.roles : 
                    (userData.role ? [userData.role] : []),
              mustChangePassword: userData.mustChangePassword === true,
              blocked: userData.blocked === true
            };
            sessionStorage.setItem('user', JSON.stringify(formattedUser));
            setUser(formattedUser);
          } else {
            await auth.signOut();
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        sessionStorage.removeItem('user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      {user ? (
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar user={user} handleLogout={handleLogout} />
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'contabilista']}>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/empresas" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Empresas />
                </PrivateRoute>
              } />

              <Route path="/singulares" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Singulares />
                </PrivateRoute>
              } />

            <Route path="/concursosUgea" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <ConcursosUgea />
                </PrivateRoute>
              } />
              
              <Route path="/versingulares/:id" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Versingular />
                </PrivateRoute>
              } />
              <Route path="/relatorios" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Relatorios />
                </PrivateRoute>
              } />
              <Route path="/addRelatorio" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <RelatorioForm />
                </PrivateRoute>
              } />
              <Route path="/pagar" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Pagar />
                </PrivateRoute>
              } />
              <Route path="/eventos" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <AdminEventos />
                </PrivateRoute>
              } />
 <Route path="/lojas" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Lojas />
                </PrivateRoute>
              } />
                <Route path="/pagarModulo" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <SubscriptionConfirmation />
                </PrivateRoute>
              } />
              <Route path="/validar" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <Validacoes />
                </PrivateRoute>
              } />
              
              <Route path="/publico" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <DashboardSectorPublico />
                </PrivateRoute>
              } />
              <Route path="/CadastroEmpresa" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <CadastroEmpresa />
                </PrivateRoute>
              } />
               
              
              <Route path="/blog" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de cotações']}>
                  <Publicidade />
                </PrivateRoute>
              } />
               <Route path="/feedback" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de cotações']}>
                  <Feedback />
                </PrivateRoute>
              } />
              <Route path="/servicos" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de serviços']}>
                  <ServicoxExternos />
                </PrivateRoute>
              } />
              <Route path="/anuncios" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'contabilista']}>
                  <Anuncios />
                </PrivateRoute>
              } />
              <Route path="/sectores" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <Sectores />
                </PrivateRoute>
              } />
              <Route path="/usuarios" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <UsuariosOffline />
                </PrivateRoute>
              } />
              <Route path="/denuncias" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <Denuncias />
                </PrivateRoute>
              } />
              <Route path="/cotacoes" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de cotações']}>
                  <Cotacoes />
                </PrivateRoute>
              } />
              <Route path="/concursos" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de cotações']}>
                  <Concursos />
                </PrivateRoute>
              } />
              <Route path="/modulos" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <Modulos />
                </PrivateRoute>
              } />
              <Route path="/utilizadores" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <Utilizadores />
                </PrivateRoute>
              } />
              <Route path="/publicacoes" element={
                <PrivateRoute user={user} allowedRoles={['admin']}>
                  <Publicacoes />
                </PrivateRoute>
              } />
            
              <Route path="/empresas/:id" element={
                <PrivateRoute user={user} allowedRoles={['admin', 'gestor de empresas']}>
                  <EmpresaDetalhes />
                </PrivateRoute>
              } />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;