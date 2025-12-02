import React, { useState, useEffect } from "react";
import { base44 } from "../services/base44Client";
import { Maintenance, Drone, Pilot, MaintenanceType } from "../types";
import { Card, Button, Input, Select, Badge } from "../components/ui_components";
import { Wrench, Calendar, FileText, Upload, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function MaintenanceManagement() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Maintenance>>({
    maintenance_type: 'corrective',
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    in_flight_incident: false,
    status: 'scheduled'
  });

  const [logFile, setLogFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [maintList, droneList, pilotList] = await Promise.all([
      base44.entities.Maintenance.list('-maintenance_date'),
      base44.entities.Drone.list(),
      base44.entities.Pilot.filter({ status: 'active' })
    ]);
    setMaintenances(maintList);
    setDrones(droneList);
    setPilots(pilotList);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = "";
      if (formData.in_flight_incident && logFile) {
        // Simulating upload
        const uploadResult = await base44.integrations.Core.UploadFile({ file: logFile });
        fileUrl = uploadResult.url;
      }

      await base44.entities.Maintenance.create({
        ...formData,
        log_file_url: fileUrl,
        next_maintenance_date: formData.next_maintenance_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // Default +30 days
        cost: formData.cost || 0
      } as any);

      // Se for corretiva ou incidente, coloca o drone em manutenção
      if (formData.drone_id && (formData.maintenance_type === 'corrective' || formData.in_flight_incident)) {
        await base44.entities.Drone.update(formData.drone_id, { status: 'maintenance' });
      }

      alert("Registro de manutenção criado com sucesso!");
      setFormData({
        maintenance_type: 'corrective',
        maintenance_date: new Date().toISOString().split('T')[0],
        maintenance_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        in_flight_incident: false,
        status: 'scheduled',
        description: '',
        technician: ''
      });
      setLogFile(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar manutenção.");
    } finally {
      setLoading(false);
    }
  };

  const maintenanceTypes: Record<MaintenanceType, string> = {
    preventive: "Preventiva",
    corrective: "Corretiva",
    inspection: "Inspeção",
    calibration: "Calibração",
    battery: "Bateria",
    propeller: "Hélices",
    camera: "Câmera/Gimbal",
    general: "Geral"
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm z-10">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="w-6 h-6 md:w-8 md:h-8 text-slate-700" />
          Gestão de Manutenção
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Controle de intervenções técnicas e histórico da frota.</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6 pb-8">
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* FORMULÁRIO (Left Column on Desktop, Top on Mobile) */}
            <div className="lg:col-span-1">
              <Card className="p-5 md:p-6 lg:sticky lg:top-6 shadow-md border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                   <AlertTriangle className="w-5 h-5 text-amber-600"/>
                   Registrar Evento
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Select 
                    label="Aeronave" 
                    required 
                    value={formData.drone_id || ''} 
                    onChange={e => setFormData({...formData, drone_id: e.target.value})}
                  >
                    <option value="">Selecione o drone...</option>
                    {drones.map(d => (
                      <option key={d.id} value={d.id}>{d.prefix} - {d.model}</option>
                    ))}
                  </Select>

                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Data" 
                      type="date" 
                      required 
                      value={formData.maintenance_date} 
                      onChange={e => setFormData({...formData, maintenance_date: e.target.value})}
                    />
                    <Input 
                      label="Hora" 
                      type="time" 
                      required 
                      value={formData.maintenance_time} 
                      onChange={e => setFormData({...formData, maintenance_time: e.target.value})}
                    />
                  </div>

                  <Select 
                    label="Tipo de Manutenção" 
                    required 
                    value={formData.maintenance_type} 
                    onChange={e => setFormData({...formData, maintenance_type: e.target.value as MaintenanceType})}
                  >
                    {Object.entries(maintenanceTypes).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>

                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        checked={formData.in_flight_incident}
                        onChange={e => setFormData({...formData, in_flight_incident: e.target.checked})}
                      />
                      <span className="font-semibold text-red-800 text-sm">Aconteceu em voo?</span>
                    </label>

                    {formData.in_flight_incident && (
                      <div className="mt-3 animate-fade-in">
                        <label className="block text-xs font-medium text-red-700 mb-1">
                          Log de Voo (AirData/KML/KMZ)
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer bg-white border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm">
                            <Upload className="w-4 h-4 mr-2" />
                            <span className="truncate">{logFile ? logFile.name : "Anexar Arquivo"}</span>
                            <input type="file" className="hidden" accept=".kml,.kmz,.csv,.txt" onChange={handleFileChange} />
                          </label>
                        </div>
                        <p className="text-[10px] text-red-500 mt-1">Obrigatório anexar a telemetria do voo.</p>
                      </div>
                    )}
                  </div>

                  <Select 
                    label="Piloto Responsável" 
                    required={formData.in_flight_incident} // Obrigatório se foi incidente
                    value={formData.pilot_id || ''} 
                    onChange={e => setFormData({...formData, pilot_id: e.target.value})}
                  >
                    <option value="">Selecione o piloto...</option>
                    {pilots.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                    ))}
                  </Select>

                  <Input 
                    label="Técnico / Oficina" 
                    placeholder="Nome do técnico ou empresa"
                    required
                    value={formData.technician || ''} 
                    onChange={e => setFormData({...formData, technician: e.target.value})}
                  />

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição do Problema</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
                      placeholder="Descreva o problema ou serviço realizado..."
                      required
                      value={formData.description || ''} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {loading ? 'Salvando...' : 'Registrar Manutenção'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* LISTA HISTÓRICO (Right Column on Desktop, Bottom on Mobile) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-slate-500"/> Histórico de Eventos
              </h2>
              
              {maintenances.length === 0 ? (
                <div className="p-8 md:p-12 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum registro de manutenção encontrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenances.map(maint => {
                    const drone = drones.find(d => d.id === maint.drone_id);
                    const pilot = pilots.find(p => p.id === maint.pilot_id);

                    return (
                      <Card key={maint.id} className="p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={maint.maintenance_type === 'corrective' ? 'danger' : 'default'}>
                              {maintenanceTypes[maint.maintenance_type]}
                            </Badge>
                            <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                              <Calendar className="w-3 h-3" /> {new Date(maint.maintenance_date).toLocaleDateString()}
                              <span className="mx-1">•</span>
                              <Clock className="w-3 h-3" /> {maint.maintenance_time}
                            </span>
                          </div>
                          {maint.in_flight_incident && (
                            <Badge variant="danger" className="flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Incidente em Voo
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 mt-3">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Aeronave</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{drone ? `${drone.prefix} - ${drone.model}` : 'Drone Removido'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Técnico / Responsável</p>
                            <p className="text-slate-900 text-sm truncate">{maint.technician}</p>
                          </div>
                          {pilot && (
                            <div className="sm:col-span-2">
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Piloto no Comando</p>
                               <p className="text-slate-900 text-sm">{pilot.full_name}</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 mb-3 border border-slate-100">
                          <p className="font-bold text-[10px] text-slate-500 mb-1 uppercase">Descrição Detalhada</p>
                          <p className="whitespace-pre-wrap">{maint.description}</p>
                        </div>

                        {maint.log_file_url && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-blue-700 uppercase">Log de Voo:</span>
                            <a href={maint.log_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium break-all">
                              Baixar Telemetria (KMZ/KML)
                            </a>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}