import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./auth/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.disable("x-powered-by");
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
  response.status(200).json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
