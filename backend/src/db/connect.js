import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, {
    appName: "inventra-backend",
  });
  console.info("Connected to MongoDB");
}
