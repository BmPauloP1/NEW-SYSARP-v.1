

import React, { useState, useEffect } from "react";
import { base44 } from "../services/base44Client";
import { Drone, Pilot, Operation } from "../types";
import { Card, Input, Select, Button } from "../components/ui_components";
import { FileText, Plane, Clock, Map as MapIcon, Save, Download, User, Navigation, Radio, CheckCircle } from "lucide-react";
import jsPDF from 'jspdf';

export default function FlightPlan() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [activeOps, setActiveOps] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOpId, setSelectedOpId] = useState("");

  const [formData, setFormData] = useState({
    pilot_id: "",
    drone_id: "",
    callsign: "",
    flight_rules: "V", // VFR
    type_of_flight: "M", // Military/Government
    aircraft_type: "RPA",
    departure_aerodrome: "ZZZZ",
    departure_time: "",
    cruising_speed: "N0050", // Knots
    level: "VFR",
    route: "DCT",
    destination_aerodrome: "ZZZZ",
    total_eet: "",
    altn_aerodrome: "",
    endurance: "",
    persons_on_board: "0",
    emergency_radio: "UHF",
    survival_equipment: "NIL",
    jackets: "NIL",
    dinghies: "NIL",
    remarks: "OP BOMBEIROS"
  });

  useEffect(() => {
    const loadData = async () => {
      const [p, d, ops] = await Promise.all([
        base44.entities.Pilot.filter({ status: 'active' }),
        base44.entities.Drone.filter({ status: 'available' }),
        base44.entities.Operation.filter({ status: 'active' })
      ]);
      setPilots(p);
      setDrones(d);
      setActiveOps(ops);
    };
    loadData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOperationSelect = (opId: string) => {
    setSelectedOpId(opId);
    if (!opId) return;

    const op = activeOps.find(o => o.id === opId);
    if (op) {
      setFormData(prev => ({
        ...prev,
        pilot_id: op.pilot_id || prev.pilot_id,
        drone_id: op.drone_id || prev.drone_id,
        remarks: `${op.name} (Ocorrência #${op.occurrence_number})`
      }));
    }
  };

  const handleSaveToSystem = async () => {
    if (!selectedOpId) {
      alert("Para salvar no sistema, selecione uma operação ativa no campo 'Vincular Operação'.");
      return;
    }
    
    setLoading(true);
    try {
      await base44.entities.Operation.update(selectedOpId, {
        flight_plan_data: JSON.stringify(formData)
      });
      alert("Plano de voo salvo e vinculado à operação com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar plano de voo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    setLoading(true);
    const doc = new jsPDF();
    const pilot = pilots.find(p => p.id === formData.pilot_id);
    const drone = drones.find(d => d.id === formData.drone_id);

    // Header
    doc.setFillColor(200, 200, 200);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PLANO DE VOO / NOTIFICAÇÃO", 105, 12, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    let y = 30;
    const lineHeight = 7;

    // Section 1: Identificação
    doc.setFont("helvetica", "bold");
    doc.text("1. IDENTIFICAÇÃO", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`Identificação da Aeronave: ${formData.callsign || (drone ? drone.prefix : "N/A")}`, 14, y);
    doc.text(`Regras de Voo: ${formData.flight_rules}`, 110, y);
    y += lineHeight;
    doc.text(`Tipo de Voo: ${formData.type_of_flight}`, 14, y);
    doc.text(`Número SISANT: ${drone?.sisant || "N/A"}`, 110, y);
    
    y += lineHeight * 2;

    // Section 2: Voo
    doc.setFont("helvetica", "bold");
    doc.text("2. DADOS DO VOO", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`Aeródromo de Partida: ${formData.departure_aerodrome}`, 14, y);
    doc.text(`Hora (EOBT): ${formData.departure_time || "0000"}`, 110, y);
    y += lineHeight;
    doc.text(`Velocidade de Cruzeiro: ${formData.cruising_speed}`, 14, y);
    doc.text(`Nível: ${formData.level}`, 110, y);
    y += lineHeight;
    doc.text(`Rota: ${formData.route}`, 14, y);
    y += lineHeight;
    doc.text(`Aeródromo de Destino: ${formData.destination_aerodrome}`, 14, y);
    doc.text(`EET Total: ${formData.total_eet || "0030"}`, 110, y);
    y += lineHeight;
    doc.text(`Alt. Aeródromo: ${formData.altn_aerodrome || "NIL"}`, 14, y);

    y += lineHeight * 2;

    // Section 3: Outras Informações
    doc.setFont("helvetica", "bold");
    doc.text("3. OUTRAS INFORMAÇÕES (RMK)", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`${formData.remarks} / OPR: CBM-PR`, 14, y);
    y += lineHeight;
    doc.text(`Autonomia: ${formData.endurance || "0045"}`, 14, y);
    doc.text(`Pessoas a Bordo: ${formData.persons_on_board}`, 110, y);

    y += lineHeight * 2;

    // Section 4: Piloto em Comando
    doc.setFont("helvetica", "bold");
    doc.text("4. PILOTO EM COMANDO", 14, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${pilot?.full_name || "N/A"}`, 14, y);
    doc.text(`Código SARPAS: ${pilot?.sarpas_code || "N/A"}`, 110, y);
    y += lineHeight;
    doc.text(`Licença/Certificado: ${pilot?.license || "N/A"}`, 14, y);
    doc.text(`Telefone: ${pilot?.phone || "N/A"}`, 110, y);

    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.text("Documento gerado pelo sistema SYSARP - Uso exclusivo para coordenação operacional.", 105, y, { align: "center" });

    doc.save("Plano_de_Voo.pdf");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      {/* Header Section (Fixed) */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            Plano de Voo
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Preenchimento e emissão de notificação de voo padrão.</p>
        </div>
        <Button 
          onClick={handleGeneratePDF} 
          disabled={loading} 
          className="w-full md:w-auto bg-slate-900 hover:bg-black shadow-md transition-transform active:scale-95"
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Gerando..." : "Baixar PDF"}
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Form Column (Left) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Identification */}
              <Card className="p-5 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-blue-600" /> Identificação e Equipamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select 
                    label="Piloto em Comando" 
                    value={formData.pilot_id} 
                    onChange={(e) => handleChange('pilot_id', e.target.value)}
                    className="bg-slate-50"
                  >
                    <option value="">Selecione...</option>
                    {pilots.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </Select>

                  <Select 
                    label="Vincular Operação (Opcional)" 
                    value={selectedOpId} 
                    onChange={(e) => handleOperationSelect(e.target.value)}
                    className="bg-blue-50 border-blue-200 text-blue-900"
                  >
                     <option value="">Selecione para preencher...</option>
                     {activeOps.map(op => (
                       <option key={op.id} value={op.id}>
                          {op.name} (#{op.occurrence_number})
                       </option>
                     ))}
                  </Select>
                  
                  <Select 
                    label="Aeronave (RPA)" 
                    value={formData.drone_id} 
                    onChange={(e) => handleChange('drone_id', e.target.value)}
                    className="bg-slate-50"
                  >
                    <option value="">Selecione...</option>
                    {drones.map(d => <option key={d.id} value={d.id}>{d.prefix} - {d.model}</option>)}
                  </Select>
                  
                  <Input 
                    label="Identificação (Callsign)" 
                    placeholder="Ex: PP-12345"
                    value={formData.callsign}
                    onChange={(e) => handleChange('callsign', e.target.value)}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Regras" 
                      value={formData.flight_rules}
                      onChange={(e) => handleChange('flight_rules', e.target.value)}
                      placeholder="V"
                    />
                    <Input 
                      label="Tipo" 
                      value={formData.type_of_flight}
                      onChange={(e) => handleChange('type_of_flight', e.target.value)}
                      placeholder="M"
                    />
                  </div>
                </div>
              </Card>

              {/* Section 2: Flight Data */}
              <Card className="p-5 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Plane className="w-4 h-4 text-blue-600" /> Dados do Voo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Aeródromo de Partida" 
                    value={formData.departure_aerodrome}
                    onChange={(e) => handleChange('departure_aerodrome', e.target.value)}
                    placeholder="ZZZZ ou ICAO"
                  />
                  <Input 
                    label="Hora (EOBT - UTC)" 
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => handleChange('departure_time', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Vel. Cruzeiro" 
                      value={formData.cruising_speed}
                      onChange={(e) => handleChange('cruising_speed', e.target.value)}
                      placeholder="N0050"
                    />
                    <Input 
                      label="Nível" 
                      value={formData.level}
                      onChange={(e) => handleChange('level', e.target.value)}
                      placeholder="VFR"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Input 
                      label="Rota" 
                      value={formData.route}
                      onChange={(e) => handleChange('route', e.target.value)}
                      placeholder="DCT (Direto) ou pontos"
                    />
                  </div>
                  
                  <Input 
                    label="Aeródromo Destino" 
                    value={formData.destination_aerodrome}
                    onChange={(e) => handleChange('destination_aerodrome', e.target.value)}
                    placeholder="ZZZZ ou ICAO"
                  />
                  <Input 
                    label="EET Total (HHMM)" 
                    value={formData.total_eet}
                    onChange={(e) => handleChange('total_eet', e.target.value)}
                    placeholder="0030"
                  />
                </div>
                
                {/* Save Button After Flight Data */}
                <div className="mt-6 border-t pt-4">
                   <Button 
                      onClick={handleSaveToSystem}
                      disabled={loading || !selectedOpId}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      title={!selectedOpId ? "Selecione uma operação para habilitar" : "Salvar vínculo"}
                   >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar no Sistema
                   </Button>
                   {!selectedOpId && (
                      <p className="text-xs text-center text-slate-400 mt-2">
                         Selecione uma operação ativa acima para habilitar o salvamento.
                      </p>
                   )}
                </div>
              </Card>
            </div>

            {/* Sidebar Column (Right) */}
            <div className="space-y-6">
              <Card className="p-5 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-blue-600" /> Suplementar
                </h3>
                <div className="space-y-4">
                  <Input 
                    label="Autonomia (Endurance)" 
                    value={formData.endurance}
                    onChange={(e) => handleChange('endurance', e.target.value)}
                    placeholder="HHMM"
                  />
                  <Input 
                    label="Pessoas a Bordo" 
                    value={formData.persons_on_board}
                    onChange={(e) => handleChange('persons_on_board', e.target.value)}
                    type="number"
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Observações (RMK)</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                      value={formData.remarks}
                      onChange={(e) => handleChange('remarks', e.target.value)}
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>
              </Card>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-800 space-y-2 shadow-sm">
                <p className="font-bold flex items-center gap-2 text-sm"><MapIcon className="w-4 h-4"/> Nota Importante:</p>
                <p className="leading-relaxed">
                  Este formulário auxilia na confecção do plano de voo para fins de planejamento e registro interno. 
                  O envio oficial deve ser realizado via <strong>SARPAS</strong> ou Sala AIS conforme a legislação vigente (ICA 100-40).
                </p>
              </div>
            </div>
          </div>
          
          {/* Spacer for bottom scrolling */}
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
}