const prisma = require("../database/connections/prisma_client");
const { AppError } = require("../errors/AppError");

module.exports = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError("Akses ditolak. Sesi tidak valid.", 401, true));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "SUPERADMIN") {
      console.warn("[SuperadminMiddleware] Akses ditolak:", {
        userId,
        path: req.originalUrl,
      });
      return next(
        new AppError(
          "Akses ditolak. Fitur ini hanya untuk Superadmin.",
          403,
          true,
        ),
      );
    }

    return next();
  } catch (error) {
    console.error("[SuperadminMiddleware] Gagal memverifikasi role:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
