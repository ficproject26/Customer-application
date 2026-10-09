const express = require('express');
const http = require('http');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('./config/db');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Address = require('./models/Address');
const Banner = require('./models/Banner');
const Vendor = require('./models/Vendor');
const Offer = require('./models/Offer');
const DeliveryPartner = require('./models/DeliveryPartner');
const Assignment = require('./models/Assignment');
const Earning = require('./models/Earning');
const Business = require('./models/Business');
const Customer = require('./models/Customer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

io.on('connection', (socket) => {
  socket.on('register', (data) => {
    socket.userId = data?.userId;
  });

  socket.on('join_order', (orderId) => {
    if (orderId) {
      socket.join(String(orderId));
      socket.join(`order_${orderId}`);
    }
  });

  socket.on('leave_order', (orderId) => {
    if (orderId) {
      socket.leave(String(orderId));
      socket.leave(`order_${orderId}`);
    }
  });

  socket.on('update_partner_location', (data) => {
    if (data && (data.orderId || data.order_number)) {
      const oId = data.orderId || data.order_number;
      io.to(String(oId)).emit('partner_location_updated', data);
      io.to(`order_${oId}`).emit('partner_location_updated', data);
      io.emit('partner_location_updated', data);
    }
  });
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded product images as static files
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Helper to ensure uploaded images always use the caller's reachable host/IP
function fixProductImageUrls(data, req) {
  if (!data) return data;
  const host = (req && typeof req.get === 'function' ? req.get('host') : null) || `${getLocalIp()}:5000`;
  const replaceHost = (u) => {
    if (typeof u === 'string' && u.includes('/uploads/')) {
      return u.replace(/http:\/\/[^\/]+\/uploads\//g, `http://${host}/uploads/`);
    }
    return u;
  };
  const fixOne = (item) => {
    const obj = item && typeof item.toObject === 'function' ? item.toObject() : (item ? { ...item } : item);
    if (obj) {
      if (obj.image) obj.image = replaceHost(obj.image);
      if (obj.imageUrl) obj.imageUrl = replaceHost(obj.imageUrl);
    }
    return obj;
  };
  return Array.isArray(data) ? data.map(fixOne) : fixOne(data);
}

// Request Logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Haversine distance formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateRoute(lat1, lon1, lat2, lon2, steps = 15) {
  const path = [];
  const midLat = lat1 + (lat2 - lat1) * 0.45;
  const midLng = lon1 + (lon2 - lon1) * 0.65;
  const controlPoints = [
    [lat1, lon1],
    [midLat, lon1],
    [midLat, midLng],
    [lat2, midLng],
    [lat2, lon2]
  ];
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const start = controlPoints[i];
    const end = controlPoints[i + 1];
    const segSteps = Math.ceil(steps / 4);
    for (let j = 0; j < segSteps; j++) {
      const t = j / segSteps;
      const lt = start[0] + (end[0] - start[0]) * t;
      const ln = start[1] + (end[1] - start[1]) * t;
      path.push([lt + Math.sin(j) * 0.0001, ln + Math.cos(j) * 0.0001]);
    }
  }
  path.push([lat2, lon2]);
  return path;
}

// ==========================================
// 1. HEALTH CHECK & FCM NOTIFICATION ROUTES
// ==========================================
const registeredFcmTokens = new Set();

app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    database: 'MongoDB Atlas',
    registeredTokens: registeredFcmTokens.size,
    message: 'Connect Backend is healthy and running.'
  });
});

// ==========================================
// IMAGE UPLOAD (base64 → saved file → public URL)
// ==========================================
app.post('/api/upload', (req, res) => {
  try {
    const { base64, mimeType = 'image/jpeg', filename } = req.body;
    if (!base64) return res.status(400).json({ success: false, message: 'No image data provided' });

    // Strip data URI prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
    const fname = (filename || `img_${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_\-\.]/g, '') + '.' + ext;
    const filePath = path.join(uploadsDir, fname);

    fs.writeFileSync(filePath, base64Data, 'base64');

    // Return a URL using the server's local IP so all LAN devices can access it
    const reqHost = req.get('host');
    const serverHost = reqHost ? reqHost.split(':')[0] : getLocalIp();
    const port = process.env.PORT || 8001;
    const publicUrl = `http://${serverHost}:${port}/uploads/${fname}`;

    console.log(`[Upload] Saved image: ${fname} → ${publicUrl}`);
    res.json({ success: true, url: publicUrl, filename: fname });
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/notifications/register-token', (req, res) => {
  const { token, platform } = req.body;
  if (token) {
    registeredFcmTokens.add(token);
    console.log(`[FCM Backend] Registered token (${platform}):`, token);
    return res.json({
      status: 'success',
      message: 'FCM Device token registered successfully',
      tokenCount: registeredFcmTokens.size,
    });
  }
  return res.status(400).json({ status: 'error', message: 'Token is required' });
});

app.post('/api/notifications/send-push', async (req, res) => {
  const { token, title, body, screen, data } = req.body;
  const targetToken = token || Array.from(registeredFcmTokens)[0];

  console.log(`[FCM Backend] Send push request received: "${title}" - "${body}" (screen: ${screen || 'Orders'})`);

  return res.json({
    status: 'success',
    message: 'FCM Push Notification payload dispatched successfully',
    targetToken: targetToken || 'All registered devices',
    payload: {
      title: title || 'Order Update',
      body: body || 'Your order is being processed.',
      screen: screen || 'Orders',
      data: data || { screen: screen || 'Orders' },
    },
  });
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, identifier, role, password } = req.body;
    const loginId = email || identifier;
    if (!loginId) {
      return res.status(400).json({ status: 'error', message: 'Email or phone number is required' });
    }
    let user = await User.findOne({ $or: [{ email: loginId }, { phone: loginId }] });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User account not found. Please register first.' });
    }
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, role, businessName, address } = req.body;
    let displayName = name || (businessName || 'Connect Member');
    const uniqueSuffix = Date.now().toString().slice(-6);
    const userId = `${role || 'cust'}_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${uniqueSuffix}`;
    
    let existing = await User.findOne({ $or: [{ email: email || undefined }, { phone: phone || undefined }] });
    if (existing) {
      existing.name = displayName;
      existing.role = role || existing.role;
      if (address) {
        existing.address = {
          address: `${address.house || ''} ${address.street || ''}`.trim(),
          city: address.city || '',
          state: address.state || '',
          pincode: address.pincode || '',
        };
      }
      await existing.save();
      return res.json({ status: 'success', data: existing });
    }

    const newUser = await User.create({
      id: userId,
      name: displayName,
      email: email || '',
      phone: phone || '',
      role: role || 'customer',
      membership: '',
      address: address ? {
        address: `${address.house || ''} ${address.street || ''}`.trim(),
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
      } : undefined,
    });
    res.json({ status: 'success', data: newUser });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Vendor Registration Route
app.post('/api/auth/register-vendor', async (req, res) => {
  try {
    const {
      email, password, vendorType, category, subcategory,
      businessName, agentName, contactPerson, address,
      mobileNumber, gstStatus, panNo, companyRegNo, msmeStatus,
      accountHolderName, bankName, bankBranch, bankStreet,
      bankCity, accountNo, ifscCode, operatingHours,
    } = req.body;

    if (!email || !businessName) {
      return res.status(400).json({ success: false, message: 'Email and Business Name are required.' });
    }

    // Check if vendor already exists
    let existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(409).json({ success: false, message: 'A vendor with this email already exists. Please log in.' });
    }

    // Create vendor document
    const vendorId = `vendor_${Date.now()}`;
    const newVendor = await Vendor.create({
      id: vendorId,
      name: contactPerson || businessName,
      email: email.toLowerCase().trim(),
      phone: mobileNumber || '',
      businessName: businessName.trim(),
      vendorType: vendorType || category || 'Products',
      category: category || vendorType || 'Products',
      subcategory: subcategory || 'General',
      address: address || '',
      agentName: agentName || '',
      gstStatus: gstStatus || 'Non-GST Declared',
      panNo: panNo || '',
      companyRegNo: companyRegNo || 'N/A',
      msmeStatus: msmeStatus || 'Non-MSME',
      bankDetails: {
        accountHolderName: accountHolderName || '',
        bankName: bankName || '',
        branch: bankBranch || '',
        street: bankStreet || '',
        city: bankCity || '',
        accountNo: accountNo || '',
        ifscCode: ifscCode || '',
      },
      operatingHours: operatingHours || '09:00 AM - 09:00 PM',
      status: 'pending',
      membershipPlan: 'Basic',
    });

    // Generate a simple token (use crypto for real apps)
    const token = crypto.randomBytes(32).toString('hex');

    console.log(`[Vendor Registration] New vendor registered: ${email} (${businessName})`);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully! Your account is under review.',
      token,
      user: {
        _id: newVendor._id,
        id: vendorId,
        name: newVendor.name,
        email: newVendor.email,
        businessName: newVendor.businessName,
        vendorType: newVendor.vendorType,
        category: newVendor.category,
        subcategory: newVendor.subcategory,
        membershipPlan: 'Basic',
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('[Vendor Registration Error]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Registration failed. Please try again.' });
  }
});

