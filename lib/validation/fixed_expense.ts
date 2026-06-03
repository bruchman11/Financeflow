import { z } from "zod";
import { parseBRLToNumeric } from "@/lib/format/currency";
import type {
  FixedExpenseFrequency,
  FixedExpenseStatus,
} from "@/lib/types/database";

export const FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom",
] as const satisfies readonly FixedExpenseFrequency[];

export const frequencyLabels: Record<FixedExpenseFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

export const STATUSES = [
  "active",
  "inactive",
] as const satisfies readonly FixedExpenseStatus[];

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

const descriptionSchema = z
  .string({ error: "Informe a descrição." })
  .trim()
  .min(1, "Informe a descrição.")
  .max(120, "Máximo 120 caracteres.");

const customDaysSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    const raw = (v ?? "").trim();
    if (!raw) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0 || n > 365) {
      ctx.addIssue({
        code: "custom",
        message: "Intervalo deve ser entre 1 e 365 dias.",
      });
      return z.NEVER;
    }
    return n;
  });

export const createFixedExpenseSchema = z
  .object({
    description: descriptionSchema,
    amount: amountSchema,
    frequency: z.enum(FREQUENCIES, { error: "Frequência inválida." }),
    custom_interval_days: customDaysSchema,
    next_due_date: dateSchema,
    category_id: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v?.trim() ? v.trim() : null)),
    default_account_id: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v?.trim() ? v.trim() : null)),
    notes: z
      .string()
      .max(500, "Máximo 500 caracteres.")
      .optional()
      .nullable()
      .transform((v) => v?.trim() || null),
  })
  .refine(
    (d) => d.frequency !== "custom" || d.custom_interval_days !== null,
    {
      message: "Informe o intervalo personalizado em dias.",
      path: ["custom_interval_days"],
    },
  );

export const updateFixedExpenseSchema = createFixedExpenseSchema;

export const setFixedExpenseStatusSchema = z.object({
  id: z.uuid({ error: "Despesa fixa inválida." }),
  status: z.enum(STATUSES),
});

export const payFixedExpenseSchema = z.object({
  fixed_expense_id: z.uuid({ error: "Despesa fixa inválida." }),
  account_id: z.uuid({ error: "Selecione a conta." }),
  amount: amountSchema,
  paid_on: dateSchema,
  due_date_paid: dateSchema,
});

export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseSchema>;
export type PayFixedExpenseInput = z.infer<typeof payFixedExpenseSchema>;
