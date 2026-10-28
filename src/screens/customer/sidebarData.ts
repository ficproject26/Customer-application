import {
  INITIAL_HIERARCHY,
  CategoryHierarchyMap,
  SUBCATEGORY_FALLBACK_IMAGES,
  normalizeMainCategoryName,
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
  Services: 'Wrench',
  'Daily Needs': 'Milk',
  Food: 'Utensils',
  Stay: 'Bed',
  Travel: 'Plane',
  Jobs: 'Briefcase',
};

export function buildSidebarData(hierarchy: CategoryHierarchyMap): SidebarDataType {
  const data: SidebarDataType = {};

  const CANONICAL_MAINS = ['Products', 'Services', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];

  // Initialize canonical keys with empty subcategories
  CANONICAL_MAINS.forEach((mainName) => {
    data[mainName] = {
      icon: ICON_MAP[mainName] || 'LayoutGrid',
      subcategories: {},
    };
  });

  if (!hierarchy || typeof hierarchy !== 'object') {
    return data;
  }

  Object.entries(hierarchy).forEach(([mainNameRaw, mainObj]) => {
    const mainName = normalizeMainCategoryName(mainNameRaw);
    if (!data[mainName]) {
      data[mainName] = {
        icon: ICON_MAP[mainName] || 'LayoutGrid',
        subcategories: {},
      };
    }

    const subRecord = data[mainName].subcategories;
    if (mainObj && Array.isArray(mainObj.subcategories)) {
      mainObj.subcategories.forEach((sub) => {
        if (!sub || !sub.name || !sub.name.trim()) return;
        const subName = sub.name.trim();
        const itemNames = Array.isArray(sub.children)
          ? sub.children.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean)
          : [];
        subRecord[subName] = {
          id: sub.id,
          name: subName,
          icon: sub.icon || '',
          banner: sub.banner || SUBCATEGORY_FALLBACK_IMAGES[subName] || '',
          items: itemNames,
        };
      });
    }
  });

  return data;
}

// Authoritative taxonomy initialized from backend schema
export const SIDEBAR_DATA: SidebarDataType = buildSidebarData(INITIAL_HIERARCHY);

export function updateSidebarData(hierarchy: CategoryHierarchyMap): void {
  const fresh = buildSidebarData(hierarchy);
  // Clear obsolete keys
  Object.keys(SIDEBAR_DATA).forEach((k) => {
    delete SIDEBAR_DATA[k];
  });
  Object.assign(SIDEBAR_DATA, fresh);
}
