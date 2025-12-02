
import { supabase, isConfigured } from './supabase';
import { Drone, Operation, Pilot, Maintenance, FlightLog, ConflictNotification, DroneChecklist } from '../types';

// Mapeamento de nomes de tabelas
const TABLE_MAP = {
  Operation: 'operations',
  Pilot: 'profiles',
  Drone: 'drones',
  Maintenance: 'maintenances',
  FlightLog: 'flight_logs',
  ConflictNotification: 'conflict_notifications',
  DroneChecklist: 'drone_checklists'
};

// Chaves do LocalStorage para Fallback Offline
const STORAGE_KEYS = {
  Operation: 'sysarp_operations',
  Pilot: 'sysarp_pilots',
  Drone: 'sysarp_drones',
  Maintenance: 'sysarp_maintenance',
  FlightLog: 'sysarp_flight_logs',
  ConflictNotification: 'sysarp_notifications',
  DroneChecklist: 'sysarp_drone_checklists'
};

// Default Catalog Data
const DEFAULT_DRONE_CATALOG = {
  "DJI": ["Matrice 350 RTK", "Matrice 30T", "Matrice 300 RTK", "Mavic 3 Thermal", "Mavic 3 Enterprise", "Agras T40", "Mini 3 Pro"],
  "Autel Robotics": ["EVO II Dual 640T V3", "EVO Max 4T"],
  "Teledyne FLIR": ["SIRAS", "Black Hornet 3"],
  "XAG": ["P100 Pro", "V40"]
};

// MOCK ADMIN USER (Backdoor)
const MOCK_ADMIN: Pilot = {
  id: 'admin-local-id',
  full_name: 'Administrador Sistema',
  email: 'admin@sysarp.mil.br',
  role: 'admin',
  status: 'active',
  phone: '41999999999',
  sarpas_code: 'ADMIN01',
  crbm: '1º CRBM - Curitiba (Leste/Litoral)',
  unit: 'BOA - Batalhão de Operações Aéreas',
  license: 'ADMIN-KEY',
  course_type: 'internal',
  course_name: 'Administração de Sistema',
  course_year: 2024,
  course_hours: 9999,
  change_password_required: false,
  terms_accepted: true,
  password: 'admin123'
};

// Helpers para LocalStorage
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Seed Data para Pilotos (Garante Admin)
const seedPilotsIfEmpty = () => {
  const currentPilots = getLocal<Pilot>('sysarp_pilots');
  if (!currentPilots.some(p => p.email === MOCK_ADMIN.email)) {
    currentPilots.unshift(MOCK_ADMIN);
    setLocal('sysarp_pilots', currentPilots);
  }
  return currentPilots;
};

// Seed Data para Aeronaves
const seedDronesIfEmpty = () => {
  const currentDrones = getLocal<Drone>('sysarp_drones');
  if (currentDrones.length === 0) {
    const today = new Date();
    const tenDaysAgo = new Date(today); tenDaysAgo.setDate(today.getDate() - 10);
    const twentyFiveDaysAgo = new Date(today); twentyFiveDaysAgo.setDate(today.getDate() - 25);

    const seeds: Drone[] = [
      {
        id: 'seed-1',
        prefix: 'HARPIA 01',
        brand: 'DJI',
        model: 'Matrice 30T',
        serial_number: 'SN12345678',
        sisant: 'PP-12345',
        sisant_expiry_date: '2025-12-31',
        status: 'available',
        weight: 3700,
        max_flight_time: 41,
        max_range: 7000,
        max_altitude: 120,
        payloads: ['Termal', 'Zoom'],
        total_flight_hours: 120.5,
        last_30day_check: tenDaysAgo.toISOString()
      },
      {
        id: 'seed-2',
        prefix: 'HARPIA 02',
        brand: 'DJI',
        model: 'Mavic 3 Thermal',
        serial_number: 'SN87654321',
        sisant: 'PP-54321',
        sisant_expiry_date: '2026-06-30',
        status: 'available',
        weight: 920,
        max_flight_time: 45,
        max_range: 5000,
        max_altitude: 120,
        payloads: ['Termal'],
        total_flight_hours: 45.2,
        last_30day_check: twentyFiveDaysAgo.toISOString()
      }
    ];
    setLocal('sysarp_drones', seeds);
    return seeds;
  }
  return currentDrones;
};


