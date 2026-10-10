const prisma = require("../database/connections/prisma_client");
const { sendSuccess, sendError } = require("../utils/response");

const TYPES = ["LIME", "SULFUR"];
const METHODS = ["INCORPORATION", "TOP_DRESSING"];

async function findOwnedDevice(id, userId) {
  return prisma.device.findFirst({ where: { id, userId } });
}

exports.createCorrection = async (req, res, next) => {
  try {
    const { type, method, doseGram, phBefore, appliedAt } = req.body;

    if (!TYPES.includes(type)) {
      return sendError(
        res,
        400,
        `"type" harus salah satu dari ${TYPES.join(", ")}.`,
      );
    }
    if (!METHODS.includes(method)) {
      return sendError(
        res,
        400,
        `"method" harus salah satu dari ${METHODS.join(", ")}.`,
      );
    }
    const dose = Number(doseGram);
    const ph = Number(phBefore);
    if (!Number.isFinite(dose) || dose <= 0) {
      return sendError(res, 400, '"doseGram" harus berupa angka lebih dari 0.');
    }
    if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
      return sendError(res, 400, '"phBefore" harus berupa angka 0-14.');
    }
    const applied = appliedAt ? new Date(appliedAt) : new Date();
    if (Number.isNaN(applied.getTime()) || applied > new Date()) {
      return sendError(
        res,
        400,
        '"appliedAt" harus tanggal valid dan tidak di masa depan.',
      );
    }

    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) {
      return sendError(
        res,
        404,
        "Device tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    const correction = await prisma.correctionLog.create({
      data: {
        deviceId: device.id,
        type,
        method,
        doseGram: dose,
        phBefore: ph,
        appliedAt: applied,
      },
    });
    return sendSuccess(res, 201, "Pencatatan koreksi berhasil disimpan.", {
      correction,
    });
  } catch (error) {
    console.error("[CorrectionController] Gagal menyimpan koreksi:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};

exports.getCorrections = async (req, res, next) => {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) {
      return sendError(
        res,
        404,
        "Device tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    const corrections = await prisma.correctionLog.findMany({
      where: { deviceId: device.id },
      orderBy: { appliedAt: "desc" },
      take: 100,
    });
    return sendSuccess(res, 200, "Riwayat koreksi berhasil diambil.", {
      corrections,
    });
  } catch (error) {
    console.error("[CorrectionController] Gagal mengambil riwayat koreksi:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};
