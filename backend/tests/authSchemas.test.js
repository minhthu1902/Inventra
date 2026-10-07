import test from "node:test";
import assert from "node:assert/strict";
import { signInSchema, signUpSchema } from "../src/auth/authSchemas.js";

test("signup trims name and normalizes email", () => {
  const parsed = signUpSchema.parse({
    name: "  Thu Thai  ",
    email: "  THU@example.com ",
    password: "secure-password-123",
  });

  assert.equal(parsed.name, "Thu Thai");
  assert.equal(parsed.email, "thu@example.com");
});

test("signup rejects short passwords and invalid email addresses", () => {
  assert.equal(
    signUpSchema.safeParse({ name: "Thu", email: "not-an-email", password: "short" }).success,
    false,
  );
});

test("signup rejects passwords longer than bcrypt's 72-byte limit", () => {
  assert.equal(
    signUpSchema.safeParse({ name: "Thu", email: "thu@example.com", password: "a".repeat(73) }).success,
    false,
  );
});

test("signin normalizes email and requires a password", () => {
  assert.deepEqual(signInSchema.parse({ email: " USER@example.com ", password: "secret" }), {
    email: "user@example.com",
    password: "secret",
  });
  assert.equal(signInSchema.safeParse({ email: "user@example.com", password: "" }).success, false);
});
