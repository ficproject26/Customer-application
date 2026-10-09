const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    businessName: { type: String, required: true },
    vendorType: { type: String, required: true },
    category: { type: String },
    subcategory: { type: String },
    address: { type: String, default: '' },
    pinCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    logo: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
