const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'agent', 'manager', 'delivery', 'user'],
      default: 'customer',
      index: true,
    },
    fcmToken: { type: String, required: true, index: true },
    platform: { type: String, enum: ['android', 'ios'], default: 'android' },
    deviceId: { type: String, default: '' },
    appVersion: { type: String, default: '1.0.0' },
    isActive: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, fcmToken: 1 }, { unique: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);

