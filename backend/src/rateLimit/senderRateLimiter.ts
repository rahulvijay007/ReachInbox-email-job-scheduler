import { redisConnection } from "../queue/connection";

/**
 * Atomic, Redis-backed rate limiter shared by every worker process/instance.
 *
 * Enforces two things per sender in a single Lua script (Lua scripts run
 * atomically in Redis, so concurrent workers — same process or multiple
 * instances — cannot race past the limits):
 *   1. A minimum delay between two sends from the same sender.
 *   2. A max-emails-per-rolling-hour-bucket cap per sender.
 *
 * When the hourly cap is hit, jobs aren't dropped — the script hands back
 * how many ms to wait until the next free slot (next hour boundary, with a
 * best-effort spread across the overflow so a whole backlog doesn't fire in
 * the same instant), and the worker uses that to `job.moveToDelayed(...)`.
 */
const RATE_LIMIT_SCRIPT = `
local lastSentKey = KEYS[1]
local hourKeyPrefix = KEYS[2]

local now = tonumber(ARGV[1])
local minDelayMs = tonumber(ARGV[2])
local hourlyLimit = tonumber(ARGV[3])
local hourWindowMs = tonumber(ARGV[4])

-- 1) minimum delay since this sender's last send
local lastSent = tonumber(redis.call('GET', lastSentKey) or '0')
local delayWait = (lastSent + minDelayMs) - now
if delayWait > 0 then
  return {0, delayWait}
end

-- 2) hourly cap for the current bucket
local bucket = math.floor(now / hourWindowMs)
local hourKey = hourKeyPrefix .. ':' .. bucket
local count = tonumber(redis.call('GET', hourKey) or '0')

if count >= hourlyLimit then
  local nextBucket = bucket + 1
  local nextBoundary = nextBucket * hourWindowMs
  local overflowKey = hourKeyPrefix .. ':overflow:' .. nextBucket
  local overflowIdx = redis.call('INCR', overflowKey)
  redis.call('PEXPIRE', overflowKey, hourWindowMs * 2)
  local wait = (nextBoundary - now) + ((overflowIdx - 1) * minDelayMs)
  return {0, wait}
end

-- allowed: atomically record the send
redis.call('SET', lastSentKey, now)
redis.call('INCR', hourKey)
redis.call('PEXPIRE', hourKey, hourWindowMs * 2)
return {1, 0}
`;

const HOUR_WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  waitMs: number;
}

export async function checkSenderRateLimit(params: {
  senderId: string;
  minDelayMs: number;
  hourlyLimit: number;
}): Promise<RateLimitResult> {
  const { senderId, minDelayMs, hourlyLimit } = params;
  const lastSentKey = `ratelimit:lastsent:${senderId}`;
  const hourKeyPrefix = `ratelimit:hour:${senderId}`;
  const now = Date.now();

  const [allowed, waitMs] = (await redisConnection.eval(
    RATE_LIMIT_SCRIPT,
    2,
    lastSentKey,
    hourKeyPrefix,
    now,
    minDelayMs,
    hourlyLimit,
    HOUR_WINDOW_MS
  )) as [number, number];

  return { allowed: allowed === 1, waitMs };
}
