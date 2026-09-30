"use strict";

const prisma = require("../src/database/connections/prisma_client");

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT l.device_id AS device_id, COUNT(*)::int AS jumlah
    FROM raw_sensor_logs l
    LEFT JOIN devices d ON d.id = l.device_id
    WHERE d.id IS NULL
    GROUP BY l.device_id
    ORDER BY jumlah DESC
  `;

  if (rows.length === 0) {
    console.log("Tidak ada raw_sensor_logs yatim.");
    return;
  }

  const total = rows.reduce((sum, r) => sum + r.jumlah, 0);
  console.log(`Ditemukan ${rows.length} device_id yatim dengan total ${total} baris:`);
  console.table(rows);
}

main()
  .catch((err) => {
    console.error("Gagal memeriksa raw_sensor_logs yatim:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
