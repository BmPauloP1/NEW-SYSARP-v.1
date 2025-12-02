
import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// CONFIGURAÇÃO SEGURA DO SUPABASE
// ==============================================================================

// Função para limpar variáveis de ambiente (remove aspas extras e espaços)
const sanitize = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/["']/g, '').trim();
};

// 1. Captura segura das variáveis de ambiente
const envUrl = sanitize((import.meta as any).env?.VITE_SUPABASE_URL);
const envKey = sanitize((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

// 2. Fallbacks Hardcoded (Garantia de funcionamento)
const FALLBACK_URL = "https://hcnlrzzwwcbhkxfcolgw.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjbmxyenp3d2NiaGt4ZmNvbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjI2MjUsImV4cCI6MjA3OTk5ODYyNX0.bbfDQA8VHebBMizyJGeP1GentnEiEka1nvFdR7fgQwo";

// 3. Definição Final
// Se a variável de ambiente existir e for válida (começa com http), usa ela. Senão, usa o fallback.
const finalUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : FALLBACK_URL;
const finalKey = (envKey && envKey.length > 20) ? envKey : FALLBACK_KEY;

export const isConfigured = !!finalUrl && !!finalKey;

// 4. Log de Diagnóstico (Apenas em desenvolvimento ou erro)
if (!finalUrl.startsWith('http')) {
  console.error('[SYSARP CRITICAL] URL do Supabase inválida:', finalUrl);
} else {
  console.log('[SYSARP] Conectando ao Supabase:', finalUrl);
}

// 5. Instanciação do Cliente
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'sysarp-v1' },
  },
});
