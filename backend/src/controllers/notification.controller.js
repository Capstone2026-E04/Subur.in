"use strict";

const prisma = require('../database/connections/prisma_client');
const { notifyDevice } = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');

exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        device: {
          userId: userId
        }
      },
      include: {
        device: {
          select: {
            label: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return sendSuccess(res, 200, 'Daftar notifikasi berhasil diambil.', { notifications });
  } catch (error) {
    console.error('[NotificationController] Gagal mengambil daftar notifikasi:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        device: {
          userId: userId
        },
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return sendSuccess(res, 200, 'Semua notifikasi berhasil ditandai telah dibaca.');
  } catch (error) {
    console.error('[NotificationController] Gagal menandai notifikasi sebagai dibaca:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: {
        id: id,
        device: {
          userId: userId
        }
      }
    });

    if (!notification) {
      return sendError(res, 404, 'Notifikasi tidak ditemukan atau Anda tidak memiliki akses.');
    }

    await prisma.notification.delete({
      where: { id: id }
    });

    return sendSuccess(res, 200, 'Notifikasi berhasil dihapus.');
  } catch (error) {
    console.error('[NotificationController] Gagal menghapus notifikasi:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      notificationId: req.params?.id,
    });
    return next(error);
  }
};

exports.createTestNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let device = await prisma.device.findFirst({
      where: { userId: userId }
    });

    if (!device) {
      const plant = await prisma.plant.findFirst();
      const polybag = await prisma.polybag.findFirst();

      if (!plant || !polybag) {
        return sendError(res, 400, 'Database tanaman atau polybag kosong. Harap jalankan seed data terlebih dahulu.');
      }

      device = await prisma.device.create({
        data: {
          id: `TEST-DEV-${userId.slice(0, 8)}`,
          userId: userId,
          label: 'Sensor Uji Coba',
          plantId: plant.id,
          polybagId: polybag.id,
          status: 'ACTIVE'
        }
      });
    }

    const notification = await notifyDevice(device.id, {
      title: 'Pengujian Sistem',
      message: 'Ini adalah notifikasi uji coba untuk memverifikasi bahwa sistem notifikasi real-time Anda berfungsi dengan baik.',
      type: 'info',
    });

    return sendSuccess(res, 201, 'Notifikasi uji coba berhasil dibuat dan dikirim ke seluruh kanal (dashboard & Telegram jika terhubung).', { notification });
  } catch (error) {
    console.error('[NotificationController] Gagal memicu notifikasi uji coba:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
