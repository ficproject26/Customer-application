import {
  INITIAL_HIERARCHY,
  CategoryHierarchyMap,
  SUBCATEGORY_FALLBACK_IMAGES,
} from '../../services/categoryService';

export interface SubCategoryDef {
  id?: string;
  name: string;
  icon?: string;
  banner?: string;
  items: string[];
}

export interface MainCategoryDef {
  icon: string;
  subcategories: Record<string, SubCategoryDef>;
}

export type SidebarDataType = Record<string, MainCategoryDef>;

const ICON_MAP: Record<string, string> = {
  Products: 'ShoppingBag',
  Product: 'ShoppingBag',
  Services: 'Wrench',
  Service: 'Wrench',
  'Daily Needs': 'Milk',
  Food: 'Utensils',
  Stay: 'Bed',
  Travel: 'Plane',
  Jobs: 'Briefcase',
  Job: 'Briefcase',
};

// Vendor App business subcategories to ensure 100% interoperability with vendor-created catalog
const VENDOR_SUPPLEMENT: Record<string, Record<string, string[]>> = {
  Product: {
    Fashion: ['Men Shirts', 'Men T-Shirts', 'Men Jeans', 'Men Footwear', 'Women Sarees', 'Women Kurtis', 'Women Dresses', 'Kids Clothing', 'Footwear'],
    'Beauty & Grooming': ['Skincare', 'Haircare', 'Cosmetics', 'Perfumes', 'Grooming Products', 'Wellness Products'],
    'Home & Kitchen': ['Kitchen Appliances', 'Cookware', 'Storage Containers', 'Dining Sets', 'Home Decor', 'Lighting'],
    'Sports & Fitness': ['Gym Equipment', 'Yoga Accessories', 'Sports Wear', 'Sports Equipment', 'Fitness Trackers'],
    'Books & Stationery': ['Academic Books', 'Story Books', 'Notebooks', 'Office Stationery', 'Art Supplies'],
  },
  Services: {
    'A/C': ['AC Power Jet Service', 'Gas Refill & Leak Fix', 'AC Installation & Uninstallation', 'Compressor Repair', 'AC Filter Cleaning'],
    'Electrical & Plumbing': ['Switch & Socket Repair', 'Fan Repair & Fitting', 'Tap & Mixer Fitting', 'Pipe Leakage Repair', 'Drainage Unblocking'],
    'Cleaning & Pest Control': ['Full Home Deep Cleaning', 'Bathroom Deep Cleaning', 'Cockroach & Ant Control', 'Termite Treatment'],
  },
  'Daily Needs': {
    'Snacks & Beverages': ['Potato Chips', 'Biscuits & Cookies', 'Fruit Juices', 'Instant Coffee', 'Tea Powder', 'Namkeen & Bhujia'],
    'Fruits & Vegetables': ['Fresh Fruits', 'Fresh Vegetables', 'Leafy Greens', 'Organic Produce'],
    'Grocery & Staples': ['Wheat Flour / Atta', 'Basmati Rice', 'Toor Dal & Pulses', 'Sugar & Salt', 'Cooking Oil & Ghee', 'Spices & Masala'],
    'Dairy, Bread & Eggs': ['Fresh Milk', 'Curd & Yogurt', 'Paneer & Tofu', 'Bread & Buns', 'Farm Eggs', 'Butter & Cheese'],
    'Household & Cleaning': ['Detergent Powder', 'Dishwash Gel', 'Floor Cleaner', 'Garbage Bags', 'Air Freshener'],
  },
  Job: {
    IT: ['Software Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Mobile App Developer', 'UI/UX Designer', 'DevOps Engineer', 'Cloud Engineer', 'Data Analyst', 'AI Engineer', 'Cyber Security Analyst'],
    'Non-IT': ['Admin Executive', 'Office Assistant', 'Data Entry Operator', 'Operations Executive', 'Customer Service Executive', 'Receptionist', 'Sales Executive', 'HR Executive', 'Accountant'],
    'Delivery & Field': ['Delivery Executive', 'Warehouse Associate', 'Field Agent', 'Driver'],
  },
};

export function buildSidebarData(hierarchy: CategoryHierarchyMap): SidebarDataType {
  const data: SidebarDataType = {};

  Object.entries(hierarchy).forEach(([mainName, mainObj]) => {
    const subRecord: Record<string, SubCategoryDef> = {};
    if (mainObj && Array.isArray(mainObj.subcategories)) {
      mainObj.subcategories.forEach((sub) => {
        const itemNames = Array.isArray(sub.children) ? sub.children.map((c) => c.name) : [];
        subRecord[sub.name] = {
          id: sub.id,
          name: sub.name,
          icon: sub.icon || '',
          banner: sub.banner || SUBCATEGORY_FALLBACK_IMAGES[sub.name] || '',
          items: itemNames,
        };
      });
    }

    // Merge vendor supplement for matched main category
    const supKey = mainName === 'Products' ? 'Product' : mainName === 'Jobs' ? 'Job' : mainName;
    if (VENDOR_SUPPLEMENT[supKey]) {
      Object.entries(VENDOR_SUPPLEMENT[supKey]).forEach(([subName, items]) => {
        if (!subRecord[subName]) {
          subRecord[subName] = {
            name: subName,
            icon: '',
            banner: SUBCATEGORY_FALLBACK_IMAGES[subName] || '',
            items,
          };
        }
      });
    }

    const entry: MainCategoryDef = {
      icon: ICON_MAP[mainName] || 'LayoutGrid',
      subcategories: subRecord,
    };

    data[mainName] = entry;
    if (mainName === 'Products') data['Product'] = entry;
    if (mainName === 'Product') data['Products'] = entry;
    if (mainName === 'Jobs') data['Job'] = entry;
    if (mainName === 'Job') data['Jobs'] = entry;
    if (mainName === 'Services') data['Service'] = entry;
  });

  return data;
}

// Authoritative taxonomy initialized from backend schema + vendor catalog
export const SIDEBAR_DATA: SidebarDataType = buildSidebarData(INITIAL_HIERARCHY);

export function updateSidebarData(hierarchy: CategoryHierarchyMap): void {
  const fresh = buildSidebarData(hierarchy);
  Object.assign(SIDEBAR_DATA, fresh);
}
