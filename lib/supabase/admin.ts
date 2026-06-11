import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSupabaseUrl } from "./env";

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não definida (necessária para a API de integração).",
    );
  }
  return key;
}

/**
 * Cliente Supabase com a service-role key.
 *
 * ATENÇÃO: bypassa RLS. Use SOMENTE em rotas de servidor seguras (API de
 * integração) e SEMPRE filtre `company_id` explicitamente em toda query/insert
 * — sem isso, dados vazam entre empresas.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
