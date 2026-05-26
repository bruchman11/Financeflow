/**
 * Lê variáveis de ambiente públicas do Supabase de forma lazy,
 * para não quebrar o build quando elas ainda não existem.
 * O erro só aparece se realmente tentarmos criar um client em runtime.
 */

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Copie .env.example para .env.local e preencha as chaves do Supabase.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
