import test from "node:test";
import assert from "node:assert/strict";
import {
  createVerificationToken,
  hashVerificationToken,
  createVerificationUrl,
} from "../src/auth/emailVerification.js";

test("verification token is a 64-character opaque token with a matching hash", () => {
  const first = createVerificationToken();
  const second = createVerificationToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.equal(first.tokenHash, hashVerificationToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.ok(first.expiresAt.getTime() > Date.now());
});

test("verification URL points to the frontend one-click verification page", () => {
  const url = new URL(createVerificationUrl("a".repeat(64)));

  assert.equal(url.pathname, "/auth/verify-email");
  assert.equal(url.searchParams.get("token"), "a".repeat(64));
});
