import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import authRoutes from "./auth/authRoutes.js";
import inventoryRoutes from "./inventory/inventoryRoutes.js";
import dashboardRoutes from "./dashboard/dashboardRoutes.js";
import aiRoutes from "./ai/aiRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  response
    .status(databaseConnected ? 200 : 503)
    .json({ status: databaseConnected ? "ok" : "degraded", database: databaseConnected ? "connected" : "disconnected" });
});
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
