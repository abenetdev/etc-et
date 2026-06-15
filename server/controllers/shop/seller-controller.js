const jwt = require("jsonwebtoken");
const SellerApplication = require("../../models/SellerApplication");
const User              = require("../../models/User");
const Store             = require("../../models/Store");

const JWT_SECRET = process.env.JWT_SECRET || "CLIENT_SECRET_KEY";

// ── POST /api/shop/seller/apply ────────────────────────────────────────────
const applyToBecomeSeller = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storeName, storeDescription, phone } = req.body;

    if (!storeName?.trim()) {
      return res.status(400).json({ success: false, message: "Store name is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Already a vendor
    if (user.role === "vendor") {
      return res.status(400).json({ success: false, message: "You are already a vendor" });
    }

    // Duplicate application
    const existing = await SellerApplication.findOne({ userId });
    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Your application is already under review",
        });
      }
      if (existing.status === "approved") {
        return res.status(400).json({ success: false, message: "Application already approved" });
      }
      // Rejected — allow reapply by updating existing record
      existing.storeName        = storeName.trim();
      existing.storeDescription = storeDescription || "";
      existing.phone            = phone || "";
      existing.status           = "pending";
      existing.adminNote        = "";
      existing.reviewedAt       = undefined;
      await existing.save();
    } else {
      await SellerApplication.create({
        userId,
        storeName: storeName.trim(),
        storeDescription: storeDescription || "",
        phone: phone || "",
      });
    }

    // Mark user as pending seller
    user.sellerStatus = "pending";
    await user.save();

    res.status(201).json({
      success: true,
      message: "Your application has been submitted! We will review it shortly.",
      sellerStatus: "pending",
    });
  } catch (e) {
    console.error("applyToBecomeSeller:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/shop/seller/status ────────────────────────────────────────────
const getSellerStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user   = await User.findById(userId).select("sellerStatus role").lean();
    const app    = await SellerApplication.findOne({ userId }).lean();

    res.status(200).json({
      success: true,
      data: {
        role:         user?.role,
        sellerStatus: user?.sellerStatus,
        application:  app || null,
      },
    });
  } catch (e) {
    console.error("getSellerStatus:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/admin/seller-applications ────────────────────────────────────
const getAllApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== "all" ? { status } : {};

    const applications = await SellerApplication.find(query)
      .populate("userId", "userName email sellerStatus")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: applications });
  } catch (e) {
    console.error("getAllApplications:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/admin/seller-applications/:id/approve ────────────────────────
const approveApplication = async (req, res) => {
  try {
    const { id }       = req.params;
    const adminId      = req.user.id;
    const { adminNote } = req.body;

    const app = await SellerApplication.findById(id).populate("userId");
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });

    const user = app.userId;

    // 1. Update application
    app.status     = "approved";
    app.adminNote  = adminNote || "";
    app.reviewedAt = new Date();
    app.reviewedBy = adminId;
    await app.save();

    // 2. Upgrade user role
    user.role         = "vendor";
    user.sellerStatus = "active";
    await user.save();

    // 3. Auto-create a store for the vendor if one doesn't exist
    const existingStore = await Store.findOne({ ownerId: user._id });
    if (!existingStore) {
      // Generate a unique slug from store name
      const baseSlug = app.storeName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 50);

      // Make slug unique
      let slug      = baseSlug;
      let counter   = 1;
      while (await Store.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      await Store.create({
        ownerId:     user._id,
        storeName:   app.storeName,
        slug,
        description: app.storeDescription || "",
        phone:       app.phone || "",
        status:      "active",
      });
    }

    // 4. Issue a fresh JWT with updated role so the client knows immediately
    const newToken = jwt.sign(
      { id: user._id.toString(), role: "vendor", email: user.email, userName: user.userName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: `${user.userName}'s application has been approved. Their store has been created.`,
      token: newToken,
    });
  } catch (e) {
    console.error("approveApplication:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/admin/seller-applications/:id/reject ─────────────────────────
const rejectApplication = async (req, res) => {
  try {
    const { id }        = req.params;
    const adminId       = req.user.id;
    const { adminNote } = req.body;

    const app = await SellerApplication.findById(id).populate("userId");
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });

    const user = app.userId;

    // Update application
    app.status     = "rejected";
    app.adminNote  = adminNote || "";
    app.reviewedAt = new Date();
    app.reviewedBy = adminId;
    await app.save();

    // Keep role as "user", set sellerStatus to "rejected"
    user.sellerStatus = "rejected";
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.userName}'s application has been rejected.`,
    });
  } catch (e) {
    console.error("rejectApplication:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  applyToBecomeSeller,
  getSellerStatus,
  getAllApplications,
  approveApplication,
  rejectApplication,
};
