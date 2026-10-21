const prisma = require("../database/connections/prisma_client");
const telegramService = require("../telegram/telegram_api.service");
const { sendSuccess, sendError } = require("../utils/response");
const { validatePassword, hashPassword } = require("../utils/password");

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        telegramChatId: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return sendError(res, 404, "Pengguna tidak ditemukan.");
    }

    const { telegramChatId, passwordHash, ...safeUser } = user;

    return sendSuccess(res, 200, "Data profil berhasil diambil.", {
      user: {
        ...safeUser,
        isTelegramLinked: Boolean(telegramChatId),
        hasPassword: Boolean(passwordHash),
      },
    });
  } catch (error) {
    console.error("[UserController] Gagal mengambil data profil:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { name, avatarUrl } = req.body;

    if (!name && !avatarUrl) {
      return sendError(
        res,
        400,
        "Minimal satu field (name atau avatarUrl) harus dikirimkan untuk diperbarui.",
      );
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0)
    ) {
      return sendError(res, 400, "Nama tidak boleh kosong.");
    }

    if (name !== undefined && name.trim().length > 100) {
      return sendError(res, 400, "Nama tidak boleh melebihi 100 karakter.");
    }

    if (avatarUrl !== undefined) {
      let valid = typeof avatarUrl === "string" && avatarUrl.length <= 2048;
      try {
        valid = valid && new URL(avatarUrl).protocol === "https:";
      } catch {
        valid = false;
      }
      if (!valid) {
        return sendError(
          res,
          400,
          "avatarUrl harus berupa URL https yang valid.",
        );
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    return sendSuccess(res, 200, "Profil berhasil diperbarui.", {
      user: updatedUser,
    });
  } catch (error) {
    console.error("[UserController] Gagal memperbarui profil:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.createPassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password, confirmPassword } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return sendError(res, 400, passwordError);
    }

    if (password !== confirmPassword) {
      return sendError(res, 400, "Konfirmasi password tidak cocok.");
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, passwordHash: null },
      data: { passwordHash: await hashPassword(password) },
    });

    if (result.count === 0) {
      const exists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!exists) {
        return sendError(res, 404, "Pengguna tidak ditemukan.");
      }
      return sendError(res, 409, "Password sudah dibuat sebelumnya.");
    }

    return sendSuccess(res, 200, "Password berhasil dibuat.");
  } catch (error) {
    console.error("[UserController] Gagal membuat password:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return sendError(res, 404, "Pengguna tidak ditemukan.");
    }

    const devices = await prisma.device.findMany({
      where: { userId },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.rawSensorLog.deleteMany({
        where: { deviceId: { in: devices.map((d) => d.id) } },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return sendSuccess(res, 200, "Akun berhasil dihapus secara permanen.");
  } catch (error) {
    console.error("[UserController] Gagal menghapus akun:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.getTelegramLinkCode = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const code = telegramService.generateLinkCode();

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramLinkCode: code,
        telegramLinkCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return sendSuccess(res, 200, "Kode penghubung Telegram berhasil dibuat.", {
      linkCode: code,
    });
  } catch (error) {
    console.error("[UserController] Gagal membuat kode penghubung Telegram:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.sendTelegramTestMessage = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { telegramChatId: true },
    });

    if (!user?.telegramChatId) {
      return sendError(res, 409, "Akun Telegram Anda belum terhubung.");
    }

    const result = await telegramService.sendMessage(
      user.telegramChatId,
      "Pesan uji coba dari Subur.in. Jika Anda menerima pesan ini, notifikasi Telegram Anda berfungsi.",
    );

    if (!result?.ok) {
      return sendError(
        res,
        502,
        "Gagal mengirim pesan ke Telegram. Coba lagi beberapa saat.",
      );
    }

    return sendSuccess(
      res,
      200,
      "Pesan uji coba berhasil dikirim ke Telegram.",
    );
  } catch (error) {
    console.error("[UserController] Gagal mengirim pesan uji coba Telegram:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.unlinkTelegram = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramLinkCode: null },
    });

    return sendSuccess(res, 200, "Koneksi Telegram berhasil diputuskan.");
  } catch (error) {
    console.error("[UserController] Gagal memutuskan koneksi Telegram:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
