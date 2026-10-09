import { apiFetch, resolveImageUrl } from './api';

export interface ChildCategoryItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  banner?: string;
}

export interface SubCategoryItem {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  children: ChildCategoryItem[];
  itemCount?: number;
}

export interface MainCategoryHierarchy {
  id: string;
  name: string;
  subcategories: SubCategoryItem[];
}

export type CategoryHierarchyMap = Record<string, MainCategoryHierarchy>;

// Fallback high-quality curated images for subcategories when no banner or product image exists
export const SUBCATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  // Products
  Electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
  Dress: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=80',
  // Services
  'IT & Device Support': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80',
  'Ac Service': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
  // Daily Needs
  Snacks: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
  'Personal care': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
  // Food
  'North indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80',
  'Fried Items': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80',
  'South Indian': 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&auto=format&fit=crop&q=80',
  Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
  Biriyani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
  // Stay
  Hotels: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&auto=format&fit=crop&q=80',
  Resorts: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&auto=format&fit=crop&q=80',
  // Travel
  Bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=80',
  Car: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&auto=format&fit=crop&q=80',
  Bike: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&auto=format&fit=crop&q=80',
  // Jobs
  'IT Domain': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&auto=format&fit=crop&q=80',
  'Non-IT': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&auto=format&fit=crop&q=80',
};

// In-memory cache for fast lookups

