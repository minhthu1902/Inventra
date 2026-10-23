import "dotenv/config";
import { z } from "zod";

const aiConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4o-mini"),
});

const parsedConfig = aiConfigSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error("Invalid AI configuration:", parsedConfig.error.flatten().fieldErrors);
  process.exit(1);
}

export const aiConfig = parsedConfig.data;
