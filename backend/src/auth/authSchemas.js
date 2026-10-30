import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must be at most 72 UTF-8 bytes",
  });

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const verifyEmailSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid verification token"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});
