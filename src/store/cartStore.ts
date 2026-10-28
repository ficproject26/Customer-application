import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  originalPrice?: number | string;
  mrp?: number | string;
  category: string;
  quantity: number;
  image?: string;
  variant?: string;
  seller?: string;
  vehicleNumber?: string;
  vehicleRegNo?: string;
  busNumber?: string;
}

export function isCartableCategory(category?: string, name?: string): boolean {
  const cat = (category || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  const combined = `${cat} ${n}`;

  if (
    combined.includes('service') ||
    combined.includes('travel') ||
    combined.includes('flight') ||
    /\bcab\b/i.test(combined) ||
    /\bbus\b/i.test(combined) ||
    combined.includes('train') ||
    combined.includes('tour') ||
    combined.includes('stay') ||
    combined.includes('hotel') ||
    combined.includes('resort') ||
    combined.includes('villa') ||
    combined.includes('job') ||
    combined.includes('employment') ||
    combined.includes('rental')
  ) {
    return false;
  }
  return true;
}

interface CartState {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  setCartItems: (items: CartItem[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  syncFromServer: (serverCart: any[]) => void;
}

let cartSyncTimer: any = null;
function scheduleCartSyncToServer(cart: CartItem[]) {
  if (cartSyncTimer) clearTimeout(cartSyncTimer);
  cartSyncTimer = setTimeout(async () => {
    try {
      const authModule = require('./authStore');
      const curUser = authModule.useAuthStore.getState().currentUser;
      if (!curUser || curUser.isGuest) return;
      const uId = curUser.id || curUser.customerId;
      if (!uId) return;
      const { apiFetch } = require('../services/api');
      await apiFetch('/auth/customer-profile', {
        method: 'PUT',
        body: { userId: uId, cart },
      });
    } catch (e) {
      console.warn('[CartStore] Failed to sync cart to backend:', e);
    }
  }, 400);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],
      addToCart: (item) =>
        set((state) => {
          if (!isCartableCategory(item.category, item.name)) {
            console.log(`[CartStore] Non-cartable item (${item.category}: ${item.name}) cannot be added to cart.`);
            return state;
          }

          const existing = state.cartItems.find((i) => i.id === item.id);
          const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
          let newItems: CartItem[];
          if (existing) {
            newItems = state.cartItems.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
            );
          } else {
            newItems = [
              ...state.cartItems,
              {
                id: item.id,
                name: item.name || 'Item',
                price: item.price || '₹0',
                category: item.category || 'General',
                quantity: qtyToAdd,
                image: item.image,
                variant: item.variant,
                seller: item.seller,
              },
            ];
          }
          scheduleCartSyncToServer(newItems);
          return { cartItems: newItems };
        }),
      setCartItems: (items) => {
        const filtered = items.filter((i) => isCartableCategory(i.category, i.name));
        scheduleCartSyncToServer(filtered);
        set({ cartItems: filtered });
      },
      updateQuantity: (id, quantity) =>
        set((state) => {
          let newItems: CartItem[];
          if (quantity <= 0) {
            newItems = state.cartItems.filter((i) => i.id !== id);
          } else {
            newItems = state.cartItems.map((i) =>
              i.id === id ? { ...i, quantity } : i
            );
          }
          scheduleCartSyncToServer(newItems);
          return { cartItems: newItems };
        }),
      removeFromCart: (id) =>
        set((state) => {
          const newItems = state.cartItems.filter((i) => i.id !== id);
          scheduleCartSyncToServer(newItems);
          return { cartItems: newItems };
        }),
      clearCart: () => {
        scheduleCartSyncToServer([]);
        set({ cartItems: [] });
      },
      syncFromServer: (serverCart: any[]) => {
        if (!Array.isArray(serverCart)) return;
        const valid = serverCart.filter((i) => i && i.id && isCartableCategory(i.category, i.name));
        set({ cartItems: valid });
      },
    }),
    {
      name: 'connect_app_cart_storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.cartItems)) {
          // Purge any non-cartable items (Services, Travel, Stay, Jobs) on load
          state.cartItems = state.cartItems.filter((i) => isCartableCategory(i.category, i.name));
        }
      },
    }
  )
);

