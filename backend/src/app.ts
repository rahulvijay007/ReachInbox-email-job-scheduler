import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRouter } from "./auth/routes";
import { sendersRouter } from "./senders/routes";
import { emailsRouter } from "./emails/routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/senders", sendersRouter);
app.use("/api/emails", emailsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