// Vendor Login Route
app.post('/api/auth/login-vendor', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    let vendor = await Vendor.findOne({ email: email.toLowerCase().trim() });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor account not found. Please register first.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[Vendor Login] Login: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        _id: vendor._id,
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        vendorType: vendor.vendorType,
        category: vendor.category,
        subcategory: vendor.subcategory,
        membershipPlan: vendor.membershipPlan || 'Gold',
        primaryBusinessId: vendor._id,
        businesses: [{
          _id: vendor._id,
          businessName: vendor.businessName,
          vendorType: vendor.vendorType,
          category: vendor.category,
          subcategory: vendor.subcategory,
        }],
      },
    });
  } catch (err) {
    console.error('[Vendor Login Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, role } = req.body || {};
    const googleEmail = email || 'google.user@connectapp.com';
    const googleName = name || 'Google Member';
    let user = await User.findOne({ email: googleEmail });
    if (!user) {
      user = await User.create({
        id: `cust_g_${Date.now()}`,
        name: googleName,
        email: googleEmail,
        role: role || 'customer',
        membership: '',
      });
    }
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/auth/email-otp', (req, res) => {
  const { email } = req.body;
  res.json({ status: 'success', message: `Verification OTP sent to ${email || 'your email'}` });
});

app.post('/api/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, otp, role } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      let displayName = email ? email.split('@')[0] : 'Member';
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      user = await User.create({
        id: `cust_otp_${Date.now()}`,
        name: displayName,
        email: email || 'user@connectapp.com',
        role: role || 'customer',
        membership: '',
      });
    }
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 3. PROFILE & MEMBERSHIP ROUTES
// ==========================================
app.get(['/api/customer/profile', '/api/profile'], async (req, res) => {
  try {
    const userId = req.query.userId || req.query.id;
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }
    let user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User profile not found' });
    }
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.patch(['/api/customer/profile', '/api/profile'], async (req, res) => {
  try {
    const { id, userId, name, email, phone, membership, avatar, dob, gender, address } = req.body;
    const targetId = id || userId;
    if (!targetId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }
    let user = await User.findOne({ id: targetId });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User profile not found' });
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (membership) user.membership = membership;
    if (avatar !== undefined) user.avatar = avatar;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (address) user.address = address;
    await user.save();
    console.log(`[Backend Profile] Updated user ${targetId} -> Membership: ${user.membership}, Avatar: ${user.avatar ? 'set' : 'none'}`);
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/customer/profile/upload-photo', async (req, res) => {
  const { imageUri } = req.body || {};
  res.json({ status: 'success', data: { url: imageUri || '' } });
});

app.post(['/api/profile/send-otp', '/api/customer/profile/send-otp'], (req, res) => {
  res.json({ status: 'success', message: 'Verification OTP has been sent successfully!' });
});

app.post(['/api/profile/verify-otp', '/api/customer/profile/verify-otp'], (req, res) => {
  res.json({ status: 'success', verified: true });
});

// ==========================================
// 4. ADDRESSES ROUTES
// ==========================================
app.get(['/api/customer/addresses', '/api/addresses'], async (req, res) => {
  try {
    const uId = req.query.userId || req.body?.userId;
    if (!uId) {
      return res.json({ status: 'success', data: [] });
    }
    const addresses = await Address.find({ userId: uId }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ status: 'success', data: addresses });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post(['/api/customer/addresses', '/api/addresses'], async (req, res) => {
  try {
    const uId = req.query.userId || req.body?.userId;
    if (!uId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }
    const count = await Address.countDocuments({ userId: uId });
    const isDefault = Boolean(req.body.isDefault) || count === 0;

    if (isDefault) {
      await Address.updateMany({ userId: uId }, { $set: { isDefault: false } });
    }

    const newAddr = await Address.create({
      id: `addr_${Date.now()}`,
      userId: uId,
      label: req.body.label || 'Home',
      name: req.body.name || '',
      phone: req.body.phone || '',
      house: req.body.house || '',
      street: req.body.street || '',
      landmark: req.body.landmark || '',
      city: req.body.city || '',
      state: req.body.state || '',
      pincode: req.body.pincode || '',
      isDefault,
    });

    if (isDefault) {
      await User.findOneAndUpdate(
        { id: uId },
        {
          $set: {
            address: {
              address: `${newAddr.house}, ${newAddr.street}`,
              city: newAddr.city,
              state: newAddr.state,
              pincode: newAddr.pincode,
            }
          }
        }
      );
    }

    res.json({ status: 'success', data: newAddr });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.patch(['/api/customer/addresses/:id/default', '/api/addresses/:id/default'], async (req, res) => {
  try {
    const addrId = req.params.id;
    const uId = req.query.userId || req.body?.userId;
    if (!uId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }

    await Address.updateMany({ userId: uId }, { $set: { isDefault: false } });
    const target = await Address.findOneAndUpdate(
      { id: addrId, userId: uId },
      { $set: { isDefault: true } },
      { new: true }
    );

    if (target) {
      await User.findOneAndUpdate(
        { id: uId },
        {
          $set: {
            address: {
              address: `${target.house}, ${target.street}`,
              city: target.city,
              state: target.state,
              pincode: target.pincode,
            }
          }
        }
      );
    }

    const all = await Address.find({ userId: uId }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ status: 'success', data: all });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete(['/api/customer/addresses/:id', '/api/addresses/:id'], async (req, res) => {
  try {
    const addrId = req.params.id;
    const uId = req.query.userId || req.body?.userId;
    if (!uId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }
    await Address.deleteOne({ id: addrId, userId: uId });
    res.json({ status: 'success', message: 'Address removed successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// VENDOR PRODUCT ROUTES (used by Vendor Mobile App)
// ==========================================

// GET all products for vendor (filtered by business/vendor)
app.get('/api/vendor/products', async (req, res) => {
  try {
    const businessId = req.headers['x-business-id'];
    const vendorEmail = req.headers['x-vendor-email'];
    let query = {};
    if (businessId) {
      query = { $or: [{ businessId }, { vendorId: businessId }] };
    } else if (vendorEmail) {
      const vendor = await Vendor.findOne({ email: vendorEmail });
      if (vendor) query = { vendorId: vendor._id };
    }
    const products = Object.keys(query).length > 0
      ? await Product.find(query).sort({ createdAt: -1 })
      : await Product.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: fixProductImageUrls(products, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST - Vendor creates a product (saved to shared MongoDB Product collection)
app.post('/api/vendor/products', async (req, res) => {
  try {
    const payload = req.body;
    const businessId = req.headers['x-business-id'];
    const vendorEmail = req.headers['x-vendor-email'];

    let vendorId;
    if (vendorEmail) {
      const vendor = await Vendor.findOne({ email: vendorEmail });
      if (vendor) vendorId = vendor._id;
    }

    const cat = payload.category || payload.vendorType || 'Products';
    const subCat = payload.subCategory || payload.subcategory || 'General';

    const product = await Product.create({
      ...payload,
      category: cat,
      vendorType: cat,
      subCategory: subCat,
      subcategory: subCat,
      imageUrl: payload.imageUrl || payload.image,
      image: payload.image || payload.imageUrl,
      vendorId: vendorId || payload.vendorId,
      businessId: businessId || payload.businessId,
      status: payload.status || 'Available',
    });

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT - Vendor updates a product
app.put('/api/vendor/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const subCat = updates.subCategory || updates.subcategory;
    if (subCat) {
      updates.subCategory = subCat;
      updates.subcategory = subCat;
    }
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findByIdAndUpdate(id, updates, { new: true });
    }
    if (!product) {
      product = await Product.findOneAndUpdate({ id }, updates, { new: true });
    }
    if (!product) {
      product = await Product.findOneAndUpdate({ _id: id }, updates, { new: true }).catch(() => null);
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    clearCache();
    if (typeof io !== 'undefined') {
      io.emit('product_catalog_updated', product);
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE - Vendor deletes a product
app.delete(['/api/vendor/products/:id', '/api/products/:id'], async (req, res) => {
  try {
    const id = req.params.id;
    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Product.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Product.findOneAndDelete({ $or: [{ id: id }, { jobID: id }] }).catch(() => null);
    }
    if (!deleted) {
      deleted = await Product.findOneAndDelete({ _id: id }).catch(() => null);
    }
    if (typeof io !== 'undefined') {
      io.emit('product_deleted', { id });
      io.emit('product_catalog_updated', { id, isDeleted: true });
    }
    console.log(`[Product Delete] Product ${id} deleted successfully from database`);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET vendor orders
app.get('/api/vendor/orders', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. VENDOR ORDER STATUS UPDATE WITH REAL-TIME NOTIFICATIONS
// ==========================================
function getJoyfulNotification(status, order) {
  const cat = (order.category || order.type || 'Products').toLowerCase();
  const prod = order.product_details ||
               (order.items && order.items.length > 0 && (order.items[0].name || order.items[0].title)) ||
               order.serviceName ||
               order.title ||
               order.product_name ||
               order.name ||
               'your items';
  const norm = (status || '').toLowerCase().trim();

  // FOOD CATEGORY
  if (cat.includes('food')) {
    if (norm === 'accepted' || norm === 'confirmed') {
      return {
        title: '🎉 Restaurant Accepted Your Order!',
        body: `Delicious news! The kitchen accepted your order for ${prod} and is getting started!`,
        desc: 'Restaurant is preparing your order.'
      };
    }
    if (norm === 'preparing') {
      return {
        title: '🍳 Sizzling in the Kitchen!',
        body: `The chef is cooking your delicious ${prod} fresh and hot right now!`,
        desc: 'Kitchen is cooking your items.'
      };
    }
    if (norm === 'ready' || norm === 'packed' || norm === 'assigned') {
      return {
        title: '🥡 Food Packed & Ready!',
        body: `Your hot ${prod} is packed and waiting for the delivery partner!`,
        desc: 'Order packed and assigned to delivery partner.'
      };
    }
    if (norm.includes('out') || norm === 'out for delivery' || norm === 'picked up') {
      return {
        title: '🛵 Food is on the Way!',
        body: `Our delivery partner picked up your ${prod} and is zooming to your doorstep!`,
        desc: 'Delivery partner is on the way with your food.'
      };
    }
    if (norm === 'delivered' || norm === 'completed') {
      return {
        title: '🍽️ Bon Appétit! Delivered!',
        body: `Your warm food has arrived! Enjoy your ${prod}!`,
        desc: 'Order delivered successfully. Enjoy your meal!'
      };
    }
  }

  // SERVICES CATEGORY
  if (cat.includes('service')) {
    if (norm === 'accepted' || norm === 'confirmed') {
      return {
        title: '🎉 Service Request Accepted!',
        body: `Great news! The service expert accepted your request for ${prod}!`,
        desc: 'Professional confirmed your booking.'
      };
    }
    if (norm === 'preparing' || norm === 'in progress' || norm === 'ongoing') {
      return {
        title: '🛠️ Service In Progress!',
        body: `The expert is currently fulfilling your service request for ${prod}!`,
        desc: 'Expert is on-site performing the service.'
      };
    }
    if (norm === 'completed' || norm === 'delivered') {
      return {
        title: '⭐ Service Successfully Completed!',
        body: `Your service for ${prod} has been completed! We hope you loved it!`,
        desc: 'Service completed successfully.'
      };
    }
  }

  // STAY & TRAVEL CATEGORY
  if (cat.includes('stay') || cat.includes('travel')) {
    if (norm === 'accepted' || norm === 'confirmed') {
      return {
        title: '🎉 Reservation Confirmed!',
        body: `Pack your bags! Your booking for ${prod} is fully confirmed!`,
        desc: 'Host confirmed your reservation.'
      };
    }
    if (norm === 'completed') {
      return {
        title: '🧳 Trip / Stay Completed!',
        body: `Hope you enjoyed your stay / journey for ${prod}!`,
        desc: 'Reservation completed.'
      };
    }
  }

  // JOBS CATEGORY
  if (cat.includes('job')) {
    if (norm === 'accepted' || norm === 'confirmed') {
      return {
        title: '🎉 Application Shortlisted!',
        body: `Congratulations! The employer accepted your application for ${prod}!`,
        desc: 'Employer processed and accepted your application.'
      };
    }
  }

  // PRODUCTS & DAILY NEEDS / DEFAULT
  if (norm === 'accepted' || norm === 'confirmed') {
    return {
      title: '🎉 Order Accepted by Seller!',
      body: `Hooray! The seller has accepted your order for "${prod}" and is preparing it with love!`,
      desc: 'Seller has processed and accepted your order.'
    };
  }
  if (norm === 'preparing') {
    return {
      title: '📦 Packing Your Order!',
      body: `Great news! The seller is carefully packing "${prod}" for shipment!`,
      desc: 'Seller is packing your order.'
    };
  }
  if (norm === 'shipped' || norm === 'assigned') {
    return {
      title: '🚚 Order Shipped & En Route!',
      body: `Super exciting! Your order "${prod}" has shipped and is on its way to the hub!`,
      desc: 'Package dispatched with delivery partner.'
    };
  }
  if (norm.includes('out') || norm === 'out for delivery') {
    return {
      title: '🛵 Out For Delivery Right Now!',
      body: `Almost at your doorstep! Our delivery executive is out for delivery with "${prod}"!`,
      desc: 'Delivery partner is on the way to your address.'
    };
  }
  if (norm === 'delivered' || norm === 'completed') {
    return {
      title: '✨ Joy Delivered Successfully!',
      body: `Your package with "${prod}" has arrived! Thank you for ordering with Connect!`,
      desc: 'Package delivered successfully. Thank you!'
    };
  }
  if (norm === 'cancelled') {
    return {
      title: '❌ Order Cancelled',
      body: `Your order for "${prod}" has been cancelled.`,
      desc: 'Order has been cancelled.'
    };
  }

  return {
    title: `Order Update: ${status}`,
    body: `Your order for "${prod}" has been updated to ${status}.`,
    desc: `Status updated to ${status}.`
  };
}

app.put('/api/vendor/orders/:id/status', async (req, res) => {
  try {
    const { status, seat, allocated_seat, travelers, bus_name } = req.body;
    const orderId = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({
        $or: [{ id: orderId }, { order_number: orderId }]
      });
    }
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status) order.status = status;
    if (bus_name) order.bus_name = bus_name;

    const finalSeat = seat || allocated_seat;
    if (finalSeat) {
      order.seat = finalSeat;
      order.allocated_seat = finalSeat;
      order.seat_status = 'Allocated';
      if (order.product_details && !order.product_details.includes('Seat:')) {
        order.product_details = `${order.product_details} • Seat: ${finalSeat}`;
      }
    }

    if (Array.isArray(travelers) && travelers.length > 0) {
      order.travelers = travelers;
    }

    // Track dynamic timeline history
    let joyful = getJoyfulNotification(order.status, order);
    if (finalSeat) {
      joyful = {
        title: '🎉 Bus Seat Allocated & Confirmed!',
        desc: `Your bus ticket is confirmed with seat ${finalSeat}. Have a pleasant journey!`,
        body: `Your bus ticket is confirmed with seat ${finalSeat}.`,
      };
    }
    if (!order.tracking_updates) order.tracking_updates = [];
    order.tracking_updates.push({
      title: joyful.title,
      status: order.status,
      message: joyful.desc,
      timestamp: new Date()
    });

    await order.save();
    clearCache();

    console.log(`[Order Status] Order #${order.order_number || order.id} updated to "${status}" -> Broadcasting real-time event!`);

    // 1. Broadcast real-time Socket event to all connected Customer apps
    const payload = {
      orderId: order.id || order.order_number,
      order_number: order.order_number || order.id,
      id: order.id,
      _id: order._id,
      status: order.status,
      title: joyful.title,
      body: joyful.body,
      message: joyful.body,
      description: joyful.desc,
      order: order.toObject ? order.toObject() : order,
      timestamp: new Date().toISOString()
    };

    io.emit('order_status_updated', payload);
    io.emit('customer_order_status', payload);
    io.emit('job_application_updated', payload);

    res.json({ success: true, data: order, notification: joyful });
  } catch (err) {
    console.error('[Order Status Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. PRODUCTS & CATALOG
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, subcategory } = req.query;
    let query = {};
    if (category && category !== 'All') {
      const cat = category === 'Product' ? 'Products' : category;
      query.category = { $regex: new RegExp(`^${cat}$`, 'i') };
    }
    if (subcategory) {
      query.subcategory = { $regex: new RegExp(`^${subcategory}$`, 'i') };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ status: 'success', data: fixProductImageUrls(products, req) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const product = await Product.findOne(
      isObjectId ? { $or: [{ id: req.params.id }, { _id: req.params.id }] } : { id: req.params.id }
    );
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    res.json({ status: 'success', data: fixProductImageUrls(product, req) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin toggle Assured badge status
app.patch(['/api/admin/products/:id/assured', '/api/products/:id/assured'], async (req, res) => {
  try {
    const isAssured = Boolean(req.body.isAssured || req.body.assured);
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: { assured: isAssured, isAssured: isAssured } },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    res.json({ status: 'success', data: product });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ==========================================
// 6. BANNERS
// ==========================================
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: banners });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/banners', async (req, res) => {
  try {
    const banner = await Banner.create({
      id: req.body.id || `banner_${Date.now()}`,
      ...req.body,
    });
    res.json({ status: 'success', data: banner });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    await Banner.deleteOne({ id: req.params.id });
    res.json({ status: 'success', message: 'Banner removed' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 7. VENDORS & HUBS
// ==========================================
app.get('/api/vendors', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    const vendors = await Vendor.find(query).sort({ rating: -1 });
    res.json({ status: 'success', data: vendors });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 8. OFFERS & MEMBERSHIP DEALS
// ==========================================
app.get('/api/offers', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    const offers = await Offer.find(query).sort({ createdAt: -1 });
    res.json({ status: 'success', data: offers });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 9. ORDERS & BOOKINGS
// ==========================================
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: orders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      order = await Order.findById(rawId);
    }
    if (!order) {
      order = await Order.findOne({
        $or: [{ id: rawId }, { order_number: rawId }]
      });
    }
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const assignment = await Assignment.findOne({ order_id: order.id, status: { $ne: 'Rejected' } });
    let partner = null;
    if (assignment) {
      partner = await DeliveryPartner.findOne({ id: assignment.delivery_partner_id });
    }


    const vendorLat = 12.9348;
    const vendorLng = 77.6189;
    const custLat = Number(order.customer_latitude) || 12.9716;
    const custLng = Number(order.customer_longitude) || 77.6412;
    const partnerLat = partner ? (Number(partner.current_latitude) || 12.9420) : vendorLat;
    const partnerLng = partner ? (Number(partner.current_longitude) || 77.6250) : vendorLng;

    const remainingDist = getDistance(partnerLat, partnerLng, custLat, custLng);
    const etaMins = Math.max(Math.round((remainingDist / 25) * 60) + 3, 5);
    const route = generateRoute(vendorLat, vendorLng, custLat, custLng, 20);

    const timeline = [
      {
        status: 'Order Placed',
        timestamp: order.createdAt || order.created_at || new Date().toISOString(),
        notes: 'Order confirmed & received at hub'
      }
    ];
    if (order.status !== 'Order Received' && order.status !== 'Pending') {
      timeline.push({
        status: 'Order Packed & Prepared',
        timestamp: new Date(new Date(order.createdAt || Date.now()).getTime() + 4 * 60000).toISOString(),
        notes: 'Items sealed & ready for lightning dispatch'
      });
    }
    if (['Ready For Pickup', 'Assigned To Delivery Partner', 'Delivery Partner Accepted', 'Picked Up', 'Out For Delivery', 'Delivered'].includes(order.status)) {
      timeline.push({
        status: 'Delivery Partner Assigned',
        timestamp: new Date(new Date(order.createdAt || Date.now()).getTime() + 8 * 60000).toISOString(),
        notes: `${partner.name} accepted your delivery order`
      });
    }
    if (['Picked Up', 'Out For Delivery', 'Delivered'].includes(order.status)) {
      timeline.push({
        status: 'Out For Delivery',
        timestamp: new Date().toISOString(),
        notes: `${partner.name} is on the way to your address`
      });
    }
    if (order.status === 'Delivered') {
      timeline.push({
        status: 'Delivered',
        timestamp: new Date().toISOString(),
        notes: 'Order safely delivered at your doorstep'
      });
    }

    res.json({
      status: 'success',
      data: {
        order,
        timeline,
        assignment,
        partner,
        tracking: {
          latitude: partnerLat,
          longitude: partnerLng,
          distance: Number(remainingDist.toFixed(2)),
          eta: etaMins,
        },
        route,
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update order delivery address or contact details (Address editable only before packing)
app.patch('/api/orders/:id/delivery-details', async (req, res) => {
  try {
    const orderId = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ $or: [{ id: orderId }, { order_number: orderId }] });
    }
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { customer_address, address_label, customer_name, customer_phone } = req.body;

    // Check if order has already reached packing or beyond
    const status = (order.status || '').toLowerCase();
    const isPackedOrBeyond =
      status.includes('pack') ||
      status.includes('ship') ||
      status.includes('dispatch') ||
      status.includes('assign') ||
      status.includes('out') ||
      status.includes('deliver') ||
      status.includes('complet') ||
      status.includes('cancel');

    if (customer_address && isPackedOrBeyond) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address cannot be changed once the order is packed or in transit.'
      });
    }

    if (customer_address) {
      order.customerAddress = customer_address;
      order.customer_address = customer_address;
      if (address_label) order.address_label = address_label;
    }

    if (customer_name) {
      order.memberName = customer_name;
      order.customer_name = customer_name;
    }

    if (customer_phone) {
      order.customerPhone = customer_phone;
      order.customer_phone = customer_phone;
      order.phone = customer_phone;
    }

    await order.save();

    console.log(`[Order Update] Delivery details updated for order #${order.order_number || order.id}`);
    res.json({ success: true, message: 'Delivery details updated successfully', data: order });
  } catch (err) {
    console.error('[Delivery Details Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const isJobOrder = req.body.category === 'Jobs' || String(req.body.order_number || '').startsWith('JOB') || String(req.body.id || '').startsWith('ord_job');
    const orderId = req.body.id || (isJobOrder ? `ord_job_${Date.now()}` : `ORD-${Date.now()}`);
    const firstItem = req.body.items && req.body.items[0];
    const initialTracking = [
      {
        title: isJobOrder ? '📋 Application Submitted' : '📦 Order Placed',
        status: req.body.status || (isJobOrder ? 'Application Submitted' : 'Pending'),
        message: isJobOrder ? 'Your job application has been submitted to the employer.' : 'Your order has been placed and sent to the seller.',
        timestamp: new Date()
      }
    ];

    const orderData = {
      ...req.body,
      id: req.body.id || orderId,
      order_number: req.body.order_number || orderId,
      user_id: req.body.user_id || req.body.userId || '',
      userId: req.body.userId || req.body.user_id || '',
      status: req.body.status || (isJobOrder ? 'Application Submitted' : 'Pending'),
      memberName: req.body.memberName || req.body.customer_name || req.body.candidateName || '',
      customer_name: req.body.customer_name || req.body.memberName || req.body.candidateName || '',
      customerPhone: req.body.customerPhone || req.body.customer_phone || req.body.candidatePhone || '',
      customer_phone: req.body.customer_phone || req.body.customerPhone || req.body.candidatePhone || '',
      customerAddress: req.body.customerAddress || req.body.pickupLocation || req.body.customer_address || '',
      pickupLocation: req.body.pickupLocation || req.body.customerAddress || '',
      product_details: req.body.product_details || (firstItem ? firstItem.name : (isJobOrder ? 'Job Application' : 'Ordered Items')),
      tracking_updates: req.body.tracking_updates && req.body.tracking_updates.length > 0 ? req.body.tracking_updates : initialTracking,
    };

    const newOrder = await Order.create(orderData);
    // Notify vendor backend in real-time
    try {
      fetch('http://127.0.0.1:8002/api/realtime/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.toObject ? newOrder.toObject() : newOrder })
      }).catch(err => console.warn('[Connect-Backend] Vendor realtime notification warning:', err.message));
    } catch (notifErr) {
      console.warn('[Connect-Backend] Vendor notify error:', notifErr.message);
    }
    clearCache();

    // Real-time notification to Vendor dashboard & Customer tracker
    io.emit('new_vendor_order', newOrder);
    io.emit('order_status_updated', {
      orderId: newOrder.id,
      order_number: newOrder.order_number,
      status: newOrder.status,
      title: isJobOrder ? '📋 Application Submitted' : '📦 Order Placed',
      message: isJobOrder ? 'Your job application has been submitted to the employer.' : 'Your order has been placed and sent to the seller.',
      order: newOrder.toObject ? newOrder.toObject() : newOrder
    });
    io.emit('job_application_updated', {
      orderId: newOrder.id,
      order_number: newOrder.order_number,
      status: newOrder.status,
      order: newOrder.toObject ? newOrder.toObject() : newOrder
    });

    return res.json({ status: 'success', data: newOrder });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: 'Cancelled' } },
      { new: true }
    );
    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });
    io.emit('order_status_updated', { orderId: order.id, status: 'Cancelled' });
    res.json({ status: 'success', message: 'Order cancelled successfully', data: order });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/orders/:id/review', async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findOneAndUpdate(
      { id: req.params.id },
      { $set: { rating: rating || 5, review_note: review || '' } },
      { new: true }
    );
    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });
    res.json({ status: 'success', message: 'Review recorded', data: order });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 10. DELIVERY PARTNERS
// ==========================================
app.get('/api/vendors/delivery-partners', async (req, res) => {
  try {
    const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: partners });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/delivery-partners/:id/dashboard', async (req, res) => {
  try {
    const partnerId = req.params.id;
    const partner = await DeliveryPartner.findOne({ id: partnerId });
    if (!partner) return res.status(404).json({ status: 'error', message: 'Partner not found' });

    const activeAssignment = await Assignment.findOne({
      delivery_partner_id: partnerId,
      status: { $in: ['Pending', 'Accepted'] }
    });

    let activeOrder = null;
    if (activeAssignment) {
      activeOrder = await Order.findOne({ id: activeAssignment.order_id });
    }

    const earnings = await Earning.find({ delivery_partner_id: partnerId });
    const todayEarnings = earnings.reduce((acc, e) => acc + (e.per_delivery_earning || 0), 0);

    res.json({
      status: 'success',
      data: {
        profile: partner,
        stats: {
          todayCompleted: earnings.length,
          todayEarnings,
          rating: 4.9,
        },
        activeAssignment,
        activeOrder,
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.put('/api/delivery-partners/:id/status', async (req, res) => {
  try {
    const { status, availability } = req.body;
    const partner = await DeliveryPartner.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status, availability: availability !== undefined ? availability : (status === 'Available') } },
      { new: true }
    );
    res.json({ status: 'success', data: partner });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/maps/route', (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.body;
  const dist = getDistance(startLat, startLng, endLat, endLng);
  const duration = Math.ceil(dist / 0.4) + 2;
  const route = generateRoute(startLat, startLng, endLat, endLng);
  res.json({
    status: 'success',
    data: {
      distance: parseFloat(dist.toFixed(2)),
      duration,
      route,
    }
  });
});

// ==========================================
// 11. RAZORPAY TEST MODE PAYMENT & VERIFICATION
// ==========================================
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_THLM17MgXLM2tP';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'nrlFSNfeqYOJiGJc4cU2sm1R';

// Create Razorpay Order
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', planType, userId } = req.body;
    const numericAmount = parseFloat(amount) || 5999;
    const amountInPaise = Math.round(numericAmount * 100);

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    let razorpayOrderId = null;

    // Server-side API call to Razorpay v1/orders
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 800);
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: `rcpt_${planType || 'order'}_${Date.now()}`,
            notes: {
              planType: planType || 'diamond',
              userId: userId || '',
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (rzpRes.ok) {
          const orderData = await rzpRes.json();
          razorpayOrderId = orderData.id;
        }
      } catch (rzpErr) {
        // Fallback test order ID generated instantly
      }
    }

    if (!razorpayOrderId) {
      return res.status(500).json({ status: 'error', message: 'Unable to initialize order with Razorpay gateway. Please check API credentials.' });
    }

    console.log(`[Razorpay Backend] Order Created -> ID: ${razorpayOrderId}, Amount: ₹${numericAmount} (${amountInPaise} paise), Plan: ${planType}`);

    res.json({
      status: 'success',
      data: {
        orderId: razorpayOrderId,
        amount: amountInPaise,
        currency,
        keyId: RAZORPAY_KEY_ID,
        planType: planType || 'diamond',
      },
    });
  } catch (err) {
    console.error('[Razorpay Create Order Error]:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Verify Payment HMAC Signature & Upgrade Membership / Save Order in DB
app.post('/api/razorpay/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, userId, items, totalAmount, address } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'error', message: 'Missing Razorpay payment parameters for verification' });
    }

    // Server-side HMAC-SHA256 signature verification using RAZORPAY_KEY_SECRET
    const bodyData = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(bodyData)
      .digest('hex');

    const isValidSignature = expectedSignature === razorpay_signature;

    if (!isValidSignature) {
      console.error('[Razorpay Backend] Signature Verification Failed!', { expectedSignature, received: razorpay_signature });
      return res.status(400).json({ status: 'error', message: 'Payment verification failed: Invalid Signature' });
    }

    const targetUserId = userId;
    if (!targetUserId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required for payment verification' });
    }
    const isMembershipPlan = ['silver', 'gold', 'diamond'].includes(String(planType || '').toLowerCase());

    if (isMembershipPlan) {
      const targetTier = String(planType).toLowerCase();
      const updatedUser = await User.findOneAndUpdate(
        { id: targetUserId },
        { $set: { membership: targetTier } },
        { new: true, upsert: true }
      );
      console.log(`[Razorpay Backend] Payment Verified Successfully! User ${targetUserId} upgraded to ${targetTier.toUpperCase()} membership 🎉`);
      return res.json({
        status: 'success',
        message: `Razorpay payment verified! Membership successfully upgraded to ${targetTier.toUpperCase()}.`,
        data: {
          membership: targetTier,
          user: updatedUser,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        },
      });
    }

    // Product/Service Checkout Order Verification
    const orderId = razorpay_order_id || (`ORD-${Date.now()}`);
    let newOrder = null;
    try {
      newOrder = await Order.create({
        id: orderId,
        order_number: orderId,
        userId: targetUserId,
        items: items || [],
        total_amount: totalAmount || 0,
        payment_method: 'Razorpay Test Mode',
        payment_status: 'Paid',
        payment_id: razorpay_payment_id,
        address: address || 'Default Address',
        status: 'Order Received',
      });
    } catch (dbErr) {
      console.warn('[Order DB Notice] Recorded order fallback:', dbErr.message);
      newOrder = { id: orderId, total_amount: totalAmount };
    }

    console.log(`[Razorpay Backend] Payment Verified Successfully! Checkout order ${orderId} created for ${targetUserId} 🎉`);

    res.json({
      status: 'success',
      message: 'Razorpay payment verified & order created successfully!',
      data: {
        orderId,
        paymentId: razorpay_payment_id,
        order: newOrder,
      },
    });
  } catch (err) {
    console.error('[Razorpay Verification Error]:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 12. VENDOR API ROUTES & REAL-TIME SYNC
// ==========================================

const cacheStore = new Map();
const CACHE_TTL_MS = 3000;

const getCached = (key) => {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  cacheStore.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
};

const clearCache = () => {
  cacheStore.clear();
};

const findVendor = async (req) => {
  const email = req?.headers?.['x-vendor-email'] || req?.body?.email;
  let vendor = null;
  if (email) {
    vendor = await Vendor.findOne({ email });
  }
  if (!vendor) {
    vendor = await Vendor.findOne().sort({ createdAt: 1 });
  }
  return vendor;
};

// Vendor Auth
app.post('/api/auth/login-vendor', async (req, res) => {
  try {
    const { email } = req.body;
    let vendor = await findVendor(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found. Please register first.' });
    }
    if (email && vendor.email !== email) {
      vendor.email = email;
      await vendor.save();
    }
    return res.json({
      success: true,
      token: `jwt_mongo_${vendor._id}`,
      user: vendor,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/register-vendor', async (req, res) => {
  try {
    const payload = req.body;
    const vendor = await Vendor.create(payload);
    clearCache();
    return res.json({ success: true, user: vendor, token: `jwt_mongo_${vendor._id}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Vendor Profile & Business Management
app.get('/api/vendor/profile', async (req, res) => {
  try {
    const vendor = await findVendor(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    return res.json({ success: true, user: vendor });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/vendor/profile', async (req, res) => {
  try {
    const updates = req.body;
    const vendor = await findVendor(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    Object.assign(vendor, updates);
    await vendor.save();
    clearCache();
    return res.json({ success: true, user: vendor });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/vendor/business', async (req, res) => {
  try {
    const { businessName, vendorType, category, subcategory, address, pinCode, phone, logo } = req.body;
    const vendor = await findVendor(req);

    const newBiz = {
      businessName: businessName || vendorType,
      vendorType,
      category: category || vendorType,
      subcategory: subcategory || 'General',
      address: address || '',
      pinCode: pinCode || '',
      phone: phone || '',
      logo: logo || '',
    };

    const existingIdx = vendor.businesses.findIndex(b => b.businessName === newBiz.businessName && b.vendorType === newBiz.vendorType);
    if (existingIdx === -1) {
      vendor.businesses.push(newBiz);
      await vendor.save();
    }

    const allVendors = await Vendor.find({});
    for (const v of allVendors) {
      if (v.businesses) {
        const idx = v.businesses.findIndex(b => b.businessName === newBiz.businessName && b.vendorType === newBiz.vendorType);
        if (idx === -1) {
          v.businesses.push(newBiz);
          await v.save();
        }
      }
    }

    await Business.create({
      vendorId: vendor._id,
      ...newBiz,
    });

    clearCache();
    const createdBiz = vendor.businesses[vendor.businesses.length - 1];
    return res.json({ success: true, user: vendor, newBusinessId: createdBiz ? createdBiz._id : 'biz_' + Date.now() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/vendor/business/:id', async (req, res) => {
  try {
    const businessId = req.params.id;
    const vendor = await findVendor(req);
    const allVendors = await Vendor.find({});
    for (const v of allVendors) {
      if (v.businesses && v.businesses.length > 0) {
        v.businesses = v.businesses.filter(b => b._id.toString() !== businessId && b.id !== businessId);
        await v.save();
      }
    }
    if (mongoose.Types.ObjectId.isValid(businessId)) {
      await Business.findByIdAndDelete(businessId);
    }
    clearCache();
    return res.json({ success: true, user: vendor });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Vendor Products CRUD
app.get('/api/vendor/products', async (req, res) => {
  try {
    const businessId = req.headers['x-business-id'];
    const vendor = await findVendor(req);
    let filter = {};
    if (businessId) {
      const biz = vendor?.businesses?.find(b => b._id?.toString() === businessId || b.id === businessId);
      if (biz && biz.vendorType) {
        filter = { $or: [{ businessId }, { category: biz.vendorType }, { vendorType: biz.vendorType }] };
      } else {
        filter = { $or: [{ businessId }, { vendorId: vendor._id }] };
      }
    } else if (vendor) {
      filter = { $or: [{ vendorId: vendor._id }, { vendor_id: vendor.id }] };
    }
    let products = await Product.find(filter).sort({ createdAt: -1 });
    if (!products || products.length === 0) {
      products = await Product.find({}).sort({ createdAt: -1 });
    }
    return res.json({ success: true, data: fixProductImageUrls(products, req) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/vendor/products', async (req, res) => {
  try {
    const vendor = await findVendor(req);
    const businessId = req.headers['x-business-id'];
    const payload = req.body;
    const cat = payload.category || payload.vendorType || 'Products';
    const prodId = 'prod_' + Date.now();
    const product = await Product.create({
      ...payload,
      id: prodId,
      category: cat,
      vendorType: cat,
      subCategory: payload.subCategory || payload.subcategory || 'General',
      subcategory: payload.subCategory || payload.subcategory || 'General',
      vendorId: vendor ? vendor._id : undefined,
      businessId: businessId || payload.businessId,
      image: payload.imageUrl || payload.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80',
      imageUrl: payload.imageUrl || payload.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80',
    });
    clearCache();
    io.emit('product_catalog_updated', product);
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/vendor/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findByIdAndUpdate(id, updates, { new: true });
    }
    if (!product) {
      product = await Product.findOneAndUpdate({ id }, updates, { new: true });
    }
    clearCache();
    io.emit('product_catalog_updated', product);
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/vendor/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Product.findByIdAndDelete(id);
    }
    await Product.deleteOne({ id });
    clearCache();
    io.emit('product_catalog_updated', { id, deleted: true });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Vendor Customers
app.get('/api/vendor/customers', async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, data: customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Vendor Orders & Real-time Live Status Updates
app.get('/api/vendor/orders', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/vendor/orders', async (req, res) => {
  try {
    const vendor = await findVendor(req);
    const orderId = 'ORD-' + Date.now();
    const order = await Order.create({
      id: orderId,
      order_number: orderId,
      ...req.body,
      vendorId: vendor ? vendor._id : undefined,
    });
    clearCache();
    io.emit('new_vendor_order', order);
    io.emit('order_status_updated', { orderId: order.id, status: order.status });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// Vendor Analytics
app.get('/api/vendor/analytics', async (req, res) => {
  try {
    const ordersCount = await Order.countDocuments({});
    const itemsCount = await Product.countDocuments({});
    const activeMembershipsCount = await User.countDocuments({ membership: { $in: ['silver', 'gold', 'diamond'] } });
    const deliveredOrders = await Order.find({ status: { $in: ['Delivered', 'Completed'] } });
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.finalAmount || o.amount || 0), 0);
    return res.json({
      success: true,
      data: {
        totalOrdersCount: ordersCount,
        totalRevenue,
        totalItemsCount: itemsCount,
        activeMembershipsCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Unified Customer APIs used by Vendor app ecosystem
app.post('/api/customer/auth/register', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    let customer = await Customer.findOne({ $or: [{ email }, { phone }] });
    if (!customer) {
      customer = await Customer.create({ name, email, phone, address, ordersCount: 0, totalSpent: 0 });
    }
    return res.json({ success: true, user: customer, token: `jwt_customer_${customer._id}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/customer/auth/login', async (req, res) => {
  try {
    const { email, phone } = req.body;
    let customer = null;
    if (email) customer = await Customer.findOne({ email });
    if (!customer && phone) customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found. Please register first.' });
    }
    return res.json({ success: true, user: customer, token: `jwt_customer_${customer._id}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customer/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && category !== 'All') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: fixProductImageUrls(products, req) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customer/businesses', async (req, res) => {
  try {
    const vendors = await Vendor.find({});
    let allBusinesses = [];
    vendors.forEach(v => {
      if (v.businesses && v.businesses.length > 0) {
        allBusinesses.push(...v.businesses);
      }
    });
    return res.json({ success: true, data: allBusinesses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/customer/orders', async (req, res) => {
  try {
    const { memberName, customerPhone, customerAddress, items, finalAmount, type, businessId, vendorId } = req.body;
    const orderId = 'ORD-' + Date.now();
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer && customerPhone) {
      customer = await Customer.create({ name: memberName || 'Customer', phone: customerPhone, address: customerAddress });
    }

    const order = await Order.create({
      id: orderId,
      order_number: orderId,
      memberName: memberName || '',
      customer_name: memberName || '',
      customerPhone: customerPhone || '',
      customer_phone: customerPhone || '',
      customerAddress: customerAddress || '',
      customer_address: customerAddress || '',
      items: items || [],
      finalAmount: finalAmount || 0,
      amount: finalAmount || 0,
      type: type || 'Order',
      order_type: (type || 'Order').toLowerCase(),
      status: 'Pending',
      businessId: businessId || undefined,
      vendorId: vendorId || undefined,
      ...req.body,
    });

    if (customer) {
      customer.ordersCount = (customer.ordersCount || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + (finalAmount || 0);
      await customer.save();
    }

    clearCache();
    io.emit('new_vendor_order', order);
    io.emit('order_status_updated', { orderId: order.id, status: order.status });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customer/orders', async (req, res) => {
  try {
    const { phone, email } = req.query;
    let filter = {};
    if (phone) filter.$or = [{ customerPhone: phone }, { customer_phone: phone }];
    if (email) filter.candidateEmail = email;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customer/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ $or: [{ id: orderId }, { order_number: orderId }] });
    }
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// INVOICE PDF GENERATION (PDFKit)
// ==========================================
const PDFDocument = require('pdfkit');

function generateInvoicePdfBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const orderNum = order.order_number || order.id || order._id || 'CONNECT-001';
      const orderDate = order.created_at || order.createdAt
        ? new Date(order.created_at || order.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const seller = order.vendor_name || order.brand_or_seller || order.provider_name || 'Connect Authorized Merchant';
      const customer = order.customer_name || 'Valued Customer';
      const phone = order.customer_phone || order.customerPhone || 'N/A';
      const address = order.customer_address || order.delivery_address || order.address || 'Customer Delivery Location';
      const paymentMethod = order.payment_method || order.paymentMethod || 'Online UPI / Card';
      const status = (order.status || 'CONFIRMED').toUpperCase();

      // 1. Top Header Navy Banner
      doc.rect(40, 40, 515, 60).fill('#0B132B');
      doc.fontSize(22).fillColor('#F5B800').text('CONNECT', 55, 52, { continued: true });
      doc.fontSize(12).fillColor('#94A3B8').text('  TAX INVOICE & RECEIPT');
      doc.fontSize(9).fillColor('#CBD5E1').text('Official Tax Document & Order Summary', 55, 78);

      // Status Pill on top right
      doc.roundedRect(440, 55, 95, 24, 6).fill('#10B981');
      doc.fontSize(10).fillColor('#FFFFFF').text(status, 440, 62, { width: 95, align: 'center' });

      // 2. Invoice & Customer Details Box
      const infoBoxTop = 115;
      doc.roundedRect(40, infoBoxTop, 515, 80, 6).strokeColor('#E2E8F0').lineWidth(1).stroke();

      doc.fontSize(8).fillColor('#64748B').text('INVOICE DETAILS', 55, infoBoxTop + 10);
      doc.fontSize(10).fillColor('#0F172A').text('Order ID: #' + orderNum, 55, infoBoxTop + 24);
      doc.fontSize(9).fillColor('#475569').text('Date: ' + orderDate, 55, infoBoxTop + 40);
      doc.text('Payment: ' + paymentMethod + ' (PAID)', 55, infoBoxTop + 54);

      doc.fontSize(8).fillColor('#64748B').text('BILLED & DELIVERED TO', 310, infoBoxTop + 10);
      doc.fontSize(10).fillColor('#0F172A').text(customer, 310, infoBoxTop + 24);
      doc.fontSize(9).fillColor('#475569').text('Phone: ' + phone, 310, infoBoxTop + 40);
      doc.text(address.length > 40 ? address.substring(0, 38) + '...' : address, 310, infoBoxTop + 54);

      // 3. Seller banner
      const sellerTop = 205;
      doc.roundedRect(40, sellerTop, 515, 28, 4).fill('#F8FAFC');
      doc.fontSize(9).fillColor('#64748B').text('Seller / Merchant: ', 55, sellerTop + 8, { continued: true });
      doc.fontSize(9).fillColor('#0F172A').text(seller);

      const isBus =
        String(order.category || '').toLowerCase().includes('travel') ||
        String(order.category || '').toLowerCase().includes('bus') ||
        Boolean(order.boarding_point || order.allocated_seat || order.seat || order.bus_name);

      let allocatedSeat = '';
      if (order.allocated_seat && !String(order.allocated_seat).toLowerCase().includes('pending') && !String(order.allocated_seat).toLowerCase().includes('awaiting')) {
        allocatedSeat = String(order.allocated_seat).trim();
      } else if (order.seat && !String(order.seat).toLowerCase().includes('pending') && !String(order.seat).toLowerCase().includes('awaiting')) {
        allocatedSeat = String(order.seat).trim();
      } else if (Array.isArray(order.travelers) && order.travelers[0]?.seat) {
        const s = String(order.travelers[0].seat).trim();
        if (!s.toLowerCase().includes('pending') && !s.toLowerCase().includes('awaiting')) {
          allocatedSeat = s;
        }
      }

      const isSeatAllocated = Boolean(allocatedSeat);
      let tableTop = 245;

      if (isBus) {
        const busTop = 242;
        doc.roundedRect(40, busTop, 515, 34, 4).fill(isSeatAllocated ? '#F0FDF4' : '#FFFBEB');
        doc.roundedRect(40, busTop, 515, 34, 4).strokeColor(isSeatAllocated ? '#86EFAC' : '#FDE68A').lineWidth(1).stroke();
        
        doc.fontSize(9).fillColor(isSeatAllocated ? '#15803D' : '#B45309').text('BUS E-TICKET: ' + (order.bus_name || 'Intercity Bus'), 55, busTop + 7);
        doc.fontSize(8.5).fillColor('#475569').text('Route: ' + (order.boarding_point || 'Boarding') + ' -> ' + (order.dropping_point || 'Dropping'), 55, busTop + 20);

        const seatStatusText = isSeatAllocated ? `SEAT CONFIRMED: ${allocatedSeat}` : 'SEAT: PENDING OPERATOR ALLOCATION';
        doc.fontSize(9).fillColor(isSeatAllocated ? '#15803D' : '#D97706').text(seatStatusText, 300, busTop + 11, { width: 240, align: 'right' });
        tableTop = busTop + 44;
      }

      // 4. Table Header
      doc.rect(40, tableTop, 515, 24).fill('#F1F5F9');
      doc.fontSize(9).fillColor('#475569');
      doc.text('ITEM DESCRIPTION', 55, tableTop + 7, { width: 260 });
      doc.text('QTY', 320, tableTop + 7, { width: 40, align: 'center' });
      doc.text('PRICE', 370, tableTop + 7, { width: 75, align: 'right' });
      doc.text('TOTAL', 455, tableTop + 7, { width: 85, align: 'right' });

      // 5. Parse and draw items
      let curY = tableTop + 24;
      let items = [];
      if (Array.isArray(order.items) && order.items.length > 0) {
        items = order.items.map((it) => ({
          name: it.title || it.name || 'Product Item',
          qty: it.quantity || 1,
          price: it.price || 0,
          total: (it.quantity || 1) * (it.price || 0),
        }));
      } else if (typeof order.product_details === 'string') {
        const parts = order.product_details.split(',').map((s) => s.trim()).filter(Boolean);
        items = parts.map((part) => {
          let qty = 1;
          let name = part;
          const qMatch = part.match(/\(x(\d+)\)/i) || part.match(/^(\d+)\s*x\s+/i);
          if (qMatch) {
            qty = parseInt(qMatch[1], 10) || 1;
            name = part.replace(/\(x\d+\)/i, '').replace(/^\d+\s*x\s+/i, '').trim();
          }
          return {
            name,
            qty,
            price: Math.round((order.amount || 100) / parts.length / qty),
            total: Math.round((order.amount || 100) / parts.length),
          };
        });
      }
      if (items.length === 0) {
        items = [{
          name: 'Order Items (' + (order.category || 'Goods') + ')',
          qty: 1,
          price: order.amount || 0,
          total: order.amount || 0,
        }];
      }

      items.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.rect(40, curY, 515, 22).fill('#FBFBFC');
        }
        doc.fontSize(9).fillColor('#0F172A').text(item.name.substring(0, 45), 55, curY + 6, { width: 260 });
        doc.fontSize(9).fillColor('#475569').text(String(item.qty), 320, curY + 6, { width: 40, align: 'center' });
        doc.text('Rs. ' + (item.price || 0).toLocaleString('en-IN'), 370, curY + 6, { width: 75, align: 'right' });
        doc.fontSize(9).fillColor('#0F172A').text('Rs. ' + (item.total || 0).toLocaleString('en-IN'), 455, curY + 6, { width: 85, align: 'right' });

        doc.moveTo(40, curY + 22).lineTo(555, curY + 22).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        curY += 22;
      });

      // 6. Summary Rows
      curY += 15;
      const subtotal = items.reduce((s, i) => s + i.total, 0) || (order.amount || 0);
      const deliveryFee = order.delivery_fee || 0;
      const grandTotal = order.amount || subtotal + deliveryFee;

      doc.fontSize(9).fillColor('#64748B').text('Subtotal:', 340, curY, { width: 100, align: 'right' });
      doc.fillColor('#0F172A').text('Rs. ' + subtotal.toLocaleString('en-IN'), 455, curY, { width: 85, align: 'right' });
      curY += 16;

      if (deliveryFee > 0) {
        doc.fontSize(9).fillColor('#64748B').text('Delivery Fee:', 340, curY, { width: 100, align: 'right' });
        doc.fillColor('#0F172A').text('Rs. ' + deliveryFee.toLocaleString('en-IN'), 455, curY, { width: 85, align: 'right' });
        curY += 16;
      }

      // Total Paid Pill
      doc.rect(330, curY, 225, 28).fill('#0B132B');
      doc.fontSize(11).fillColor('#F5B800').text('TOTAL PAID:', 340, curY + 8);
      doc.fontSize(12).fillColor('#FFFFFF').text('Rs. ' + grandTotal.toLocaleString('en-IN'), 445, curY + 7, { width: 95, align: 'right' });

      // 7. Footer
      doc.fontSize(8).fillColor('#94A3B8').text(
        'Thank you for ordering with Connect App! For support or queries, contact support@connectapp.in',
        40,
        730,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Generate Invoice PDF - POST with order body
app.post('/api/orders/generate-invoice-pdf', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order) {
      return res.status(400).json({ success: false, message: 'Order data is required' });
    }
    const pdfBuffer = await generateInvoicePdfBuffer(order);
    const base64 = pdfBuffer.toString('base64');
    return res.json({ success: true, base64 });
  } catch (err) {
    console.error('[InvoicePDF Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Download Invoice PDF directly via GET
app.get('/api/orders/:id/invoice-pdf', async (req, res) => {
  try {
    const orderId = req.params.id;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ $or: [{ id: orderId }, { order_number: orderId }] });
    }
    if (!order) {
      return res.status(404).send('Order not found');
    }
    const pdfBuffer = await generateInvoicePdfBuffer(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${order.order_number || order._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[InvoicePDF GET Error]', err);
    return res.status(500).send('Error generating invoice PDF');
  }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 8001;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Connect Backend] Server running on http://0.0.0.0:${PORT} connected to MongoDB Atlas! 🚀`);
  });
});
