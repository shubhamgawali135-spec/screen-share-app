import { Request, Response } from "express";
import * as sessionService from "../services/session.service";

export async function createSessionHandler(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const session = await sessionService.createSession();
    res.status(201).json({ session });
    return;
  } catch (err) {
    console.error("[sessions] create failed:", err);
    res.status(500).json({ error: "Failed to create session" });
    return;
  }
}

export async function getSessionHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { sessionCode } = req.params;

  try {
    const session = await sessionService.getSessionByCode(sessionCode);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.status(200).json({ session });
    return;
  } catch (err) {
    console.error("[sessions] lookup failed:", err);
    res.status(500).json({ error: "Failed to fetch session" });
    return;
  }
}