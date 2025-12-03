

export type MissionType = 'search_rescue' | 'fire' | 'civil_defense' | 'monitoring' | 'air_support' | 'disaster';
export type OperationStatus = 'active' | 'completed' | 'cancelled';
export type PilotRole = 'admin' | 'operator';
export type PilotStatus = 'active' | 'inactive';
export type DroneStatus = 'available' | 'in_operation' | 'maintenance';
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'calibration' | 'battery' | 'propeller' | 'camera' | 'general';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed';

// Logo Oficial do CBMPR (Local - pasta img)
export const SYSARP_LOGO = "/img/logosoarp.png";

export interface Pilot {
  id: string;
  full_name: string;
  sarpas_code: string;
  phone: string;
  crbm: string;
  unit: string;
  license: string;
  course_type: 'internal' | 'external';
  course_name: string;
  course_year: number;
  course_hours: number;
  role: PilotRole;
  status: PilotStatus;
  email: string;
  password?: string; // Added for auth
  change_password_required?: boolean; // Force password change on first login
  
  // LGPD Compliance
  terms_accepted?: boolean;
  terms_accepted_at?: string;
}

export interface Drone {
  id: string;
  prefix: string;
  brand: string;
  model: string;
  serial_number: string;
  sisant: string;
  sisant_expiry_date: string;
  payloads: string[];
  max_flight_time: number;
  max_range: number;
  max_altitude: number;
  weight: number;
  status: DroneStatus;
  total_flight_hours: number; // Novo campo para controle de manutenção (TBO)
  last_30day_check?: string; // Data do último checklist (Relógio 7 dias)
}

// --- Checklist 7 Dias Definitions ---

export interface ChecklistItemState {
  category: string;
  name: string;
  checked: boolean;
}

export interface DroneChecklist {
  id: string;
  drone_id: string;
  pilot_id: string; // Quem realizou
  date: string;
  items: ChecklistItemState[];
  status: 'approved' | 'rejected';
  notes?: string; // Observações gerais ou sobre itens reprovados
}

export const DRONE_CHECKLIST_TEMPLATE = {
  "Documentação": [
    "Checklist (PREFLIGHT, STARTING, TAKEOFF, LANDING, J11 and J12)",
    "Contatos Regionais, ATS e DTCEA",
    "Dtz POP CBMPR",
    "Certificado ANAC",
    "Homologação ANATEL",
    "A.R.O. - Avaliação de Risco Operacional",
    "Manual da Aeronave",
    "Registro de Voos",
    "Registro de Defeitos e MNT (Leitura de pendências)",
    "Checklist de Materiais e Equipamentos"
  ],
  "Equipamento": [
    "Verificar integridade física da RPA",
    "Verificar integridade física do CONTROLE",
    "Verificar integridade física das BATERIAS",
    "Verificar integridade física das HÉLICES",
    "Baterias totalmente carregadas da RPA",
    "Bateria totalmente carregada do Controle"
  ],
  "Voo de Checagem": [
    "Fixação correta das hélices",
    "Remover tampa da lente/trava do gimbal",
    "Colocar a Bateria na RPA",
    "Ligar Controle",
    "Ligar RPA e mantê-la em local plano e imóvel",
    "Verificar posição das antenas do controle",
    "Verificar se o brilho e volume da Tela estão no máximo",
    "Abrir aplicativo de voo",
    "Ajustar Altura Máxima de Voo e RTH em 120 m",
    "Rc Signal Lost (deve estar na opção Return-to-home)",
    "Formatar cartão de memória",
    "Verificar chave do modo de Voo no Controle em 'P'",
    "Verificar se o Smart Return da Bateria está ativado",
    "Verificar Status Principal em Cor Verde no SmartController",
    "Verificar quantidade mínima de 10 satélites",
    "Área de decolagem livre de pessoas ou objetos",
    "Realizar decolagem subindo até 3m de altura",
    "Verificar respostas dos comandos de Voo e Gimbal",
    "Pousar a aeronave",
    "Desligar RPA",
    "Remover Bateria e colocá-la em local adequado",
    "Remover as Hélices",
    "Enviar o Registro de Vôos para Nuvem",
    "Desligar Controle",
    "Recarregar Todas as Baterias e Controle antes de Armazenar"
  ],
  "Prontidão": [
    "Acondicionar o material em local adequado"
  ]
};

// --- A.R.O. (Avaliação de Risco Operacional) Definitions ---

