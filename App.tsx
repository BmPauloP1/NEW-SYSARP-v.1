import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PilotManagement from './pages/PilotManagement';
import DroneManagement from './pages/DroneManagement';
import OperationManagement from './pages/OperationManagement';
import FlightPlan from './pages/FlightPlan';
import Aro from './pages/Aro';
import Transmissions from './pages/Transmissions';
import MaintenanceManagement from './pages/MaintenanceManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { supabase } from './services/supabase';
import { base44 } from './services/base44Client';

// Módulo Operação Verão - Ensure relative paths
import OperationSummerFlights from './pages/OperationSummerFlights';
import OperationSummerStats from './pages/OperationSummerStats';
import OperationSummerReport from './pages/OperationSummerReport';
import OperationSummerAudit from './pages/OperationSummerAudit';

// Componente para monitorar autenticação e corrigir perfil se necessário
const AuthObserver = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("Usuário logado via AuthObserver:", session.user.email);
        
        // Tenta buscar o perfil
        try {
           await base44.auth.me();
           // Se der sucesso, o usuário existe e está completo.
           // Se estiver na tela de login, manda pro dashboard
           if (window.location.hash.includes('/login')) {
              navigate('/');
           }
        } catch (e) {
           console.warn("Perfil não encontrado no observer, tentando autocura...");
           // Se falhar (perfil não existe), força a criação
           try {
              const { error } = await supabase.from('profiles').insert([{
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata.full_name || 'Usuário Recuperado',
                  role: 'operator',
                  status: 'active',
                  terms_accepted: true
              }]);
              if (!error) {
                 console.log("Perfil recuperado com sucesso!");
                 navigate('/');
              }
           } catch (err) {
              console.error("Falha crítica na autocura:", err);
           }
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
};

function App() {
  return (
    <HashRouter>
      <AuthObserver />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/pilots" element={<Layout><PilotManagement /></Layout>} />
        <Route path="/drones" element={<Layout><DroneManagement /></Layout>} />
        
        {/* Módulo Operação Verão */}
        <Route path="/summer/flights" element={<Layout><OperationSummerFlights /></Layout>} />
        <Route path="/summer/stats" element={<Layout><OperationSummerStats /></Layout>} />
        <Route path="/summer/report" element={<Layout><OperationSummerReport /></Layout>} />
        <Route path="/summer/audit" element={<Layout><OperationSummerAudit /></Layout>} />

        <Route path="/operations" element={<Layout><OperationManagement /></Layout>} />
        <Route path="/flight-plan" element={<Layout><FlightPlan /></Layout>} />
        <Route path="/aro" element={<Layout><Aro /></Layout>} />
        <Route path="/transmissions" element={<Layout><Transmissions /></Layout>} />
        <Route path="/maintenance" element={<Layout><MaintenanceManagement /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;