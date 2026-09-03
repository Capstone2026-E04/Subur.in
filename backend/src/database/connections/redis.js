"use strict";

const { Redis: UpstashRedis } = require("@upstash/redis");
const Redis = require("ioredis");

let redisClient = null;

class UpstashRedisAdapter {
  constructor(client) {
    this.client = client;
  }

  async ping() {
    try {
      const pong = await this.client.ping();
      return pong;
    } catch (err) {
      throw err;
    }
  }

  async get(key) {
    const data = await this.client.get(key);
    if (data && typeof data === "object") {
      return JSON.stringify(data);
    }
    return data;
  }

  async set(key, value, option, seconds) {
    let payload = value;
    try {
      if (typeof value === "string") {
        payload = JSON.parse(value);
      }
    } catch (e) {
    }

    if (option === "EX" || option === "ex") {
      return await this.client.set(key, payload, { ex: seconds });
    }
    if (option === "PX" || option === "px") {
      return await this.client.set(key, payload, { px: seconds });
    }
    return await this.client.set(key, payload);
  }

  async exists(key) {
    const res = await this.client.exists(key);
    return typeof res === "number" ? res : (res ? 1 : 0);
  }

  async keys(pattern) {
    return await this.client.keys(pattern);
  }

  async del(...keys) {
    return await this.client.del(...keys);
  }

  async setex(key, seconds, value) {
    return await this.set(key, value, "EX", seconds);
  }

  async incr(key) {
    return await this.client.incr(key);
  }

  on(event, callback) {
    if (event === "connect") {
      setTimeout(() => callback(), 0);
    }
  }
}

function getRedisClient() {
  if (redisClient) return redisClient;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    console.log("[Redis] ️ Menggunakan Upstash Redis REST Client.");
    const rawClient = new UpstashRedis({
      url: upstashUrl,
      token: upstashToken,
    });
    redisClient = new UpstashRedisAdapter(rawClient);
    
    redisClient.on("connect", () => {
      console.log("[Redis]  Terhubung ke Upstash Redis.");
    });
  } else {
    console.log("[Redis]  Menggunakan local Docker Redis (ioredis).");
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });
    } else {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });
    }

    redisClient.on("connect", () => {
      console.log("[Redis]  Terhubung ke Redis (ioredis).");
    });

    redisClient.on("error", (err) => {
      console.error("[Redis]  Error koneksi Redis (ioredis):", err.message);
    });

    redisClient.on("close", () => {
      console.warn("[Redis]  Koneksi Redis ditutup (ioredis).");
    });
  }

  return redisClient;
}

module.exports = { getRedisClient };