export const INITIAL_HIERARCHY: CategoryHierarchyMap = {
  Products: {
    id: '6a8d22c21bc647d92ae36339',
    name: 'Products',
    subcategories: [
      {
        id: 'sub_electronics',
        name: 'Electronics',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_power_bank', name: 'Power Bank' },
          { id: 'ch_laptop', name: 'Laptop' },
          { id: 'ch_tablets', name: 'Tablets' },
          { id: 'ch_smartphones', name: 'Smartphones' },
          { id: 'ch_smartwatches', name: 'Smartwatches' },
          { id: 'ch_headphones', name: 'Bluetooth Headphones' },
          { id: 'ch_headset', name: 'Headset' },
        ],
      },
      {
        id: 'sub_dress',
        name: 'Dress',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_mens', name: 'Mens' },
          { id: 'ch_womens', name: 'Womens Dress' },
          { id: 'ch_childrens', name: "Children's Dress" },
        ],
      },
    ],
  },
  Services: {
    id: '6a8d22c21bc647d92ae36338',
    name: 'Services',
    subcategories: [
      {
        id: 'sub_it_support',
        name: 'IT & Device Support',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_laptop_rep', name: 'Laptop Repairs' },
          { id: 'ch_pc_rep', name: 'PC Repairs' },
          { id: 'ch_wifi_setup', name: 'Wifi & Network setup' },
          { id: 'ch_watch_rep', name: 'Smart Watches Repair' },
          { id: 'ch_smart_watch', name: 'Smart Watches' },
          { id: 'ch_cctv', name: 'CCTV installation' },
        ],
      },
      {
        id: 'sub_ac_service',
        name: 'Ac Service',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_full_clean', name: 'Full clean' },
        ],
      },
    ],
  },
  'Daily Needs': {
    id: '6a8d22c21bc647d92ae3633a',
    name: 'Daily Needs',
    subcategories: [
      {
        id: 'sub_snacks',
        name: 'Snacks',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_chips', name: 'Chips' },
        ],
      },
      {
        id: 'sub_personal_care',
        name: 'Personal care',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_shampoo', name: 'Shampoo' },
        ],
      },
    ],
  },
  Food: {
    id: '6a8d22c31bc647d92ae3633b',
    name: 'Food',
    subcategories: [
      {
        id: 'sub_biriyani',
        name: 'Biriyani',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_chicken_biriyani', name: 'Chicken Biriyani' },
          { id: 'ch_mutton_biriyani', name: 'Mutton Biriyani' },
          { id: 'ch_veg_biriyani', name: 'Veg Biriyani' },
          { id: 'ch_paneer_biriyani', name: 'Paneer Biryani' },
        ],
      },
      {
        id: 'sub_north_indian',
        name: 'North indian',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_dal_makhani', name: 'Dal Makhani' },
          { id: 'ch_butter_chicken', name: 'Butter Chicken' },
          { id: 'ch_paneer_butter', name: 'Paneer Butter Masala' },
          { id: 'ch_naan', name: 'Naan' },
        ],
      },
      {
        id: 'sub_fried_items',
        name: 'Fried Items',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_chicken_rice', name: 'chicken Rice' },
          { id: 'ch_egg_rice', name: 'Egg rice' },
        ],
      },
      {
        id: 'sub_south_indian',
        name: 'South Indian',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_meals', name: 'Meals' },
          { id: 'ch_pongal', name: 'Pongal' },
          { id: 'ch_idly', name: 'idly' },
        ],
      },
      {
        id: 'sub_bakery',
        name: 'Bakery',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_cake', name: 'Cake' },
          { id: 'ch_cookies', name: 'Cookies' },
        ],
      },
    ],
  },
  Stay: {
    id: '6a8d22c31bc647d92ae3633c',
    name: 'Stay',
    subcategories: [
      {
        id: 'sub_hotels',
        name: 'Hotels',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_luxury', name: 'Luxury' },
          { id: 'ch_budget', name: 'Budget' },
        ],
      },
      {
        id: 'sub_resorts',
        name: 'Resorts',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_hill_station', name: 'Hill Station' },
          { id: 'ch_beach', name: 'Beach' },
        ],
      },
    ],
  },
  Travel: {
    id: '6a8d22c31bc647d92ae3633d',
    name: 'Travel',
    subcategories: [
      {
        id: 'sub_bus',
        name: 'Bus',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_non_ac_bus', name: 'Non AC bus' },
          { id: 'ch_ac_bus', name: 'Ac bus' },
        ],
      },
      {
        id: 'sub_car',
        name: 'Car',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_ac_car', name: 'AC Car' },
          { id: 'ch_non_ac_car', name: 'Non AC Car' },
        ],
      },
      {
        id: 'sub_bike',
        name: 'Bike',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_mini_superbikes', name: 'Mini Superbikes' },
        ],
      },
    ],
  },
  Jobs: {
    id: '6a8d22c31bc647d92ae3633e',
    name: 'Jobs',
    subcategories: [
      {
        id: 'sub_it_domain',
        name: 'IT Domain',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&auto=format&fit=crop&q=80',
        children: [
          { id: 'ch_full_stack', name: 'Full Stack' },
          { id: 'ch_ui_ux', name: 'UI/UX Designer' },
          { id: 'ch_frontend', name: 'Frontend Developer' },
          { id: 'ch_backend', name: 'Backend Developer' },
          { id: 'ch_software', name: 'Software Developer' },
        ],
      },
      {
        id: 'sub_non_it',
        name: 'Non-IT',
        icon: '',
        banner: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&auto=format&fit=crop&q=80',
        children: [],
      },
    ],
  },
};

let cachedHierarchy: CategoryHierarchyMap = INITIAL_HIERARCHY;
let cachedProducts: any[] | null = null;

export function getCachedHierarchy(): CategoryHierarchyMap {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useProductStore } = require('../store/productStore');
    const storeHier = useProductStore.getState().categoryHierarchy;
    if (storeHier && Object.keys(storeHier).length > 0) {
      return storeHier;
    }
  } catch {}
  return cachedHierarchy || INITIAL_HIERARCHY;
}


/**
 * Standardize category names (e.g., 'Product' -> 'Products', 'Job' -> 'Jobs')
 */
export function normalizeMainCategoryName(name: string): string {
  const clean = String(name || '').trim().toLowerCase();
  if (clean === 'product' || clean === 'products') return 'Products';
  if (clean === 'service' || clean === 'services') return 'Services';
  if (clean === 'daily need' || clean === 'daily needs') return 'Daily Needs';
  if (clean === 'food' || clean === 'foods') return 'Food';
  if (clean === 'stay' || clean === 'stays' || clean === 'hotel' || clean === 'hotels') return 'Stay';
  if (clean === 'travel' || clean === 'travels') return 'Travel';
  if (clean === 'job' || clean === 'jobs' || clean === 'career' || clean === 'careers') return 'Jobs';
  return name;
}

