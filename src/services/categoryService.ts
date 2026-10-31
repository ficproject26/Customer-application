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
    id: 'main_products',
    name: 'Products',
    subcategories: [
      { id: 'sub_electronics', name: 'Electronics', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['Electronics'], children: [{ id: 'ch_air_cooler', name: 'Air Cooler' }, { id: 'ch_tv', name: 'TV' }, { id: 'ch_ceiling_fan', name: 'Ceiling Fan' }] },
      { id: 'sub_furniture', name: 'Furniture', icon: '', banner: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_sofa', name: 'Sofa' }, { id: 'ch_chair', name: 'Chair' }, { id: 'ch_cot', name: 'Cot' }, { id: 'ch_bean_bag', name: 'Bean Bag' }] },
      { id: 'sub_toys', name: 'Toys', icon: '', banner: 'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=400&auto=format&fit=crop&q=80', children: [] },
      { id: 'sub_stationary', name: 'Stationary', icon: '', banner: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80', children: [] },
    ],
  },
  Services: {
    id: 'main_services',
    name: 'Services',
    subcategories: [
      { id: 'sub_plumbers', name: 'Plumbers', icon: '', banner: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_sanitary_plumbers', name: 'Sanitary Plumbers' }, { id: 'ch_water_supply_plumbers', name: 'Water Supply Plumbers' }] },
      { id: 'sub_electrician', name: 'Electrician', icon: '', banner: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_solar_technicians', name: 'Solar Technicians' }, { id: 'ch_lineman', name: 'Lineman' }] },
      { id: 'sub_electronic_services', name: 'Electronic services', icon: '', banner: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&auto=format&fit=crop&q=80', children: [] },
      { id: 'sub_example', name: 'Example', icon: '', banner: '', children: [] },
    ],
  },
  'Daily Needs': {
    id: 'main_daily_needs',
    name: 'Daily Needs',
    subcategories: [
      { id: 'sub_diary', name: 'Diary', icon: '', banner: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_milk', name: 'Milk' }, { id: 'ch_paneer', name: 'Paneer' }, { id: 'ch_curd', name: 'Curd' }, { id: 'ch_butter', name: 'Butter' }] },
      { id: 'sub_groceries', name: 'Groceries', icon: '', banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_toor_dal', name: 'Toor Dal' }, { id: 'ch_urad_dal', name: 'Urad Dal' }, { id: 'ch_chilli_powder', name: 'Chilli Powder' }] },
    ],
  },
  Food: {
    id: 'main_food',
    name: 'Food',
    subcategories: [
      { id: 'sub_south_indian', name: 'South Indian', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['South Indian'], children: [{ id: 'ch_dosa', name: 'Dosa' }, { id: 'ch_idly', name: 'Idly' }, { id: 'ch_south_indian_meals', name: 'South Indian Meals' }] },
      { id: 'sub_north_indian', name: 'North Indian', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['North indian'], children: [{ id: 'ch_naan', name: 'Naan' }, { id: 'ch_dal_makhani', name: 'Dal Makhani' }] },
    ],
  },
  Stay: {
    id: 'main_stay',
    name: 'Stay',
    subcategories: [
      { id: 'sub_viila', name: 'Viila', icon: '', banner: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80', children: [{ id: 'ch_cluster_villas', name: 'Cluster Villas' }, { id: 'ch_standalone_villas', name: 'Standalone Villas' }] },
      { id: 'sub_resort', name: 'Resort', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['Resorts'], children: [{ id: 'ch_beach', name: 'Beach' }, { id: 'ch_island', name: 'Island' }, { id: 'ch_mountain', name: 'Mountain' }] },
    ],
  },
  Travel: {
    id: 'main_travel',
    name: 'Travel',
    subcategories: [
      { id: 'sub_bus', name: 'Bus', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['Bus'], children: [{ id: 'ch_ac_sleeper', name: 'A/C Sleeper' }, { id: 'ch_seater', name: 'Seater' }] },
      { id: 'sub_cab', name: 'Cab', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['Car'], children: [] },
    ],
  },
  Jobs: {
    id: 'main_jobs',
    name: 'Jobs',
    subcategories: [
      { id: 'sub_it', name: 'IT', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['IT Domain'], children: [{ id: 'ch_data_analyst', name: 'Data Analyst' }, { id: 'ch_full_stack_developer', name: 'Full Stack Developer' }] },
      { id: 'sub_non_it', name: 'Non-IT', icon: '', banner: SUBCATEGORY_FALLBACK_IMAGES['Non-IT'], children: [{ id: 'ch_data_associate', name: 'Data Associate' }, { id: 'ch_system_administrator', name: 'System Administrator' }] },
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
export function buildCategoryHierarchy(rawCategories: any[], _realProducts?: any[]): CategoryHierarchyMap {
  const mainCategoryOrder = ['Products', 'Services', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
  const hierarchy: CategoryHierarchyMap = {};

  const normMain = (n: string) => normalizeMainCategoryName(n);

  const flatCats: any[] = [];
  const walk = (c: any) => {
    if (!c || c.isDeleted || c.isActive === false || c.description === 'DELETED_HIERARCHY_MARKER') return;
    flatCats.push(c);
    if (Array.isArray(c.children)) {
      c.children.forEach(walk);
    }
  };
  (Array.isArray(rawCategories) ? rawCategories : []).forEach(walk);

  mainCategoryOrder.forEach((mainName) => {
    const root = (Array.isArray(rawCategories) ? rawCategories : []).find(
      (c) => normMain(c.name) === mainName && (c.level === 'main' || !c.parentId)
    );

    const subMap = new Map<string, { id: string; name: string; icon?: string; banner?: string; children: Map<string, ChildCategoryItem> }>();

    const appendItem = (subNameRaw: string, subId?: string, subIcon?: string, subBanner?: string, childItems: any[] = []) => {
      const subName = String(subNameRaw || '').trim();
      if (!subName || normMain(subName) === mainName || subName === 'ALL_SUBCATEGORIES_DELETED_MARKER') return;

      const existingKey = Array.from(subMap.keys()).find(k => k.toLowerCase() === subName.toLowerCase()) || subName;

      if (!subMap.has(existingKey)) {
        subMap.set(existingKey, {
          id: subId || `sub_${existingKey.toLowerCase().replace(/\s+/g, '_')}`,
          name: existingKey,
          icon: subIcon || '',
          banner: subBanner || SUBCATEGORY_FALLBACK_IMAGES[existingKey] || '',
          children: new Map(),
        });
      }

      const subEntry = subMap.get(existingKey)!;
      if (subIcon && !subEntry.icon) subEntry.icon = subIcon;
      if (subBanner && !subEntry.banner) subEntry.banner = subBanner;

      (Array.isArray(childItems) ? childItems : []).forEach((ch) => {
        if (!ch) return;
        const chName = (typeof ch === 'string' ? ch : ch.subSubcategory || ch.name || ch.title || '').trim();
        if (
          chName &&
          normMain(chName) !== mainName &&
          chName.toLowerCase() !== existingKey.toLowerCase()
        ) {
          const existingChildKey = Array.from(subEntry.children.keys()).find(k => k.toLowerCase() === chName.toLowerCase());
          if (!existingChildKey) {
            subEntry.children.set(chName, {
              id: (typeof ch === 'object' && ch._id) ? String(ch._id) : `child_${chName.toLowerCase().replace(/\s+/g, '_')}`,
              name: chName,
              description: typeof ch === 'object' ? ch.description : undefined,
              icon: typeof ch === 'object' ? ch.icon : undefined,
              banner: typeof ch === 'object' ? ch.banner : undefined,
            });
          }
        }
      });
    };

    // 1. Process nested tree from root record
    if (root && Array.isArray(root.children)) {
      root.children.forEach((sub: any) => {
        if (!sub || sub.isDeleted || sub.isActive === false) return;
        const subName = (sub.subcategory || sub.name || '').trim();
        appendItem(subName, sub._id, sub.icon, sub.banner, sub.children);
      });
    }

    // 2. Also check flat categories attached by parentId
    if (root && root._id) {
      flatCats
        .filter((c) => String(c.parentId) === String(root._id) && (c.level === 'sub' || c.level === 'subcategory'))
        .forEach((sub: any) => {
          const subName = (sub.subcategory || sub.name || '').trim();
          appendItem(subName, sub._id, sub.icon, sub.banner, sub.children);
        });
    }

    // 3. Ingest active products catalog to ensure any vendor-added subcategories appear dynamically
    if (Array.isArray(_realProducts) && _realProducts.length > 0) {
      _realProducts.forEach((p) => {
        if (!p || p.isActive === false || p.isDeleted === true) return;
        const pMain = normMain(p.mainCategory || p.main_category || p.category || '');
        if (pMain === mainName) {
          const pSub = String(p.category || p.subcategory || '').trim();
          const pChild = String(p.subcategory && p.subcategory !== pSub ? p.subcategory : (p.childCategory || '')).trim();
          if (pSub && normMain(pSub) !== mainName) {
            appendItem(pSub, undefined, undefined, undefined, pChild ? [{ name: pChild }] : []);
          }
        }
      });
    }

    hierarchy[mainName] = {
      id: root ? String(root._id) : `main_${mainName.toLowerCase()}`,
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
  if (cachedHierarchy && !skipCache && Object.values(cachedHierarchy).some(m => m.subcategories.length > 0)) {
    return cachedHierarchy;
  }

  try {
    const rawRes = await apiFetch('/api/public/categories', { skipCache })
      .catch(() => apiFetch('/categories', { skipCache }))
      .catch(() => null);

    let rawCategories: any[] = [];
    if (rawRes) {
      if (Array.isArray(rawRes.data)) rawCategories = rawRes.data;
      else if (Array.isArray(rawRes.categories)) rawCategories = rawRes.categories;
      else if (Array.isArray(rawRes.items)) rawCategories = rawRes.items;
      else if (Array.isArray(rawRes)) rawCategories = rawRes;
    }

    const hierarchy = buildCategoryHierarchy(rawCategories);
    cachedHierarchy = hierarchy;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { updateSidebarData } = require('../screens/customer/sidebarData');
      if (typeof updateSidebarData === 'function') {
        updateSidebarData(hierarchy);
      }
    } catch {}
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
