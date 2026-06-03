import { z } from "zod";
import type { DreType } from "@/lib/types/database";

export const DRE_TYPES = [
  "revenue",
  "cost",
  "expense",
  "tax",
] as const satisfies readonly DreType[];

export const dreTypeLabels: Record<DreType, string> = {
  revenue: "Receita",
  cost: "Custo",
  expense: "Despesa",
  tax: "Imposto",
};

export const dreTypeColors: Record<DreType, string> = {
  revenue: "#22c55e",
  cost: "#f97316",
  expense: "#ef4444",
  tax: "#64748b",
};

/**
 * Código DRE no formato "NN" ou "NN.NN" ou "NN.NN.NN" (até 3 níveis).
 * Cada segmento tem 2 dígitos.
 */
const codeSchema = z
  .string({ error: "Informe o código." })
  .trim()
  .regex(
    /^\d{2}(\.\d{2}){0,2}$/,
    "Formato inválido. Use 01, 01.02 ou 01.02.03.",
  );

const nameSchema = z
  .string({ error: "Informe o nome." })
  .trim()
  .min(1, "Informe o nome.")
  .max(60, "Máximo 60 caracteres.");

const dreTypeSchema = z.enum(DRE_TYPES, { error: "Tipo DRE inválido." });

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

export const createCategorySchema = z.object({
  code: codeSchema,
  name: nameSchema,
  dre_type: dreTypeSchema,
  color: colorSchema,
});

export const updateCategorySchema = createCategorySchema;

export const archiveCategorySchema = z.object({
  id: z.uuid({ error: "Categoria inválida." }),
  archived: z.string().transform((v) => v === "1" || v === "true"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Retorna o code do pai a partir de um code filho, ou null se for raiz. */
export function parentCodeOf(code: string): string | null {
  const segments = code.split(".");
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join(".");
}
