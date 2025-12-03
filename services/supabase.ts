
import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// CONFIGURAÇÃO SEGURA DO SUPABASE
// ==============================================================================

// Função para limpar variáveis de ambiente
const sanitize = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/["']/g, '').trim();
};

const envUrl = sanitize((import.meta as any).env?.VITE_SUPABASE_URL);
const envKey = sanitize((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

const FALLBACK_URL = "https://hcnlrzzwwcbhkxfcolgw.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjbmxyenp3d2NiaGt4ZmNvbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjI2MjUsImV4cCI6MjA3OTk5ODYyNX0.bbfDQA8VHebBMizyJGeP1GentnEiEka1nvFdR7fgQwo";

const finalUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : FALLBACK_URL;
const finalKey = (envKey && envKey.length > 20) ? envKey : FALLBACK_KEY;

export const isConfigured = !!finalUrl && !!finalKey;

if (!finalUrl.startsWith('http')) {
  console.error('[SYSARP CRITICAL] URL do Supabase inválida:', finalUrl);
} else {
  console.log('[SYSARP] Conectando ao Supabase (Optimized Mode):', finalUrl);
}

// 5. Instanciação do Cliente com Configurações Otimizadas
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
        eventsPerSecond: 5 // Limita eventos para evitar sobrecarga
    }
  },
  global: {
    headers: { 'x-client-info': 'sysarp-optimized-v1' },
  },
});
