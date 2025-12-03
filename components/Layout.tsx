import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "../services/base44Client";
import { supabase, isConfigured } from "../services/supabase"; 
import { Pilot, ConflictNotification, LGPD_TERMS } from "../types";
import { DroneIcon, Button, Card } from "./ui_components";
import {
  LayoutDashboard, Users, Radio, FileText, Wrench,
  Shield, LogOut, Menu, X, Activity, AlertTriangle, ChevronDown, ChevronRight, Navigation, Sun, Database, CheckCircle, XCircle
} from "lucide-react";

// Definição da interface para itens de navegação com suporte a submenus
interface NavigationItem {
  title: string;
  url?: string;
  icon: any;
  adminOnly: boolean;
  children?: { title: string; url: string; adminOnly?: boolean }[];
}

const navigationItems: NavigationItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: false },
  { title: "Pilotos", url: "/pilots", icon: Users, adminOnly: false },
  { title: "Aeronaves", url: "/drones", icon: DroneIcon, adminOnly: false },
  // Módulo Operação Verão (Atualizado)
  { 
    title: "Op. Verão 2025/2026",
    icon: Sun,
    adminOnly: false,
    children: [
      { title: "Diário de Voos", url: "/summer/flights" },
      { title: "Estatísticas", url: "/summer/stats" },
      { title: "Relatórios", url: "/summer/report" },
      { title: "Auditoria", url: "/summer/audit", adminOnly: true }
    ]
  },
  // Operações agora é um item pai com filhos atualizados
  { 
    title: "Operações", 
    icon: Radio, 
    adminOnly: false,
    children: [
      { title: "Criar Operações", url: "/operations" },
      { title: "Plano de Voo", url: "/flight-plan" },
      { title: "A.R.O", url: "/aro" }
    ]
  },
  { title: "Transmissão", url: "/transmissions", icon: Activity, adminOnly: false },
  { title: "Manutenção", url: "/maintenance", icon: Wrench, adminOnly: false },
  { title: "Relatórios", url: "/reports", icon: FileText, adminOnly: false }
];

interface LayoutProps {
  children?: React.ReactNode;
}

