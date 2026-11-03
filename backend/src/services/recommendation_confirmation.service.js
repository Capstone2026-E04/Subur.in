"use strict";

const prisma = require("../database/connections/prisma_client");

// Konfirmasi hanya berlaku untuk log rekomendasi terbaru milik device.
// Mengembalikan "none" (belum ada log), "already" (sudah dikonfirmasi), atau "confirmed".
async function confirmLatestRecommendation(deviceId) {
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
  return count === 0
    ? { status: "already", log: latest }
    : { status: "confirmed", log: { id: latest.id, confirmedAt } };
}

module.exports = { confirmLatestRecommendation };
