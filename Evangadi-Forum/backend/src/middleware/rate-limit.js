import rateLimit from "express-rate-limit";

const build = (max, msg, extra = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    ...extra,
    standardHeaders: true,
    legacyHeaders: false,
    // Same { msg } shape the error handler uses, so the frontend shows it as-is.
    message: { msg },
  });

// Login / register / Google / reset: slows down password guessing.
// Only FAILED requests (status >= 400) count, so normal users are never
// blocked, and a whole class/office sharing one IP has plenty of headroom.
export const authLimiter = build(
  50,
  "Too many failed attempts. Please wait a few minutes and try again.",
  { skipSuccessfulRequests: true },
);

// Forgot-password sends an email, so it gets a tighter limit.
export const forgotPasswordLimiter = build(
  5,
  "Too many reset requests. Please wait a few minutes and try again.",
);
