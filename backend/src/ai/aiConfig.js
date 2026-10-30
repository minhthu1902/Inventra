import "dotenv/config";
import { z } from "zod";

// Both providers speak the OpenAI Chat Completions format; Gemini through its OpenAI-compatible endpoint
const providers = {
  openai: {
    label: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  gemini: {
    label: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash",
  },
};

const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const aiConfigSchema = z.object({
  AI_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["openai", "gemini"]).optional()),
  AI_API_KEY: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  AI_MODEL: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  AI_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  OPENAI_MODEL: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export function resolveAiConfig(source) {
  const parsed = aiConfigSchema.safeParse(source);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const values = parsed.data;
  // Without an explicit provider, use whichever provider has a key; OpenAI keeps priority for existing setups
  const providerName =
    values.AI_PROVIDER ?? (!values.OPENAI_API_KEY && values.GEMINI_API_KEY ? "gemini" : "openai");
  const provider = providers[providerName];
  const providerKey = providerName === "gemini" ? values.GEMINI_API_KEY : values.OPENAI_API_KEY;
  const providerModel = providerName === "openai" ? values.OPENAI_MODEL : undefined;
  return {
    config: {
      provider: providerName,
      label: provider.label,
      apiKey: values.AI_API_KEY ?? providerKey ?? "",
      model: values.AI_MODEL ?? providerModel ?? provider.model,
      url: values.AI_BASE_URL ?? provider.url,
    },
  };
}

const resolved = resolveAiConfig(process.env);

if (resolved.error) {
  console.error("Invalid AI configuration:", resolved.error);
  process.exit(1);
}

export const aiConfig = resolved.config;
