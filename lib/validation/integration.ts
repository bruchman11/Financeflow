import { z } from "zod";

/** Aceita número ou string ("1.234,56" BR ou "1234.56") e devolve "1234.56". */
const amountSchema = z.union([z.string(), z.number()]).transform((v, ctx) => {
  let s = typeof v === "number" ? String(v) : v.trim();
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  s = s.replace(/[^\d.]/g, "");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    ctx.addIssue({ code: "custom", message: "Valor inválido (deve ser > 0)." });
    return z.NEVER;
  }
  return n.toFixed(2);
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em AAAA-MM-DD.");

/** Body do POST /api/integrations/transactions. */
export const integrationCreateTxSchema = z.object({
  phone: z.string().min(5, "Telefone inválido."),
  type: z.enum(["income", "expense"], { error: "Tipo inválido." }),
  amount: amountSchema,
  account: z.string().min(1, "Conta obrigatória."),
  occurred_on: isoDate.optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  client_request_id: z.uuid().optional().nullable(),
});

export type IntegrationCreateTxInput = z.infer<
  typeof integrationCreateTxSchema
>;

/** Filtros comuns dos GET de leitura (validados a partir da query). */
export const integrationRangeSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
