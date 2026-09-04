const METRICS_PASSWORD = process.env.METRICS_PASSWORD;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!METRICS_PASSWORD) {
    console.error(
      "Metrics Auth Middleware Error: METRICS_PASSWORD belum diatur di environment.",
    );
    return res.status(500).json({
      success: false,
      message: "Konfigurasi autentikasi metrics belum lengkap di server.",
    });
  }

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    authHeader.split(" ")[1] !== METRICS_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Akses ditolak. Password metrics tidak valid atau tidak disediakan (gunakan Bearer <password>).",
    });
  }

  next();
};
