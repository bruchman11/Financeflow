import { z } from "zod";
import { parseBRLToNumeric } from "@/lib/format/currency";

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

export const createTransferSchema = z
  .object({
    from_account_id: z.uuid({ error: "Selecione a conta de origem." }),
    to_account_id: z.uuid({ error: "Selecione a conta de destino." }),
    amount: amountSchema,
    occurred_on: dateSchema,
    description: z
      .string()
      .max(255, "Máximo 255 caracteres.")
      .optional()
      .nullable()
      .transform((v) => v?.trim() || ""),
  })
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: "A conta de origem e destino devem ser diferentes.",
    path: ["to_account_id"],
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
