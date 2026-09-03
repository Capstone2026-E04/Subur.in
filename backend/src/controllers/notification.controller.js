"use strict";

const prisma = require('../database/connections/prisma_client');
const { broadcastToDevice } = require('../sse/sse_manager');

exports.getUserNotifications = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Daftar notifikasi berhasil diambil.',
      data: { notifications }
    });
  } catch (error) {
    console.error('Get User Notifications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar notifikasi.',
      error: error.message
    });
  }
};

exports.markAllAsRead = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai telah dibaca.'
    });
  } catch (error) {
    console.error('Mark All As Read Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menandai notifikasi.',
      error: error.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan atau Anda tidak memiliki akses.'
      });
    }

    await prisma.notification.delete({
      where: { id: id }
    });

    return res.status(200).json({
      success: true,
      message: 'Notifikasi berhasil dihapus.'
    });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus notifikasi.',
      error: error.message
    });
  }
};

exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;

    let device = await prisma.device.findFirst({
      where: { userId: userId }
    });

    if (!device) {
      const plant = await prisma.plant.findFirst();
      const polybag = await prisma.polybag.findFirst();

      if (!plant || !polybag) {
        return res.status(400).json({
          success: false,
          message: 'Database tanaman atau polybag kosong. Harap jalankan seed data terlebih dahulu.'
        });
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

    const mockNotification = {
      id: `test-notif-${Date.now()}`,
      deviceId: device.id,
      title: 'Pengujian Sistem',
      message: 'Ini adalah notifikasi uji coba untuk memverifikasi bahwa sistem notifikasi real-time Anda berfungsi dengan baik.',
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
      device: {
        label: device.label
      }
    };

    broadcastToDevice(device.id, {
      type: "NOTIFICATION",
      notification: mockNotification
    });

    return res.status(201).json({
      success: true,
      message: 'Notifikasi uji coba berhasil dibuat secara real-time (tanpa disimpan ke database).',
      data: { notification: mockNotification }
    });
  } catch (error) {
    console.error('Create Test Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memicu notifikasi uji coba.',
      error: error.message
    });
  }
};
