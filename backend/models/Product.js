const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema({
  label: { type: String, required: true },
  val: { type: String, required: true },
}, { _id: false });

const variantOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  priceDiff: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
}, { _id: false });

const variantSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  options: [variantOptionSchema],
}, { _id: false });

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Connect Verified' },
  rating: { type: String, default: '4.8' },
  verified: { type: Boolean, default: true },
  location: { type: String, default: 'Bangalore' },
}, { _id: false });

const productSchema = new mongoose.Schema({
  id: { type: String, index: true },
  vendorId: { type: mongoose.Schema.Types.Mixed },
  businessId: { type: String },
  name: { type: String, required: true, index: true },
  brand: { type: String, default: 'Connect Brand' },
  category: { type: String, required: true, index: true },
  vendorType: { type: String },
  subcategory: { type: String, default: 'General' },
  subCategory: { type: String, default: 'General' },
  image: { type: String },
  imageUrl: { type: String },
  gallery: [{ type: String }],
  description: { type: String, default: '' },
  specifications: [specificationSchema],
  variants: [variantSchema],
  price: { type: Number, required: true },
  mrp: { type: Number },
  originalPrice: { type: Number },
  stock: { type: Number, default: 10 },
  status: { type: String, default: 'Available' },
  availability: { type: String, default: 'In Stock' },
  itemType: { type: String, default: '' },
  unit: { type: String, default: 'count' },
  pinCode: { type: String, default: '560001' },
  foodType: { type: String },
  roomType: { type: String },
  specialization: { type: String },
  rating: { type: Number, default: 4.5 },
  ratingCount: { type: String, default: '1.2k' },
  assured: { type: Boolean, default: true },
  isAssured: { type: Boolean, default: true },
  deliveryInfo: { type: String, default: 'Free Express Delivery in 24 Hours' },
  seller: { type: sellerSchema, default: () => ({ name: 'Connect Verified', rating: '4.8', verified: true, location: 'Bangalore' }) },
  warranty: { type: String, default: '1 Year Brand Warranty' },
  highlights: [{ type: String }],
  actionType: { type: String, default: '' },
  // Category-specific fields (Stay, Travel, Food, Jobs, etc.)
  roomClass: { type: String },
  numberOfGuests: { type: String },
  selectedAmenities: [{ type: String }],
  amenities: [{ type: String }],
  hotelName: { type: String },
  stayCity: { type: String },
  locationCity: { type: String },
  stayAddress: { type: String },
  location: { type: String },
  bedType: { type: String },
  roomSize: { type: String },
  roomView: { type: String },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  starRating: { type: Number },
  propertyType: { type: String },
  childCategory: { type: String },
  freeCancellation: { type: Boolean },
  freeBreakfast: { type: Boolean },
  coupleFriendly: { type: Boolean },
  payAtHotel: { type: Boolean },
  boardingPoint: { type: String },
  boardingTime: { type: String },
  dropPoint: { type: String },
  arrivalTime: { type: String },
  totalDistance: { type: String },
  busSchedule: { type: String },
  routeStops: [{
    stopName: { type: String },
    time: { type: String },
    _id: false,
  }],
  jobType: { type: String },
  salaryPeriod: { type: String },
  experienceLevel: { type: String },
  qualification: { type: String },
  preparationTime: { type: String },
  jobID: { type: String, index: true },
  jobLocation: { type: String },
  experienceRequired: { type: String },
  salaryPackage: { type: String },
  skillsRequirement: { type: mongoose.Schema.Types.Mixed },
  jobDescription: { type: String },
  keyResponsibilities: { type: String },
  deadlineDate: { type: String },
  applicationTips: { type: String },
  qualificationRequired: { type: String },
  linkedProfileUrl: { type: String },
  companyName: { type: String },
  companyWebsite: { type: String },
  contactNumber: { type: String },
  mailId: { type: String },
  vacancies: { type: String },
  vehicleNumber: { type: String },
  vehicleRegNo: { type: String },
  busNumber: { type: String },
}, { timestamps: true, strict: false });

// Pre-save hook to ensure bidirectional field synchronization
productSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id ? this._id.toString() : `prod_${Date.now()}`;
  }

  // Ensure Job products have a clean, unique jobID and NO image
  const isJob = this.category === 'Job' || this.category === 'Jobs' || this.vendorType === 'Job' || this.vendorType === 'Jobs';
  if (isJob) {
    this.image = '';
    this.imageUrl = '';
    if (!this.jobID) {
      this.jobID = `JOB-${Date.now()}`;
    }
  } else {
    this.jobID = undefined;
  }

  // If image is base64, save to uploads folder and assign public HTTP URL
  if (this.image && (this.image.startsWith('data:image/') || (this.image.length > 500 && !this.image.startsWith('http')))) {
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const base64Data = this.image.replace(/^data:image\/\w+;base64,/, '');
      const ext = this.image.includes('data:image/png') ? 'png' : 'jpg';
      const fname = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, fname), base64Data, 'base64');
      const publicUrl = `http://192.168.0.139:5000/uploads/${fname}`;
      this.image = publicUrl;
      this.imageUrl = publicUrl;
    } catch (e) {
      console.error('[Product pre-save image upload]', e.message);
    }
  }

  // Sync image & imageUrl
  if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  } else if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  }
  if (!this.image) {
    this.image = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80';
    this.imageUrl = this.image;
  }

  // Sync subcategory & subCategory
  if (this.subCategory && !this.subcategory) {
    this.subcategory = this.subCategory;
  } else if (this.subcategory && !this.subCategory) {
    this.subCategory = this.subcategory;
  }

  // Sync originalPrice & mrp
  if (this.originalPrice !== undefined && this.mrp === undefined) {
    this.mrp = this.originalPrice;
  } else if (this.mrp !== undefined && this.originalPrice === undefined) {
    this.originalPrice = this.mrp;
  }

  // Sync category & vendorType
  if (!this.vendorType) {
    this.vendorType = this.category;
  }

  // Sync status & availability
  if (this.status === 'Available') {
    this.availability = 'In Stock';
  } else if (this.status === 'Out of Stock') {
    this.availability = 'Out of Stock';
  }

  if (typeof next === 'function') next();
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