/**
 * Fetch and construct the authoritative Category Hierarchy from the backend
 */
/**
 * Fetch and construct the authoritative Category Hierarchy from the backend
 */
export function buildCategoryHierarchy(rawCategories: any[], realProducts: any[]): CategoryHierarchyMap {
  const mainCategoryOrder = ['Products', 'Services', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
  const hierarchy: CategoryHierarchyMap = {};

  mainCategoryOrder.forEach((mainName) => {
    // Find the main root record in the API response
    const root = rawCategories.find(
      (c) =>
        normalizeMainCategoryName(c.name) === mainName &&
        (c.level === 'main' || !c.parentId)
    );

    // Group subcategories by unique subcategory name
    const subMap = new Map<string, { id: string; name: string; icon?: string; banner?: string; children: Map<string, ChildCategoryItem> }>();

    // 1. Process Admin Category Management nested tree from /api/categories
    if (root && Array.isArray(root.children)) {
      root.children.forEach((sub: any) => {
        const subName = (sub.subcategory || sub.name || '').trim();
        if (!subName || sub.isDeleted) return;

        if (!subMap.has(subName)) {
          subMap.set(subName, {
            id: sub._id || `sub_${subName.toLowerCase().replace(/\s+/g, '_')}`,
            name: subName,
            icon: sub.icon || '',
            banner: sub.banner || '',
            children: new Map(),
          });
        }

        const subEntry = subMap.get(subName)!;
        if (sub.icon && !subEntry.icon) subEntry.icon = sub.icon;
        if (sub.banner && !subEntry.banner) subEntry.banner = sub.banner;

        if (Array.isArray(sub.children)) {
          sub.children.forEach((child: any) => {
            const childName = (child.subSubcategory || child.name || '').trim();
            if (!childName || child.isDeleted) return;

            if (!subEntry.children.has(childName)) {
              subEntry.children.set(childName, {
                id: child._id || `child_${childName.toLowerCase().replace(/\s+/g, '_')}`,
                name: childName,
                description: child.description,
                icon: child.icon,
                banner: child.banner,
              });
            }
          });
        }
      });
    }

    // Also check if any categories in rawCategories have parentId === root._id
    if (root && root._id) {
      rawCategories
        .filter((c) => c.parentId === root._id && c.level === 'sub')
        .forEach((sub: any) => {
          const subName = (sub.subcategory || sub.name || '').trim();
          if (!subName || sub.isDeleted) return;

          if (!subMap.has(subName)) {
            subMap.set(subName, {
              id: sub._id,
              name: subName,
              icon: sub.icon || '',
              banner: sub.banner || '',
              children: new Map(),
            });
          }

          const subEntry = subMap.get(subName)!;
          if (Array.isArray(sub.children)) {
            sub.children.forEach((child: any) => {
              const childName = (child.subSubcategory || child.name || '').trim();
              if (!childName || child.isDeleted) return;
              if (!subEntry.children.has(childName)) {
                subEntry.children.set(childName, {
                  id: child._id,
                  name: childName,
                  description: child.description,
                  icon: child.icon,
                  banner: child.banner,
                });
              }
            });
          }
        });
    }

    // 2. Incorporate any products configured by Admin/Vendors for this main category
    if (Array.isArray(realProducts)) {
      realProducts.forEach((p: any) => {
        if (p.isActive === false || p.isDeleted === true) return;

        const pMain = normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory || '');
        if (pMain !== mainName) return;

        const pSub = (p.category || '').trim();
        const pChild = (p.subcategory || p.subCategory || '').trim();

        if (pSub) {
          if (!subMap.has(pSub)) {
            subMap.set(pSub, {
              id: `sub_${pSub.toLowerCase().replace(/\s+/g, '_')}`,
              name: pSub,
              icon: p.icon || '',
              banner: p.banner || p.image || '',
              children: new Map(),
            });
          }

          const subEntry = subMap.get(pSub)!;
          if (pChild && !subEntry.children.has(pChild)) {
            subEntry.children.set(pChild, {
              id: `child_${pChild.toLowerCase().replace(/\s+/g, '_')}`,
              name: pChild,
            });
          }
        }
      });
    }

    hierarchy[mainName] = {
      id: root ? root._id : `main_${mainName.toLowerCase()}`,
      name: mainName,
      subcategories: Array.from(subMap.values()).map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        banner: s.banner,
        children: Array.from(s.children.values()),
      })),
    };
  });

  return hierarchy;
}

