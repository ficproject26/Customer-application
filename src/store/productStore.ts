import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { useBannerStore } from './bannerStore';
import {
  CategoryHierarchyMap,
  INITIAL_HIERARCHY,
  buildCategoryHierarchy,
} from '../services/categoryService';

export interface ProductStoreState {
  products: any[];
  categoryHierarchy: CategoryHierarchyMap;
  lastProductsFetched: number;
  lastHierarchyFetched: number;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoadedInitial: boolean;
  error: string | null;

  loadProducts: (force?: boolean) => Promise<any[]>;
  loadCategoryHierarchy: (force?: boolean) => Promise<CategoryHierarchyMap>;
  loadAllCatalogData: (force?: boolean) => Promise<void>;
  setProducts: (products: any[]) => void;
  clearProductCache: () => void;
}

const PRODUCTS_CACHE_TTL = 60 * 1000; // 60 seconds freshness window
const HIERARCHY_CACHE_TTL = 300 * 1000; // 5 minutes freshness window

// In-flight deduplication promises to avoid parallel identical queries
let inFlightProductFetch: Promise<any[]> | null = null;
let inFlightHierarchyFetch: Promise<CategoryHierarchyMap> | null = null;

export const useProductStore = create<ProductStoreState>()(
  persist(
    (set, get) => ({
      products: [],
      categoryHierarchy: INITIAL_HIERARCHY,
      lastProductsFetched: 0,
      lastHierarchyFetched: 0,
      isLoading: false,
      isRefreshing: false,
      hasLoadedInitial: false,
      error: null,

      loadProducts: async (force = false) => {
        const state = get();
        const now = Date.now();

        // If fresh and not forced, return cached products instantly (0ms UI wait)
        if (!force && state.products.length > 0 && now - state.lastProductsFetched < PRODUCTS_CACHE_TTL) {
          return state.products;
        }

        if (inFlightProductFetch) {
          return inFlightProductFetch;
        }

        // Cold load (zero cached products) -> show skeleton
        // Background refresh -> keep existing cached data visible without blocking UI
        if (state.products.length === 0) {
          set({ isLoading: true, error: null });
        } else {
          set({ isRefreshing: true, error: null });
        }

        inFlightProductFetch = (async () => {
          try {
            const res: any = await apiFetch('/products');
            let productList: any[] = [];

            if (res) {
              if (Array.isArray(res.data) && res.data.length > 0) productList = res.data;
              else if (Array.isArray(res.products) && res.products.length > 0) productList = res.products;
              else if (Array.isArray(res.items) && res.items.length > 0) productList = res.items;
              else if (Array.isArray(res) && res.length > 0) productList = res;
            }

            if (productList.length > 0) {
              set({
                products: productList,
                lastProductsFetched: Date.now(),
                hasLoadedInitial: true,
                isLoading: false,
                isRefreshing: false,
                error: null,
              });
              return productList;
            } else {
              set({
                hasLoadedInitial: true,
                isLoading: false,
                isRefreshing: false,
              });
              return get().products;
            }
          } catch (err: any) {
            console.warn('[ProductStore] Failed to load products:', err);
            set({
              hasLoadedInitial: true,
              isLoading: false,
              isRefreshing: false,
              error: err?.message || 'Failed to fetch products',
            });
            return get().products;
          } finally {
            inFlightProductFetch = null;
          }
        })();

        return inFlightProductFetch;
      },

      loadCategoryHierarchy: async (force = false) => {
        const state = get();
        const now = Date.now();

        if (
          !force &&
          state.categoryHierarchy &&
          Object.keys(state.categoryHierarchy).length > 0 &&
          now - state.lastHierarchyFetched < HIERARCHY_CACHE_TTL
        ) {
          return state.categoryHierarchy;
        }

        if (inFlightHierarchyFetch) {
          return inFlightHierarchyFetch;
        }

        inFlightHierarchyFetch = (async () => {
          try {
            // Concurrent fetch of categories and products
            const [rawRes, realProducts] = await Promise.all([
              apiFetch('/categories').catch(() => null),
              get().loadProducts(false).catch(() => get().products),
            ]);

            let rawCategories: any[] = [];
            if (rawRes) {
              if (Array.isArray(rawRes.data)) rawCategories = rawRes.data;
              else if (Array.isArray(rawRes.categories)) rawCategories = rawRes.categories;
              else if (Array.isArray(rawRes.items)) rawCategories = rawRes.items;
              else if (Array.isArray(rawRes)) rawCategories = rawRes;
            }

            const hierarchy = buildCategoryHierarchy(rawCategories, realProducts || []);
            set({
              categoryHierarchy: hierarchy,
              lastHierarchyFetched: Date.now(),
            });
            return hierarchy;
          } catch (err) {
            console.warn('[ProductStore] Failed to load hierarchy:', err);
            return get().categoryHierarchy || INITIAL_HIERARCHY;
          } finally {
            inFlightHierarchyFetch = null;
          }
        })();

        return inFlightHierarchyFetch;
      },

      loadAllCatalogData: async (force = false) => {
        await Promise.allSettled([
          get().loadProducts(force),
          get().loadCategoryHierarchy(force),
          useBannerStore.getState().loadBanners(),
        ]);
      },

      setProducts: (products: any[]) => {
        set({ products, hasLoadedInitial: true, lastProductsFetched: Date.now() });
      },

      clearProductCache: () => {
        set({
          products: [],
          categoryHierarchy: INITIAL_HIERARCHY,
          lastProductsFetched: 0,
          lastHierarchyFetched: 0,
          hasLoadedInitial: false,
        });
      },
    }),
    {
      name: 'connect_products_cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        products: state.products,
        categoryHierarchy: state.categoryHierarchy,
        lastProductsFetched: state.lastProductsFetched,
        lastHierarchyFetched: state.lastHierarchyFetched,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          useProductStore.setState({ hasLoadedInitial: true });
        } else {
          useProductStore.setState({ hasLoadedInitial: true });
        }
      },
    }
  )
);

// Pre-warm catalog data in background on module load (0ms main thread blocking)
setTimeout(() => {
  useProductStore.getState().loadAllCatalogData(false).catch(() => {});
}, 50);

