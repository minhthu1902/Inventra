import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH_COOKIE_NAME } from "../auth/authCookies.js";

export function requireAuth(request, response, next) {
  const token = request.cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    request.auth = { userId: payload.sub };
    return next();
  } catch {
    return response.status(401).json({ message: "Authentication required" });
  }
}
