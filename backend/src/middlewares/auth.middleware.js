const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi tidak disediakan atau format salah (gunakan Bearer <token>).'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth Middleware JWT Verification Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token autentikasi tidak valid atau sudah kedaluwarsa.',
      error: error.message
    });
  }
};
