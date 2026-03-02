import mongoose from 'mongoose';

const coinPackageSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    coins: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0.01
    },
    description: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { collection: 'coinPackages' }
);

// Update the updatedAt timestamp before saving
coinPackageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const CoinPackage = mongoose.model('CoinPackage', coinPackageSchema);

export default CoinPackage;
