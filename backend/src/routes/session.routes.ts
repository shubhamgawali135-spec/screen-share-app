import { Router } from "express";
import { createSessionHandler, getSessionHandler } from "../controllers/session.controller";

const router = Router();

router.post("/", createSessionHandler);
router.get("/:sessionCode", getSessionHandler);

export default router;
