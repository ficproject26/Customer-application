const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    password: { type: String },
    phone: { type: String, default: '' },
    businessName: { type: String, default: '' },
    vendorType: { type: String, default: 'Products' },
    category: { type: String, default: 'Products', index: true },
    subcategory: { type: String, default: 'General' },
    desc: { type: String, default: '' },
    image: { type: String, default: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=150&q=80' },
    rating: { type: String, default: '4.8' },
    distance: { type: String, default: '1.2 km' },
    location: { type: String, default: 'Bengaluru' },
    address: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    membershipPlan: { type: String, enum: ['Basic', 'Silver', 'Gold', 'Diamond'], default: 'Basic' },
    agentName: { type: String, default: '' },
    operatingHours: { type: String, default: '09:00 AM - 09:00 PM' },
    // Documents
    gstStatus: { type: String, default: 'Non-GST Declared' },
    panNo: { type: String, default: '' },
    companyRegNo: { type: String, default: 'N/A' },
    msmeStatus: { type: String, default: 'Non-MSME' },
    // Bank Details
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branch: { type: String, default: '' },
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      accountNo: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
    },
    primaryBusinessId: { type: String, default: '' },
    businesses: [
      {
        businessName: { type: String, required: true },
        vendorType: { type: String, required: true },
        category: { type: String },
        subcategory: { type: String },
        address: { type: String, default: '' },
        pinCode: { type: String, default: '' },
        phone: { type: String, default: '' },
        logo: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true, strict: false }
);

// Pre-save hook to ensure id matches _id or custom id
vendorSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id ? this._id.toString() : `v_${Date.now()}`;
  }
  if (typeof next === 'function') next();
});

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
