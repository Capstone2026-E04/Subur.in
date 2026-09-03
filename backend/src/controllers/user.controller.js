const prisma = require('../database/connections/prisma_client');


exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
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

    return res.status(200).json({
      success: true,
      message: 'Data profil berhasil diambil.',
      data: { user }
    });

  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data profil.',
      error: error.message
    });
  }
};


exports.updateProfile = async (req, res) => {
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
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui profil.',
      error: error.message
    });
  }
};


exports.deleteAccount = async (req, res) => {
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
    console.error('Delete Account Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus akun.',
      error: error.message
    });
  }
};