/**
 * Fetch and construct the authoritative Category Hierarchy from the backend
 */
export async function fetchCategoryHierarchy(skipCache = false): Promise<CategoryHierarchyMap> {
  if (cachedHierarchy && !skipCache) {
    return cachedHierarchy;
  }

  try {
    const [rawRes, realProducts] = await Promise.all([
      apiFetch('/categories', { skipCache }).catch(() => null),
      fetchRealProducts(skipCache).catch(() => []),
    ]);

    let rawCategories: any[] = [];
    if (rawRes) {
      if (Array.isArray(rawRes.data)) rawCategories = rawRes.data;
      else if (Array.isArray(rawRes.categories)) rawCategories = rawRes.categories;
      else if (Array.isArray(rawRes.items)) rawCategories = rawRes.items;
      else if (Array.isArray(rawRes)) rawCategories = rawRes;
    }

    const hierarchy = buildCategoryHierarchy(rawCategories, realProducts);
    cachedHierarchy = hierarchy;
    return hierarchy;
  } catch (err) {
    console.error('Failed to fetch category hierarchy:', err);
    return cachedHierarchy || INITIAL_HIERARCHY;
  }
}

export async function fetchRealProducts(skipCache = false): Promise<any[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useProductStore } = require('../store/productStore');
    const storeProds = useProductStore.getState().products;
    if (storeProds && storeProds.length > 0 && !skipCache) {
      return storeProds;
    }
  } catch {}

  if (cachedProducts && !skipCache) {
    return cachedProducts;
  }

  try {
    const res = await apiFetch('/products', { skipCache });
    let productList: any[] = [];

    if (res && Array.isArray(res.data)) productList = res.data;
    else if (res && Array.isArray(res.products)) productList = res.products;
    else if (res && Array.isArray(res.items)) productList = res.items;
    else if (Array.isArray(res)) productList = res;

    if (productList.length > 0) {
      cachedProducts = productList;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useProductStore } = require('../store/productStore');
        useProductStore.getState().setProducts(productList);
      } catch {}
      return productList;
    }

    return cachedProducts || [];
  } catch (err) {
    console.error('Failed to fetch real products:', err);
    return cachedProducts || [];
  }
}

/**
 * Get subcategories for a given Main Category
 */
export function getSubcategoriesForMain(
  hierarchy: CategoryHierarchyMap,
  mainCategoryName: string
): SubCategoryItem[] {
  const normMain = normalizeMainCategoryName(mainCategoryName);
  return hierarchy[normMain]?.subcategories || [];
}

/**
 * Get child categories for a given Main Category and Subcategory
 */
export function getChildCategoriesForSub(
  hierarchy: CategoryHierarchyMap,
  mainCategoryName: string,
  subCategoryName: string
): ChildCategoryItem[] {
  const subs = getSubcategoriesForMain(hierarchy, mainCategoryName);
  const cleanSub = (subCategoryName || '').trim().toLowerCase();
  const matchedSub = subs.find((s) => s.name.trim().toLowerCase() === cleanSub);
  return matchedSub?.children || [];
}

/**
 * Clean string for comparison
 */
function clean(str: any): string {
  return String(str || '').trim().toLowerCase();
}

