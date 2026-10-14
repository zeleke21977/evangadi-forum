// One place decides which frontends may talk to this server (REST and Socket.IO).
// PRODUCTION: set CLIENT_ORIGIN to your deployed frontend URL(s), comma-separated.
// Falls back to FRONTEND_URL, then to "*" (any origin — development only).
export const allowedOrigins = () => {
  const raw = process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL;
  if (!raw) {
    if (process.env.NODE_ENV === "production")
      console.warn(
        "WARNING: CLIENT_ORIGIN is not set, so any website may call this API. Set it to your frontend URL.",
      );
    return "*";
  }
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
};
