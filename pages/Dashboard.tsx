
import React, { useEffect, useState, useCallback, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { base44 } from "../services/base44Client";
import { Operation, Drone, Pilot, Maintenance, MISSION_HIERARCHY, ConflictNotification } from "../types";
import { Badge, Button } from "../components/ui_components";
import { Radio, Video, AlertTriangle, Map as MapIcon, Wrench, List, Shield, Crosshair, Phone, Check } from "lucide-react";

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

// Componente para controlar o mapa (Otimizado)
const MapController = memo(() => {
  const map = useMap();
  const [positionFound, setPositionFound] = useState(false);

  useEffect(() => {
    // 1. Correção de Renderização (Bug do Leaflet em Flexbox) - Request Animation Frame é mais suave que Timeout
    let frameId: number;
    const resizeMap = () => {
       if (map) map.invalidateSize();
    };
    
    // Pequeno delay inicial para garantir montagem do DOM
    const timer = setTimeout(() => {
       frameId = requestAnimationFrame(resizeMap);
    }, 100);

    // 2. Geolocalização do Dispositivo (Apenas uma vez)
    if (!positionFound && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!map || !map.getContainer()) return;
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 10);
          setPositionFound(true);
        },
        (error) => {
          console.warn("Geolocalização bloqueada:", error.message);
          map.setZoom(7); // Fallback zoom
        },
        { timeout: 10000, maximumAge: 60000 } // Cache da posição por 1 min
      );
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [map, positionFound]);

  return null;
});

export default function Dashboard() {
  const [activeOps, setActiveOps] = useState<Operation[]>([]);
  const [recentOps, setRecentOps] = useState<Operation[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<Maintenance[]>([]);
  const [conflictAlerts, setConflictAlerts] = useState<ConflictNotification[]>([]);
  const [liveStreams, setLiveStreams] = useState<Operation[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [currentUser, setCurrentUser] = useState<Pilot | null>(null);
  
  // Ref para controle de montagem e evitar updates em componente desmontado
  const isMounted = React.useRef(true);

  const loadData = useCallback(async (user?: Pilot) => {
    try {
      // Paraleliza as requisições para performance
      const [ops, maints, drn] = await Promise.all([
        base44.entities.Operation.list('-start_time'),
        base44.entities.Maintenance.filter(m => m.status !== 'completed'),
        base44.entities.Drone.list()
      ]);

      if (!isMounted.current) return;

      const active = ops.filter(o => o.status === 'active');
      
      // Batch updates to reduce renders
      setActiveOps(active);
      setRecentOps(ops.slice(0, 5));
      setMaintenanceAlerts(maints);
      setLiveStreams(active.filter(o => o.stream_url));
      setDrones(drn);

      // Load Conflict Notifications for current user
      if (user) {
          const conflicts = await base44.entities.ConflictNotification.filter({ target_pilot_id: user.id, acknowledged: false });
          if(isMounted.current) setConflictAlerts(conflicts);
      }
    } catch (e: any) {
      // Suppress "Failed to fetch" console noise
      if (e.message && e.message.includes("Failed to fetch")) {
         // Silent fail
      } else {
         console.warn("Dashboard partial load error:", e.message);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    const init = async () => {
        try {
            const user = await base44.auth.me();
            if(isMounted.current) {
                setCurrentUser(user);
                loadData(user);
            }
        } catch (e) {
            console.debug("Dashboard init auth check", e);
        }
    };
    init();

    const interval = setInterval(() => {
        if (currentUser && isMounted.current) loadData(currentUser);
    }, 30000);
    
    return () => {
        isMounted.current = false;
        clearInterval(interval);
    };
  }, [currentUser, loadData]);

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
        {/* LEFT/TOP: MAP */}
        <div className="w-full lg:flex-1 h-[50vh] lg:h-auto relative border-r border-slate-200 shadow-inner z-0">
           <MapContainer 
              center={[-25.2521, -52.0215]} 
              zoom={7} 
              style={{ height: '100%', width: '100%' }}
            >
              <MapController />
              
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {activeOps.map(op => {
                // Safety check for valid coordinates
                if (typeof op.latitude !== 'number' || typeof op.longitude !== 'number' || isNaN(op.latitude)) return null;

                return (
                    <Marker 
                      key={op.id} 
                      position={[op.latitude, op.longitude]} 
                      icon={icon}
                    >
                      <Popup>
                        <div className="p-1">
                          <strong className="text-sm block">{op.name}</strong>
                          <span className="text-xs text-slate-500 block mb-1">#{op.occurrence_number}</span>
                          <Badge variant="danger">{MISSION_HIERARCHY[op.mission_type]?.label || op.mission_type}</Badge>
                          {op.stream_url && (
                            <div className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1">
                              <Video className="w-3 h-3" /> Transmissão Disponível
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
              })}
           </MapContainer>
           
           <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 text-xs z-[400]">
              <div className="font-bold text-slate-700 mb-2">Legenda</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>
                <span>Marcador Padrão (Ativo)</span>
              </div>
           </div>
        </div>

        {/* RIGHT/BOTTOM: ALERTS SIDEBAR */}
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
            
            {/* Conflict Alerts */}
            {conflictAlerts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-red-500 overflow-hidden flex-shrink-0 animate-pulse">
                <div className="bg-red-600 px-4 py-2 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Tráfego Convergente
                  </h3>
                </div>
                <div className="p-3">
                   {conflictAlerts.map(alert => (
                     <div key={alert.id} className="text-xs text-red-800 bg-red-50 p-2 rounded mb-1">
                        <strong>{alert.new_op_name}</strong> - Detectado próximo à sua posição.
                        <Button size="sm" className="w-full mt-2 h-6 text-[10px]" onClick={() => handleAckConflict(alert.id)}>Ciente</Button>
                     </div>
                   ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
