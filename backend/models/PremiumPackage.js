import mongoose from 'mongoose';

const premiumPackageSchema = new mongoose.Schema({
  packageId: { type: String, unique: true, required: true }, // e.g., 'premium_1m', 'premium_3m', etc.
  name: { type: String, required: true }, // e.g., "1 Month Premium"
  duration: { type: Number, required: true }, // Duration in days (30, 90, 180, 365)
  plan: { type: String, enum: ['1_month', '3_months', '6_months', '12_months'], required: true },
  price: { type: Number, required: true }, // Price in local currency
  displayPrice: { type: String, required: true }, // Display price (e.g., "$9.99")
  features: [{ type: String }], // Array of premium features
  description: { type: String },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const PremiumPackage = mongoose.model('PremiumPackage', premiumPackageSchema);
export default PremiumPackage;