/**
 * Filter products by hierarchy (Main Category -> Subcategory -> Child Category)
 */
export function filterProductsByHierarchy(
  products: any[],
  opts: {
    mainCategory?: string;
    subCategory?: string;
    childCategory?: string;
    searchQuery?: string;
  }
): any[] {
  const { mainCategory, subCategory, childCategory, searchQuery } = opts;
  const targetMain = mainCategory ? normalizeMainCategoryName(mainCategory) : '';
  const cleanSub = clean(subCategory);
  const cleanChild = clean(childCategory);
  const query = clean(searchQuery);

  return products.filter((p) => {
    // 1. Exclude inactive or deleted items
    if (p.isActive === false || p.isDeleted === true) return false;

    // 2. Main Category matching
    if (targetMain && targetMain !== 'All') {
      const pMain = normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory || '');
      if (clean(pMain) !== clean(targetMain)) return false;
    }

    // 3. Subcategory matching (p.category in MongoDB is the subcategory!)
    if (cleanSub && cleanSub !== 'all') {
      const pSub = clean(p.category || p.subcategory || '');
      if (pSub !== cleanSub && !pSub.includes(cleanSub) && !cleanSub.includes(pSub)) return false;
    }

    // 4. Child Category matching (p.subcategory in MongoDB is the child category!)
    if (cleanChild && cleanChild !== 'all') {
      const pChild = clean(p.subcategory || p.childCategory || p.itemType || '');
      if (pChild !== cleanChild && !pChild.includes(cleanChild) && !cleanChild.includes(pChild)) {
        // Also check product name for child category keyword
        const pName = clean(p.name);
        if (!pName.includes(cleanChild)) return false;
      }
    }

    // 5. Search query matching
    if (query) {
      const name = clean(p.name);
      const desc = clean(p.description || p.detail);
      const brand = clean(p.brand);
      const sub = clean(p.category);
      const child = clean(p.subcategory);
      const match =
        name.includes(query) ||
        desc.includes(query) ||
        brand.includes(query) ||
        sub.includes(query) ||
        child.includes(query);
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Get Recommended Products across diverse categories (Food, Stay, Daily Needs, Products, etc.)
 * Strictly matching the user's expected card format shown in Image 1.
 */
export function getRecommendedProducts(products: any[]): any[] {
  if (!products || products.length === 0) return [];

  // Filter out invalid items
  const valid = products.filter((p) => p && p.name && (p.isActive !== false));

  // Build a balanced list featuring items from Food, Stay, Daily Needs, Products, Services, Travel
  const desiredOrder = ['Food', 'Stay', 'Daily Needs', 'Products', 'Services', 'Travel'];
  const byCategory: Record<string, any[]> = {};
  
  desiredOrder.forEach((cat) => {
    byCategory[cat] = valid.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === cat);
  });

  const recommended: any[] = [];
  const maxItems = 12;

  // Interleave items across categories
  for (let round = 0; round < 4; round++) {
    desiredOrder.forEach((cat) => {
      if (recommended.length < maxItems && byCategory[cat]?.[round]) {
        recommended.push(byCategory[cat][round]);
      }
    });
  }

  // If still fewer than 8, fill with remaining valid products
  if (recommended.length < 8) {
    valid.forEach((p) => {
      if (recommended.length < maxItems && !recommended.some((r) => (r._id || r.id) === (p._id || p.id))) {
        recommended.push(p);
      }
    });
  }

  return recommended;
}

/**
 * Resolves the primary image URL for a product or category with appropriate fallback
 */
export function getCategoryBannerOrImage(subName: string, productSample?: any): string {
  if (productSample) {
    const raw = productSample.image || productSample.imageUrl || (Array.isArray(productSample.images) && productSample.images[0]?.url);
    if (raw) {
      const resolved = resolveImageUrl(raw);
      if (resolved) return resolved;
    }
  }

  return (
    SUBCATEGORY_FALLBACK_IMAGES[subName] ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80'
  );
}
