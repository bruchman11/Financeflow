import { z } from "zod";

export const emailSchema = z
  .string({ error: "Informe seu e-mail" })
  .trim()
  .min(1, "Informe seu e-mail")
  .email("E-mail inválido");

export const passwordSchema = z
  .string({ error: "Informe sua senha" })
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(72, "Senha muito longa");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});

export const signUpSchema = z.object({
  full_name: z
    .string({ error: "Informe seu nome" })
    .trim()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),
  email: emailSchema,
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