// Generic Entity Handler
const createEntityHandler = <T extends { id: string }>(entityName: keyof typeof TABLE_MAP) => {
  const tableName = TABLE_MAP[entityName];
  const storageKey = STORAGE_KEYS[entityName];

  return {
    list: async (orderBy?: string): Promise<T[]> => {
      if (!isConfigured) {
        if (entityName === 'Drone') seedDronesIfEmpty();
        if (entityName === 'Pilot') seedPilotsIfEmpty();
        return getLocal<T>(storageKey);
      }

      try {
        let query = supabase.from(tableName).select('*');
        if (orderBy) {
          const ascending = !orderBy.startsWith('-');
          const column = orderBy.replace('-', '');
          query = query.order(column, { ascending });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as unknown as T[];
      } catch (e) {
        console.warn(`Supabase list error for ${entityName}:`, e);
        return getLocal<T>(storageKey);
      }
    },

    filter: async (predicate: Partial<T> | ((item: T) => boolean)): Promise<T[]> => {
      if (!isConfigured) {
        if (entityName === 'Pilot') seedPilotsIfEmpty();
        const items = getLocal<T>(storageKey);
        if (typeof predicate === 'function') {
          return items.filter(predicate);
        } else {
          return items.filter(item => Object.entries(predicate).every(([key, value]) => (item as any)[key] === value));
        }
      }

      try {
        if (typeof predicate === 'object') {
          let query = supabase.from(tableName).select('*');
          Object.entries(predicate).forEach(([key, value]) => {
            query = query.eq(key, value as any);
          });
          const { data, error } = await query;
          if (error) throw error;
          return data as unknown as T[];
        }
        
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return (data as unknown as T[]).filter(predicate);
      } catch (e) {
        console.warn(`Supabase filter error for ${entityName}:`, e);
        const items = getLocal<T>(storageKey);
        if (typeof predicate === 'function') {
          return items.filter(predicate);
        } else {
          return items.filter(item => Object.entries(predicate).every(([key, value]) => (item as any)[key] === value));
        }
      }
    },

    create: async (item: Omit<T, 'id' | 'created_at'>): Promise<T> => {
      const cleanItem = JSON.parse(JSON.stringify(item));
      if ('password' in cleanItem) delete cleanItem.password;
      
      if (!isConfigured) {
        const newItem = { ...cleanItem, id: crypto.randomUUID(), created_at: new Date().toISOString() } as T;
        const items = getLocal<T>(storageKey);
        items.push(newItem);
        setLocal(storageKey, items);
        return newItem;
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert([cleanItem])
          .select()
          .single();
        
        if (error) {
           console.error(`Supabase Insert Error (${tableName}):`, JSON.stringify(error, null, 2));
           throw error; 
        }
        return data as T;

      } catch (e: any) {
        const msg = e.message || '';
        
        if (msg.includes("Failed to fetch")) {
          throw new Error("Erro de Conexão: Não foi possível contatar o servidor. Verifique sua internet ou se o firewall está bloqueando o Supabase.");
        }

        const missingCol = msg.match(/Could not find the '(.+?)' column/)?.[1];
        if (missingCol) {
           throw new Error(`Banco de Dados desatualizado: Falta a coluna '${missingCol}' na tabela '${tableName}'.`);
        }

        throw new Error(`Erro ao salvar: ${msg}`);
      }
    },

    update: async (id: string, updates: Partial<T>): Promise<T> => {
      if (!isConfigured) {
        const items = getLocal<T>(storageKey);
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error("Item não encontrado localmente");
        
        const updatedItem = { ...items[index], ...updates };
        items[index] = updatedItem;
        setLocal(storageKey, items);
        return updatedItem;
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data as T;
      } catch (e: any) {
        const msg = e.message || '';
        if (msg.includes("Failed to fetch")) {
           throw new Error("Erro de Conexão: Falha ao contatar o servidor.");
        }
        throw new Error(`Erro ao atualizar: ${msg}`);
      }
    },

    delete: async (id: string): Promise<void> => {
      if (!isConfigured) {
        const items = getLocal<T>(storageKey);
        setLocal(storageKey, items.filter(i => i.id !== id));
        return;
      }

      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        throw new Error(`Erro ao excluir: ${e.message}`);
      }
    }
  };
};

