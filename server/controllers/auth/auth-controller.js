const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "CLIENT_SECRET_KEY";

//register
const registerUser = async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    const checkUser = await User.findOne({ email });
    if (checkUser)
      return res.json({
        success: false,
        message: "User Already exists with the same email! Please try again",
      });

    const hashPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      userName,
      email,
      password: hashPassword,
    });

    await newUser.save();
    res.status(200).json({
      success: true,
      message: "Registration successful",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

//login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const checkUser = await User.findOne({ email });
    if (!checkUser)
      return res.json({
        success: false,
        message: "User doesn't exists! Please register first",
      });

    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (!checkPasswordMatch)
      return res.json({
        success: false,
        message: "Incorrect Email or Password! Please try again",
      });

    // Block deactivated or deleted accounts
    if (checkUser.accountStatus === "deleted") {
      return res.json({ success: false, message: "This account has been removed." });
    }
    if (checkUser.accountStatus === "deactivated") {
      return res.json({ success: false, message: "Your account has been deactivated. Please contact support." });
    }

    const userId = checkUser._id.toString();

    const token = jwt.sign(
      {
        id: userId,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }).json({
      success: true,
      message: "Logged in successfully",
      user: {
        email: checkUser.email,
        role: checkUser.role,
        id: userId,
        userName: checkUser.userName,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

//logout

const logoutUser = (req, res) => {
  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};

//auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded._id;
    req.user = {
      ...decoded,
      id: userId ? userId.toString() : undefined,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });
  }
};

const adminMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorised user!" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const userId = decoded.id || decoded._id;
    req.user = {
      ...decoded,
      id: userId ? userId.toString() : undefined,
    };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorised user!" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { userName, email } = req.body;

    if (!userName?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const emailTaken = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: userId },
    });
    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: "Email is already in use",
      });
    }

    user.userName = userName.trim();
    user.email = email.trim().toLowerCase();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        userName: user.userName,
      },
      JWT_SECRET,
      { expiresIn: "60m" }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 60 * 60 * 1000 // 60 minutes
    }).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        userName: user.userName,
      },
    });
  } catch (e) {
    console.error("updateProfile:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Current password required. New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (e) {
    console.error("changePassword:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
  adminMiddleware,
  updateProfile,
  changePassword,
};
