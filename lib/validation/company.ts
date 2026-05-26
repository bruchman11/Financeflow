import { z } from "zod";

/**
 * Schema para criação de empresa. CNPJ é opcional e livre no MVP
 * (sem máscara obrigatória), apenas tira espaços e limita tamanho.
 */
export const createCompanySchema = z.object({
  name: z
    .string({ error: "Informe o nome da empresa" })
    .trim()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),
  legal_name: z
    .string()
    .trim()
    .max(180, "Razão social muito longa")
    .optional()
    .or(z.literal("")),
  tax_id: z
    .string()
    .trim()
    .max(20, "CNPJ inválido")
    .optional()
    .or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const setActiveCompanySchema = z.object({
  company_id: z.string().uuid("Empresa inválida"),
});
