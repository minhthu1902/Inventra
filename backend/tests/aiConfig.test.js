import test from "node:test";
import assert from "node:assert/strict";
import { resolveAiConfig } from "../src/ai/aiConfig.js";

test("defaults to OpenAI with no key, so local analysis is used", () => {
  const { config } = resolveAiConfig({});
  assert.equal(config.provider, "openai");
  assert.equal(config.apiKey, "");
  assert.equal(config.model, "gpt-4o-mini");
  assert.equal(config.url, "https://api.openai.com/v1/chat/completions");
});

test("keeps existing OPENAI_API_KEY and OPENAI_MODEL setups working", () => {
  const { config } = resolveAiConfig({ OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4.1-mini" });
  assert.equal(config.label, "OpenAI");
  assert.equal(config.apiKey, "sk-test");
  assert.equal(config.model, "gpt-4.1-mini");
});

test("uses Gemini's OpenAI-compatible endpoint when Gemini is selected", () => {
  const { config } = resolveAiConfig({ AI_PROVIDER: "gemini", AI_API_KEY: "gemini-test" });
  assert.equal(config.label, "Gemini");
  assert.equal(config.apiKey, "gemini-test");
  assert.equal(config.model, "gemini-3.5-flash-lite");
  assert.equal(config.url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
});

test("picks Gemini automatically when only GEMINI_API_KEY is set", () => {
  const { config } = resolveAiConfig({ GEMINI_API_KEY: "gemini-test", AI_MODEL: "gemini-2.5-flash-lite" });
  assert.equal(config.provider, "gemini");
  assert.equal(config.model, "gemini-2.5-flash-lite");
});

test("treats blank values as unset and rejects unknown providers", () => {
  assert.equal(resolveAiConfig({ AI_PROVIDER: "", OPENAI_API_KEY: "  " }).config.apiKey, "");
  assert.ok(resolveAiConfig({ AI_PROVIDER: "other" }).error);
});
