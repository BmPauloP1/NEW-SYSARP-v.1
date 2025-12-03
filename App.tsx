

import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { supabase } from './services/supabase';
import { base44 } from './services/base44Client';

// Lazy Load Pages para otimizar o carregamento inicial (Code Splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PilotManagement = lazy(() => import('./pages/PilotManagement'));
const DroneManagement = lazy(() => import('./pages/DroneManagement'));
const OperationManagement = lazy(() => import('./pages/OperationManagement'));
const FlightPlan = lazy(() => import('./pages/FlightPlan'));
const Aro = lazy(() => import('./pages/Aro'));
const Transmissions = lazy(() => import('./pages/Transmissions'));
const MaintenanceManagement = lazy(() => import('./pages/MaintenanceManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const Login = lazy(() => import('./pages/Login'));

// Módulo Operação Verão
const OperationSummerFlights = lazy(() => import('./pages/OperationSummerFlights'));
const OperationSummerStats = lazy(() => import('./pages/OperationSummerStats'));
const OperationSummerReport = lazy(() => import('./pages/OperationSummerReport'));
const OperationSummerAudit = lazy(() => import('./pages/OperationSummerAudit'));

// Componente de Loading elegante para feedback visual durante o carregamento de chunks
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 overflow-hidden">
    <div className="relative flex items-center justify-center">
        {/* Pulsing rings */}
        <div className="absolute w-32 h-32 bg-red-600 rounded-full opacity-10 animate-ping"></div>
        <div className="absolute w-24 h-24 bg-red-600 rounded-full opacity-20 animate-pulse"></div>
        
        {/* Spinning border */}
        <div className="w-16 h-16 border-4 border-slate-200 border-t-red-700 rounded-full animate-spin relative z-10 shadow-lg"></div>
        
        {/* Center Dot */}
        <div className="absolute w-3 h-3 bg-red-700 rounded-full z-20"></div>
    </div>
    
    <div className="mt-8 text-center space-y-2 z-10">
        <h2 className="text-xl font-black text-slate-800 tracking-wider uppercase drop-shadow-sm">SYSARP</h2>
        <div className="flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></span>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Carregando Módulos</p>
    </div>
  </div>
);

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
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    </HashRouter>
  );
}

export default App;