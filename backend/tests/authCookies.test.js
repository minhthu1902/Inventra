import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  setAuthCookie,
} from "../src/auth/authCookies.js";

function createResponseStub() {
  return {
    cookieCall: null,
    clearCookieCall: null,
    cookie(name, token, options) {
      this.cookieCall = { name, token, options };
    },
    clearCookie(name, options) {
      this.clearCookieCall = { name, options };
    },
  };
}

test("auth session cookie is HTTP-only and can be cleared with matching scope", () => {
  const response = createResponseStub();
  setAuthCookie(response, "test-session-token");
  clearAuthCookie(response);

  assert.equal(response.cookieCall.name, AUTH_COOKIE_NAME);
  assert.equal(response.cookieCall.token, "test-session-token");
  assert.equal(response.cookieCall.options.httpOnly, true);
  assert.equal(response.cookieCall.options.sameSite, "lax");
  assert.equal(response.clearCookieCall.name, AUTH_COOKIE_NAME);
  assert.equal(
    response.clearCookieCall.options.path,
    response.cookieCall.options.path,
  );
});
