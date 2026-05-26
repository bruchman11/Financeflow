import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Endpoint do callback do Supabase Auth (PKCE).
 * Recebe `code` no query string, troca por sessão e redireciona.
 * Usado em confirmações de e-mail, magic links e (no futuro) OAuth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/companies";

  if (!code) {
    return NextResponse.redirect(new URL("/login", url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/login", url);
    redirectUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(next, url));
}
