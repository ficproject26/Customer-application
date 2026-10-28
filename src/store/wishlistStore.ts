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
  clearWishlist: () => void;
  syncFromServer: (serverFavorites: any[]) => void;
}

let wishlistSyncTimer: any = null;
function scheduleWishlistSyncToServer(items: WishlistItem[]) {
  if (wishlistSyncTimer) clearTimeout(wishlistSyncTimer);
  wishlistSyncTimer = setTimeout(async () => {
    try {
      const authModule = require('./authStore');
      const curUser = authModule.useAuthStore.getState().currentUser;
      if (!curUser || curUser.isGuest) return;
      const uId = curUser.id || curUser.customerId;
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
      clearWishlist: () => {
        scheduleWishlistSyncToServer([]);
        set({ wishlistItems: [] });
      },
      syncFromServer: (serverFavorites: any[]) => {
        if (!Array.isArray(serverFavorites)) return;
        set((state) => {
          const currentMap = new Map(state.wishlistItems.map((i) => [i.id, i]));
          const merged: WishlistItem[] = [];
          for (const fav of serverFavorites) {
            if (!fav) continue;
            if (typeof fav === 'string') {
              const existing = currentMap.get(fav);
              if (existing) merged.push(existing);
              else merged.push({ id: fav, name: 'Saved Item', price: '₹0', category: 'General' });
            } else if (fav.id) {
              merged.push(fav);
            }
          }
          return { wishlistItems: merged };
        });
      },
    }),
    {
      name: 'connect_app_wishlist_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

