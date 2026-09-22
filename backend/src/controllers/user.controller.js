const prisma = require('../database/connections/prisma_client');
const telegramService = require('../services/telegram.service');
const { sendSuccess, sendError } = require('../utils/response');


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
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return sendError(res, 404, 'Pengguna tidak ditemukan.');
    }

    const { telegramChatId, ...userWithoutChatId } = user;

    return sendSuccess(res, 200, 'Data profil berhasil diambil.', {
      user: { ...userWithoutChatId, isTelegramLinked: Boolean(telegramChatId) }
    });

  } catch (error) {
    console.error('[UserController] Gagal mengambil data profil:', {
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
      return sendError(res, 400, 'Minimal satu field (name atau avatarUrl) harus dikirimkan untuk diperbarui.');
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return sendError(res, 400, 'Nama tidak boleh kosong.');
    }

    if (name !== undefined && name.trim().length > 100) {
      return sendError(res, 400, 'Nama tidak boleh melebihi 100 karakter.');
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
      }
    });

    return sendSuccess(res, 200, 'Profil berhasil diperbarui.', { user: updatedUser });

  } catch (error) {
    console.error('[UserController] Gagal memperbarui profil:', {
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
      select: { id: true }
    });

    if (!user) {
      return sendError(res, 404, 'Pengguna tidak ditemukan.');
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return sendSuccess(res, 200, 'Akun berhasil dihapus secara permanen.');

  } catch (error) {
    console.error('[UserController] Gagal menghapus akun:', {
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
      data: { telegramLinkCode: code }
    });

    return sendSuccess(res, 200, 'Kode penghubung Telegram berhasil dibuat.', { linkCode: code });

  } catch (error) {
    console.error('[UserController] Gagal membuat kode penghubung Telegram:', {
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
      data: { telegramChatId: null, telegramLinkCode: null }
    });

    return sendSuccess(res, 200, 'Koneksi Telegram berhasil diputuskan.');

  } catch (error) {
    console.error('[UserController] Gagal memutuskan koneksi Telegram:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
