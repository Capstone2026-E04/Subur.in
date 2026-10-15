const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const prisma = require("../database/connections/prisma_client");
const { AppError } = require("../errors/AppError");
const { sendSuccess, sendError } = require("../utils/response");
const {
  validatePassword,
  hashPassword,
  verifyPassword,
} = require("../utils/password");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { JWT_SECRET } = require("../config/jwt");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 100;
const INVALID_LOGIN_MESSAGE = "Email atau password salah.";

let dummyHashPromise = null;

function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("dummy-password-for-timing-equalization");
  }
  return dummyHashPromise;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
}

function issueSessionToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" },
  );
}

function toAuthPayload(user) {
  return {
    token: issueSessionToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  };
}

exports.register = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName || !email || password === undefined) {
      return sendError(res, 400, "Nama, email, dan password wajib diisi.");
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      return sendError(
        res,
        400,
        `Nama tidak boleh melebihi ${MAX_NAME_LENGTH} karakter.`,
      );
    }

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return sendError(res, 400, "Format email tidak valid.");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return sendError(res, 400, passwordError);
    }

    if (await findUserByEmail(email)) {
      return sendError(res, 409, "Email sudah terdaftar.");
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: trimmedName,
          email,
          passwordHash: await hashPassword(password),
        },
      });
    } catch (createError) {
      if (createError.code === "P2002") {
        return sendError(res, 409, "Email sudah terdaftar.");
      }
      throw createError;
    }

    return sendSuccess(res, 201, "Registrasi berhasil!", toAuthPayload(user));
  } catch (error) {
    console.error("[AuthController] Gagal memproses registrasi:", {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string" || !password) {
      return sendError(res, 400, "Email dan password wajib diisi.");
    }

    if (password.length > 1024) {
      return sendError(res, 401, INVALID_LOGIN_MESSAGE);
    }

    const user = await findUserByEmail(email);
    const storedHash = user?.passwordHash ?? (await getDummyHash());
    const isPasswordValid = await verifyPassword(password, storedHash);

    if (!user || !user.passwordHash || !isPasswordValid) {
      return sendError(res, 401, INVALID_LOGIN_MESSAGE);
    }

    return sendSuccess(res, 200, "Login berhasil!", toAuthPayload(user));
  } catch (error) {
    console.error("[AuthController] Gagal memproses login:", {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};

exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendError(res, 400, "Google ID Token wajib dikirimkan!");
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error("[AuthController] Verifikasi Google ID Token gagal:", {
        message: verifyError.message,
        stack: verifyError.stack,
      });
      return next(
        new AppError(
          "Google ID Token tidak valid atau kedaluwarsa.",
          401,
          true,
        ),
      );
    }

    const {
      sub: googleId,
      name,
      email,
      email_verified: emailVerified,
      picture: avatarUrl,
    } = payload;

    if (!email || !emailVerified) {
      return sendError(
        res,
        400,
        "Akun Google Anda tidak memiliki alamat email yang terverifikasi.",
      );
    }

    let user = await prisma.user.findUnique({
      where: { googleId: googleId },
    });

    if (!user) {
      const existingUserByEmail = await findUserByEmail(email);

      if (existingUserByEmail) {
        const isUnlinkedPasswordAccount = !existingUserByEmail.googleId;

        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId: googleId,
            name: existingUserByEmail.name || name,
            avatarUrl: existingUserByEmail.avatarUrl || avatarUrl,
            ...(isUnlinkedPasswordAccount ? { passwordHash: null } : {}),
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            googleId: googleId,
            name: name,
            email: email,
            avatarUrl: avatarUrl,
          },
        });
      }
    }

    return sendSuccess(
      res,
      200,
      "Autentikasi Google berhasil!",
      toAuthPayload(user),
    );
  } catch (error) {
    console.error("[AuthController] Gagal memproses login Google:", {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
