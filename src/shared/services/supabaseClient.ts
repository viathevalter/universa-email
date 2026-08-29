import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const targetUrl = url || localStorage.getItem('saas_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const targetKey = anonKey || localStorage.getItem('saas_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey || !targetUrl.startsWith('https://')) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(targetUrl, targetKey);
    } catch (e) {
      console.warn('[Supabase Init Error]', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function resetSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  if (url && anonKey) {
    localStorage.setItem('saas_supabase_url', url);
    localStorage.setItem('saas_supabase_anon_key', anonKey);
    supabaseInstance = createClient(url, anonKey);
    return supabaseInstance;
  } else {
    localStorage.removeItem('saas_supabase_url');
    localStorage.removeItem('saas_supabase_anon_key');
    supabaseInstance = null;
    return null;
  }
}
