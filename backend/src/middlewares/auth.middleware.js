const jwt = require('jsonwebtoken');
const { AppError } = require('../errors/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Akses ditolak. Token autentikasi tidak disediakan atau format salah (gunakan Bearer <token>).', 401, true));
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Verifikasi JWT gagal:', {
      message: error.message,
      stack: error.stack,
      path: req.originalUrl,
    });
    return next(new AppError('Token autentikasi tidak valid atau sudah kedaluwarsa.', 401, true));
  }
};
