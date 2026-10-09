const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['customer', 'delivery', 'vendor'], default: 'customer' },
  membership: { type: String, default: '' },
  status: { type: String, default: 'Available' },
  availability: { type: Boolean, default: true },
  dob: { type: String, default: '' },
  gender: { type: String, default: '' },
  avatar: { type: String, default: '' },
  emailVerified: { type: Boolean, default: true },
  phoneVerified: { type: Boolean, default: true },
  address: addressSchema,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
