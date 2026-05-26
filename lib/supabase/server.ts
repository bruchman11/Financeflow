import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Lê e escreve cookies da requisição atual para manter a sessão.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll é chamado em Server Components puros, onde cookies
          // são read-only. Quando isso acontece, a renovação efetiva
          // do token acontece no middleware. Ignorar é seguro.
        }
      },
    },
  });
}
