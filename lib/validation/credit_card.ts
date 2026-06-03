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

const optionalAmountSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim();
    if (!raw) return null;
    const normalized = parseBRLToNumeric(raw);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Valor inválido." });
      return z.NEVER;
    }
    return normalized;
  });

const dateSchema = z
  .string({ error: "Informe a data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

const dayOfMonthSchema = z
  .string()
  .transform((v, ctx) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1 || n > 31) {
      ctx.addIssue({ code: "custom", message: "Use um dia entre 1 e 31." });
      return z.NEVER;
    }
    return n;
  });

const colorSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    const s = (v ?? "").trim().toLowerCase();
    if (!s) return null;
    if (!/^#[0-9a-f]{6}$/.test(s)) return null;
    return s;
  });

// ── Cartão ────────────────────────────────────────────────────────────────────

export const createCreditCardSchema = z.object({
  name: z
    .string({ error: "Informe o nome." })
    .trim()
    .min(1, "Informe o nome.")
    .max(60, "Máximo 60 caracteres."),
  closing_day: dayOfMonthSchema,
  due_day: dayOfMonthSchema,
  limit_amount: optionalAmountSchema,
  payment_account_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  color: colorSchema,
});

export const updateCreditCardSchema = createCreditCardSchema;

// ── Compra ────────────────────────────────────────────────────────────────────

const installmentsSchema = z
  .string()
  .transform((v, ctx) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1 || n > 60) {
      ctx.addIssue({
        code: "custom",
        message: "Parcelas devem ser entre 1 e 60.",
      });
      return z.NEVER;
    }
    return n;
  });

export const createPurchaseSchema = z.object({
  description: z
    .string({ error: "Informe a descrição." })
    .trim()
    .min(1, "Informe a descrição.")
    .max(120, "Máximo 120 caracteres."),
  total_amount: amountSchema,
  installments_total: installmentsSchema,
  purchase_date: dateSchema,
  competence_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const s = (v ?? "").trim();
      if (!s) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
      return s;
    }),
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  payee: z
    .string()
    .max(120, "Máximo 120 caracteres.")
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

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

// Edição de compra: apenas campos textuais/categoria (não valor nem parcelas).
export const updatePurchaseSchema = z.object({
  description: z
    .string({ error: "Informe a descrição." })
    .trim()
    .min(1, "Informe a descrição.")
    .max(120, "Máximo 120 caracteres."),
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  payee: z
    .string()
    .max(120, "Máximo 120 caracteres.")
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

export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

// ── Pagamento de fatura ───────────────────────────────────────────────────────

export const payInvoiceSchema = z.object({
  invoice_id: z.uuid({ error: "Fatura inválida." }),
  account_id: z.uuid({ error: "Selecione a conta de pagamento." }),
  amount: amountSchema,
  paid_on: dateSchema,
});
