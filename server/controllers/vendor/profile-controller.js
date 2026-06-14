const bcrypt = require("bcryptjs");
const User   = require("../../models/User");

// ── GET /api/vendor/profile ────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (e) {
    console.error("getProfile:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/vendor/profile ────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { userName, email } = req.body;
    const errors = {};

    if (!userName?.trim()) errors.userName = "Username is required";
    else if (userName.length < 3) errors.userName = "Minimum 3 characters";

    if (!email?.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email";

    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    // Check email uniqueness (excluding current user)
    const emailTaken = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
        errors: { email: "This email is already taken" },
      });
    }

    // Check username uniqueness
    const usernameTaken = await User.findOne({ userName, _id: { $ne: req.user.id } });
    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
        errors: { userName: "This username is already taken" },
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { userName: userName.trim(), email: email.trim().toLowerCase() },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, data: user, message: "Profile updated successfully" });
  } catch (e) {
    console.error("updateProfile:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/vendor/profile/change-password ───────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = {};

    if (!currentPassword)          errors.currentPassword = "Current password is required";
    if (!newPassword)              errors.newPassword     = "New password is required";
    else if (newPassword.length < 6) errors.newPassword   = "Minimum 6 characters";
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
        errors: { currentPassword: "Incorrect password" },
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different",
        errors: { newPassword: "Must differ from current password" },
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (e) {
    console.error("changePassword:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getProfile, updateProfile, changePassword };
