import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['COIN_PURCHASE', 'PREMIUM_UPGRADE', 'COIN_DEDUCTION'], required: true },
  amount: { type: Number, required: true }, // Amount of coins
  price: { type: String }, // Price in currency (e.g., "$4.99")
  method: { type: String, enum: ['card', 'momo', 'apple', 'google', 'MPESA'], default: 'card' },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'COMPLETED' },
  description: { type: String },
  isPremiumUpgrade: { type: Boolean, default: false },
  phoneNumber: { type: String }, // M-Pesa phone number
  paymentLink: { type: String }, // Lipana payment link
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
