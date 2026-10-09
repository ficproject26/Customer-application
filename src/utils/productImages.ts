/**
 * Utility to resolve accurate, high-resolution product and service images based on name, subcategory, or category.
 */

export function getRelevantProductImage(name?: string, subcategory?: string, category?: string): string {
  const n = (name || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const combined = `${n} ${sub} ${cat}`;

  // Biscuits & Cookies
  if (combined.includes('biscuit') || combined.includes('cookie')) {
    return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80';
  }
  // Potato Chips & Snacks
  if (combined.includes('chip') || combined.includes('wafer') || combined.includes('crisps') || combined.includes('potato chips')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80';
  }
  // Fruit Juices
  if (combined.includes('juice')) {
    return 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=80';
  }
  // Coffee
  if (combined.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80';
  }
  // Tea
  if (combined.includes('tea')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80';
  }
  // Namkeen & Bhujia
  if (combined.includes('namkeen') || combined.includes('bhujia') || combined.includes('snack')) {
    return 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&auto=format&fit=crop&q=80';
  }
  // Tomato
  if (combined.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80';
  }
  // Potato
  if (combined.includes('potato') && !combined.includes('chip')) {
    return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80';
  }
  // Onion
  if (combined.includes('onion')) {
    return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80';
  }
  // Banana
  if (combined.includes('banana')) {
    return 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80';
  }
  // Apple
  if (combined.includes('apple') && !combined.includes('iphone') && !combined.includes('macbook')) {
    return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80';
  }
  // Carrot
  if (combined.includes('carrot')) {
    return 'https://images.unsplash.com/photo-1598170845058-12f6a672c878?w=500&auto=format&fit=crop&q=80';
  }
  // Spinach
  if (combined.includes('spinach')) {
    return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=80';
  }
  // Lemon
  if (combined.includes('lemon')) {
    return 'https://images.unsplash.com/photo-1534531141161-bc8b3767f401?w=500&auto=format&fit=crop&q=80';
  }
  // Cucumber
  if (combined.includes('cucumber')) {
    return 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500&auto=format&fit=crop&q=80';
  }
  // Mango
  if (combined.includes('mango')) {
    return 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop&q=80';
  }
  // Atta / Wheat / Flour
  if (combined.includes('atta') || combined.includes('wheat') || combined.includes('flour') || combined.includes('maida') || combined.includes('rava')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80';
  }
  // Rice / Poha
  if (combined.includes('rice') || combined.includes('poha') || combined.includes('basmati')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80';
  }
  // Dal / Pulses
  if (combined.includes('dal') || combined.includes('pulse') || combined.includes('toor')) {
    return 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop&q=80';
  }
  // Sugar / Salt
  if (combined.includes('sugar') || combined.includes('salt')) {
    return 'https://images.unsplash.com/photo-1581447109200-bf2769116351?w=500&auto=format&fit=crop&q=80';
  }
  // Milk
  if (combined.includes('milk')) {
    return 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80';
  }
  // Curd / Yogurt
  if (combined.includes('curd') || combined.includes('yogurt')) {
    return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80';
  }
  // Paneer / Cheese
  if (combined.includes('paneer') || combined.includes('cheese')) {
    return 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&auto=format&fit=crop&q=80';
  }
  // Bread
  if (combined.includes('bread')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80';
  }
  // Eggs
  if (combined.includes('egg') || combined.includes('eggs')) {
    return 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&auto=format&fit=crop&q=80';
  }
  // Butter & Ghee
  if (combined.includes('butter') || combined.includes('ghee')) {
    return 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80';
  }
  // Oil
  if (combined.includes('oil')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80';
  }
  // Masala / Spices
  if (combined.includes('masala') || combined.includes('turmeric') || combined.includes('chilli')) {
    return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80';
  }
  // Household / Cleaner / Detergent
  if (combined.includes('detergent') || combined.includes('dishwash') || combined.includes('floor cleaner') || combined.includes('garbage')) {
    return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80';
  }
  // Personal Care / Shampoo / Soap
  if (combined.includes('shampoo') || combined.includes('soap') || combined.includes('toothpaste') || combined.includes('face wash') || combined.includes('lotion')) {
    return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80';
  }

  // Fast Food / Cafes
  if (combined.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('fries') || combined.includes('french fries')) {
    return 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('dosa') || combined.includes('idli')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('biryani')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80';
  }

  // Electronics
  if (combined.includes('headphone') || combined.includes('earbud') || combined.includes('earphone')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('laptop') || combined.includes('macbook') || combined.includes('computer')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('phone') || combined.includes('mobile') || combined.includes('iphone')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('watch') || combined.includes('smartwatch')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('camera')) {
    return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('speaker')) {
    return 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('tv') || combined.includes('television')) {
    return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('gaming') || combined.includes('console')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=80';
  }

  // Fashion
  if (combined.includes('t-shirt') || combined.includes('shirt')) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('dress') || combined.includes('ethnic')) {
    return 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('shoe') || combined.includes('sneaker')) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('handbag') || combined.includes('bag')) {
    return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('jeans')) {
    return 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80';
  }

  // Furniture & Home
  if (combined.includes('sofa')) {
    return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('table') || combined.includes('dining')) {
    return 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('bed')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('cookware') || combined.includes('kitchen')) {
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=80';
  }

  // Services
  if (combined.includes('electrician') || combined.includes('electric')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('plumber') || combined.includes('plumbing')) {
    return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('ac service') || combined.includes('ac repair')) {
    return 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('home cleaning') || combined.includes('deep cleaning') || combined.includes('housekeeping')) {
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('salon') || combined.includes('spa') || combined.includes('beauty')) {
    return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80';
  }

  // Category level fallbacks
  if (cat.includes('daily needs') || sub.includes('snack') || sub.includes('beverage') || sub.includes('grocery') || sub.includes('fruit') || sub.includes('dairy')) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('food') || sub.includes('restaurant') || sub.includes('cafe')) {
    return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('product') || cat.includes('electronics') || sub.includes('electronic')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('fashion') || sub.includes('fashion')) {
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('job') || sub.includes('employment')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('stay') || sub.includes('hotel') || sub.includes('resort')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=80';
  }
  if (combined.includes('travel') || combined.includes('flight') || /\bbus\b/i.test(combined) || /\bcab\b/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=80';
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
}
