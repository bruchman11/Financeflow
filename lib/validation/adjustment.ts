import { z } from "zod";
import { parseBRLToNumeric } from "@/lib/format/currency";

/**
 * Saldo alvo do ajuste: aceita negativos (conta no vermelho).
 */
const targetBalanceSchema = z
  .string({ error: "Informe o saldo desejado." })
  .min(1, "Informe o saldo desejado.")
  .transform((value, ctx) => {
    const raw = value.trim();
    // parseBRLToNumeric aceita "-" no início
    const normalized = parseBRLToNumeric(raw);
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
    return normalized;
  });

const dateSchema = z
  .string({ error: "Informe a data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const adjustBalanceSchema = z.object({
  account_id: z.uuid({ error: "Conta inválida." }),
  target_balance: targetBalanceSchema,
  occurred_on: dateSchema,
  reason: z
    .string()
    .max(255, "Máximo 255 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || ""),
});

export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
