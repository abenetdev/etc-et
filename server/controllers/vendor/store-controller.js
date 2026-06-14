const Store = require("../../models/Store");
const { imageUploadUtil } = require("../../helpers/cloudinary");

// ── Helpers ────────────────────────────────────────────────────────────────

function validateURL(url) {
  if (!url) return true; // empty is allowed
  // Normalize missing protocol before validating
  const normalized = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

function validateEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  if (!phone) return true;
  return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(phone);
}

function validateSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function validateHexColor(color) {
  if (!color) return true;
  return /^#([A-Fa-f0-9]{6})$/.test(color);
}

// ── Get Store ──────────────────────────────────────────────────────────────

const getStore = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.query.ownerId;

    if (!ownerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const store = await Store.findOne({ ownerId });

    if (!store) {
      // Return empty store template so frontend knows to show "create store" state
      return res.status(200).json({
        success: true,
        data: null,
        message: "No store found. Please create your store.",
      });
    }

    res.status(200).json({ success: true, data: store });
  } catch (e) {
    console.error("getStore error:", e);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── Create Store ───────────────────────────────────────────────────────────

const createStore = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.body.ownerId;

    if (!ownerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check if vendor already has a store
    const existingStore = await Store.findOne({ ownerId });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: "Store already exists. Use PUT to update.",
      });
    }

    const { storeName, slug } = req.body;

    // Required field validation
    if (!storeName || !slug) {
      return res.status(400).json({
        success: false,
        message: "Store name and slug are required",
      });
    }

    // Slug validation
    if (!validateSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Slug must be lowercase with hyphens only (e.g. my-store)",
        field: "slug",
      });
    }

    // Slug uniqueness check
    const slugExists = await Store.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: "This slug is already taken. Please choose another.",
        field: "slug",
      });
    }

    const store = new Store({ ...req.body, ownerId });
    await store.save();

    res.status(201).json({
      success: true,
      data: store,
      message: "Store created successfully!",
    });
  } catch (e) {
    console.error("createStore error:", e);
    if (e.name === "ValidationError") {
      const errors = Object.values(e.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── Update Store ───────────────────────────────────────────────────────────

const updateStore = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.body.ownerId;

    if (!ownerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      storeName,
      slug,
      description,
      businessCategory,
      status,
      logo,
      banner,
      primaryColor,
      secondaryColor,
      phone,
      alternativePhone,
      email,
      address,
      city,
      region,
      country,
      facebook,
      instagram,
      tiktok,
      telegram,
      youtube,
      website,
      aboutUs,
      returnPolicy,
      shippingPolicy,
      privacyPolicy,
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    // ── Validation ──────────────────────────────────────────

    const errors = {};

    if (storeName !== undefined) {
      if (!storeName.trim()) errors.storeName = "Store name is required";
      else if (storeName.length > 100) errors.storeName = "Max 100 characters";
    }

    if (slug !== undefined) {
      if (!slug.trim()) {
        errors.slug = "Slug is required";
      } else if (!validateSlug(slug)) {
        errors.slug = "Slug must be lowercase with hyphens only (e.g. my-store)";
      } else {
        // Check uniqueness against other stores (not this one)
        const existing = await Store.findOne({ slug, ownerId: { $ne: ownerId } });
        if (existing) errors.slug = "This slug is already taken";
      }
    }

    if (description && description.length > 1000) {
      errors.description = "Max 1000 characters";
    }

    if (email && !validateEmail(email)) {
      errors.email = "Invalid email format";
    }

    if (phone && !validatePhone(phone)) {
      errors.phone = "Invalid phone number";
    }

    if (alternativePhone && !validatePhone(alternativePhone)) {
      errors.alternativePhone = "Invalid phone number";
    }

    if (primaryColor && !validateHexColor(primaryColor)) {
      errors.primaryColor = "Invalid hex color (e.g. #2563EB)";
    }

    if (secondaryColor && !validateHexColor(secondaryColor)) {
      errors.secondaryColor = "Invalid hex color (e.g. #1E40AF)";
    }

    // URL validation
    const urlFields = { facebook, instagram, tiktok, telegram, youtube, website };
    for (const [field, value] of Object.entries(urlFields)) {
      if (value && !validateURL(value)) {
        errors[field] = `Invalid URL format`;
      }
    }

    if (seoTitle && seoTitle.length > 70) errors.seoTitle = "Max 70 characters";
    if (seoDescription && seoDescription.length > 160) errors.seoDescription = "Max 160 characters";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // ── Find or create store ─────────────────────────────────

    let store = await Store.findOne({ ownerId });

    if (!store) {
      // Auto-create store if doesn't exist
      if (!storeName || !slug) {
        return res.status(400).json({
          success: false,
          message: "Store name and slug are required to create a store",
        });
      }
      store = new Store({ ownerId });
    }

    // ── Apply updates ────────────────────────────────────────

    const updatableFields = [
      "storeName", "slug", "description", "businessCategory", "status",
      "logo", "banner", "primaryColor", "secondaryColor",
      "phone", "alternativePhone", "email", "address", "city", "region", "country",
      "facebook", "instagram", "tiktok", "telegram", "youtube", "website",
      "aboutUs", "returnPolicy", "shippingPolicy", "privacyPolicy",
      "seoTitle", "seoDescription", "seoKeywords",
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        store[field] = req.body[field];
      }
    }

    await store.save();

    res.status(200).json({
      success: true,
      data: store,
      message: "Store settings saved successfully!",
    });
  } catch (e) {
    console.error("updateStore error:", e);
    if (e.name === "ValidationError") {
      const errors = Object.values(e.errors).reduce((acc, err) => {
        acc[err.path] = err.message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ── Image Upload ───────────────────────────────────────────────────────────

const uploadStoreImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const url = "data:" + req.file.mimetype + ";base64," + b64;
    const result = await imageUploadUtil(url);

    res.json({ success: true, result });
  } catch (e) {
    console.error("uploadStoreImage error:", e);
    res.status(500).json({ success: false, message: "Image upload failed", error: e.message });
  }
};

// ── Check Slug Availability ────────────────────────────────────────────────

const checkSlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const ownerId = req.user?.id || req.query.ownerId;

    if (!validateSlug(slug)) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Invalid slug format",
      });
    }

    const existing = await Store.findOne({
      slug,
      ...(ownerId ? { ownerId: { $ne: ownerId } } : {}),
    });

    res.status(200).json({
      success: true,
      available: !existing,
      message: existing ? "Slug is already taken" : "Slug is available",
    });
  } catch (e) {
    console.error("checkSlug error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getStore,
  createStore,
  updateStore,
  uploadStoreImage,
  checkSlug,
};
