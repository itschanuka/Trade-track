import { z } from "zod";

export const SignupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(12).max(128)
  })
  .strict();

export const ForgotPasswordSchema = z
  .object({
    email: z.string().trim().email().max(255)
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    token: z.string().trim().min(32).max(256),
    password: z.string().min(12).max(128)
  })
  .strict();

export const OnboardingSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(48)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    address: z.string().trim().max(500).optional().or(z.literal("")),
    website: z.string().trim().url().max(255).optional().or(z.literal("")),
    defaultPaymentTerms: z.coerce.number().int().min(0).max(120),
    defaultTaxRate: z.coerce.number().min(0).max(100),
    defaultPaymentInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
    defaultQuoteExpiry: z.coerce.number().int().min(1).max(120),
    invoicePrefix: z.string().trim().min(1).max(12),
    quotePrefix: z.string().trim().min(1).max(12)
  })
  .strict();

export type SignupInput = z.infer<typeof SignupSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
