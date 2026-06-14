/**
 * Database Migration Script: Admin → Vendor
 * 
 * This script updates all users with role="admin" to role="vendor"
 * Run this once after deploying the vendor system
 * 
 * Usage: node scripts/migrate-admin-to-vendor.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrateAdminToVendor = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    console.log('\n📊 Finding users with admin role...');
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found. Nothing to migrate.');
    } else {
      console.log(`📝 Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach(user => {
        console.log(`   - ${user.userName} (${user.email})`);
      });

      console.log('\n🔄 Updating admin users to vendor role...');
      const result = await User.updateMany(
        { role: 'admin' },
        { $set: { role: 'vendor' } }
      );

      console.log(`✅ Successfully updated ${result.modifiedCount} user(s) to vendor role`);
    }

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
migrateAdminToVendor();
