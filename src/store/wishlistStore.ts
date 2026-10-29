import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistItem {
  id: string;
  name: string;
  price: string;
  category: string;
  image?: string;
  spec?: string;
}

interface WishlistState {
  wishlistItems: WishlistItem[];
  toggleWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: (remote?: boolean | any) => void;
  syncFromServer: (serverFavorites: any[]) => void;
}

let wishlistSyncTimer: any = null;
let isRemoteWishlistUpdating = false;

function scheduleWishlistSyncToServer(items: WishlistItem[]) {
  if (isRemoteWishlistUpdating) return;
  if (wishlistSyncTimer) clearTimeout(wishlistSyncTimer);
  wishlistSyncTimer = setTimeout(async () => {
    try {
      if (isRemoteWishlistUpdating) return;
      const authModule = require('./authStore');
      const curUser = authModule.useAuthStore.getState().currentUser;
      if (!curUser || curUser.isGuest) return;
      let uId = curUser.customerId || curUser.registrationId;
      if (!uId && curUser.id && !curUser.id.startsWith('customer_')) {
        uId = curUser.id;
      }
      if (!uId) {
        uId = curUser.id;
      }
      if (!uId) return;
      const { apiFetch } = require('../services/api');
      const favorites = items.map((i) => i.id).filter(Boolean);
      await apiFetch('/auth/customer-profile', {
        method: 'PUT',
        body: { userId: uId, favorites },
      });
    } catch (e) {
      console.warn('[WishlistStore] Failed to sync favorites to backend:', e);
    }
  }, 400);
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      wishlistItems: [],
      toggleWishlist: (item) =>
        set((state) => {
          const exists = state.wishlistItems.some((i) => i.id === item.id);
          let newItems: WishlistItem[];
          if (exists) {
            newItems = state.wishlistItems.filter((i) => i.id !== item.id);
          } else {
            newItems = [...state.wishlistItems, item];
          }
          scheduleWishlistSyncToServer(newItems);
          return { wishlistItems: newItems };
        }),
      removeFromWishlist: (id) =>
        set((state) => {
          const newItems = state.wishlistItems.filter((i) => i.id !== id);
          scheduleWishlistSyncToServer(newItems);
          return { wishlistItems: newItems };
        }),
      clearWishlist: (remote = true) => {
        if (remote !== false) {
          scheduleWishlistSyncToServer([]);
        }
        set({ wishlistItems: [] });
      },
      syncFromServer: (serverFavorites: any[]) => {
        if (!Array.isArray(serverFavorites)) return;
        isRemoteWishlistUpdating = true;
        let catalog: any[] = [];
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useProductStore } = require('./productStore');
          catalog = useProductStore.getState().products || [];
          if (catalog.length === 0) {
            useProductStore.getState().loadProducts?.().catch?.(() => {});
          }
        } catch {}
        set((state) => {
          const currentMap = new Map(state.wishlistItems.map((i) => [i.id, i]));
          const catalogMap = new Map(catalog.map((p) => [String(p.id || p._id), p]));
          const merged: WishlistItem[] = [];
          const seen = new Set<string>();

          for (const fav of serverFavorites) {
            if (!fav) continue;
            const favId = typeof fav === 'string' ? fav : String(fav.id || fav._id || '');
            if (!favId || seen.has(favId)) continue;
            seen.add(favId);

            const existing = currentMap.get(favId);
            if (existing && existing.name !== 'Saved Item') {
              merged.push(existing);
            } else {
              const catProd = catalogMap.get(favId);
              if (catProd) {
                merged.push({
                  id: favId,
                  name: catProd.name || catProd.title || 'Saved Product',
                  price: catProd.price ? (String(catProd.price).startsWith('₹') ? String(catProd.price) : `₹${catProd.price}`) : '₹0',
                  category: catProd.category || catProd.mainCategory || 'Products',
                  image: catProd.image || catProd.imageUrl || (Array.isArray(catProd.images) ? catProd.images[0]?.url : undefined),
                  spec: catProd.spec || catProd.unit || '',
                });
              } else if (typeof fav === 'object' && fav.name) {
                merged.push({
                  id: favId,
                  name: fav.name,
                  price: fav.price || '₹0',
                  category: fav.category || 'Products',
                  image: fav.image,
                  spec: fav.spec,
                });
              } else if (existing) {
                merged.push(existing);
              } else {
                merged.push({ id: favId, name: 'Saved Item', price: '₹0', category: 'Products' });
              }
            }
          }
          return { wishlistItems: merged };
        });
        setTimeout(() => {
          isRemoteWishlistUpdating = false;
        }, 400);
      },
    }),
    {
      name: 'connect_app_wishlist_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

