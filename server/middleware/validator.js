// ── Input Validation Middleware ─────────────────────────────────────────────

const validateOrderCreation = (req, res, next) => {
  const { userId, cartItems, addressInfo, totalAmount } = req.body;

  // Validate userId
  if (!userId || typeof userId !== "string" || userId.length !== 24) {
    return res.status(400).json({
      success: false,
      message: "Valid userId is required",
    });
  }

  // Validate cartItems
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "cartItems must be a non-empty array",
    });
  }

  // Validate each cart item
  for (const item of cartItems) {
    if (!item.productId || typeof item.productId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Each cart item must have a valid productId",
      });
    }
    if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Each cart item must have a valid quantity (minimum 1)",
      });
    }
    if (!item.price || typeof item.price !== "number" || item.price < 0) {
      return res.status(400).json({
        success: false,
        message: "Each cart item must have a valid price",
      });
    }
  }

  // Validate addressInfo
  if (!addressInfo || typeof addressInfo !== "object") {
    return res.status(400).json({
      success: false,
      message: "addressInfo is required",
    });
  }

  if (!addressInfo.address || typeof addressInfo.address !== "string") {
    return res.status(400).json({
      success: false,
      message: "address is required",
    });
  }

  if (!addressInfo.city || typeof addressInfo.city !== "string") {
    return res.status(400).json({
      success: false,
      message: "city is required",
    });
  }

  if (!addressInfo.pincode || typeof addressInfo.pincode !== "string") {
    return res.status(400).json({
      success: false,
      message: "pincode is required",
    });
  }

  if (!addressInfo.phone || typeof addressInfo.phone !== "string") {
    return res.status(400).json({
      success: false,
      message: "phone is required",
    });
  }

  // Validate totalAmount
  if (totalAmount === undefined || typeof totalAmount !== "number" || totalAmount < 0) {
    return res.status(400).json({
      success: false,
      message: "totalAmount must be a valid number",
    });
  }

  // Sanitize addressInfo to prevent XSS
  req.body.addressInfo = {
    address: addressInfo.address.trim(),
    city: addressInfo.city.trim(),
    pincode: addressInfo.pincode.trim(),
    phone: addressInfo.phone.trim(),
    notes: addressInfo.notes ? addressInfo.notes.trim() : "",
  };

  next();
};

const validateOrderVerification = (req, res, next) => {
  const { txRef } = req.body;

  if (!txRef || typeof txRef !== "string" || txRef.length < 10) {
    return res.status(400).json({
      success: false,
      message: "Valid txRef is required",
    });
  }

  next();
};

const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
      });
    }
    next();
  };
};

const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs to prevent XSS
  const sanitizeString = (value) => {
    if (typeof value === "string") {
      return value.trim().replace(/[<>]/g, "");
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === "string") {
          sanitized[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  next();
};

module.exports = {
  validateOrderCreation,
  validateOrderVerification,
  validateObjectId,
  sanitizeInput,
};
