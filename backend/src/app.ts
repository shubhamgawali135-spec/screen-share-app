import express, { Express } from "express";
import cors from "cors";
import { env } from "./config/env";
import healthRouter from "./routes/health";
import sessionRouter from "./routes/session.routes";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      methods: ["GET", "POST"],
    })
  );
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/sessions", sessionRouter);

  return app;
}
