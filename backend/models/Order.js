const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  mrp: { type: Number },
  variant: { type: String },
  image: { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  id: { type: String, index: true },
  order_number: { type: String, index: true },
  vendor_id: { type: String, default: 'v1' },
  vendorId: { type: mongoose.Schema.Types.Mixed },
  businessId: { type: String },
  vendor_name: { type: String, default: 'Connect Official Store' },
  category: { type: String, default: 'Products' },
  order_type: { type: String, default: 'order' },
  type: { type: String, default: 'Order' },
  customer_name: { type: String },
  memberName: { type: String },
  customer_phone: { type: String },
  customerPhone: { type: String },
  customer_address: { type: String },
  customerAddress: { type: String },
  customer_latitude: { type: Number, default: 12.9716 },
  customer_longitude: { type: Number, default: 77.6412 },
  pickupLocation: { type: String },
  dropLocation: { type: String },
  product_details: { type: String, default: '' },
  brand_or_seller: { type: String, default: 'Connect Verified' },
  image: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  items: [orderItemSchema],
  item_count: { type: Number, default: 1 },
  amount: { type: Number },
  finalAmount: { type: Number },
  listing_price: { type: Number },
  original_amount: { type: Number },
  selling_price: { type: Number },
  platform_fee: { type: Number, default: 10 },
  coupon_code: { type: String, default: '' },
  coupon_discount: { type: Number, default: 0 },
  member_discount: { type: Number, default: 0 },
  status: {
    type: String,
    default: 'Pending',
    index: true,
  },
  expected_delivery: { type: String },
  delivered_at: { type: String },
  payment_method: { type: String, default: 'Paid via UPI' },
  payment_status: { type: String, default: 'Paid' },
  delivery_fee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  rating: { type: Number },
  review_note: { type: String },
  user_id: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.Mixed },
  candidateName: { type: String },
  candidatePhone: { type: String },
  candidateEmail: { type: String },
  candidateResume: { type: String },
  candidateEducation: { type: String },
  candidateExperience: { type: String },
  applicant_education: { type: String },
  applicant_experience: { type: String },
  applicant_email: { type: String },
  resume_name: { type: String },
  application_status: { type: String },
  job_id: { type: String },
  application_id: { type: String },
  appointmentDate: { type: String },
  appointmentTimeSlot: { type: String },
  provider_name: { type: String },
  appointment_slot: { type: String },
  operator_name: { type: String },
  bus_name: { type: String },
  bus_type: { type: String },
  seat: { type: String },
  allocated_seat: { type: String },
  seat_status: { type: String, default: 'Pending' },
  travelers: { type: Array, default: [] },
  boarding_point: { type: String },
  dropping_point: { type: String },
  route: { type: String },
  travel_date: { type: String },
  passenger_count: { type: Number },
  hotel_name: { type: String },
  check_in: { type: String },
  check_out: { type: String },
  guests_count: { type: String },
  room_type: { type: String },
  tracking_updates: [{
    title: { type: String },
    status: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true, strict: false });

// Pre-save hook to ensure bidirectional field synchronization
orderSchema.pre('save', function (next) {
  // Sync ID & Order number
  if (!this.id) {
    this.id = 'ORD-' + Date.now();
  }
  if (!this.order_number) {
    this.order_number = this.id;
  }

  // Sync customer names
  if (this.customer_name && !this.memberName) {
    this.memberName = this.customer_name;
  } else if (this.memberName && !this.customer_name) {
    this.customer_name = this.memberName;
  }
  if (!this.customer_name && !this.memberName) {
    this.customer_name = 'Customer';
    this.memberName = 'Customer';
  }

  // Sync customer phone
  if (this.customer_phone && !this.customerPhone) {
    this.customerPhone = this.customer_phone;
  } else if (this.customerPhone && !this.customer_phone) {
    this.customer_phone = this.customerPhone;
  }
  if (!this.customer_phone && !this.customerPhone) {
    this.customer_phone = '';
    this.customerPhone = '';
  }

  // Sync customer address
  if (this.customer_address && !this.customerAddress) {
    this.customerAddress = this.customer_address;
  } else if (this.customerAddress && !this.customer_address) {
    this.customer_address = this.customerAddress;
  }

  // Sync amounts
  if (this.amount !== undefined && this.finalAmount === undefined) {
    this.finalAmount = this.amount;
  } else if (this.finalAmount !== undefined && this.amount === undefined) {
    this.amount = this.finalAmount;
  }

  // Sync types
  if (this.order_type && !this.type) {
    this.type = this.order_type.charAt(0).toUpperCase() + this.order_type.slice(1);
  } else if (this.type && !this.order_type) {
    this.order_type = this.type.toLowerCase();
  }

  // Sync vendor IDs
  if (this.vendor_id && !this.vendorId) {
    this.vendorId = this.vendor_id;
  } else if (this.vendorId && !this.vendor_id) {
    this.vendor_id = String(this.vendorId);
  }

  // Calculate item count if not set
  if (this.items && this.items.length > 0) {
    this.item_count = this.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }

  if (typeof next === 'function') next();
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
