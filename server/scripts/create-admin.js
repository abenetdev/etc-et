/**
 * Promote an existing user to admin role.
 *
 * Usage:
 *   node scripts/create-admin.js your@email.com
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/create-admin.js <email>");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`✅ ${user.userName} (${user.email}) is now an admin.`);
  console.log("   Log out and log back in to access /admin/dashboard");

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
