import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { db } from './fb';

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

// Componente de rota privada
function PrivateRoute({ children, allowedRoles }) {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const snapshot = await get(ref(db, `utilizadores/${user.uid}`));
          setRole(snapshot.exists() ? snapshot.val().role : null);
        } catch (error) {
          console.error('Erro ao buscar o papel do usuário:', error);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  if (!role) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" />;

  return children;
}

// Componente de tela de carregamento
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-gray-200">
    <div className="text-xl font-semibold text-gray-700">Carregando...</div>
  </div>
);

// Dados mockados para relatório
const mockData = {
  BpOFEMyyTjWfQBAgfKICVOQJjpV2: {
    "2024": {
      "12": {
        "-ODjRpR7qkKwrO1q8_az": { amount: 700, method: "EMOLA" },
        "-ODjYel5BZaBey1q-49m": { amount: 700, method: "MPESA" },
        "-ODjlur3HoRrRvfPHNvi": { amount: 1000, method: "MPESA" },
      },
    },
  },
};

// Componentes reutilizáveis
const SidebarLink = ({ to, label }) => (
  <li>
    <Link
      to={to}
      className="block p-3 rounded-lg text-lg font-medium bg-gray-800 hover:bg-gray-700 transition"
    >
      {label}
    </Link>
  </li>
);

const Sidebar = () => {
  const menuItems = [
    { to: "/empresas", label: "Empresas", roles: ["admin", "gestor de empresas"] },
    { to: "/publicidades", label: "Publicidades", roles: ["admin", "gestor de cotações"] },
    { to: "/servicos", label: "Serviços Externos", roles: ["admin", "gestor de serviços"] },
    { to: "/anuncios", label: "Anúncios", roles: ["admin", "contabilista"] },
    { to: "/modulos", label: "Módulos", roles: ["admin"] },
    { to: "/usuarios", label: "Usuários", roles: ["admin"] },
    { to: "/cotacoes", label: "Cotações", roles: ["admin", "gestor de cotações"] },
    { to: "/utilizadores", label: "Utilizadores", roles: ["admin"] },
    { to: "/publico", label: "Sector Publico", roles: ["admin"] },
    { to: "/parceiros", label: "Parceiros/Investidores", roles: ["admin", "gestor de empresas"] },
  ];

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
        </ul>
      </nav>
    </aside>
  );
};

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute allowedRoles={['admin', 'contabilista']}>
                  <RevenueReport data={mockData.BpOFEMyyTjWfQBAgfKICVOQJjpV2} />
                </PrivateRoute>
              }
            />
            <Route path="/empresas" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><Empresas /></PrivateRoute>} />
            <Route path="/publico" element={<PrivateRoute allowedRoles={['admin', 'gestor de empresas']}><DashboardSectorPublico /></PrivateRoute>} />
            <Route path="/publicidades" element={<PrivateRoute allowedRoles={['admin', 'gestor de cotações']}><Publicidade /></PrivateRoute>} />
            <Route path="/servicos" element={<PrivateRoute allowedRoles={['admin', 'gestor de serviços']}><ServicoxExternos /></PrivateRoute>} />
            <Route path="/anuncios" element={<PrivateRoute allowedRoles={['admin', 'contabilista']}><Anuncios /></PrivateRoute>} />
            <Route path="/modulos" element={<PrivateRoute allowedRoles={['admin']}><Modulos /></PrivateRoute>} />
            <Route path="/usuarios" element={<PrivateRoute allowedRoles={['admin']}><UsuariosOffline /></PrivateRoute>} />
            <Route path="/cotacoes" element={<PrivateRoute allowedRoles={['admin','gestor de cotações']}><Cotacoes /></PrivateRoute>} />
            <Route path="/utilizadores" element={<PrivateRoute allowedRoles={['admin']}><Utilizadores /></PrivateRoute>} />
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
