const mongoose = require('./backend/node_modules/mongoose') || require('mongoose');
require('dotenv').config({ path: './.env' });

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./backend/models/Product');
  const all = await Product.find({});
  let fixed = 0;
  for (const p of all) {
    const needsFix = (p.image && p.image.startsWith('file://')) || (p.imageUrl && p.imageUrl.startsWith('file://'));
    if (needsFix) {
      console.log('Fixing:', p.name, '|', (p.image || '').substring(0, 60));
      p.image = FALLBACK;
      p.imageUrl = FALLBACK;
      await p.save();
      fixed++;
    }
  }
  console.log('Fixed', fixed, 'products with broken file:// image URLs.');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
