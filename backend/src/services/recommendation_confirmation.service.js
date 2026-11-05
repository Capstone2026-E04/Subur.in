"use strict";

const prisma = require("../database/connections/prisma_client");
const {
  confirmWaterAction,
} = require("../ai/services/water_schedule.service");

// Konfirmasi hanya berlaku untuk log rekomendasi terbaru milik device.
// Mengembalikan "none" (belum ada log), "already" (sudah dikonfirmasi), atau "confirmed".
// Saat "confirmed", jadwal rekomendasi berikutnya dimulai ulang (4 jam dari sekarang).
async function confirmLatestRecommendation(deviceId, deviceCode) {
  const latest = await prisma.recommendationLog.findFirst({
    where: { deviceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, confirmedAt: true },
  });
  if (!latest) return { status: "none" };
  if (latest.confirmedAt) return { status: "already", log: latest };

  const confirmedAt = new Date();
  const { count } = await prisma.recommendationLog.updateMany({
    where: { id: latest.id, confirmedAt: null },
    data: { confirmedAt },
  });
  if (count === 0) return { status: "already", log: latest };

  await confirmWaterAction(deviceCode);
  return { status: "confirmed", log: { id: latest.id, confirmedAt } };
}

module.exports = { confirmLatestRecommendation };
