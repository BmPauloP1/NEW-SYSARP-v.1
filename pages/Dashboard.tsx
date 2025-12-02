import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { base44 } from "../services/base44Client";
import { Operation, Drone, Pilot, Maintenance, MISSION_HIERARCHY, ConflictNotification } from "../types";
import { Card, Badge, Button } from "../components/ui_components";
import { Radio, Video, AlertTriangle, Map as MapIcon, Wrench, Clock, ExternalLink, Activity, List, Shield, Crosshair, Phone, Check } from "lucide-react";

// Fix Leaflet icons
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para controlar o mapa (Redimensionamento e Geolocalização)
const MapController = () => {
  const map = useMap();
  const [positionFound, setPositionFound] = useState(false);

  useEffect(() => {
    // 1. Correção de Renderização (Bug do Leaflet em Flexbox)
    // Força o mapa a atualizar seu tamanho após o DOM ser pintado
    const timer = setTimeout(() => {
      if (map && map.getContainer()) {
        map.invalidateSize();
      }
    }, 200);

    // 2. Geolocalização do Dispositivo
    if (!positionFound && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Safeguard: Check if map instance and container still exist before calling methods
          if (!map || !map.getContainer()) return;
          
          const { latitude, longitude } = position.coords;
          // Usa setView em vez de flyTo para evitar animações complexas que podem causar erro _leaflet_pos se o mapa desmontar
          map.setView([latitude, longitude], 10);
          setPositionFound(true);
        },
        (error) => {
          if (!map || !map.getContainer()) return;
          console.warn("Geolocalização bloqueada ou indisponível:", error.message);
          map.setZoom(7);
        }
      );
    }

    return () => clearTimeout(timer);
  }, [map, positionFound]);

  return null;
};

