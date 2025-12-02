import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { base44 } from "../services/base44Client";
import { sarpasApi } from "../services/sarpasApi";
import { operationSummerService } from "../services/operationSummerService";
import { Operation, Drone, Pilot, MISSION_HIERARCHY, ARO_SCENARIOS, AroItem, AroAssessment, MissionType, ConflictNotification } from "../types";
import { SUMMER_LOCATIONS } from "../types_summer";
import { Button, Input, Select, Badge } from "../components/ui_components";
import { Plus, Video, Map as MapIcon, Clock, ArrowLeft, Save, Crosshair, User, Plane, Share2, Pencil, X, CloudRain, Wind, CheckSquare, ShieldCheck, AlertTriangle, Radio, Send, Sun, FileText, Timer, Anchor } from "lucide-react";

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

// Icone para o marcador temporário (seleção manual)
const tempIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const LocationSelector = ({ onLocationSelect, isSelecting }: { onLocationSelect: (lat: number, lng: number) => void, isSelecting: boolean }) => {
  useMapEvents({
    click(e) {
      if (isSelecting) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Safe Map Controller
const MapController = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && map.getContainer()) map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Weather Widget Component
const WeatherWidget = ({ lat, lng }: { lat: number, lng: number }) => {
  const windSpeed = Math.floor(Math.random() * 25) + 5; // 5-30 km/h
  const kpIndex = Math.floor(Math.random() * 4); // 0-4
  const rainProb = Math.floor(Math.random() * 30); // 0-30%

  return (
    <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 w-full animate-fade-in mt-2 shadow-md">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
        <CloudRain className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider">Meteorologia Local (Estimada)</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-slate-800/50 p-2 rounded">
            <Wind className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-400">Vento</span>
            <span className={`text-xs font-bold ${windSpeed > 20 ? 'text-red-400' : 'text-green-400'}`}>{windSpeed} km/h</span>
        </div>
        <div className="flex flex-col items-center bg-slate-800/50 p-2 rounded">
            <AlertTriangle className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-400">Índice KP</span>
            <span className={`text-xs font-bold ${kpIndex > 3 ? 'text-red-400' : 'text-green-400'}`}>{kpIndex}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-800/50 p-2 rounded">
            <CloudRain className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-400">Chuva</span>
            <span className="text-xs font-bold text-blue-300">{rainProb}%</span>
        </div>
      </div>
      <div className="mt-2 text-[9px] text-slate-500 text-center border-t border-slate-800 pt-1">
        Coords: {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
};

// Haversine Distance Calculation (in meters)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const getRiskColor = (code: string) => {
    const red = ["5A", "5B", "5C", "4A", "4B", "3A"];
    const orange = ["5D", "4C", "3B", "2A", "2B"];
    const yellow = ["5E", "4D", "4E", "3C", "3D", "2C", "1A", "1B"];
    if (red.includes(code)) return "bg-red-600 text-white";
    if (orange.includes(code)) return "bg-orange-500 text-white";
    if (yellow.includes(code)) return "bg-yellow-400 text-black";
    return "bg-green-500 text-white";
};

const AroModal = ({ onConfirm, onCancel }: any) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="font-bold text-xl mb-4">Avaliação de Risco Operacional (Simulação)</h2>
                <p className="mb-4 text-slate-600">Confirme que a avaliação de risco foi realizada para esta operação.</p>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={() => onConfirm({items: [], declaration_accepted: true, rubric: "SYSTEM", created_at: new Date().toISOString()})}>
                        Confirmar A.R.O.
                    </Button>
                </div>
            </div>
        </div>
    )
};

const ChecklistModal = ({ onConfirm, onCancel }: any) => (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="font-bold text-xl mb-4">Checklist de Decolagem</h2>
            <p className="mb-4">Verifique itens físicos e de segurança antes de prosseguir.</p>
            <Button onClick={onConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white">Confirmar Decolagem</Button>
            <Button variant="outline" onClick={onCancel} className="w-full mt-2">Cancelar</Button>
        </div>
    </div>
);

const ConflictModal = ({ conflicts, onAck, onCancel }: any) => (
     <div className="fixed inset-0 bg-red-900/80 z-[2001] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg max-w-md w-full border-4 border-red-500">
            <h2 className="font-bold text-xl text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6"/> ALERTA DE CONFLITO
            </h2>
            <p className="mb-4 text-slate-700 font-medium">Conflito de espaço aéreo detectado com {conflicts.length} operação(ões) ativa(s).</p>
            
            <div className="bg-red-50 p-3 rounded mb-4 text-sm">
                <p className="font-bold text-red-800">Aeronave(s) próxima(s):</p>
                <ul className="list-disc list-inside text-red-700">
                    {conflicts.map((c: Operation) => <li key={c.id}>{c.name} ({c.radius}m)</li>)}
                </ul>
            </div>

            <Button onClick={onAck} className="w-full bg-red-600 text-white hover:bg-red-700">Estou Ciente (Manter Coordenação)</Button>
            <Button variant="outline" onClick={onCancel} className="w-full mt-2">Abortar Criação</Button>
        </div>
    </div>
);

export default function OperationManagement() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState<Operation | null>(null);
  
  const [showChecklist, setShowChecklist] = useState(false); 
  const [showAroModal, setShowAroModal] = useState(false); 
  const [conflictData, setConflictData] = useState<Operation[] | null>(null); 
  const [loading, setLoading] = useState(false);
  
  const [aroData, setAroData] = useState<AroAssessment | null>(null); 
  const [tempMarker, setTempMarker] = useState<{lat: number, lng: number} | null>(null);
  const [sendToSarpas, setSendToSarpas] = useState(false); 
  
  // Summer Op States
  const [isSummerOp, setIsSummerOp] = useState(false);
  const [summerCity, setSummerCity] = useState("");
  const [summerPost, setSummerPost] = useState("");

  const initialFormState = {
    name: '',
    pilot_id: '',
    drone_id: '',
    mission_type: 'search_rescue' as MissionType,
    sub_mission_type: '',
    latitude: -25.2521, 
    longitude: -52.0215,
    radius: 500,
    flight_altitude: 60,
    stream_url: '',
    description: '',
    duration_minutes: 60
  };

  // Estado estendido para o formulário
  const [formData, setFormData] = useState(initialFormState);

  const [finishData, setFinishData] = useState({
    description: '',
    actions_taken: '',
    flight_hours: 0,
    photos: [] as File[],
    kmz_file: null as File | null
  });

  const loadData = async () => {
    try {
      const [ops, pils, drns] = await Promise.all([
        base44.entities.Operation.list('-created_at'),
        base44.entities.Pilot.filter({ status: 'active' }),
        base44.entities.Drone.list()
      ]);
      setOperations(ops);
      setPilots(pils);
      setDrones(drns);
    } catch(e: any) {
      // Suppress network errors during polling to avoid console spam
      if (e.message && e.message.includes("Failed to fetch")) {
         console.warn("Network error during data load (retrying...)");
      } else {
         console.error(e);
      }
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    setTempMarker({ lat, lng });
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const checkConflicts = (newOp: typeof formData): Operation[] => {
    if (!newOp.latitude || !newOp.longitude || !newOp.radius) return [];
    const activeOps = operations.filter(op => op.status === 'active' && op.id !== isEditing);
    const conflicts: Operation[] = [];
    activeOps.forEach(existingOp => {
      const distance = getDistance(newOp.latitude, newOp.longitude, existingOp.latitude, existingOp.longitude);
      if (distance < ((newOp.radius) + existingOp.radius + 100)) conflicts.push(existingOp);
    });
    return conflicts;
  };

  // Função para iniciar edição populando o formulário
  const handleStartEdit = (op: Operation) => {
    setFormData({
        name: op.name,
        pilot_id: op.pilot_id,
        drone_id: op.drone_id,
        mission_type: op.mission_type,
        sub_mission_type: op.sub_mission_type || '',
        latitude: op.latitude,
        longitude: op.longitude,
        radius: op.radius,
        flight_altitude: op.flight_altitude || 60,
        stream_url: op.stream_url || '',
        description: op.description || '',
        duration_minutes: 60 // Padrão, pois não guardamos a previsão no DB
    });
    setTempMarker({ lat: op.latitude, lng: op.longitude });
    setIsEditing(op.id);
    setIsCreating(true); // Força a exibição do formulário
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setIsEditing(null);
    setTempMarker(null);
    setFormData(initialFormState);
    setSendToSarpas(false);
    setIsSummerOp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
       performSave();
    } else {
       if (!formData.pilot_id || !formData.drone_id) { alert("Selecione piloto e drone"); return; }
       if (!formData.name) { alert("Nome da operação é obrigatório"); return; }
       
       if (isSummerOp) {
          if (!summerCity || !summerPost) {
             alert("Para Operação Verão, é obrigatório selecionar a Localidade e o Posto de Guarda-Vidas.");
             return;
          }
       }

       const conflicts = checkConflicts(formData);
       if (conflicts.length > 0) setConflictData(conflicts);
       else setShowAroModal(true);
    }
  };

  const handleConflictAck = () => {
    setShowAroModal(true);
  };

  const handleAroConfirm = (assessment: AroAssessment) => {
    setAroData(assessment);
    setShowAroModal(false);
    setShowChecklist(true);
  };

  const performSave = async () => {
    setLoading(true);
    try {
      if (isEditing) {
        // Atualiza a operação existente
        await base44.entities.Operation.update(isEditing, {
          name: formData.name,
          pilot_id: formData.pilot_id,
          drone_id: formData.drone_id,
          stream_url: formData.stream_url,
          radius: formData.radius,
          flight_altitude: formData.flight_altitude,
          mission_type: formData.mission_type,
          sub_mission_type: formData.sub_mission_type,
          description: formData.description,
          latitude: formData.latitude,
          longitude: formData.longitude
        });
        alert("Operação atualizada com sucesso!");
        handleCancelForm();
      } else {
        const selectedPilot = pilots.find(p => p.id === formData.pilot_id);
        const selectedDrone = drones.find(d => d.id === formData.drone_id);
        
        let sarpasProtocol = "";
        let finalEndTime = undefined;

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000);
        finalEndTime = endTime.toISOString();
        
        let finalDescription = formData.description;
        if (isSummerOp && summerCity && summerPost) {
            const summerHeader = `[OP VERÃO] ${summerCity} - ${summerPost}`;
            finalDescription = finalDescription 
               ? `${summerHeader}\n\n${finalDescription}` 
               : summerHeader;
        }

        if (sendToSarpas && selectedPilot && selectedDrone) {
           try {
             sarpasProtocol = await sarpasApi.submitFlightRequest({
                ...formData,
                description: finalDescription,
                start_time: startTime.toISOString(),
                end_time: finalEndTime
             }, selectedPilot, selectedDrone);
             alert(`Solicitação SARPAS enviada! Protocolo: ${sarpasProtocol}`);
           } catch (sarpasError) {
             console.error("Erro SARPAS", sarpasError);
             if(!confirm("Erro ao conectar com SARPAS. Deseja continuar criando a operação apenas localmente?")) {
                setLoading(false);
                return;
             }
           }
        }

        const occurrenceNumber = `${new Date().getFullYear()}${selectedPilot?.unit?.split(' ')[0] || 'BM'}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        // Remove duration_minutes from payload
        const { duration_minutes, ...dbPayload } = formData;

        await base44.entities.Operation.create({
          ...dbPayload,
          occurrence_number: occurrenceNumber,
          status: 'active',
          start_time: startTime.toISOString(),
          end_time: finalEndTime,
          photos: [],
          sarpas_protocol: sarpasProtocol,
          aro: aroData,
          is_summer_op: isSummerOp,
          description: finalDescription || `Operação iniciada em ${startTime.toLocaleString()}`
        } as any);

        await base44.entities.Drone.update(formData.drone_id, { status: 'in_operation' });

        if (conflictData && conflictData.length > 0) {
           for (const existingOp of conflictData) {
              const notification: Omit<ConflictNotification, 'id'> = {
                 target_pilot_id: existingOp.pilot_id,
                 new_op_name: formData.name,
                 new_pilot_name: selectedPilot?.full_name || 'Desconhecido',
                 new_pilot_phone: selectedPilot?.phone || '',
                 new_op_altitude: formData.flight_altitude,
                 new_op_radius: formData.radius,
                 created_at: new Date().toISOString(),
                 acknowledged: false
              };
              
              try {
                await base44.entities.ConflictNotification.create(notification);
              } catch (e) {
                console.error("Erro ao criar notificação de conflito", e);
              }
           }
        }
        
        handleCancelForm();
      }
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao salvar operação: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setShowChecklist(false);
      setShowAroModal(false);
      setConflictData(null); 
    }
  };

  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFinishing) return;
    setLoading(true);

    try {
      const endTime = new Date();
      const startTime = new Date(isFinishing.start_time);
      const calculatedDuration = Number(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2));
      
      let kmzUrl = "";
      if (finishData.kmz_file) {
        const upload = await base44.integrations.Core.UploadFile({ file: finishData.kmz_file });
        kmzUrl = upload.url;
      }

      await base44.entities.Operation.update(isFinishing.id, {
        status: 'completed',
        end_time: endTime.toISOString(),
        flight_hours: calculatedDuration,
        description: finishData.description,
        actions_taken: finishData.actions_taken,
        kmz_file: kmzUrl
      } as any);

      const currentDrone = drones.find(d => d.id === isFinishing.drone_id);
      await base44.entities.Drone.update(isFinishing.drone_id, { 
          status: 'available',
          total_flight_hours: (currentDrone?.total_flight_hours || 0) + calculatedDuration
      });
      
      await base44.entities.FlightLog.create({
        operation_id: isFinishing.id,
        pilot_id: isFinishing.pilot_id,
        drone_id: isFinishing.drone_id,
        flight_date: isFinishing.start_time,
        flight_hours: calculatedDuration,
        mission_type: isFinishing.mission_type
      });

      if (isFinishing.is_summer_op) {
         const pilot = pilots.find(p => p.id === isFinishing.pilot_id);
         
         const missionMap: Record<string, 'patrulha' | 'resgate' | 'prevencao' | 'apoio' | 'treinamento'> = {
           search_rescue: 'resgate',
           fire: 'apoio',
           civil_defense: 'apoio',
           monitoring: 'patrulha',
           air_support: 'apoio',
           disaster: 'apoio'
         };
         
         let locationName = isFinishing.name;
         if (isFinishing.description && isFinishing.description.includes('[OP VERÃO]')) {
             const firstLine = isFinishing.description.split('\n')[0];
             locationName = firstLine.replace('[OP VERÃO] ', '').trim();
         }

         await operationSummerService.create({
            pilot_id: isFinishing.pilot_id,
            drone_id: isFinishing.drone_id,
            mission_type: missionMap[isFinishing.mission_type] || 'prevencao', 
            location: locationName, 
            date: isFinishing.start_time.split('T')[0],
            start_time: new Date(isFinishing.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            end_time: endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            flight_duration: Math.round(calculatedDuration * 60),
            notes: `Ocorrência: ${isFinishing.occurrence_number}. ${finishData.description}`,
            evidence_photos: [],
            evidence_videos: []
         }, pilot?.id || 'system');
         
         alert("Registro no Diário da Operação Verão criado automaticamente!");
      }

      setIsFinishing(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Erro ao encerrar operação");
    } finally {
      setLoading(false);
    }
  };

  const activeOps = operations.filter(o => o.status === 'active');

  return (
    <div className="flex flex-col lg:flex-row h-full w-full relative bg-slate-100 overflow-hidden">
      {/* Modals */}
      {conflictData && <ConflictModal conflicts={conflictData} onAck={handleConflictAck} onCancel={() => setConflictData(null)} />}
      {showAroModal && <AroModal onConfirm={handleAroConfirm} onCancel={() => setShowAroModal(false)} />}
      {showChecklist && <ChecklistModal onConfirm={performSave} onCancel={() => setShowChecklist(false)} />}

      {/* MAP - On mobile: fixed height at top. Desktop: flexible */}
      <div className="w-full h-[40vh] lg:h-full lg:flex-1 z-0 relative order-1 lg:order-1 border-b lg:border-r border-slate-200">
        <MapContainer 
          center={[-25.2521, -52.0215]} 
          zoom={8} 
          style={{ height: '100%', width: '100%' }}
        >
          <MapController />
          <TileLayer attribution='OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationSelector onLocationSelect={handleLocationSelect} isSelecting={isCreating} />
          {activeOps.map(op => {
            if (typeof op.latitude !== 'number' || typeof op.longitude !== 'number' || isNaN(op.latitude) || isNaN(op.longitude)) {
              return null;
            }
            return (
              <Marker key={op.id} position={[op.latitude, op.longitude]} icon={icon}>
                  <Popup>
                    <b>{op.name}</b><br/>
                    {op.is_summer_op && <span className="text-orange-600 font-bold text-xs">☀️ Op. Verão</span>}
                  </Popup>
              </Marker>
            );
          })}
          {tempMarker && (
            <>
              <Marker key="temp-marker" position={[tempMarker.lat, tempMarker.lng]} icon={tempIcon} />
              <Circle 
                center={[tempMarker.lat, tempMarker.lng]} 
                radius={formData.radius} 
                pathOptions={{ color: 'orange', dashArray: '5, 5', fillColor: 'orange', fillOpacity: 0.2 }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* SIDEBAR - Mobile: flex-1 (fills rest). Desktop: fixed width */}
      <div className="w-full lg:w-[28rem] h-auto flex-1 lg:h-full bg-white lg:border-l border-slate-200 z-10 flex flex-col shadow-xl overflow-hidden order-2 lg:order-2">
        {isCreating ? (
           <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
                 <h2 className="font-bold text-lg text-slate-800">{isEditing ? 'Editar Operação' : 'Nova Operação'}</h2>
                 <Button variant="outline" onClick={handleCancelForm} size="sm"><X className="w-4 h-4"/></Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <form id="opForm" onSubmit={handleSubmit} className="space-y-6">
                    {/* Form content maintained... */}
                    <div className="space-y-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase border-b pb-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Identificação e Meios
                         </h3>
                         <div className="space-y-3">
                            <Input label="Nome da Operação" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Busca em Matinhos" required />
                            <div className="grid grid-cols-2 gap-3">
                                <Select label="Piloto" required value={formData.pilot_id} onChange={e => setFormData({...formData, pilot_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {pilots.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                </Select>
                                <Select label="Aeronave" required value={formData.drone_id} onChange={e => setFormData({...formData, drone_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.prefix}</option>)}
                                </Select>
                            </div>
                         </div>
                    </div>

                    <div className="space-y-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase border-b pb-1 flex items-center gap-2">
                            <Radio className="w-3 h-3" /> Detalhes da Missão
                         </h3>
                         <div className="grid grid-cols-2 gap-3">
                            <Select label="Natureza" required value={formData.mission_type} onChange={e => setFormData({...formData, mission_type: e.target.value as any, sub_mission_type: ''})}>
                                {Object.entries(MISSION_HIERARCHY).map(([k, v]) => <option key={k} value={k}>{(v as any).label}</option>)}
                            </Select>
                            <Select label="Sub-natureza" required value={formData.sub_mission_type} onChange={e => setFormData({...formData, sub_mission_type: e.target.value})}>
                                <option value="">Selecione...</option>
                                {MISSION_HIERARCHY[formData.mission_type]?.subtypes.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </Select>
                         </div>
                         <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição / Observações (SARPAS)</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none h-20 resize-none"
                                placeholder="Detalhes da ocorrência para solicitação de voo..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                         </div>
                    </div>

                    <div className="space-y-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase border-b pb-1 flex items-center gap-2">
                            <Plane className="w-3 h-3" /> Parâmetros de Voo
                         </h3>
                         <div className="grid grid-cols-3 gap-3">
                            <Input label="Raio (m)" type="number" value={formData.radius} onChange={e => setFormData({...formData, radius: Number(e.target.value)})} required />
                            <Input label="Altitude (m)" type="number" value={formData.flight_altitude} onChange={e => setFormData({...formData, flight_altitude: Number(e.target.value)})} required />
                            <Select label="Duração Est." value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}>
                                <option value="30">30 min</option>
                                <option value="60">1 hora</option>
                                <option value="120">2 horas</option>
                                <option value="180">3 horas</option>
                            </Select>
                         </div>
                         <Input label="Link de Transmissão (Opcional)" placeholder="RTMP / YouTube / DroneDeploy" value={formData.stream_url} onChange={e => setFormData({...formData, stream_url: e.target.value})} />
                    </div>

                    <div className="space-y-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase border-b pb-1 flex items-center gap-2">
                            <MapIcon className="w-3 h-3" /> Localização e Clima
                         </h3>
                         <div className="grid grid-cols-2 gap-3">
                             <Input label="Latitude" value={formData.latitude} readOnly className="bg-slate-50 text-slate-500" />
                             <Input label="Longitude" value={formData.longitude} readOnly className="bg-slate-50 text-slate-500" />
                         </div>
                         <div className="p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 flex items-center gap-2">
                            <Crosshair className="w-4 h-4" />
                            Clique no mapa para atualizar a coordenada.
                         </div>
                         <WeatherWidget lat={formData.latitude} lng={formData.longitude} />
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Send className="w-4 h-4 text-indigo-600" />
                                <div>
                                    <span className="text-xs font-bold text-indigo-800 block">Solicitar Voo (SARPAS)</span>
                                    <span className="text-xs text-indigo-600 block">Envia solicitação automaticamente</span>
                                </div>
                            </div>
                            <input type="checkbox" className="accent-indigo-600 w-4 h-4" checked={sendToSarpas} onChange={(e) => setSendToSarpas(e.target.checked)} />
                        </div>

                        <div className={`p-3 border rounded-lg transition-colors ${isSummerOp ? 'bg-orange-100 border-orange-300' : 'bg-orange-50 border-orange-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Sun className="w-5 h-5 text-orange-500" />
                                    <div>
                                    <p className="text-xs font-bold text-orange-800">Op. Verão 2025/2026</p>
                                    <p className="text-xs text-orange-600">Vincular estatísticas</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isSummerOp} onChange={(e) => setIsSummerOp(e.target.checked)} />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>
                            
                            {isSummerOp && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-orange-200 animate-fade-in">
                                    <div className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1 mb-1">
                                       <Anchor className="w-3 h-3" /> Detalhamento Operacional
                                    </div>
                                    <div className="space-y-3">
                                        <Select 
                                            label="Localidade / Município" 
                                            value={summerCity} 
                                            onChange={(e) => {
                                                setSummerCity(e.target.value); 
                                                setSummerPost(''); 
                                                if(e.target.value && formData.name === '') {
                                                    setFormData(prev => ({...prev, name: `Op. ${e.target.value}`}));
                                                }
                                            }}
                                            className="bg-white"
                                            labelClassName="text-orange-900"
                                        >
                                            <option value="">Selecione...</option>
                                            {Object.keys(SUMMER_LOCATIONS).map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </Select>

                                        <Select 
                                            label="Posto de Guarda-Vidas (PGV)" 
                                            value={summerPost} 
                                            onChange={(e) => {
                                                setSummerPost(e.target.value);
                                                if(summerCity && e.target.value && formData.name.startsWith('Op.')) {
                                                    setFormData(prev => ({...prev, name: `${e.target.value} - ${summerCity}`}));
                                                }
                                            }} 
                                            disabled={!summerCity}
                                            className="bg-white"
                                            labelClassName="text-orange-900"
                                        >
                                            <option value="">Selecione o PGV...</option>
                                            {summerCity && SUMMER_LOCATIONS[summerCity]?.map(pgv => (
                                                <option key={pgv} value={pgv}>{pgv}</option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
              </div>

              <div className="p-4 border-t bg-white shrink-0">
                 <Button form="opForm" type="submit" disabled={loading} className="w-full bg-blue-600 text-white h-12 font-bold text-lg shadow-lg hover:bg-blue-700">
                    {loading ? "Processando..." : (isEditing ? "SALVAR ALTERAÇÕES" : "INICIAR OPERAÇÃO")}
                 </Button>
              </div>
           </div>
        ) : (
           <div className="p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                 <h2 className="font-bold text-lg text-slate-800">Operações Ativas</h2>
                 <Button onClick={() => setIsCreating(true)} className="shadow-md"><Plus className="w-4 h-4 mr-1"/> Nova</Button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                 {activeOps.length === 0 && (
                    <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma operação em andamento.</p>
                    </div>
                 )}
                 {activeOps.map(op => (
                    <div key={op.id} className="p-4 border border-l-4 border-l-red-600 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm text-slate-900">{op.name}</h4>
                          {op.is_summer_op && <Sun className="w-4 h-4 text-orange-500" />}
                       </div>
                       <p className="text-xs text-slate-500 font-mono mb-2">{op.occurrence_number}</p>
                       
                       <div className="flex gap-2 mb-3">
                          <Badge variant="default">{MISSION_HIERARCHY[op.mission_type]?.label || op.mission_type}</Badge>
                          {op.sarpas_protocol && <Badge variant="success" className="text-[10px]">SARPAS OK</Badge>}
                       </div>

                       <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleStartEdit(op)}>
                             <Pencil className="w-3 h-3 mr-1"/> Editar
                          </Button>
                          <Button size="sm" className="flex-1 text-xs h-8 bg-red-600 text-white hover:bg-red-700" onClick={() => setIsFinishing(op)}>
                             Encerrar
                          </Button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
      
      {/* FINISH MODAL */}
      {isFinishing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-lg max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="font-bold text-lg mb-4 border-b pb-2">Encerrar Operação</h3>
              <form onSubmit={handleFinishSubmit} className="space-y-4">
                 <div>
                    <label className="text-sm font-bold text-slate-700 mb-1 block">Relatório Final / Descrição</label>
                    <textarea 
                        className="w-full border p-2 rounded text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 outline-none" 
                        placeholder="Descreva como foi a operação..." 
                        value={finishData.description}
                        onChange={e => setFinishData({...finishData, description: e.target.value})}
                        required
                    />
                 </div>
                 <div>
                    <label className="text-sm font-bold text-slate-700 mb-1 block">Ações Realizadas</label>
                    <textarea 
                        className="w-full border p-2 rounded text-sm h-20 resize-none focus:ring-2 focus:ring-red-500 outline-none" 
                        placeholder="Quais medidas foram tomadas..." 
                        value={finishData.actions_taken}
                        onChange={e => setFinishData({...finishData, actions_taken: e.target.value})}
                        required
                    />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsFinishing(null)}>Cancelar</Button>
                    <Button type="submit" className="bg-red-600 text-white hover:bg-red-700">Confirmar Encerramento</Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}