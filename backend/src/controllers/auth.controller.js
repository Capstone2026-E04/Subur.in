const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../database/connections/prisma_client');
const { AppError } = require('../errors/AppError');
const { sendSuccess, sendError } = require('../utils/response');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendError(res, 400, 'Google ID Token wajib dikirimkan!');
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[AuthController] Verifikasi Google ID Token gagal:', {
        message: verifyError.message,
        stack: verifyError.stack,
      });
      return next(new AppError('Google ID Token tidak valid atau kedaluwarsa.', 401, true));
    }

    const { sub: googleId, name, email, picture: avatarUrl } = payload;

    if (!email) {
      return sendError(res, 400, 'Akun Google Anda tidak menyediakan alamat email.');
    }

    let user = await prisma.user.findUnique({
      where: { googleId: googleId }
    });

    if (user) {
    } else {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: email }
      });

      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId: googleId,
            name: existingUserByEmail.name || name,
            avatarUrl: existingUserByEmail.avatarUrl || avatarUrl
          }
        });
      } else {
        user = await prisma.user.create({
          data: {
            googleId: googleId,
            name: name,
            email: email,
            avatarUrl: avatarUrl
          }
        });
      }
    }

    const sessionToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return sendSuccess(res, 200, 'Autentikasi Google berhasil!', {
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });

  } catch (error) {
    console.error('[AuthController] Gagal memproses login Google:', {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
