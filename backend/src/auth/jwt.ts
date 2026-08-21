import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionTokenPayload {
  userId: string;
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload;
}

export const SESSION_COOKIE_NAME = "reachinbox_session";
