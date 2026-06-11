import "server-only";
import { timingSafeEqual } from "node:crypto";

export type IntegrationContact = {
  phone: string;
  companyId: string;
  userId: string;
};

/** Reduz um telefone a apenas dígitos (E.164 sem "+"). */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

let cachedContacts: IntegrationContact[] | null = null;

function loadContacts(): IntegrationContact[] {
  if (cachedContacts) return cachedContacts;
  const raw = process.env.INTEGRATION_CONTACTS;
  if (!raw) {
    cachedContacts = [];
    return cachedContacts;
  }
  try {
    const parsed = JSON.parse(raw) as Array<{
      phone?: string;
      companyId?: string;
      userId?: string;
    }>;
    cachedContacts = parsed
      .filter((c) => c.phone && c.companyId && c.userId)
      .map((c) => ({
        phone: normalizePhone(c.phone),
        companyId: c.companyId as string,
        userId: c.userId as string,
      }));
  } catch {
    cachedContacts = [];
  }
  return cachedContacts;
}

/** Compara a API key em tempo constante (evita timing attacks). */
export function isValidApiKey(provided: string | null | undefined): boolean {
  const expected = process.env.INTEGRATION_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Resolve o telefone para a empresa/usuário allowlisted (ou null). */
export function resolveContact(
  phone: string | null | undefined,
): IntegrationContact | null {
  const norm = normalizePhone(phone);
  if (!norm) return null;
  return loadContacts().find((c) => c.phone === norm) ?? null;
}

export type AuthResult =
  | { ok: true; contact: IntegrationContact }
  | { ok: false; status: number; error: string };

/**
 * Autoriza uma requisição da API de integração:
 * 1) header `x-api-key` válido; 2) telefone presente; 3) telefone allowlisted.
 */
export function authorize(req: Request, phone: string | null): AuthResult {
  if (!isValidApiKey(req.headers.get("x-api-key"))) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  if (!phone || !normalizePhone(phone)) {
    return { ok: false, status: 400, error: "missing_phone" };
  }
  const contact = resolveContact(phone);
  if (!contact) {
    return { ok: false, status: 403, error: "phone_not_allowlisted" };
  }
  return { ok: true, contact };
}
