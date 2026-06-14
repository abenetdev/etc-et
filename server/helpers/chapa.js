/**
 * Chapa Payment Gateway Helper
 * Docs: https://developer.chapa.co/docs
 *
 * Add these to your .env file:
 *   CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   CHAPA_WEBHOOK_SECRET=your_webhook_secret_from_chapa_dashboard
 *   CLIENT_BASE_URL=http://localhost:5173
 */

const axios = require("axios");
const crypto = require("crypto");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";

// ── Verify Chapa webhook signature ───────────────────────────────────────────
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) {
    console.warn("CHAPA_WEBHOOK_SECRET not set - skipping signature verification");
    return true; // Allow if not configured (for development)
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ── Initialize a Chapa payment ─────────────────────────────────────────────
async function initializePayment({
  amount,
  currency = "ETB",
  email,
  firstName,
  lastName,
  txRef,
  returnUrl,
  callbackUrl,
  description,
}) {
  const secretKey = process.env.CHAPA_SECRET_KEY;
  const clientBase = process.env.CLIENT_BASE_URL || "http://localhost:5173";

  if (!secretKey) {
    throw new Error("CHAPA_SECRET_KEY is not set in .env");
  }

  const payload = {
    amount:       String(Number(amount).toFixed(2)),
    currency,
    email:        email       || "customer@example.com",
    first_name:   firstName   || "Customer",
    last_name:    lastName    || "",
    tx_ref:       txRef,
    return_url:   returnUrl   || `${clientBase}/shop/chapa-return`,
    callback_url: callbackUrl || `${clientBase}/api/shop/order/chapa-webhook`,
    description:  description || "Order payment",
  };

  console.log("Chapa initialize payload:", { ...payload, amount: payload.amount });

  const response = await axios.post(
    `${CHAPA_BASE_URL}/transaction/initialize`,
    payload,
    {
      headers: {
        Authorization:  `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

// ── Verify a Chapa payment ─────────────────────────────────────────────────
async function verifyPayment(txRef) {
  const secretKey = process.env.CHAPA_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CHAPA_SECRET_KEY is not set in .env");
  }

  const response = await axios.get(
    `${CHAPA_BASE_URL}/transaction/verify/${txRef}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );

  return response.data;
}

module.exports = { 
  initializePayment, 
  verifyPayment,
  verifyWebhookSignature
};
