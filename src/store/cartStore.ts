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
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cartItems: [],
      addToCart: (item) =>
        set((state) => {
          if (!isCartableCategory(item.category, item.name)) {
            console.log(`[CartStore] Non-cartable item (${item.category}: ${item.name}) cannot be added to cart.`);
            return state;
          }

          const existing = state.cartItems.find((i) => i.id === item.id);
          const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
          if (existing) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
              ),
            };
          }
          return {
            cartItems: [
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
            ],
          };
        }),
      setCartItems: (items) =>
        set({
          cartItems: items.filter((i) => isCartableCategory(i.category, i.name)),
        }),
      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cartItems: state.cartItems.filter((i) => i.id !== id) };
          }
          return {
            cartItems: state.cartItems.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          };
        }),
      removeFromCart: (id) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.id !== id),
        })),
      clearCart: () => set({ cartItems: [] }),
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
