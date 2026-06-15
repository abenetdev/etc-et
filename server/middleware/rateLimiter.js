const rateLimit = require("express-rate-limit");

// ── Strict rate limiter for payment endpoints ─────────────────────────────
const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many payment attempts, please try again later",
      retryAfter: Math.ceil(
        (req.rateLimit.resetTime - Date.now()) / 1000
      ),
      resetAt: req.rateLimit.resetTime,
    });
  },
});

// ── Moderate rate limiter for general API endpoints ───────────────────────
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      retryAfter: Math.ceil(
        (req.rateLimit.resetTime - Date.now()) / 1000
      ),
      resetAt: req.rateLimit.resetTime,
    });
  },
});

// ── Strict rate limiter for authentication endpoints ──────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts, please try again later",
      retryAfter: Math.ceil(
        (req.rateLimit.resetTime - Date.now()) / 1000
      ),
      resetAt: req.rateLimit.resetTime,
    });
  },
});

module.exports = {
  paymentRateLimiter,
  apiRateLimiter,
  authRateLimiter,
};