require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./database/connections/prisma_client");
const { getRedisClient } = require("./database/connections/redis");
const apiRouter = require("./routes/api");
const { connectMQTT } = require("./mqtt/connection");
const { registerSensorSubscriber } = require("./mqtt/subscribers/sensor_subscriber");
const { initCronJobs } = require("./cron/database_cleanup_cron");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use("/api", apiRouter);

app.get("/health", async (req, res) => {
  try {
    
    await prisma.$queryRaw`SELECT 1`;

    
    let redisStatus = "UNKNOWN";
    try {
      const redis = getRedisClient();
      const pingResult = await redis.ping();
      redisStatus = pingResult === "PONG" ? "CONNECTED" : "UNHEALTHY";
    } catch (redisErr) {
      redisStatus = `ERROR: ${redisErr.message}`;
    }

    return res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      redis: redisStatus,
      message:
        redisStatus === "CONNECTED"
          ? "Server Subur.in-Backend berjalan normal dan terkoneksi ke Supabase & Redis!"
          : "Server berjalan normal, terkoneksi ke Supabase, namun bermasalah dengan Redis.",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return res.status(500).json({
      status: "DOWN",
      message: "Server berjalan, namun GAGAL terkoneksi ke database Supabase.",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

app.get("/", (req, res) => {
  res.send(
    "Selamat datang di API Subur.in-Backend! Kunjungi /api untuk melihat endpoint yang tersedia.",
  );
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(process.env.DATABASE_URL)

  try {
    initCronJobs();
  } catch (err) {
    console.error("[Cron] Gagal menginisialisasi cron jobs:", err.message);
  }


  try {
    getRedisClient();
    console.log("[Redis] Inisialisasi Redis dimulai...");
  } catch (err) {
    console.error("[Redis] Gagal menginisialisasi Redis:", err.message);
  }

  try {
    const mqttClient = connectMQTT();

    mqttClient.on("connect", () => {
      registerSensorSubscriber(mqttClient);
    });

    console.log("[MQTT] Inisialisasi MQTT dimulai...");
  } catch (err) {
    console.error("[MQTT] Gagal menginisialisasi MQTT:", err.message);
  }
});
