# 🚀 Quick Start Guide - Multi-Vendor System

## ⚡ Get Up and Running in 3 Steps

### Step 1: Migrate Admin Users to Vendors
```bash
cd server
node scripts/migrate-admin-to-vendor.js
```

### Step 2: Start Backend
```bash
cd server
npm start
```
✅ Backend running at: `http://localhost:5000`

### Step 3: Start Frontend
```bash
cd client
npm run dev
```
✅ Frontend running at: `http://localhost:5173`

---

## 🎯 Access Your Vendor Dashboard

1. **Navigate to:** `http://localhost:5173`
2. **Login** with vendor credentials
3. **Automatically redirected to:** `/vendor/dashboard`

---

## 🔑 Create a Vendor Account

### Option 1: Convert Existing User
```javascript
// In MongoDB
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "vendor" } }
)
```

### Option 2: Register & Update
1. Register normally through the app
2. Update role in database to "vendor"
3. Logout and login again

---

## 📊 What Changed?

| Before | After |
|--------|-------|
| `/admin/dashboard` | `/vendor/dashboard` |
| `role: "admin"` | `role: "vendor"` |
| "Admin Panel" | "Vendor Dashboard" |
| Single admin manages all | Each vendor manages their own |

---

## ✅ Quick Test Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Login as vendor redirects to `/vendor/dashboard`
- [ ] Can create new product
- [ ] Can view products list
- [ ] Can edit product
- [ ] Can delete product
- [ ] Can view orders
- [ ] Can update order status

---

## 🆘 Common Issues

**Can't login as vendor?**
→ Run migration script to update user roles

**404 on vendor routes?**
→ Restart backend server

**Redirected to /unauth-page?**
→ User role must be exactly "vendor" (lowercase)

---

## 📁 Project Structure

```
mern-ecommerce-2024/
├── client/
│   └── src/
│       ├── components/vendor-view/     ✅ NEW
│       ├── pages/vendor-view/          ✅ NEW
│       └── store/vendor/               ✅ NEW
│
└── server/
    ├── controllers/vendor/             ✅ NEW
    ├── routes/vendor/                  ✅ NEW
    ├── scripts/                        ✅ NEW
    │   └── migrate-admin-to-vendor.js
    └── models/User.js                  ✅ UPDATED
```

---

## 🎉 That's It!

You're now running a multi-vendor ecommerce system!

For detailed documentation, see:
- `VENDOR_MIGRATION_GUIDE.md` - Complete migration details
- `BACKEND_SETUP_COMPLETE.md` - Testing & troubleshooting guide
