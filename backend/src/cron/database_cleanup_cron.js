const cron = require("node-cron");
const prisma = require("../database/connections/prisma_client");
const { getRedisClient } = require("../database/connections/redis");
const { broadcastToDevice } = require("../sse/sse_manager");


function getPartitionRanges(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  
  const startYear = year;
  const startMonth = String(month + 1).padStart(2, '0');
  const startStr = `${startYear}-${startMonth}-01 00:00:00+00`;
  
  const nextDate = new Date(Date.UTC(year, month + 1, 1));
  const endYear = nextDate.getUTCFullYear();
  const endMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const endStr = `${endYear}-${endMonth}-01 00:00:00+00`;
  
  const partitionName = `raw_sensor_logs_y${startYear}m${startMonth}`;
  
  return { partitionName, startStr, endStr };
}

async function checkIsPartitioned() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT p.partstrat::text AS partstrat
      FROM pg_class c
      JOIN pg_partitioned_table p ON c.oid = p.partrelid
      WHERE c.relname = 'raw_sensor_logs';
    `);
    return result.length > 0 && result[0].partstrat === 'r';
  } catch (err) {
    console.error("[Cron] Gagal memeriksa tipe partisi tabel:", err.message);
    return false;
  }
}

async function createPartitionForMonth(date) {
  const { partitionName, startStr, endStr } = getPartitionRanges(date);
  try {
    const tableExistsResult = await prisma.$queryRawUnsafe(`
      SELECT to_regclass('public.${partitionName}')::text AS table_regclass;
    `);
    
    if (tableExistsResult.length > 0 && tableExistsResult[0].table_regclass !== null) {
      console.log(`[Cron] Tabel partisi ${partitionName} sudah ada.`);
      return;
    }
    
    console.log(`[Cron] Membuat partisi ${partitionName} untuk rentang ${startStr} hingga ${endStr}...`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${partitionName}" 
      PARTITION OF "raw_sensor_logs" 
      FOR VALUES FROM ('${startStr}') TO ('${endStr}');
    `);
    console.log(`[Cron] Sukses membuat tabel partisi ${partitionName}.`);
  } catch (err) {
    console.error(`[Cron] Gagal memproses pembuatan partisi ${partitionName}:`, err.message);
  }
}

async function managePartitions() {
  console.log("[Cron] Memulai pengecekan partisi...");
  const isPartitioned = await checkIsPartitioned();
  
  if (!isPartitioned) {
    console.warn(
      "[Cron] PERINGATAN: Tabel 'raw_sensor_logs' di database tidak dikonfigurasi sebagai tabel terpartisi (partitioned table). Pengecekan/pembuatan partisi dilewati."
    );
    return;
  }

  const now = new Date();
  await createPartitionForMonth(now);

  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  await createPartitionForMonth(nextMonth);
  
  console.log("[Cron] Pengecekan partisi selesai.");
}

async function cleanupOldLogs() {
  console.log("[Cron] Memulai pembersihan log lama (>30 hari)...");
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedRecommendations = await prisma.recommendationLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`[Cron] Hapus recommendation_logs selesai. Jumlah baris dihapus: ${deletedRecommendations.count}`);
    
    const deletedSensors = await prisma.rawSensorLog.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`[Cron] Hapus raw_sensor_logs selesai. Jumlah baris dihapus: ${deletedSensors.count}`);

    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`[Cron] Hapus notifications selesai. Jumlah baris dihapus: ${deletedNotifications.count}`);
    
  } catch (err) {
    console.error("[Cron] Gagal melakukan pembersihan log lama:", err.message);
  }
}

async function checkOfflineDevices() {
  console.log("[Cron] Memeriksa status keaktifan device (heartbeat)...");
  try {
    const devices = await prisma.device.findMany();
    const now = new Date();
    const redis = getRedisClient();

    for (const device of devices) {
      if (!device.lastSeenAt) continue;

      const thresholdMs = 2 * device.sensorInterval * 60 * 1000;
      const timeSinceLastSeen = now.getTime() - new Date(device.lastSeenAt).getTime();

      if (timeSinceLastSeen > thresholdMs) {
        const notifiedKey = `sensor:offline_notified:${device.id}`;
        const alreadyNotified = await redis.get(notifiedKey);

        if (!alreadyNotified) {
          console.warn(`[Cron] Device "${device.id}" terdeteksi offline. Tidak mengirim data melebihi 2x interval.`);
          
          try {
            await prisma.notification.create({
              data: {
                deviceId: device.id,
                title: "Data Sensor Tidak Valid",
                message: "Data sensor tidak valid. Periksa sensor, daya, atau koneksi.",
                type: "warning",
              }
            });
          } catch (dbErr) {
            console.error(`[Cron] Gagal menyimpan notifikasi offline device ${device.id} ke DB:`, dbErr.message);
          }

          broadcastToDevice(device.id, {
            type: "NOTIFICATION",
            notification: {
              title: "Data Sensor Tidak Valid",
              message: "Data sensor tidak valid. Periksa sensor, daya, atau koneksi.",
              type: "warning",
            }
          });

          await redis.set(notifiedKey, "1");
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Gagal memeriksa status offline device:", err.message);
  }
}

function initCronJobs() {
  console.log("[Cron] Menginisialisasi cron jobs Subur.in...");
  
  cron.schedule("0 0 * * *", () => {
    cleanupOldLogs().catch(err => {
      console.error("[Cron Job] Gagal menjalankan pembersihan harian:", err);
    });
  });
  
  cron.schedule("0 1 * * *", () => {
    managePartitions().catch(err => {
      console.error("[Cron Job] Gagal menjalankan pengecekan partisi harian:", err);
    });
  });
  
  cron.schedule("*/1 * * * *", () => {
    checkOfflineDevices().catch(err => {
      console.error("[Cron Job] Gagal menjalankan pengecekan device offline:", err);
    });
  });
  
  console.log("[Cron] Menjalankan inisialisasi awal database cleanup & partisi saat startup...");
  
  const maxRetries = 5;
  const delayMs = 3000;

  async function runStartupJobs() {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log(`[Cron] Database terhubung dengan sukses pada percobaan ke-${attempt}. Menjalankan startup jobs...`);
        
        await cleanupOldLogs();
        await managePartitions();
        
        console.log("[Cron] Inisialisasi awal database cleanup & partisi selesai.");
        return;
      } catch (err) {
        console.warn(`[Cron] Percobaan koneksi database ke-${attempt} gagal: ${err.message}`);
        if (attempt === maxRetries) {
          console.error("[Cron] Gagal melakukan inisialisasi awal startup setelah beberapa kali mencoba. Database tidak dapat dihubungi.");
        } else {
          console.log(`[Cron] Mencoba kembali dalam ${delayMs / 1000} detik...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  runStartupJobs().catch(err => {
    console.error("[Cron] Error tidak terduga pada inisialisasi startup:", err);
  });
}

module.exports = {
  initCronJobs,
  cleanupOldLogs,
  managePartitions
};
