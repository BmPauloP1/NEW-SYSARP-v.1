
import React, { useState, useEffect } from "react";
import { base44 } from "../services/base44Client";
import { Operation, ARO_SCENARIOS, AroItem, AroAssessment } from "../types";
import { Card, Button, Badge, Select, Input } from "../components/ui_components";
import { CloudRain, Wind, FileText, Globe, ExternalLink, Map, AlertTriangle, Navigation, Thermometer, Eye, CheckCircle, AlertOctagon, Save, Radio } from "lucide-react";

const getRiskColor = (code: string) => {
    const red = ["5A", "5B", "5C", "4A", "4B", "3A"];
    const orange = ["5D", "4C", "3B", "2A", "2B"];
    const yellow = ["5E", "4D", "4E", "3C", "3D", "2C", "1A", "1B"];
    if (red.includes(code)) return "bg-red-600 text-white";
    if (orange.includes(code)) return "bg-orange-500 text-white";
    if (yellow.includes(code)) return "bg-yellow-400 text-black";
    return "bg-green-500 text-white";
};

const matrixData = {
  severidade: ['Catastrófico (A)', 'Crítico (B)', 'Significativo (C)', 'Pequeno (D)', 'Insignificante (E)'],
  probabilidade: ['Frequente (5)', 'Ocasional (4)', 'Remoto (3)', 'Improvável (2)', 'Muito Improvável (1)'],
  risks: [
    ['5A', '5B', '5C', '5D', '5E'],
    ['4A', '4B', '4C', '4D', '4E'],
    ['3A', '3B', '3C', '3D', '3E'],
    ['2A', '2B', '2C', '2D', '2E'],
    ['1A', '1B', '1C', '1D', '1E']
  ]
};

const DEFAULT_ITEMS: AroItem[] = ARO_SCENARIOS.map((desc, idx) => ({
  scenario_id: idx + 1,
  description: desc,
  probability: 1,
  severity: 'E',
  risk_code: '1E',
  mitigation: '',
  authorization_level: ''
}));

