"use strict";

const Redis = require("ioredis");

let redisClient = null;

function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;

  const options = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  };

  if (redisUrl) {
    redisClient = new Redis(redisUrl, options);
  } else {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      ...options,
    });
  }

  redisClient.on("connect", () => {
    console.log("[Redis] Terhubung ke Redis (ioredis).");
  });

  redisClient.on("error", (err) => {
    console.error("[Redis] Error koneksi Redis (ioredis):", err.message);
  });

  redisClient.on("close", () => {
    console.warn("[Redis] Koneksi Redis ditutup (ioredis).");
  });

  return redisClient;
}

module.exports = { getRedisClient };
