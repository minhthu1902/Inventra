import test from "node:test";
import assert from "node:assert/strict";
import { isDatabaseUnavailableError } from "../src/db/connect.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

function createResponseStub() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("recognizes MongoDB connectivity failures", () => {
  assert.equal(isDatabaseUnavailableError({ name: "MongooseServerSelectionError" }), true);
  assert.equal(isDatabaseUnavailableError({ name: "MongoNetworkError" }), true);
  assert.equal(
    isDatabaseUnavailableError(new Error("Operation `items.find()` buffering timed out after 10000ms")),
    true,
  );
  assert.equal(isDatabaseUnavailableError(new Error("Something else")), false);
  assert.equal(isDatabaseUnavailableError(undefined), false);
});

test("error handler answers 503 instead of 500 when the database is unreachable", () => {
  const response = createResponseStub();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler({ name: "MongooseServerSelectionError", message: "IP not allowed" }, {}, response, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /temporarily unavailable/);
});