export default function Aro() {
  const [activeOps, setActiveOps] = useState<Operation[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string>("");
  const [items, setItems] = useState<AroItem[]>(DEFAULT_ITEMS);
  const [accepted, setAccepted] = useState(false);
  const [rubric, setRubric] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     base44.entities.Operation.filter({ status: 'active' }).then(ops => {
       setActiveOps(ops);
     });
  }, []);

  // Efeito para carregar dados do ARO se a operação já tiver um salvo
  useEffect(() => {
    if (selectedOpId) {
        const op = activeOps.find(o => o.id === selectedOpId);
        if (op && op.aro) {
            setItems(op.aro.items);
            setAccepted(op.aro.declaration_accepted);
            setRubric(op.aro.rubric || "");
        } else {
            // Reset se não tiver ARO
            setItems(DEFAULT_ITEMS);
            setAccepted(false);
            setRubric("");
        }
    }
  }, [selectedOpId, activeOps]);

  const links = [
    { name: "AISWEB", url: "https://aisweb.decea.mil.br/", icon: Map },
    { name: "REDEMET", url: "https://www.redemet.aer.mil.br/", icon: CloudRain },
    { name: "SARPAS", url: "https://sarpas.decea.mil.br/", icon: Navigation },
  ];

  const handleUpdate = (idx: number, field: keyof AroItem, value: any) => {
    const newItems = [...items];
    const item = newItems[idx];
    // @ts-ignore
    item[field] = value;
    if (field === 'probability' || field === 'severity') {
      item.risk_code = `${item.probability}${item.severity}`;
    }
    setItems(newItems);
  };
  
  const handleSaveAro = async () => {
    if (!selectedOpId) {
        alert("Por favor, vincule o A.R.O. a uma operação ativa.");
        return;
    }
    if (!accepted) {
        alert("Você deve aceitar a declaração de responsabilidade.");
        return;
    }
    setLoading(true);
    try {
        const aroAssessment: AroAssessment = {
            items,
            declaration_accepted: accepted,
            rubric: rubric || "Assinado Digitalmente",
            created_at: new Date().toISOString()
        };
        await base44.entities.Operation.update(selectedOpId, { aro: aroAssessment });
        alert(`A.R.O. salvo com sucesso para a operação selecionada!`);
        
        // Atualiza a lista local para refletir a mudança
        const ops = await base44.entities.Operation.filter({ status: 'active' });
        setActiveOps(ops);

    } catch (e) {
        console.error("Erro ao salvar ARO", e);
        alert("Falha ao salvar o A.R.O.");
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 h-full overflow-y-auto pb-20">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
             <AlertOctagon className="w-8 h-8 text-red-700"/> Avaliação de Risco Operacional
          </h1>
          <div className="flex flex-wrap gap-2 self-start md:self-center">
             {links.map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                   <l.icon className="w-3 h-3 text-slate-500"/> {l.name}
                </a>
             ))}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-9 space-y-6">
             <Card className="p-4 bg-blue-50 border-blue-200">
                <label className="font-bold text-blue-900 block mb-2">Vincular A.R.O. à Operação Ativa</label>
                <Select value={selectedOpId} onChange={e => setSelectedOpId(e.target.value)} className="bg-white">
                   <option value="">Selecione uma operação...</option>
                   {activeOps.map(op => <option key={op.id} value={op.id}>{op.name} (#{op.occurrence_number}) {op.aro ? '✅ (Já possui ARO)' : ''}</option>)}
                </Select>
             </Card>

             <Card className="p-4 overflow-x-auto">
                <h3 className="font-bold mb-3 text-sm uppercase text-slate-500">Matriz de Classificação do Grau de Risco</h3>
                <div className="min-w-[600px]">
                   <div className="grid grid-cols-6 gap-1 text-[11px] text-center font-bold">
                      <div className="p-2 border-r border-b border-slate-200 bg-slate-50">Prob. \ Sev.</div>
                      {matrixData.severidade.map(s => <div key={s} className="bg-slate-100 p-2 border-b border-slate-200">{s}</div>)}
                      {matrixData.probabilidade.map((p, pIndex) => (
                         <React.Fragment key={p}>
                           <div className="bg-slate-100 p-2 border-r border-slate-200 self-center">{p}</div>
                           {matrixData.risks[pIndex].map(risk => (
                              <div key={risk} className={`p-2 font-mono flex items-center justify-center rounded-sm ${getRiskColor(risk)}`}>{risk}</div>
                           ))}
                         </React.Fragment>
                      ))}
                   </div>
                </div>
             </Card>

             <div className="space-y-4">
                {items.map((item, idx) => (
                   <Card key={idx} className={`p-4 ${item.scenario_id === 8 ? 'bg-red-50 border-red-200' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                         <span className="font-bold text-sm text-slate-800">{item.description}</span>
                         <Badge className={getRiskColor(item.risk_code)}>{item.risk_code}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                         <div className="grid grid-cols-2 gap-3 md:col-span-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 block">Probabilidade</label>
                                <Select 
                                  className="w-full text-sm p-1.5"
                                  value={item.probability} 
                                  disabled={item.scenario_id === 8}
                                  onChange={e => handleUpdate(idx, 'probability', Number(e.target.value))}
                                >
                                   {[5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                                </Select>
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 block">Severidade</label>
                                <Select 
                                  className="w-full text-sm p-1.5"
                                  value={item.severity}
                                  disabled={item.scenario_id === 8}
                                  onChange={e => handleUpdate(idx, 'severity', e.target.value)}
                                >
                                   {['A','B','C','D','E'].map(v => <option key={v} value={v}>{v}</option>)}
                                </Select>
                             </div>
                         </div>
                         
                         <div className="md:col-span-3">
                           <Input 
                             label="Nível de Autorização"
                             className="text-sm p-1.5"
                             labelClassName="text-[10px] font-bold text-slate-500"
                             value={item.authorization_level || ''} 
                             onChange={e => handleUpdate(idx, 'authorization_level', e.target.value)} 
                             placeholder="Ex: Oficial de Dia"
                           />
                         </div>
                         <div className="md:col-span-5">
                            <Input
                              label="Medidas Mitigadoras"
                              className="text-sm p-1.5"
                              labelClassName="text-[10px] font-bold text-slate-500"
                              value={item.mitigation} 
                              disabled={item.scenario_id === 8}
                              onChange={e => handleUpdate(idx, 'mitigation', e.target.value)} 
                              placeholder={item.scenario_id === 8 ? "PROIBIDO" : "Ações preventivas/corretivas..."}
                            />
                         </div>
                      </div>
                   </Card>
                ))}
             </div>

             <Card className="p-6">
                <h3 className="font-bold mb-3">Declaração de Responsabilidade</h3>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-900 space-y-3">
                    <p>Declaro para os devidos fins que conheço e cumpro as legislações e regulamentações aplicáveis, em especial as listadas neste documento, assim como conheço as consequências do seu descumprimento.</p>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input type="checkbox" className="w-4 h-4 accent-sysarp-primary" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                        Li e aceito os termos.
                    </label>
                </div>
                 <div className="mt-4">
                     <Input label="Rúbrica do Responsável" placeholder="Digite seu nome ou matrícula" value={rubric} onChange={e => setRubric(e.target.value)} />
                 </div>
                 <Button onClick={handleSaveAro} disabled={loading || !accepted} className="w-full mt-4 h-12 text-lg">
                    <Save className="w-5 h-5 mr-2"/>
                    {loading ? "Salvando A.R.O..." : "Salvar e Vincular à Operação"}
                 </Button>
             </Card>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
             <Card className="p-4 bg-slate-900 text-white">
                <h3 className="font-bold flex items-center gap-2 mb-3 border-b border-slate-700 pb-2"><CloudRain className="w-4 h-4 text-blue-400"/> Meteorologia Local</h3>
                 <div className="text-center p-4">
                   <div className="text-4xl font-bold">22ºC</div>
                   <div className="text-xs text-slate-400">Parcialmente Nublado</div>
                   <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-800 p-2 rounded">
                         <p className="text-slate-400 text-[10px]">Vento</p>
                         <p>08 KT</p>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                         <p className="text-slate-400 text-[10px]">Teto</p>
                         <p>SCT030</p>
                      </div>
                       <div className="bg-slate-800 p-2 rounded">
                         <p className="text-slate-400 text-[10px]">Visib.</p>
                         <p>10KM+</p>
                      </div>
                   </div>
                </div>
             </Card>
             <Card className="p-4 bg-yellow-50 border-yellow-200">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3 border-b border-yellow-200 pb-2"><AlertTriangle className="w-4 h-4"/> NOTAMs Ativos</h3>
                <div className="text-xs text-slate-700 space-y-3 max-h-60 overflow-y-auto">
                   <p><strong>D0456/24:</strong> OBST MOVEL (GUINDASTE) VIOLANDO SFC A 5KM DO AD...</p>
                   <p><strong>A1234/24:</strong> PISTA 15/33 FECHADA PARA POUSO E DECOLAGEM...</p>
                </div>
             </Card>
          </div>
       </div>
    </div>
  );
}
