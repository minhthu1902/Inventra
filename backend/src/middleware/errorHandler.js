import mongoose from "mongoose";
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
  // Data the model rejects is a bad request, not a server failure
  if (error instanceof mongoose.Error.ValidationError) {
    return response.status(400).json({
      message: "Request validation failed",
      errors: Object.values(error.errors).map(({ path, message }) => ({ path, message })),
    });
  }
  if (error instanceof mongoose.Error.CastError) {
    return response.status(400).json({ message: `Invalid value for ${error.path}` });
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
