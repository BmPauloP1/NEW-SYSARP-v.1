
import React, { useState, useEffect, useMemo } from 'react';
import { operationSummerService } from '../services/operationSummerService';
import { base44 } from '../services/base44Client';
import { SummerStats, SUMMER_MISSION_LABELS, SummerFlight, SUMMER_LOCATIONS, SummerMissionType } from '../types_summer';
import { Pilot, Drone } from '../types';
import { Card, Select, Input, Button } from '../components/ui_components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, MapPin, Activity, Sun, Filter, RefreshCcw, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Colors for Mission Types
const MISSION_COLORS: Record<string, string> = {
  patrulha: '#3b82f6',   // Blue
  resgate: '#ef4444',    // Red
  prevencao: '#f59e0b',  // Amber
  apoio: '#8b5cf6',      // Violet
  treinamento: '#10b981' // Emerald
};

const CHART_COLORS = ['#f97316', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'];

// Approximate Coordinates for Coast Cities to simulate heatmap location if exact coords aren't available
const CITY_COORDS: Record<string, [number, number]> = {
  "Pontal do Paraná": [-25.6666, -48.5126],
  "Matinhos": [-25.8174, -48.5426],
  "Guaratuba": [-25.8828, -48.5756],
  "Paranaguá": [-25.5204, -48.5093],
  "Morretes": [-25.4746, -48.8335],
  "Antonina": [-25.4287, -48.7135]
};

// Map Fix
const MapController = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && map.getContainer()) {
        map.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Helper to generate jitter for overlapping points
const jitter = (coord: number) => coord + (Math.random() - 0.5) * 0.02;

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: SummerMissionType;
  info: string;
}