export type RiskProbability = 1 | 2 | 3 | 4 | 5; // 1: Muito Improvável -> 5: Frequente
export type RiskSeverity = 'A' | 'B' | 'C' | 'D' | 'E'; // A: Catastrófico -> E: Insignificante
export type RiskLevel = 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AroItem {
  scenario_id: number;
  description: string;
  probability: RiskProbability;
  severity: RiskSeverity;
  risk_code: string; // Ex: "5A"
  mitigation: string;
  authorization_level?: string; // Nível hierárquico de autorização
}

export interface AroAssessment {
  items: AroItem[];
  declaration_accepted: boolean; // "Declaro para os devidos fins..."
  rubric: string;
  created_at: string;
}

export const ARO_SCENARIOS = [
  "Situação 1: Perda de Link C2",
  "Situação 2: Existência de tráfego aéreo local",
  "Situação 3: Presença de pessoas não anuentes",
  "Situação 4: Vento acima do recomendado pelo fabricante",
  "Situação 5: Ultrapassar os limites previstos na LEGISLAÇÃO",
  "Situação 6: Voo noturno",
  "Situação 7: Voo sob chuva moderada",
  "Situação 8: Voo acima de 120m AGL (exceto ENTORNO DE ESTRUTURA)"
];

// --- End A.R.O. ---

export interface Operation {
  id: string;
  name: string;
  occurrence_number: string;
  latitude: number;
  longitude: number;
  drone_id: string;
  pilot_id: string;
  radius: number;
  flight_altitude?: number; // Added flight altitude
  mission_type: MissionType;
  sub_mission_type?: string; // Nova Sub-natureza
  status: OperationStatus;
  start_time: string;
  end_time?: string;
  flight_hours?: number;
  photos: string[];
  gpx_file?: string;
  stream_url?: string;
  notes?: string;
  created_at: string;
  kmz_file?: string;
  description?: string;
  actions_taken?: string;
  
  // Integração Externa
  sarpas_protocol?: string; // Protocolo retornado pela API do SARPAS
  
  // Integração Operação Verão
  is_summer_op?: boolean; 
  
  // Avaliação de Risco
  aro?: AroAssessment;

  // Plano de Voo (ARO/Notificação)
  flight_plan_data?: string; // Stores the JSON string of the flight plan form
}

export interface Maintenance {
  id: string;
  drone_id: string;
  pilot_id?: string; // Piloto responsável no momento (opcional se for manutenção de rotina)
  maintenance_type: MaintenanceType;
  description: string;
  technician: string;
  maintenance_date: string;
  maintenance_time: string; // Hora do ocorrido/manutenção
  next_maintenance_date: string;
  cost: number;
  status: MaintenanceStatus;
  
  // Novos campos solicitados
  in_flight_incident: boolean; // Aconteceu em voo?
  log_file_url?: string; // Arquivo KMZ/KML do Airdata
}

export interface ConflictNotification {
  id: string;
  target_pilot_id: string; // O piloto que recebe o alerta (dono da op antiga)
  
  // Dados da NOVA operação conflitante
  new_op_name: string;
  new_pilot_name: string;
  new_pilot_phone?: string; // Telefone para contato WhatsApp
  new_op_altitude: number;
  new_op_radius: number;
  
  created_at: string;
  acknowledged: boolean;
}

export interface FlightLog {
  id: string;
  operation_id: string;
  pilot_id: string;
  drone_id: string;
  flight_date: string;
  flight_hours: number;
  mission_type: string;
}

// Hierarquia de Missões (Natureza -> Sub-natureza)
export const MISSION_HIERARCHY: Record<MissionType, { label: string; subtypes: string[] }> = {
  search_rescue: {
    label: "Busca e Salvamento (SAR)",
    subtypes: ["Pessoas (Terrestre)", "Pessoas (Aquático/Afogamento)", "Animais", "Objetos / Evidências", "Veículos"]
  },
  fire: {
    label: "Incêndio",
    subtypes: ["Ambiental / Vegetação", "Estrutural / Edificação", "Veicular", "Industrial", "Espaço Confinado"]
  },
  civil_defense: {
    label: "Defesa Civil",
    subtypes: ["Vistoria Estrutural", "Deslizamento / Encostas", "Inundação / Enxurrada", "Mapeamento de Risco"]
  },
  monitoring: {
    label: "Monitoramento",
    subtypes: ["Preventivo (Eventos)", "Ostensivo (Apoio Policial)", "Levantamento de Dados", "Patrulhamento"]
  },
  air_support: {
    label: "Apoio Aéreo",
    subtypes: ["Transporte de Carga", "Lançamento de Boia", "Iluminação de Cena", "Retransmissão de Sinal"]
  },
  disaster: {
    label: "Desastre / HazMat",
    subtypes: ["Produto Perigoso (QBRN)", "Colapso Estrutural", "Acidente Múltiplas Vítimas", "Rompimento de Barragem"]
  }
};

