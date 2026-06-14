const mongoose = require("mongoose");

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

/** Resolve vendor/user id from JWT payload (supports id or legacy _id). */
function getUserId(req) {
  const raw = req.user?.id || req.user?._id;
  if (!raw) return null;
  return raw.toString();
}

/** Build a query that matches ObjectId or string vendor references. */
function vendorIdMatch(field, vendorId) {
  const objectId = toObjectId(vendorId);
  const conditions = [{ [field]: vendorId }];
  if (objectId) conditions.push({ [field]: objectId });
  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

/** Products owned by a vendor (storeId). */
function vendorProductFilter(vendorId) {
  return vendorIdMatch("storeId", vendorId);
}

/** Orders owned by a vendor — one order doc per vendor after checkout split. */
function vendorOrderFilter(vendorId) {
  return vendorIdMatch("vendorId", vendorId);
}

module.exports = {
  toObjectId,
  getUserId,
  vendorIdMatch,
  vendorProductFilter,
  vendorOrderFilter,
};
