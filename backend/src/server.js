import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";
import mongoose from "mongoose";

async function startServer() {
  await connectDatabase();
  const server = app.listen(env.PORT, () => {
    console.info(`Inventra API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal) => {
    console.info(`${signal} received; closing API server`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start Inventra API:", error);
  process.exit(1);
});
