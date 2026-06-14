const rateLimit = require("express-rate-limit");

// ── Strict rate limiter for payment endpoints ─────────────────────────────
const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many payment attempts, please try again later",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});

// ── Moderate rate limiter for general API endpoints ───────────────────────
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Strict rate limiter for authentication endpoints ───────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  paymentRateLimiter,
  apiRateLimiter,
  authRateLimiter,
};
