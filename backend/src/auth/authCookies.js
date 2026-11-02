import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "inventra_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export function setAuthCookie(response, token) {
  response.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearAuthCookie(response) {
  response.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
