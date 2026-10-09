import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActivityProduct {
  id: string;
  name: string;
  category?: string;
  image?: string;
  price?: string;
  vendor?: string;
  timestamp: number;
}

interface ActivityState {
  recentSearches: string[];
  recentViews: ActivityProduct[];
  categoryCounts: Record<string, number>;
  viewedVendors: string[];
  recordSearch: (query: string) => void;
  recordProductView: (product: {
    id: string;
    name: string;
    category?: string;
    image?: string;
    price?: string;
    vendor?: string;
  }) => void;
  recordCategoryExplore: (category: string) => void;
  recordVendorView: (vendor: string) => void;
  clearActivity: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      recentSearches: [],
      recentViews: [],
      categoryCounts: {},
      viewedVendors: [],

      recordSearch: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) return;

        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed.toLowerCase()
          );
          return {
            recentSearches: [trimmed, ...filtered].slice(0, 10),
          };
        });
      },

      recordProductView: (product) => {
        if (!product || !product.name) return;

        set((state) => {
          const filteredViews = state.recentViews.filter((item) => item.id !== product.id && item.name !== product.name);
          const newView: ActivityProduct = {
            id: product.id || `view_${Date.now()}`,
            name: product.name,
            category: product.category,
            image: product.image,
            price: product.price,
            vendor: product.vendor,
            timestamp: Date.now(),
          };

          const updatedCounts = { ...state.categoryCounts };
          if (product.category) {
            const cat = product.category.trim();
            updatedCounts[cat] = (updatedCounts[cat] || 0) + 1;
          }

          let updatedVendors = state.viewedVendors;
          if (product.vendor) {
            const v = product.vendor.trim();
            updatedVendors = [v, ...state.viewedVendors.filter((item) => item !== v)].slice(0, 8);
          }

          return {
            recentViews: [newView, ...filteredViews].slice(0, 15),
            categoryCounts: updatedCounts,
            viewedVendors: updatedVendors,
          };
        });
      },

      recordCategoryExplore: (category: string) => {
        if (!category) return;
        const cat = category.trim();
        set((state) => {
          const updatedCounts = { ...state.categoryCounts };
          updatedCounts[cat] = (updatedCounts[cat] || 0) + 1;
          return {
            categoryCounts: updatedCounts,
          };
        });
      },

      recordVendorView: (vendor: string) => {
        if (!vendor) return;
        const v = vendor.trim();
        set((state) => ({
          viewedVendors: [v, ...state.viewedVendors.filter((item) => item !== v)].slice(0, 8),
        }));
      },

      clearActivity: () =>
        set({
          recentSearches: [],
          recentViews: [],
          categoryCounts: {},
          viewedVendors: [],
        }),
    }),
    {
      name: 'connect_app_activity_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

