import { isDatabaseUnavailableError } from "../db/connect.js";

export function notFoundHandler(_request, response) {
  return response.status(404).json({ message: "Route not found" });
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === 11000) {
    return response
      .status(409)
      .json({ message: "A record with this identifier already exists" });
  }
  if (isDatabaseUnavailableError(error)) {
    console.error("Database unavailable:", error.message);
    return response.status(503).json({
      message: "Inventra's database is temporarily unavailable. Please try again in a moment.",
    });
  }
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  if (status === 500) {
    console.error(error);
  }
  return response.status(status).json({
    message: status === 500 ? "Internal server error" : error.message,
  });
}