export default function OperationSummerStats() {
  // Data State
  const [allFlights, setAllFlights] = useState<SummerFlight[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterMission, setFilterMission] = useState('all');
  const [filterDrone, setFilterDrone] = useState('all');
  const [filterPilot, setFilterPilot] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterPgv, setFilterPgv] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [f, p, d] = await Promise.all([
      operationSummerService.list(),
      base44.entities.Pilot.list(),
      base44.entities.Drone.list()
    ]);
    setAllFlights(f);
    setPilots(p);
    setDrones(d);
    setLoading(false);
  };

  const handleResetFilters = () => {
    setFilterMission('all');
    setFilterDrone('all');
    setFilterPilot('all');
    setFilterLocation('all');
    setFilterPgv('all');
  };

  // Filter Logic
  const filteredFlights = useMemo(() => {
    return allFlights.filter(f => {
      const matchMission = filterMission === 'all' || f.mission_type === filterMission;
      const matchDrone = filterDrone === 'all' || f.drone_id === filterDrone;
      const matchPilot = filterPilot === 'all' || f.pilot_id === filterPilot;
      
      // Location Filter (City)
      const matchLocation = filterLocation === 'all' || f.location.toLowerCase().includes(filterLocation.toLowerCase());
      
      // PGV Filter
      const matchPgv = filterPgv === 'all' || f.location.toLowerCase().includes(filterPgv.toLowerCase());
      
      return matchMission && matchDrone && matchPilot && matchLocation && matchPgv;
    });
  }, [allFlights, filterMission, filterDrone, filterPilot, filterLocation, filterPgv]);

  // Dynamic Stats Calculation
  const stats = useMemo(() => {
    const s: SummerStats = {
      total_flights: filteredFlights.length,
      total_hours: 0,
      flights_by_mission: {},
      flights_by_drone: {},
      top_locations: {}
    };

    filteredFlights.forEach(f => {
      s.total_hours += (f.flight_duration || 0) / 60;
      
      s.flights_by_mission[f.mission_type] = (s.flights_by_mission[f.mission_type] || 0) + 1;
      s.flights_by_drone[f.drone_id] = (s.flights_by_drone[f.drone_id] || 0) + 1;
      s.top_locations[f.location] = (s.top_locations[f.location] || 0) + 1;
    });

    return s;
  }, [filteredFlights]);

  // Markers for Map
  const mapMarkers = useMemo(() => {
    return filteredFlights.map(f => {
      // Try to find a matching city in the location string
      const cityKey = Object.keys(CITY_COORDS).find(city => f.location.includes(city));
      
      if (cityKey) {
        const [baseLat, baseLng] = CITY_COORDS[cityKey];
        return {
          id: f.id,
          lat: jitter(baseLat),
          lng: jitter(baseLng),
          title: f.location,
          type: f.mission_type,
          info: `${new Date(f.date).toLocaleDateString()} - ${SUMMER_MISSION_LABELS[f.mission_type]}`
        } as MapMarker;
      }
      return null;
    }).filter((m): m is MapMarker => m !== null);
  }, [filteredFlights]);


  if (loading) {
    return (
       <div className="p-8 flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
       </div>
    );
  }

  // Prepare Chart Data
  const missionData = Object.entries(stats.flights_by_mission).map(([name, value]) => ({ 
    name: SUMMER_MISSION_LABELS[name as keyof typeof SUMMER_MISSION_LABELS] || name, 
    value 
  }));
  
  const locationData = Object.entries(stats.top_locations)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 5);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <Activity className="w-8 h-8 text-orange-600" />
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Estatísticas Operacionais</h1>
           <p className="text-sm text-slate-500">Indicadores de Desempenho - Operação Verão</p>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="p-4 border-t-4 border-t-orange-500 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm uppercase">
          <Filter className="w-4 h-4" /> Filtros de Pesquisa
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Select 
            label="Tipo de Ocorrência" 
            value={filterMission} 
            onChange={e => setFilterMission(e.target.value)}
            className="text-sm"
          >
            <option value="all">Todas</option>
            {Object.entries(SUMMER_MISSION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label as string}</option>
            ))}
          </Select>

          <Select 
            label="Aeronave" 
            value={filterDrone} 
            onChange={e => setFilterDrone(e.target.value)}
            className="text-sm"
          >
            <option value="all">Todas</option>
            {drones.map(d => (
              <option key={d.id} value={d.id}>{d.prefix} - {d.model}</option>
            ))}
          </Select>

          <Select 
            label="Piloto" 
            value={filterPilot} 
            onChange={e => setFilterPilot(e.target.value)}
            className="text-sm"
          >
            <option value="all">Todos</option>
            {pilots.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </Select>

          <Select 
            label="Localidade"
            value={filterLocation}
            onChange={e => {
                setFilterLocation(e.target.value);
                setFilterPgv('all'); // Reset PGV when location changes
            }}
            className="text-sm"
          >
            <option value="all">Todas as Cidades</option>
            {Object.keys(SUMMER_LOCATIONS).map(city => (
               <option key={city} value={city}>{city}</option>
            ))}
          </Select>

          <Select 
            label="Posto Guarda-Vidas (PGV)"
            value={filterPgv}
            onChange={e => setFilterPgv(e.target.value)}
            className="text-sm"
            disabled={filterLocation === 'all'}
          >
             <option value="all">Todos os Postos</option>
             {filterLocation !== 'all' && SUMMER_LOCATIONS[filterLocation]?.map(pgv => (
                 <option key={pgv} value={pgv}>{pgv}</option>
             ))}
          </Select>

          <div className="flex items-end">
            <Button onClick={handleResetFilters} variant="outline" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600">
              <RefreshCcw className="w-4 h-4 mr-2" /> Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-wider">Total de Voos (Filtro)</p>
              <h2 className="text-5xl font-bold mt-2">{stats.total_flights}</h2>
              <p className="text-xs text-orange-200 mt-1">Registros encontrados</p>
            </div>
            <Sun className="w-10 h-10 opacity-30" />
          </div>
        </Card>
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Horas Voadas</p>
              <h2 className="text-4xl font-bold mt-2 text-slate-800">{stats.total_hours.toFixed(1)}h</h2>
              <p className="text-xs text-green-600 mt-1 font-medium">Tempo de emprego</p>
            </div>
            <Clock className="w-8 h-8 text-slate-300" />
          </div>
        </Card>
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
           <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Local + Ativo</p>
              <h2 className="text-xl font-bold mt-2 text-slate-800 truncate">
                {Object.keys(stats.top_locations)[0] || 'N/A'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Maior volume</p>
            </div>
            <MapPin className="w-8 h-8 text-slate-300" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 h-80 shadow-md">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase">Distribuição por Missão</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={missionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {missionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 h-80 shadow-md">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase">Top 5 Localidades</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20}>
                   {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-2">
           <Card className="h-[664px] shadow-md border-0 overflow-hidden relative">
              <div className="bg-slate-800 text-white p-3 flex justify-between items-center absolute top-0 left-0 right-0 z-[400] opacity-90">
                 <h3 className="font-bold text-sm flex items-center gap-2">
                    <MapIcon className="w-4 h-4" /> Mapa de Calor Operacional
                 </h3>
                 <span className="text-xs text-slate-300">Litoral Paranaense</span>
              </div>
              
              <MapContainer 
                 center={[-25.6, -48.5]} 
                 zoom={9} 
                 style={{ height: '100%', width: '100%' }}
              >
                 <MapController />
                 <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                 />
                 
                 {mapMarkers.map(marker => (
                    <CircleMarker 
                      key={marker.id}
                      center={[marker.lat, marker.lng]}
                      pathOptions={{ 
                          color: MISSION_COLORS[marker.type] || 'gray',
                          fillColor: MISSION_COLORS[marker.type] || 'gray',
                          fillOpacity: 0.6,
                          weight: 1
                      }}
                      radius={10}
                    >
                      <Popup>
                        <div className="text-xs font-sans">
                           <strong className="block text-sm mb-1">{marker.title}</strong>
                           <span className="block text-slate-500">{marker.info}</span>
                           <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-white text-[10px] uppercase font-bold" style={{ backgroundColor: MISSION_COLORS[marker.type] }}>
                              {SUMMER_MISSION_LABELS[marker.type as keyof typeof SUMMER_MISSION_LABELS]}
                           </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                 ))}
              </MapContainer>

              {/* Legend Overlay */}
              <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur p-3 rounded-lg shadow-xl border border-slate-200 z-[400] text-xs">
                 <div className="font-bold text-slate-700 mb-2 border-b pb-1">Legenda (Tipo de Missão)</div>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(SUMMER_MISSION_LABELS).map(([key, label]) => (
                       <div key={key} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: MISSION_COLORS[key] }}></div>
                          <span className="text-slate-600">{label as string}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
