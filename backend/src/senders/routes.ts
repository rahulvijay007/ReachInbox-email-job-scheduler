import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { createSender, listSenders } from "./senderService";
import { env } from "../config/env";

export const sendersRouter = Router();
sendersRouter.use(requireAuth);

sendersRouter.get("/", async (req, res, next) => {
  try {
    const senders = await listSenders(req.userId!);
    res.json({ senders, defaults: { minDelayMs: env.MIN_DELAY_BETWEEN_EMAILS_MS, hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER } });
  } catch (err) {
    next(err);
  }
});

const createSenderSchema = z.object({
  label: z.string().min(1).max(120),
});

sendersRouter.post("/", async (req, res, next) => {
  try {
    const { label } = createSenderSchema.parse(req.body);
    const sender = await createSender(req.userId!, label);
    res.status(201).json({ sender });
  } catch (err) {
    next(err);
  }
});
