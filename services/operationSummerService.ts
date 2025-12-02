

import { supabase, isConfigured } from './supabase';
import { SummerFlight, SummerStats, SummerAuditLog } from '../types_summer';

const TABLE = 'op_summer_flights';
const AUDIT_TABLE = 'op_summer_audit';
const STORAGE_KEY = 'sysarp_summer_flights';
const AUDIT_STORAGE_KEY = 'sysarp_summer_audit';

// Helpers LocalStorage
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

export const operationSummerService = {
  
  list: async (): Promise<SummerFlight[]> => {
    if (!isConfigured) return getLocal(STORAGE_KEY);
    
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data as SummerFlight[];
    } catch (e) {
      return getLocal(STORAGE_KEY);
    }
  },

  create: async (flight: Omit<SummerFlight, 'id' | 'created_at'>, userId: string): Promise<SummerFlight> => {
    // Calcular duração se não vier
    if (!flight.flight_duration) {
      const today = new Date().toISOString().split('T')[0];
      const start = new Date(`${today}T${flight.start_time}`);
      const end = new Date(`${today}T${flight.end_time}`);
      flight.flight_duration = Math.round((end.getTime() - start.getTime()) / 60000);
      if (flight.flight_duration < 0) flight.flight_duration += 1440; // Ajuste virada de dia
    }

    const auditEntry = {
      user_id: userId,
      action: 'CREATE',
      details: `Voo registrado em ${flight.location} (${flight.mission_type})`,
      timestamp: new Date().toISOString()
    };

    if (!isConfigured) {
      const newItem = { ...flight, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const items = getLocal(STORAGE_KEY);
      items.push(newItem);
      setLocal(STORAGE_KEY, items);

      // Local Audit
      const audits = getLocal(AUDIT_STORAGE_KEY);
      audits.push({ ...auditEntry, id: crypto.randomUUID(), flight_id: newItem.id });
      setLocal(AUDIT_STORAGE_KEY, audits);

      return newItem as SummerFlight;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert([flight])
      .select()
      .single();

    if (error) throw error;

    // Log Auditoria Remota (Best Effort)
    try {
      await supabase.from(AUDIT_TABLE).insert({
        flight_id: data.id,
        ...auditEntry
      });
    } catch (auditErr) {
      console.warn("Falha ao registrar auditoria (create):", auditErr);
    }

    return data as SummerFlight;
  },

  delete: async (ids: string[], userId: string): Promise<void> => {
    if (!isConfigured) {
      const items = getLocal(STORAGE_KEY);
      const filtered = items.filter((i: any) => !ids.includes(i.id));
      setLocal(STORAGE_KEY, filtered);

      // Local Audit
      const audits = getLocal(AUDIT_STORAGE_KEY);
      audits.push({ 
        user_id: userId,
        action: 'DELETE',
        details: `Exclusão local de ${ids.length} registro(s)`,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID(), 
        flight_id: 'local-bulk' 
      });
      setLocal(AUDIT_STORAGE_KEY, audits);
      return;
    }

    try {
      // 1. Delete flights
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .in('id', ids);

      if (error) throw error;

      // 2. Audit Log (Safe execution - does not block deletion success)
      try {
        await supabase.from(AUDIT_TABLE).insert({
          // Removed flight_id here to avoid UUID type mismatch error ('bulk-delete' is not UUID)
          // Also, referencing deleted rows via FK would fail anyway.
          user_id: userId,
          action: 'DELETE',
          details: `Exclusão de ${ids.length} registro(s) de voo. IDs: ${ids.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      } catch (auditError: any) {
        console.warn("Aviso: Falha ao criar log de auditoria para exclusão:", auditError.message);
      }

    } catch (e: any) {
      console.error("Erro crítico ao excluir voos:", e);
      throw new Error(e.message || "Erro desconhecido ao excluir registros no banco de dados.");
    }
  },

  getStats: async (): Promise<SummerStats> => {
    const flights = await operationSummerService.list();
    
    const stats: SummerStats = {
      total_flights: flights.length,
      total_hours: 0,
      flights_by_mission: {},
      flights_by_drone: {},
      top_locations: {}
    };

    flights.forEach(f => {
      stats.total_hours += (f.flight_duration || 0) / 60;
      
      stats.flights_by_mission[f.mission_type] = (stats.flights_by_mission[f.mission_type] || 0) + 1;
      stats.flights_by_drone[f.drone_id] = (stats.flights_by_drone[f.drone_id] || 0) + 1;
      stats.top_locations[f.location] = (stats.top_locations[f.location] || 0) + 1;
    });

    return stats;
  },

  getAuditLogs: async (): Promise<SummerAuditLog[]> => {
    if (!isConfigured) return getLocal(AUDIT_STORAGE_KEY);
    const { data } = await supabase.from(AUDIT_TABLE).select('*').order('timestamp', { ascending: false });
    return data || [];
  }
};