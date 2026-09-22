const prisma = require('../database/connections/prisma_client');
const telegramService = require('../services/telegram.service');


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
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    const { telegramChatId, ...userWithoutChatId } = user;

    return res.status(200).json({
      success: true,
      message: 'Data profil berhasil diambil.',
      data: { user: { ...userWithoutChatId, isTelegramLinked: Boolean(telegramChatId) } }
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
      return res.status(400).json({
        success: false,
        message: 'Minimal satu field (name atau avatarUrl) harus dikirimkan untuk diperbarui.'
      });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Nama tidak boleh kosong.'
      });
    }

    if (name !== undefined && name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nama tidak boleh melebihi 100 karakter.'
      });
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

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: { user: updatedUser }
    });

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
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil dihapus secara permanen.'
    });

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

    return res.status(200).json({
      success: true,
      message: 'Kode penghubung Telegram berhasil dibuat.',
      data: { linkCode: code }
    });

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

    return res.status(200).json({
      success: true,
      message: 'Koneksi Telegram berhasil diputuskan.'
    });

  } catch (error) {
    console.error('[UserController] Gagal memutuskan koneksi Telegram:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