export default function Dashboard() {
  const [activeOps, setActiveOps] = useState<Operation[]>([]);
  const [recentOps, setRecentOps] = useState<Operation[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<Maintenance[]>([]);
  const [conflictAlerts, setConflictAlerts] = useState<ConflictNotification[]>([]);
  const [liveStreams, setLiveStreams] = useState<Operation[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [currentUser, setCurrentUser] = useState<Pilot | null>(null);
  
  useEffect(() => {
    const init = async () => {
        try {
            const user = await base44.auth.me();
            setCurrentUser(user);
            loadData(user);
        } catch (e) {
            console.debug("Dashboard auth/load failed (likely redirecting)", e);
        }
    };
    init();

    const interval = setInterval(() => {
        if (currentUser) loadData(currentUser);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]); // Added currentUser dependency to ensure interval uses correct user

  const loadData = async (user?: Pilot) => {
    try {
      const [ops, maints, drn] = await Promise.all([
        base44.entities.Operation.list('-start_time'),
        base44.entities.Maintenance.filter(m => m.status !== 'completed'),
        base44.entities.Drone.list()
      ]);

      const active = ops.filter(o => o.status === 'active');
      setActiveOps(active);
      setRecentOps(ops.slice(0, 5));
      setMaintenanceAlerts(maints);
      setLiveStreams(active.filter(o => o.stream_url));
      setDrones(drn);

      // Load Conflict Notifications for current user
      if (user) {
          const conflicts = await base44.entities.ConflictNotification.filter({ target_pilot_id: user.id, acknowledged: false });
          setConflictAlerts(conflicts);
      }
    } catch (e: any) {
      // Suppress "Failed to fetch" console noise if polling while offline/unstable
      if (e.message && e.message.includes("Failed to fetch")) {
         console.warn("Dashboard polling failed (network issue)");
      } else {
         console.error("Dashboard data load error", e);
      }
    }
  };

  const handleAckConflict = async (id: string) => {
     try {
         await base44.entities.ConflictNotification.update(id, { acknowledged: true });
         setConflictAlerts(prev => prev.filter(c => c.id !== id));
     } catch (e) {
         console.error(e);
     }
  };

  const openWhatsApp = (phone: string) => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* HEADER / TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <span className="hidden sm:inline">Centro de Comando Operacional</span>
            <span className="sm:hidden">CCO - SYSARP</span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">Monitoramento em Tempo Real - SYSARP</p>
        </div>
        <div className="flex gap-3">
           <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-bold text-sm">{activeOps.length} <span className="hidden sm:inline">Operações Ativas</span><span className="sm:hidden">Ops</span></span>
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* LEFT/TOP: MAP (Flexible width/height) */}
        {/* On Mobile: Height fixed to 50vh. On Desktop: flex-1 */}
        <div className="w-full lg:flex-1 h-[50vh] lg:h-auto relative border-r border-slate-200 shadow-inner z-0">
           <MapContainer 
              center={[-25.2521, -52.0215]} // Paraná Center (Default Fallback)
              zoom={7} 
              style={{ height: '100%', width: '100%' }}
            >
              <MapController /> {/* Componente de Controle Adicionado */}
              
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {activeOps.map(op => {
                // Ensure coordinates are valid numbers before rendering marker to avoid Leaflet errors
                if (typeof op.latitude === 'number' && typeof op.longitude === 'number' && !isNaN(op.latitude) && !isNaN(op.longitude)) {
                  return (
                    <Marker 
                      key={op.id} // Stable ID key prevents remounting on position update
                      position={[op.latitude, op.longitude]} 
                      icon={icon}
                    >
                      <Popup>
                        <div className="p-1">
                          <strong className="text-sm block">{op.name}</strong>
                          <span className="text-xs text-slate-500 block mb-1">#{op.occurrence_number}</span>
                          <Badge variant="danger">{MISSION_HIERARCHY[op.mission_type]?.label || op.mission_type}</Badge>
                          {op.sub_mission_type && (
                             <div className="mt-1 text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                               {op.sub_mission_type}
                             </div>
                          )}
                          {op.stream_url && (
                            <div className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1">
                              <Video className="w-3 h-3" /> Transmissão Disponível
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
           </MapContainer>
           
           {/* Floating Legend */}
           <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 text-xs z-[400]">
              <div className="font-bold text-slate-700 mb-2">Legenda</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>
                <span>Marcador Padrão (Ativo)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 border-t pt-1">
                 <Crosshair className="w-3 h-3" />
                 <span>Centralizado via GPS</span>
              </div>
           </div>
        </div>

        {/* RIGHT/BOTTOM: ALERTS SIDEBAR (Fixed width desktop / Full width mobile) */}
        {/* On Mobile: Height 50vh. On Desktop: width 96 */}
        <div className="w-full lg:w-96 h-[50vh] lg:h-auto bg-slate-100 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-200 z-10 flex-shrink-0 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] lg:shadow-none">
          <div className="p-4 bg-white border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2 shadow-sm flex-shrink-0">
            <Shield className="w-5 h-5 text-red-700" />
            Painel de Controle
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* BOX 1: LIVE STREAMS */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden flex-shrink-0">
              <div className="bg-red-800 px-4 py-2 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Video className="w-3 h-3" />
                  Transmissões
                </h3>
                {liveStreams.length > 0 && <span className="text-[10px] text-white font-bold animate-pulse bg-red-600 px-2 rounded-full">AO VIVO</span>}
              </div>
              
              <div className="p-3 space-y-2">
                {liveStreams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nenhuma transmissão ativa.</p>
                ) : (
                  liveStreams.map(op => (
                    <div key={op.id} className="p-3 bg-red-50 border border-red-100 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                           <h4 className="font-bold text-sm text-slate-800 leading-tight break-words">{op.name}</h4>
                           <p className="text-[10px] text-red-600 font-medium mt-1 uppercase">
                              {MISSION_HIERARCHY[op.mission_type]?.label || op.mission_type}
                           </p>
                        </div>
                        <a href="#/transmissions" className="p-2 bg-white rounded-full text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-colors shadow-sm">
                          <Video className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BOX 2: RECENT OPERATIONS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
              <div className="bg-slate-800 px-4 py-2">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <List className="w-3 h-3" />
                  Operações Recentes
                </h3>
              </div>
              
              <div className="p-3 space-y-2">
                {recentOps.map(op => (
                   <div key={op.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        op.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                         <MapIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                         <div className="flex justify-between items-baseline">
                           <p className="text-xs font-bold text-slate-800 truncate">{op.name}</p>
                           <span className="text-[10px] text-slate-400">{new Date(op.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-mono">#{op.occurrence_number}</p>
                         <div className="mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                              op.status === 'active' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {op.status === 'active' ? 'Em Andamento' : 'Encerrada'}
                            </span>
                         </div>
                      </div>
                   </div>
                ))}
              </div>
            </div>

            {/* BOX 3: MAINTENANCE ALERTS */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden flex-shrink-0">
              <div className="bg-amber-600 px-4 py-2 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Wrench className="w-3 h-3" />
                  Manutenção
                </h3>
                {maintenanceAlerts.length > 0 && (
                   <span className="bg-white text-amber-700 text-[10px] font-bold px-1.5 rounded-full">
                     {maintenanceAlerts.length}
                   </span>
                )}
              </div>
              
              <div className="p-3 space-y-2">
                {maintenanceAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nenhuma manutenção pendente.</p>
                ) : (
                  maintenanceAlerts.map(maint => {
                    const drone = drones.find(d => d.id === maint.drone_id);
                    return (
                      <div key={maint.id} className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-xs font-bold text-amber-900 truncate">{drone?.prefix || 'Aeronave'}</span>
                           <span className="text-[9px] bg-white border border-amber-200 text-amber-800 px-1 rounded">
                             {new Date(maint.maintenance_date).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-tight">{maint.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* BOX 4: CONFLICT ALERTS */}
            <div className="bg-white rounded-xl shadow-sm border border-red-500 overflow-hidden flex-shrink-0 animate-fade-in">
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-yellow-300" />
                  Alertas de Tráfego
                </h3>
                {conflictAlerts.length > 0 && (
                   <span className="bg-white text-red-600 text-[10px] font-bold px-1.5 rounded-full animate-pulse">
                     {conflictAlerts.length}
                   </span>
                )}
              </div>
              
              <div className="p-3 space-y-2">
                {conflictAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Nenhum conflito reportado.</p>
                ) : (
                  conflictAlerts.map(alert => (
                    <div key={alert.id} className="p-3 bg-red-50 border-l-4 border-l-red-600 rounded-r-lg shadow-sm">
                      <div className="mb-2">
                         <p className="text-xs font-bold text-red-800 uppercase mb-0.5">Tráfego Convergente Detectado</p>
                         <p className="text-[11px] text-slate-700 font-semibold">Nova Op: {alert.new_op_name}</p>
                         <p className="text-[11px] text-slate-600">Piloto: {alert.new_pilot_name}</p>
                         <p className="text-[10px] text-slate-500 mt-0.5">
                            Alt: {alert.new_op_altitude}m | Raio: {alert.new_op_radius}m
                         </p>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                         {alert.new_pilot_phone && (
                             <Button 
                                size="sm" 
                                className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white border-none"
                                onClick={() => openWhatsApp(alert.new_pilot_phone!)}
                             >
                                <Phone className="w-3 h-3 mr-1" /> WhatsApp
                             </Button>
                         )}
                         <Button 
                            size="sm" 
                            className="flex-1 h-7 text-[10px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => handleAckConflict(alert.id)}
                         >
                            <Check className="w-3 h-3 mr-1" /> Ciente
                         </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}