import "dotenv/config";
import { z } from "zod";

const optionalEmail = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.email().optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: optionalEmail,
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration:",
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsedEnv.data;
