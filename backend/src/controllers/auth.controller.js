const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../database/connections/prisma_client');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID Token wajib dikirimkan!'
      });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Google ID Token tidak valid atau kedaluwarsa.',
        error: verifyError.message
      });
    }

    const { sub: googleId, name, email, picture: avatarUrl } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Akun Google Anda tidak menyediakan alamat email.'
      });
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

    return res.status(200).json({
      success: true,
      message: 'Autentikasi Google berhasil!',
      data: {
        token: sessionToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl
        }
      }
    });

  } catch (error) {
    console.error('Google Sign-In Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memproses login Google.',
      error: error.message
    });
  }
};
