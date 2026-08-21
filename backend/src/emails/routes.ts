import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { scheduleEmails } from "./scheduleService";
import { getEmailJob, listScheduledEmails, listSentEmails } from "./queryService";
import { ApiError } from "../middleware/errorHandler";
import { env } from "../config/env";

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  recipients: z.array(z.string()).min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  startTime: z.coerce.date(),
  delayBetweenEmailsSec: z.coerce.number().int().min(0).default(2),
  hourlyLimit: z.coerce.number().int().min(1).default(env.MAX_EMAILS_PER_HOUR_PER_SENDER),
});

emailsRouter.post("/schedule", async (req, res, next) => {
  try {
    const input = scheduleSchema.parse(req.body);
    const result = await scheduleEmails({ ...input, userId: req.userId! });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

emailsRouter.get("/scheduled", async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const result = await listScheduledEmails(req.userId!, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

emailsRouter.get("/sent", async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const result = await listSentEmails(req.userId!, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

emailsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await getEmailJob(req.userId!, req.params.id);
    if (!job) throw new ApiError(404, "Email job not found");
    res.json({ job });
  } catch (err) {
    next(err);
  }
});
