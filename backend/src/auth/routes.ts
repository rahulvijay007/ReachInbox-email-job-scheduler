import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { verifyGoogleIdToken } from "./google";
import { signSessionToken, SESSION_COOKIE_NAME } from "./jwt";
import { ensureDefaultSender } from "../senders/senderService";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

export const authRouter = Router();

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

authRouter.post("/google", async (req, res, next) => {
  try {
    const { idToken } = googleLoginSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(idToken);

    const user = await prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: { name: profile.name, avatarUrl: profile.avatarUrl, email: profile.email },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    // Every user needs at least one sender to schedule from.
    await ensureDefaultSender(user.id);

    const token = signSessionToken({ userId: user.id });
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});
