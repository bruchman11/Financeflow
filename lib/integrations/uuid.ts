import "server-only";
import { createHash } from "node:crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Namespace fixo (UUID) para os ids de integração do FinanceFlow.
const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/-/g, ""), "hex");
}

/** UUIDv5 (SHA-1) determinístico a partir de namespace + nome. */
function uuidv5(name: string): string {
  const bytes = createHash("sha1")
    .update(hexToBytes(NAMESPACE))
    .update(Buffer.from(name, "utf8"))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // versão 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Converte um id qualquer (ex.: o `wamid` do WhatsApp) num UUID estável:
 * - se já for um UUID válido → devolve em minúsculas;
 * - senão → UUIDv5 determinístico (mesma entrada → sempre o mesmo UUID).
 * Mantém a idempotência sem exigir que o cliente gere UUIDs.
 */
export function stableUuid(raw: string): string {
  const s = raw.trim();
  if (UUID_RE.test(s)) return s.toLowerCase();
  return uuidv5(s);
}