// Mantido para compatibilidade reversa onde necessário, mapeado da hierarquia
export const MISSION_LABELS: Record<MissionType, string> = {
  search_rescue: MISSION_HIERARCHY.search_rescue.label,
  fire: MISSION_HIERARCHY.fire.label,
  civil_defense: MISSION_HIERARCHY.civil_defense.label,
  monitoring: MISSION_HIERARCHY.monitoring.label,
  air_support: MISSION_HIERARCHY.air_support.label,
  disaster: MISSION_HIERARCHY.disaster.label
};

// Estrutura Organizacional do CBM-PR (Mapeamento CRBM -> Unidades)
// Atualizado: GB -> BBM, GOA -> BOA
export const ORGANIZATION_CHART: Record<string, string[]> = {
  "1º CRBM - Curitiba (Leste/Litoral)": [
    "1º BBM - Curitiba",
    "6º BBM - São José dos Pinhais",
    "7º BBM - Colombo",
    "8º BBM - Paranaguá",
    "BOA - Batalhão de Operações Aéreas"
  ],
  "2º CRBM - Londrina (Norte)": [
    "3º BBM - Londrina",
    "11º BBM - Apucarana",
    "1ª CIBM - Ivaiporã",
    "3ª CIBM - Santo Antônio da Platina"
  ],
  "3º CRBM - Cascavel (Oeste)": [
    "4º BBM - Cascavel",
    "9º BBM - Foz do Iguaçu",
    "10º BBM - Francisco Beltrão",
    "13º BBM - Pato Branco"
  ],
  "4º CRBM - Maringá (Noroeste)": [
    "5º BBM - Maringá",
    "2ª CIBM - Umuarama",
    "4ª CIBM - Cianorte",
    "5ª CIBM - Paranavaí"
  ],
  "5º CRBM - Ponta Grossa (Campos Gerais)": [
    "2º BBM - Ponta Grossa",
    "12º BBM - Guarapuava",
    "6ª CIBM - Irati"
  ],
  "Defesa Civil": [
    "COMPEDEC",
    "NAR"
  ]
};

// LGPD - Texto Legal
export const LGPD_TERMS = `
POLÍTICA DE PRIVACIDADE E TERMOS DE USO DE DADOS - SYSARP CBMPR

1. FINALIDADE DO TRATAMENTO
O Sistema de Aeronaves Remotamente Pilotadas (SYSARP) do Corpo de Bombeiros Militar do Paraná coleta e processa dados pessoais para fins exclusivos de:
- Gestão operacional de missões aéreas de segurança pública e defesa civil.
- Registro de horas de voo para controle de manutenção e habilitação de pilotos.
- Integração com sistemas de controle do espaço aéreo (DECEA/SARPAS) para solicitação de voos.
- Auditoria e compliance conforme regulamentação da ANAC (RBAC-E94) e DECEA (ICA 100-40).

2. DADOS COLETADOS
Serão coletados e armazenados:
- Nome Completo e Posto/Graduação.
- Dados de contato (E-mail Institucional, Telefone).
- Dados operacionais (Código SARPAS, Licença ANAC, Lotação).
- Geolocalização durante o uso do sistema para monitoramento de operações.

3. COMPARTILHAMENTO DE DADOS
Os dados poderão ser compartilhados automaticamente via API com o Departamento de Controle do Espaço Aéreo (DECEA) para fins de autorização de voo, conforme exigência legal. Não haverá uso comercial dos dados.

4. SEGURANÇA
Adotamos medidas técnicas para proteger seus dados, incluindo criptografia em trânsito e repouso. O acesso é restrito a pessoal autorizado.

5. DIREITOS DO TITULAR
Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a confirmar a existência de tratamento, acessar seus dados e corrigir dados incompletos. Para exercer esses direitos, contate a administração do sistema.

Ao prosseguir, você declara estar ciente e de acordo com estes termos.
`;