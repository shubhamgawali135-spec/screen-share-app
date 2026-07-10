import { Request, Response } from "express";
import * as sessionService from "../services/session.service";

export async function createSessionHandler(_req: Request, res: Response) {
  try {
    const session = await sessionService.createSession();
    res.status(201).json({ session });
  } catch (err) {
    console.error("[sessions] create failed:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
}

export async function getSessionHandler(req: Request, res: Response) {
  const { sessionCode } = req.params;

  try {
    const session = await sessionService.getSessionByCode(sessionCode);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.status(200).json({ session });
  } catch (err) {
    console.error("[sessions] lookup failed:", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
}