// Auth Handler
const authHandler = {
  me: async (): Promise<Pilot> => {
    // Check if using the backdoor admin session
    const isAdminSession = localStorage.getItem('sysarp_admin_session');
    
    // IF ONLINE, backdoor is disabled to force real auth
    if (!isConfigured) {
       if (isAdminSession === 'true') return MOCK_ADMIN;
       const localSession = localStorage.getItem('sysarp_user_session');
       if (localSession) return JSON.parse(localSession) as Pilot;
       throw new Error("Sessão não encontrada (Offline)");
    } else {
       // If configured, clear legacy/offline admin session to avoid confusion
       if (isAdminSession) localStorage.removeItem('sysarp_admin_session');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Não autenticado");
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
         // Auto-healing
         console.warn("Perfil não encontrado, tentando auto-healing...");
         try {
           const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata.full_name || 'Usuário Recuperado',
                  role: 'operator',
                  status: 'active',
                  terms_accepted: true
              }])
              .select()
              .single();
              
           if(newProfile) return newProfile as Pilot;
         } catch(err) {
           console.error("Auto-healing falhou:", err);
         }
         throw new Error("Perfil não encontrado.");
      }
      return profile as Pilot;
    } catch (e) {
      const localSession = localStorage.getItem('sysarp_user_session');
      if (localSession && !isConfigured) return JSON.parse(localSession) as Pilot;
      throw e;
    }
  },

  login: async (email: string, password?: string): Promise<Pilot> => {
    const adminEmails = ['admin', 'admin@admin.com', 'admin@sysarp.mil.br'];
    
    if (!password) throw new Error("Senha obrigatória");

    // Offline Backdoor
    if (!isConfigured) {
      if(adminEmails.includes(email.toLowerCase()) && password === 'admin123') {
        localStorage.setItem('sysarp_admin_session', 'true');
        return MOCK_ADMIN;
      }
      const pilots = seedPilotsIfEmpty();
      const pilot = pilots.find(p => p.email === email);
      if (pilot && pilot.password === password) {
         localStorage.setItem('sysarp_user_session', JSON.stringify(pilot));
         return pilot;
      }
      throw new Error("Usuário não encontrado ou senha incorreta (Modo Offline)");
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Failed to fetch")) throw new Error("Erro de Conexão: Não foi possível conectar ao servidor.");
        if (error.message.includes("Email not confirmed")) throw new Error("E-mail não confirmado. Verifique sua caixa de entrada ou peça ao administrador para desativar a confirmação de e-mail no Supabase.");
        if (error.message.includes("Email logins are disabled")) throw new Error("O provedor de E-mail está desativado no painel do Supabase. Ative-o em Authentication > Providers.");
        throw error;
      }
      if (!data.user) throw new Error("Erro no login");

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

      if (!profile) {
         // Self-healing: Create profile if missing
         try {
           const { data: newProfile } = await supabase.from('profiles').insert([{
               id: data.user.id,
               email: data.user.email,
               full_name: data.user.user_metadata.full_name || 'Usuário',
               role: 'operator',
               status: 'active',
               terms_accepted: true
           }]).select().single();
           if (newProfile) return newProfile as Pilot;
         } catch(profileErr) {
             console.error("Auto-healing falhou:", profileErr);
         }
         return { 
             id: data.user.id, 
             email: data.user.email!, 
             full_name: 'Perfil Pendente', 
             role: 'operator', 
             status: 'active' 
         } as Pilot;
      }

      return profile as Pilot;
    } catch (e: any) {
      console.warn("Login Supabase falhou:", e);
      throw e; 
    }
  },

  createAccount: async (pilotData: Partial<Pilot> & { password?: string, email_confirm?: boolean }): Promise<Pilot> => {
    if (!pilotData.email || !pilotData.password) throw new Error("Email e senha obrigatórios");
    
    if (!isConfigured) {
      // Local creation logic...
      const pilots = getLocal<Pilot>('sysarp_pilots');
      const newPilot: Pilot = {
        ...pilotData, id: crypto.randomUUID(), role: 'operator', status: 'active',
        full_name: pilotData.full_name!, email: pilotData.email!, 
        password: pilotData.password, change_password_required: false,
        terms_accepted_at: new Date().toISOString()
      } as Pilot;
      pilots.push(newPilot); setLocal('sysarp_pilots', pilots);
      localStorage.setItem('sysarp_user_session', JSON.stringify(newPilot));
      return newPilot;
    }

    try {
      if (!navigator.onLine) throw new Error("Sem conexão com a internet.");

      // Ensure no undefined values are sent to meta_data to prevent SQL trigger issues
      const metaData = {
        full_name: pilotData.full_name || 'Usuário',
        phone: pilotData.phone || '',
        sarpas_code: pilotData.sarpas_code || '',
        crbm: pilotData.crbm || '',
        unit: pilotData.unit || '',
        license: pilotData.license || '',
        role: pilotData.role || 'operator',
        terms_accepted: pilotData.terms_accepted || false
      };

      const { data, error } = await supabase.auth.signUp({
        email: pilotData.email, 
        password: pilotData.password,
        options: { 
          data: metaData
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao criar usuário no Auth.");

      // Explicit Profile Creation (Upsert) - Fallback if Trigger fails
      try {
        const profilePayload = {
            id: data.user.id,
            email: pilotData.email,
            full_name: metaData.full_name,
            role: metaData.role,
            status: 'active',
            phone: metaData.phone,
            sarpas_code: metaData.sarpas_code,
            crbm: metaData.crbm,
            unit: metaData.unit,
            license: metaData.license,
            terms_accepted: metaData.terms_accepted,
            terms_accepted_at: new Date().toISOString()
        };
        
        await supabase.from('profiles').upsert(profilePayload);
      } catch (upsertError: any) {
        console.warn("Aviso: Upsert manual de perfil falhou (possivelmente criado pelo Trigger):", upsertError.message);
      }

      return { id: data.user.id, ...pilotData } as Pilot;

    } catch (e: any) {
      console.error("Cadastro Supabase falhou:", e);
      const msg = e.message || '';

      if (msg.includes("Failed to fetch")) {
        throw new Error("Não foi possível conectar ao servidor Supabase. Verifique sua conexão com a internet.");
      }
      if (msg.includes("Email logins are disabled")) {
        throw new Error("O provedor de E-mail está desativado no Supabase. Ative-o em Authentication > Providers > Email.");
      }
      if (msg.includes("Database error saving new user")) {
        const fixSql = `
-- COPY AND RUN THIS IN SUPABASE SQL EDITOR:
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS sarpas_code text,
ADD COLUMN IF NOT EXISTS crbm text,
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS license text,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
`;
        console.error("SQL FIX REQUIRED:", fixSql);
        throw new Error("SQL FIX REQUIRED: O banco de dados está bloqueando o cadastro. Use o modal para copiar o script de correção.");
      }
      throw new Error(msg || "Erro no cadastro.");
    }
  },

  changePassword: async (userId: string, newPassword: string): Promise<void> => {
    if (userId === MOCK_ADMIN.id) return;
    const termsAcceptedAt = new Date().toISOString();

    if (!isConfigured) {
      const pilots = getLocal<Pilot>('sysarp_pilots');
      const index = pilots.findIndex(p => p.id === userId);
      if (index !== -1) {
        pilots[index].password = newPassword;
        pilots[index].change_password_required = false;
        pilots[index].terms_accepted = true;
        setLocal('sysarp_pilots', pilots);
      }
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.from('profiles').update({ 
        change_password_required: false,
        terms_accepted: true,
        terms_accepted_at: termsAcceptedAt
      }).eq('id', userId);
    } catch (e) {
      console.error(e);
    }
  },

  logout: async () => {
    localStorage.removeItem('sysarp_admin_session');
    localStorage.removeItem('sysarp_user_session');
    if (isConfigured) await supabase.auth.signOut();
  },

  system: {
    getCatalog: async (): Promise<Record<string, string[]>> => {
       const stored = localStorage.getItem('droneops_catalog');
       return stored ? JSON.parse(stored) : DEFAULT_DRONE_CATALOG;
    },
    updateCatalog: async (newCatalog: Record<string, string[]>) => {
       localStorage.setItem('droneops_catalog', JSON.stringify(newCatalog));
    },
    diagnose: async () => {
      const results = [];
      if (!isConfigured) return [{ check: 'Modo Offline', status: 'WARN', message: 'Rodando localmente.' }];

      // Test 1: Profiles
      try {
        const { error } = await supabase.from('profiles').select('id, email, phone, terms_accepted, sarpas_code').limit(1);
        if (error) throw error;
        results.push({ check: 'Tabela Pilotos (Profiles)', status: 'OK', message: 'Colunas novas detectadas.' });
      } catch (e: any) {
        results.push({ check: 'Tabela Pilotos (Profiles)', status: 'ERROR', message: `Erro: ${e.message}. Faltam colunas.` });
      }

      // Test 2: Drones
      try {
        const { error } = await supabase.from('drones').select('id, last_30day_check').limit(1);
        if (error) throw error;
        results.push({ check: 'Tabela Aeronaves', status: 'OK', message: 'Coluna last_30day_check ok.' });
      } catch (e: any) {
        results.push({ check: 'Tabela Aeronaves', status: 'ERROR', message: e.message });
      }
      
      // Test 3: Operations
      try {
        const { error } = await supabase.from('operations').select('id, aro, flight_altitude').limit(1);
        if (error) throw error;
        results.push({ check: 'Tabela Operações', status: 'OK', message: 'Colunas ARO/Altitude ok.' });
      } catch (e: any) {
        results.push({ check: 'Tabela Operações', status: 'ERROR', message: e.message });
      }

      return results;
    }
  }
};

export const base44 = {
  entities: {
    Operation: createEntityHandler<Operation>('Operation'),
    Pilot: createEntityHandler<Pilot>('Pilot'),
    Drone: createEntityHandler<Drone>('Drone'),
    Maintenance: createEntityHandler<Maintenance>('Maintenance'),
    FlightLog: createEntityHandler<FlightLog>('FlightLog'),
    ConflictNotification: createEntityHandler<ConflictNotification>('ConflictNotification'),
    DroneChecklist: createEntityHandler<DroneChecklist>('DroneChecklist'),
  },
  auth: authHandler,
  system: authHandler.system,
  integrations: {
    Core: {
      UploadFile: async ({ file }: { file: File }) => {
        if (!isConfigured) return { url: URL.createObjectURL(file) };

        const fileName = `${Date.now()}_${file.name}`;
        try {
          const { error } = await supabase.storage.from('mission-files').upload(fileName, file);
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage.from('mission-files').getPublicUrl(fileName);
          return { url: publicUrl };
        } catch (e) {
          console.warn("Upload offline fallback.");
          return { url: URL.createObjectURL(file) };
        }
      }
    }
  }
};