// Popup Modal Component for Alerts
const IncomingConflictModal = ({ 
  notification, 
  onConfirm 
}: { 
  notification: ConflictNotification; 
  onConfirm: () => void 
}) => {
  const [checked, setChecked] = React.useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-4 border-sysarp-primary">
        <div className="bg-sysarp-primary p-4 flex items-center gap-3 text-white">
           <AlertTriangle className="w-8 h-8 animate-pulse" />
           <div>
             <h2 className="text-xl font-bold uppercase leading-none">Alerta: Tráfego Convergente</h2>
             <span className="text-sm text-red-100">Aviso de Conflito de Espaço Aéreo</span>
           </div>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-700 font-medium">
            Atenção, piloto! Uma nova operação foi iniciada em área de conflito com seu voo atual.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
             <div className="flex justify-between border-b border-red-200 pb-2">
               <span className="text-sm text-red-800 font-bold">Nova Operação:</span>
               <span className="text-sm text-slate-800">{notification.new_op_name}</span>
             </div>
             <div className="flex justify-between border-b border-red-200 pb-2">
               <span className="text-sm text-red-800 font-bold">Piloto Responsável:</span>
               <span className="text-sm text-slate-800">{notification.new_pilot_name}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-sm text-red-800 font-bold">Parâmetros:</span>
               <span className="text-sm text-slate-800 font-mono">Alt: {notification.new_op_altitude}m | Raio: {notification.new_op_radius}m</span>
             </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
             <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-sysarp-primary mt-0.5" 
                  checked={checked} 
                  onChange={e => setChecked(e.target.checked)} 
                />
                <span className="text-sm font-bold text-slate-800">
                  Estou ciente do tráfego e manterei coordenação ativa via rádio com o outro piloto.
                </span>
             </label>
          </div>

          <Button 
            onClick={onConfirm} 
            disabled={!checked}
            className={`w-full h-12 text-lg ${checked ? 'bg-sysarp-primary hover:bg-sysarp-dark text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
          >
            Confirmar Ciência
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<Pilot | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for collapsible menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "Operações": true,
    "Op. Verão 2025/2026": true // Default expanded
  });
  
  // Notification State
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);

  // LGPD Modal
  const [showLgpdModal, setShowLgpdModal] = useState(false);

  // Diagnostic Modal
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Initial fetch of unacknowledged notifications
        const alerts = await base44.entities.ConflictNotification.filter({ target_pilot_id: currentUser.id, acknowledged: false });
        setNotifications(alerts);

      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  // Realtime Subscriptions using Supabase
  React.useEffect(() => {
    if (!user) return;
    
    // Skip if supabase is not configured (to avoid connection errors in console)
    if (!isConfigured) return;

    const channel = supabase
      .channel('conflict_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conflict_notifications',
          filter: `target_pilot_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Novo conflito recebido:', payload);
          const newAlert = payload.new as ConflictNotification;
          if (!newAlert.acknowledged) {
             setNotifications((prev) => [...prev, newAlert]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAcknowledgeNotification = async () => {
    if (notifications.length === 0) return;
    
    const currentAlert = notifications[0];
    try {
      // Mark as acknowledged in DB
      await base44.entities.ConflictNotification.update(currentAlert.id, { acknowledged: true });
      // Remove from local state
      setNotifications(prev => prev.slice(1));
    } catch (e) {
      console.error("Error acknowledging alert", e);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate('/login');
  };

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const runDiagnostic = async () => {
    setDiagLoading(true);
    setShowDiagnostic(true);
    const results = await base44.system.diagnose();
    setDiagnosticResults(results);
    setDiagLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sysarp-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const visibleNavItems = navigationItems.filter(item => 
    !item.adminOnly || user.role === 'admin'
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden relative">
      
      {/* Global Notification Modal */}
      {notifications.length > 0 && (
        <IncomingConflictModal 
          notification={notifications[0]} 
          onConfirm={handleAcknowledgeNotification} 
        />
      )}

      {/* LGPD Modal Overlay */}
      {showLgpdModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-white">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-red-600" />
                   Política de Privacidade e Termos de Uso
                 </h3>
                 <button onClick={() => setShowLgpdModal(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-white">
                 {LGPD_TERMS}
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end">
                 <Button onClick={() => setShowLgpdModal(false)}>Fechar</Button>
              </div>
           </Card>
        </div>
      )}

      {/* Diagnostic Modal */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="max-w-md w-full bg-white">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <Database className="w-5 h-5 text-blue-600" />
                   Diagnóstico de Conexão
                 </h3>
                 <button onClick={() => setShowDiagnostic(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                 {diagLoading ? (
                    <div className="flex items-center justify-center py-8">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                       <span className="ml-3 text-sm text-slate-600">Verificando tabelas e colunas...</span>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {diagnosticResults.map((res, idx) => (
                          <div key={idx} className={`p-3 border rounded-lg flex items-start gap-3 ${res.status === 'OK' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                             {res.status === 'OK' ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                             <div>
                                <p className={`text-sm font-bold ${res.status === 'OK' ? 'text-green-800' : 'text-red-800'}`}>{res.check}</p>
                                <p className="text-xs text-slate-600">{res.message}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end">
                 <Button onClick={() => setShowDiagnostic(false)}>Fechar</Button>
              </div>
           </Card>
        </div>
      )}

      {/* Mobile Header - Z-index adjusted to be BELOW the sidebar when open */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-sysarp-dark to-sysarp-primary z-30 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-3">
          {/* Mobile Header Logo Container - Adjusted to be rounded-lg for better fit */}
          <div className="w-10 h-10 rounded-lg bg-white p-0.5 overflow-hidden flex items-center justify-center">
             <img 
               src="/img/logosoarp.png" 
               alt="Logo" 
               className="w-full h-full object-contain" 
             />
          </div>
          <span className="text-white font-bold tracking-wider">SYSARP</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2 hover:bg-white/10 rounded">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Overlay - Closes menu on click */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Higher Z-Index than header on mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-sysarp-dark to-sysarp-primary text-white shadow-2xl transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static flex flex-col h-full
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="h-20 flex items-center gap-3 px-4 border-b border-red-700/50 bg-black/10 flex-shrink-0">
          {/* Sidebar Logo Container */}
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-1 overflow-hidden flex-shrink-0">
             <img 
               src="/img/logosoarp.png" 
               alt="Logo" 
               className="w-full h-full object-contain" 
             />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-lg tracking-wider leading-none">SYSARP</h1>
            <span className="text-[10px] text-red-200 uppercase tracking-widest font-semibold">CBMPR</span>
          </div>
          {/* Mobile Close Button inside Sidebar */}
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden ml-auto text-white p-1">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = item.url ? location.pathname === item.url : false;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.title];

              if (hasChildren) {
                return (
                  <div key={item.title} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 text-red-100 hover:bg-white/10 hover:text-white group`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-red-200 group-hover:text-white" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="pl-10 space-y-1 animate-fade-in">
                        {item.children!.map(child => {
                          if (child.adminOnly && user.role !== 'admin') return null;
                          return (
                            <Link
                              key={child.title}
                              to={child.url}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                location.pathname === child.url
                                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                                  : 'text-red-200 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${location.pathname === child.url ? 'bg-white' : 'bg-red-400'}`}></div>
                              {child.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.title}
                  to={item.url!}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-white/20 text-white shadow-md border-l-4 border-white backdrop-blur-sm' 
                      : 'text-red-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-red-200'}`} />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Profile / Connection Status */}
        <div className="p-4 border-t border-red-700/50 bg-black/20 flex-shrink-0 space-y-3">
          
          {/* Connection Status Indicator - ADMIN ONLY - NOW CLICKABLE FOR DIAGNOSTICS */}
          {user.role === 'admin' && (
            <button 
              onClick={runDiagnostic}
              className="w-full flex items-center justify-center gap-2 bg-black/30 hover:bg-black/50 transition-colors rounded py-1 px-2 border border-white/10 cursor-pointer"
              title="Clique para Diagnóstico de Conexão"
            >
              <Database className={`w-3 h-3 ${isConfigured ? 'text-green-400' : 'text-amber-400'}`} />
              <span className={`text-[10px] font-bold uppercase ${isConfigured ? 'text-green-400' : 'text-amber-400'}`}>
                Status: {isConfigured ? 'Online (Supabase)' : 'Offline (Local)'}
              </span>
            </button>
          )}

          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-sysarp-primary rounded-full flex items-center justify-center text-white font-bold border border-red-400 shadow">
              {user.full_name?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
              <p className="text-xs text-red-200 truncate capitalize opacity-80">{user.role === 'operator' ? 'Piloto' : 'Administrador'}</p>
            </div>
          </div>

          <button 
             onClick={() => setShowLgpdModal(true)}
             className="w-full text-left px-2 text-[10px] text-red-300 hover:text-white hover:underline"
          >
             Política de Privacidade e Termos de Uso
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-800 text-red-100 rounded-lg transition-colors text-sm font-medium border border-red-800/50"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content - Pushed down by header only on mobile */}
      <main className="flex-1 pt-16 lg:pt-0 relative w-full overflow-hidden h-full flex flex-col">
        {children}
      </main>

    </div>
  );
}