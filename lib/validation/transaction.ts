import { z } from "zod";
import { parseBRLToNumeric } from "@/lib/format/currency";
import type { TransactionType } from "@/lib/types/database";

export const TRANSACTION_TYPES = [
  "income",
  "expense",
] as const satisfies readonly TransactionType[];

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Entrada",
  expense: "Saída",
};

const amountSchema = z
  .string({ error: "Informe o valor." })
  .min(1, "Informe o valor.")
  .transform((value, ctx) => {
    const normalized = parseBRLToNumeric(value.trim());
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Valor inválido. Use o formato 1.234,56.",
      });
      return z.NEVER;
    }
    const [intPart] = normalized.replace("-", "").split(".");
    if (intPart.length > 12) {
      ctx.addIssue({ code: "custom", message: "Valor muito alto." });
      return z.NEVER;
    }
    if (Number(normalized) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Valor deve ser maior que zero.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const dateSchema = z
  .string({ error: "Informe a data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

const optionalDateSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    const s = (v ?? "").trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
  });

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, { error: "Tipo inválido." }),
  amount: amountSchema,
  account_id: z.uuid({ error: "Selecione uma conta." }),
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  occurred_on: dateSchema,
  /** Quando ausente, o trigger no banco preenche com occurred_on. */
  competence_date: optionalDateSchema,
  description: z
    .string()
    .max(255, "Máximo 255 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
  client_request_id: z.uuid().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.omit({
  client_request_id: true,
});

export const deleteTransactionSchema = z.object({
  id: z.uuid({ error: "Movimentação inválida." }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
