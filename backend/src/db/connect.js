import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, {
    appName: "inventra-backend",
  });
  console.info("Connected to MongoDB");
}

// Keep retrying in the background so the API stays up (and reports 503) while the database is unreachable
export async function connectDatabaseWithRetry({ maxDelayMs = 30_000 } = {}) {
  let delayMs = 2_000;
  for (;;) {
    try {
      await connectDatabase();
      return;
    } catch (error) {
      console.error(`MongoDB connection failed; retrying in ${delayMs / 1000}s:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }
}

export function isDatabaseUnavailableError(error) {
  const name = error?.name ?? "";
  return (
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNotConnectedError" ||
    /buffering timed out/i.test(error?.message ?? "")
  );
}
