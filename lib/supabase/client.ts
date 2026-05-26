import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase para Client Components.
 * Usar apenas onde for estritamente necessário (forms interativos).
 * A maioria das leituras deve acontecer no servidor.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
