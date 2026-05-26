import { z } from "zod";
import type { TransactionType } from "@/lib/types/database";

export const TRANSACTION_TYPES = [
  "income",
  "expense",
] as const satisfies readonly TransactionType[];

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Entrada",
  expense: "Saída",
};

/**
 * Preset fixo de cores. Hex 6 dígitos minúsculo.
 * Escolhidas para terem bom contraste com texto branco/dark mode.
 */
export const CATEGORY_COLORS = [
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#10b981", // esmeralda
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#64748b", // cinza
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const DEFAULT_CATEGORY_COLOR: CategoryColor = "#64748b";

const nameSchema = z
  .string({ error: "Informe o nome." })
  .trim()
  .min(1, "Informe o nome.")
  .max(60, "Máximo 60 caracteres.");

const typeSchema = z.enum(TRANSACTION_TYPES, { error: "Tipo inválido." });

const colorSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim().toLowerCase();
    if (!raw) return DEFAULT_CATEGORY_COLOR;
    const valid = (CATEGORY_COLORS as readonly string[]).includes(raw);
    if (!valid) {
      ctx.addIssue({ code: "custom", message: "Cor inválida." });
      return z.NEVER;
    }
    return raw as CategoryColor;
  });

export const createCategorySchema = z.object({
  name: nameSchema,
  type: typeSchema,
  color: colorSchema,
});

export const updateCategorySchema = createCategorySchema;

export const archiveCategorySchema = z.object({
  id: z.uuid({ error: "Categoria inválida." }),
  archived: z.string().transform((v) => v === "1" || v === "true"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
