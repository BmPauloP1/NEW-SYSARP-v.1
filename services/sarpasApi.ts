
import { Operation, Drone, Pilot, MissionType } from "../types";

const API_BASE_URL = "http://brutm.xmobots.com/api/brutm";

/**
 * Mapeia o tipo de missão interna do SYSARP para os tipos aceitos pelo SARPAS.
 * Regra: 
 * - Ocorrências reais (Busca, Incêndio, Desastre, etc) = SPECIAL
 * - Rotina (Monitoramento, Mapeamento, Foto, Formatura) = STANDARD
 */
const getSarpasOperationType = (missionType?: MissionType): string => {
  const specialTypes: MissionType[] = ['search_rescue', 'fire', 'disaster', 'civil_defense', 'air_support'];
  
  if (missionType && specialTypes.includes(missionType)) {
    return "SPECIAL"; // Operações Especiais / State Aircraft
  }
  return "STANDARD"; // Operações Padrão (Mapeamento, Foto, Treino, Formatura)
};

/**
 * Formata datas para o padrão separado dia/hora exigido pelo DTO da API
 */
const formatSarpasDate = (dateObj: Date) => {
  return {
    day: dateObj.toISOString().split('T')[0], // YYYY-MM-DD
    hour: dateObj.toTimeString().slice(0, 5) // HH:mm
  };
};

export const sarpasApi = {
  
  /**
   * Envia uma solicitação de operação para o SARPAS.
   * Endpoint: POST /sarpas/solicitation
   * Payload: SolicitationDataDTO
   */
  submitFlightRequest: async (operation: Partial<Operation>, pilot: Pilot, drone: Drone): Promise<string> => {
    
    // 1. Definição de Horários
    const startDate = new Date(operation.start_time || Date.now());
    // Se não houver data fim definida, define uma janela de operação padrão de 3 horas
    const endDate = operation.end_time 
      ? new Date(operation.end_time) 
      : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    const startFmt = formatSarpasDate(startDate);
    const endFmt = formatSarpasDate(endDate);

    // 2. Definição de Geometria
    const lat = operation.latitude || 0;
    const lng = operation.longitude || 0;
    
    // Pontos em formato [Lat, Lng] para campos simples
    const centerPointLatLng = [lat, lng];
    
    // Pontos em formato [Lng, Lat] para GeoJSON (Padrão OGC)
    const centerPointGeoJSON = [lng, lat];

    const altitude = operation.flight_altitude || 60; // Metros AGL
    const radius = operation.radius || 500; // Metros

    // 3. Construção do Payload (SolicitationDataDTO)
    const payload = {
      data: {
        type: "solicitation",
        attributes: {
          operation: {
            basic_information: {
              name: operation.name || `OP-${operation.occurrence_number}`,
              type: getSarpasOperationType(operation.mission_type), 
              agree_terms: 1
            },
            aircrafts: [
              {
                id: 0, // API resolve pelo UUID
                uuid: drone.sisant // Usando SISANT conforme solicitação
              }
            ],
            flight: {
              // ATENÇÃO: Array de pilotos deve ser vazio conforme doc, o piloto responsável vai em 'sarpas_code'
              pilots: [], 
              sarpas_code: pilot.sarpas_code,
              
              // Tipo de Voo
              type: "VLOS", // Visual Line of Sight
              
              // Datas
              date: {
                start_day: startFmt.day,
                start_hour: startFmt.hour,
                finish_day: endFmt.day,
                finish_hour: endFmt.hour
              },
              
              // Dados Espaciais (AreaDTO)
              area: {
                flight_distance: radius,
                flight_type: "CIRCULAR",
                // Decolagem e Pouso no centro do raio
                takeoff_point: centerPointLatLng,
                landing_point: centerPointLatLng,
                
                // Rota Requerida (RequiredRouteDTO -> GeojsonDTO)
                required_route: {
                  geojson: {
                    type: "Feature",
                    properties: {
                      radius: radius,
                      upperLimit: altitude,
                      lowerLimit: 0
                    },
                    geometry: {
                      type: "Point",
                      coordinates: centerPointGeoJSON
                    }
                  }
                }
              },
              
              // Comunicação (CommunicationDTO) - Obrigatório para contato ATS
              communication: {
                ats_call_type: "TEL", // Contato via Telefone
                rpa_call_type: "TEL",
                rps: [
                  {
                    name: pilot.full_name,
                    lat: String(lat),
                    lng: String(lng),
                    contact_info: pilot.phone,
                    radius: radius
                  }
                ]
              },
              
              observations: operation.description || `Operação Bombeiros: ${pilot.unit}. Ocorrência: ${operation.occurrence_number}`,
              
              // Campo obrigatório conforme Schema da API
              documents: [] 
            }
          }
        }
      }
    };

    console.log("Enviando Payload para SARPAS:", JSON.stringify(payload, null, 2));

    try {
      // Simulação de delay de rede
      await new Promise(r => setTimeout(r, 2000));
      
      // Gera protocolo mockado baseado no tipo
      const typePrefix = getSarpasOperationType(operation.mission_type) === "SPECIAL" ? "EMG" : "SRP";
      const year = new Date().getFullYear();
      const randomId = String(Math.floor(Math.random() * 100000)).padStart(6, '0');
      const mockProtocol = `${typePrefix}-${year}-${randomId}`;
      
      return mockProtocol;

    } catch (error) {
      console.error("Erro na integração SARPAS", error);
      throw error;
    }
  },

  /**
   * Verifica status da solicitação (Mock)
   */
  checkStatus: async (protocol: string) => {
    return { status: "APPROVED", message: "Operação autorizada." };
  }
};
