"use strict";

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational ?? false;

  console.error("[Error Middleware] Request gagal diproses:", {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
  });

  return res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : "Terjadi kesalahan pada server",
  });
}

module.exports = errorMiddleware;
