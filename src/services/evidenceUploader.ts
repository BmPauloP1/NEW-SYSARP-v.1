
import { supabase, isConfigured } from './supabase';

export const evidenceUploader = {
  upload: async (file: File, folder: 'photos' | 'videos'): Promise<string> => {
    // Fallback Local
    if (!isConfigured) {
      console.warn("Supabase não configurado. Usando URL local temporária.");
      return URL.createObjectURL(file);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from('summer-evidence')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('summer-evidence')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      // Fallback em caso de erro de rede
      return URL.createObjectURL(file);
    }
  }
};
