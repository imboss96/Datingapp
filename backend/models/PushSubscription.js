import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: String,
    auth: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('PushSubscription', PushSubscriptionSchema);
