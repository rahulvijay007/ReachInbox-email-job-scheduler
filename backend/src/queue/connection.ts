import IORedis from "ioredis";
import { env } from "../config/env";

// A single shared ioredis connection, configured per BullMQ's requirement
// of maxRetriesPerRequest: null. Used by the Queue, the Worker, and the
// rate-limiter's Lua-script client.
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
