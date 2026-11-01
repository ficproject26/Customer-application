const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, default: 'customer', index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String, default: 'order', index: true },
    targetScreen: { type: String, default: 'Orders' },
    targetId: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

