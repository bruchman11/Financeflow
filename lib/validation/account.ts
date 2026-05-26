import { z } from "zod";
import { parseBRLToNumeric } from "@/lib/format/currency";
import type { AccountKind } from "@/lib/types/database";

export const ACCOUNT_KINDS = [
  "cash",
  "checking",
  "savings",
  "credit_card",
  "other",
] as const satisfies readonly AccountKind[];

export const accountKindLabels: Record<AccountKind, string> = {
  cash: "Caixa",
  checking: "Conta corrente",
  savings: "Poupança",
  credit_card: "Cartão de crédito",
  other: "Outra",
};

const nameSchema = z
  .string({ error: "Informe o nome." })
  .trim()
  .min(1, "Informe o nome.")
  .max(80, "Máximo 80 caracteres.");

const kindSchema = z.enum(ACCOUNT_KINDS, { error: "Tipo inválido." });

/**
 * Saldo inicial: aceita string vazia (vira "0.00") ou input PT-BR.
 * Após normalização, validamos faixa contra numeric(14,2):
 * até 12 dígitos antes do ponto.
 */
const openingBalanceSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim();
    if (!raw) return "0.00";
    const normalized = parseBRLToNumeric(raw);
    if (normalized === null) {
      ctx.addIssue({
        code: "custom",
        message: "Valor inválido. Use o formato 1.234,56.",
      });
      return z.NEVER;
    }
    const [intPart] = normalized.replace("-", "").split(".");
    if (intPart.length > 12) {
      ctx.addIssue({
        code: "custom",
        message: "Valor muito alto.",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const createAccountSchema = z.object({
  name: nameSchema,
  kind: kindSchema,
  opening_balance: openingBalanceSchema,
});

export const updateAccountSchema = createAccountSchema;

export const archiveAccountSchema = z.object({
  id: z.uuid({ error: "Conta inválida." }),
  archived: z
    .string()
    .transform((v) => v === "1" || v === "true"),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
