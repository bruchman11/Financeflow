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
        message: "Valor inválido. Use 1.234,56.",
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

const descriptionSchema = z
  .string({ error: "Informe a descrição." })
  .trim()
  .min(1, "Informe a descrição.")
  .max(120, "Máximo 120 caracteres.");

export const createBillSchema = z.object({
  description: descriptionSchema,
  beneficiary_name: z
    .string()
    .max(120, "Máximo 120 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
  amount: amountSchema,
  due_date: dateSchema,
  competence_date: optionalDateSchema,
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  barcode: z
    .string()
    .max(60, "Máximo 60 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
  digitable_line: z
    .string()
    .max(60, "Máximo 60 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
  notes: z
    .string()
    .max(500, "Máximo 500 caracteres.")
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
});

export const updateBillSchema = createBillSchema;

export const payBillSchema = z.object({
  bill_id: z.uuid({ error: "Boleto inválido." }),
  account_id: z.uuid({ error: "Selecione a conta de pagamento." }),
  amount: amountSchema,
  paid_on: dateSchema,
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
