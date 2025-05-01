import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import './App.css'
import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from './fb'
import Dashboard from './components/Dashboard';
import Empresas from './components/Empresas';
import EmpresaDetalhes from './components/EmpresaDetalhes';
import LoginModal from './components/LoginModal';
import Publicidade from './components/Publicidade';
import ServicoxExternos from './components/ServicoxExternos';
import Anuncios from './components/Anuncios';
import Modulos from './components/Modulos';
import UsuariosOffline from './components/Usuarios';
import Utilizadores from './components/Utilizadores';
import Cotacoes from './components/roles/Cotacoes';
import RevenueReport from './components/RevenueReport';
import Parceiros from './components/Parceiros';
import DashboardSectorPublico from './components/DashboardSectorPublico';
import Validacoes from './components/Validacoes';
import CadastroEmpresa from './components/CadastroEmpresa'
import { getUserData } from './components/utils/utils'
import Sectores from './components/Modulos'
import Denuncias from './components/Denuncias'
import Publicacoes from './components/Publicacoes'
import Pagar from './components/Pagar'

// Componente de rota privada
function PrivateRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = getUserData();

    console.log(userData)
    
    if (userData) {
      setUser(userData);
      setRole(userData.role);
      setLoading(false);
    } else {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser)
          try {
            const snapshot = await get(ref(db, `utilizadores/${firebaseUser.uid}`))
            setRole(snapshot.exists() ? snapshot.val().role : null)
          } catch (error) {
            console.error('Erro ao buscar o papel do usuário:', error)
          }
        } else {
          setUser(null)
          setRole(null)
        }
        setLoading(false)
      });
      return () => unsubscribe()
    }
  }, []);

  if (loading) return <LoadingScreen />;
  if (!role) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" />
  return children;
}

const clearUserData = () => {
  sessionStorage.removeItem('user')
};

const handleLogout = async () => {
  try {
    await signOut(auth);

    clearUserData();

    window.location.href = '/login'
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    alert('Ocorreu um erro ao tentar sair.')
  }
};
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

const Sidebar = () => {
  const menuItems = [
    { to: "/empresas", label: "Empresas", roles: ["admin", "gestor de empresas"] },
    { to: "/CadastroEmpresa", label: "Cadastrar Empresa", roles: ["admin", "gestor de empresas"] },
    { to: "/validar", label: "Validações", roles: ["admin", "gestor de empresas"] },
    { to: "/blog", label: "Blog", roles: ["admin", "gestor de cotações"] },
    { to: "/anuncios", label: "Anúncios", roles: ["admin", "contabilista"] },
    { to: "/usuarios", label: "Usuários", roles: ["admin"] },
    { to: "/cotacoes", label: "Cotações", roles: ["admin", "gestor de cotações"] },
    { to: "/sectores", label: "Sectores", roles: ["admin", "gestor de cotações"] },
    { to: "/utilizadores", label: "Utilizadores", roles: ["admin"] },
    { to: "/denuncias", label: "Denuncias", roles: ["admin"] },
    { to: "/pagar", label: "pagar", roles: ["admin"] },
    { to: "/publicacoes", label: "Publicacoes", roles: ["admin"] },
    { to: "/parceiros", label: "Parceiros/Investidores", roles: ["admin"] },
  ]
  return (
    <aside className="bg-black text-white w-72 min-h-screen p-6">
      <Link to="/" className="block mb-10">
        <h2 className="text-3xl font-extrabold text-center tracking-tight">Admin Panel</h2>
      </Link>
      <nav>
        <ul className="space-y-6">
          {menuItems.map((item) => (
            <SidebarLink key={item.to} to={item.to} label={item.label} />
          ))}
              <Link
        onClick={handleLogout}
        className="block p-3 rounded-lg text-lg font-medium bg-red-800 text-white hover:bg-gray-700 transition mt-4">
        SAIR
      </Link>
        </ul>
      </nav>
    </aside>
  )
}
function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<PrivateRoute allowedRoles={['admin', 'contabilista']}><Dashboard /></PrivateRoute>} />
            <Route path="/empresas" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><Empresas /></PrivateRoute>} />
            <Route path="/pagar" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><Pagar /></PrivateRoute>} />
            <Route path="/validar" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><Validacoes /></PrivateRoute>} />
            <Route path="/publico" element={<PrivateRoute allowedRoles={['admin']}><DashboardSectorPublico /></PrivateRoute>} />
            <Route path="/CadastroEmpresa" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><CadastroEmpresa /></PrivateRoute>} />
            <Route path="/blog" element={<PrivateRoute allowedRoles={['admin', 'gestor de cotações']}><Publicidade /></PrivateRoute>} />
            <Route path="/servicos" element={<PrivateRoute allowedRoles={['admin', 'gestor de serviços']}><ServicoxExternos /></PrivateRoute>} />
            <Route path="/anuncios" element={<PrivateRoute allowedRoles={['admin', 'contabilista']}><Anuncios /></PrivateRoute>} />
            <Route path="/sectores" element={<PrivateRoute allowedRoles={['admin']}><Sectores /></PrivateRoute>} />
            <Route path="/usuarios" element={<PrivateRoute allowedRoles={['admin']}><UsuariosOffline /></PrivateRoute>} />
            <Route path="/denuncias" element={<PrivateRoute allowedRoles={['admin']}><Denuncias /></PrivateRoute>} />
            <Route path="/cotacoes" element={<PrivateRoute allowedRoles={['admin','gestor de cotações']}><Cotacoes /></PrivateRoute>} />
            <Route path="/utilizadores" element={<PrivateRoute allowedRoles={['admin']}><Utilizadores /></PrivateRoute>} />
            <Route path="/publicacoes" element={<PrivateRoute allowedRoles={['admin']}><Publicacoes /></PrivateRoute>} />
            <Route path="/parceiros" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><Parceiros /></PrivateRoute>} />
            <Route path="/empresas/:id" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><EmpresaDetalhes /></PrivateRoute>} />
            <Route path="/login" element={<LoginModal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;
