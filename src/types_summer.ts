
export type SummerMissionType = 'patrulha' | 'resgate' | 'prevencao' | 'apoio' | 'treinamento';

export const SUMMER_MISSION_LABELS: Record<SummerMissionType, string> = {
  patrulha: "Patrulhamento Ostensivo",
  resgate: "Resgate Aquático (Afogamento)",
  prevencao: "Prevenção (Banhistas)",
  apoio: "Apoio a Embarcações/Incidentes",
  treinamento: "Treinamento Operacional"
};

export const SUMMER_LOCATIONS: Record<string, string[]> = {
  "Pontal do Paraná": [
    "PGV Trapiche", "PGV Pontal I", "PGV Pontal II", "PGV Assenodi", "PGV Atami Sul",
    "PGV AVM", "PGV Shangri-lá I", "PGV Shangri-lá II", "PGV Shangri-lá III",
    "PGV Carmeri", "PGV Marissol", "PGV Grajaú", "PGV Leblon", "PGV Ipanema I",
    "PGV Ipanema II", "PGV Ipanema III", "PGV Guarapari", "PGV Sta. Terezinha I",
    "PGV Sta. Terezinha II", "PGV Canoas I", "PGV Canoas II", "PGV Canoas III",
    "PGV Privê", "PGV Leste I", "PGV Leste II", "PGV Leste III", "PGV Banestado",
    "PGV Jd. Canadá", "PGV Monções", "PGV Monções II"
  ],
  "Matinhos": [
    "PGV Junara", "PGV Gaivotas II", "PGV Gaivotas I", "PGV Costa Azul", "PGV Associação",
    "PGV Albatroz", "PGV Currais", "PGV Ipacaraí", "PGV Betaras", "PGV Solimar",
    "PGV Marajó", "PGV Saint Ethiene", "PGV Flórida", "PVG Praia Grande II",
    "PGV Praia Grande I", "PGV Riviera III", "PGV Riviera II", "PGV Riviera I",
    "PGV Camping", "PGV Av. Curitiba", "PGV Matinhos", "PGV Prainha", "PGV Praia Brava",
    "PGV SESC", "PGV Pipeline", "PGV UFPR", "PGV Trombetta", "PGV Caiobá", "PGV Praia Mansa"
  ],
  "Guaratuba": [
    "PGV Caieiras I", "PGV Caieiras II", "PGV Thalia", "PGV Vila Real", "PGV Magistrado",
    "PGV Barra Vento", "PGV Central", "PGV Avenida Ponta Grossa", "PGV Volta das Canoas",
    "PGV Cristo", "PGV Brejatuba I", "PGV Brejatuba II", "PGV Paraguaios", "PGV Santa Paula",
    "PGV Curaçao", "PGV Candeias", "PGV Rota do Sol", "PGV Fox", "PGV Pousada",
    "PGV Eliane", "PGV Nereidas I", "PGV Nereidas II", "PGV Mar Doce", "PGV Coroados I",
    "PGV Coroados II", "PGV Barra do Saí", "PGV Rio da Barra"
  ],
  "Paranaguá / Morretes / Antonina": [
    "PGV Encantadas", "PGV Praia de Fora", "PGV - Tático Móvel de Porto de Cima"
  ]
};

export interface SummerFlight {
  id: string;
  pilot_id: string;
  drone_id: string;
  mission_type: SummerMissionType;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  flight_duration: number; // Minutos
  notes?: string;
  evidence_photos: string[];
  evidence_videos: string[];
  created_at: string;
}

export interface SummerAuditLog {
  id: string;
  flight_id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  timestamp: string;
}

export interface SummerStats {
  total_flights: number;
  total_hours: number;
  flights_by_mission: Record<string, number>;
  flights_by_drone: Record<string, number>;
  top_locations: Record<string, number>;
}
