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
  vendorId?: string;
  vendor_id?: string;
  productId?: string;
  vehicleNumber?: string;
  vehicleRegNo?: string;
  busNumber?: string;
  bookingDate?: string;
  bookingTime?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  bookingType?: string;
  serviceTimingName?: string;
  configurationDetails?: string;
}

export function isCartableCategory(category?: string, name?: string): boolean {
  const cat = (category || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  const combined = `${cat} ${n}`;

  // Jobs are application-only and not purchase items in cart
  if (
    combined.includes('job') ||
    combined.includes('employment') ||
    combined.includes('internship') ||
    combined.includes('vacancy')
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
  clearCart: (remote?: boolean | any) => void;
  syncFromServer: (serverCart: any[]) => void;
}

let cartSyncTimer: any = null;
let isRemoteCartUpdating = false;

function scheduleCartSyncToServer(cart: CartItem[]) {
  if (isRemoteCartUpdating) return;
  if (cartSyncTimer) clearTimeout(cartSyncTimer);
  cartSyncTimer = setTimeout(async () => {
    try {
      const authModule = require('./authStore');
      const curUser = authModule.useAuthStore.getState().currentUser;
      if (!curUser || curUser.isGuest) return;
      // Always prioritize canonical customerId or registrationId, falling back to non-synthesized id
      let uId = curUser.customerId || curUser.registrationId;
      if (!uId && curUser.id && !curUser.id.startsWith('customer_')) {
        uId = curUser.id;
      }
      if (!uId) {
        uId = curUser.id;
      }
      if (!uId) return;
      const { apiFetch } = require('../services/api');
      const payloadCart = cart.map(item => ({
        ...item,
        price: typeof item.price === 'string' 
          ? (parseFloat(item.price.replace(/[^\d.]/g, '')) || 0)
          : Number(item.price || 0),
        displayPrice: typeof item.price === 'string' && item.price.startsWith('₹') ? item.price : `₹${item.price}`,
      }));
      await apiFetch('/auth/customer-profile', {
        method: 'PUT',
        body: { userId: uId, customerId: uId, cart: payloadCart },
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
              i.id === item.id
                ? {
                    ...i,
                    quantity: i.quantity + qtyToAdd,
                    bookingDate: item.bookingDate || i.bookingDate,
                    bookingTime: item.bookingTime || i.bookingTime,
                    checkInDate: item.checkInDate || i.checkInDate,
                    checkInTime: item.checkInTime || i.checkInTime,
                    checkOutDate: item.checkOutDate || i.checkOutDate,
                    checkOutTime: item.checkOutTime || i.checkOutTime,
                    configurationDetails: item.configurationDetails || i.configurationDetails,
                    vehicleNumber: item.vehicleNumber || i.vehicleNumber,
                    vehicleRegNo: item.vehicleRegNo || i.vehicleRegNo,
                    busNumber: item.busNumber || i.busNumber,
                    bookingType: item.bookingType || i.bookingType,
                    serviceTimingName: item.serviceTimingName || i.serviceTimingName,
                    vendorId: item.vendorId || (item as any).vendor_id || i.vendorId || (i as any).vendor_id,
                    vendor_id: item.vendorId || (item as any).vendor_id || i.vendor_id || (i as any).vendorId,
                    productId: item.productId || item.id || i.productId || i.id,
                  }
                : i
            );
          } else {
            newItems = [
              ...state.cartItems,
              {
                id: item.id,
                productId: item.productId || item.id,
                vendorId: item.vendorId || (item as any).vendor_id || '',
                vendor_id: item.vendorId || (item as any).vendor_id || '',
                name: item.name || 'Item',
                price: item.price || '₹0',
                originalPrice: item.originalPrice,
                mrp: item.mrp,
                category: item.category || 'General',
                quantity: qtyToAdd,
                image: item.image,
                variant: item.variant,
                seller: item.seller,
                vehicleNumber: item.vehicleNumber,
                vehicleRegNo: item.vehicleRegNo,
                busNumber: item.busNumber,
                bookingDate: item.bookingDate,
                bookingTime: item.bookingTime,
                checkInDate: item.checkInDate,
                checkInTime: item.checkInTime,
                checkOutDate: item.checkOutDate,
                checkOutTime: item.checkOutTime,
                bookingType: item.bookingType,
                serviceTimingName: item.serviceTimingName,
                configurationDetails: item.configurationDetails,
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
      clearCart: (remote = true) => {
        if (remote !== false) {
          scheduleCartSyncToServer([]);
        }
        set({ cartItems: [] });
      },
      syncFromServer: (serverCart: any[]) => {
        if (!Array.isArray(serverCart)) return;
        isRemoteCartUpdating = true;
        let catalog: any[] = [];
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useProductStore } = require('./productStore');
          catalog = useProductStore.getState().products || [];
        } catch {}
        const catalogMap = new Map(catalog.map((p) => [String(p.id || p._id), p]));

        const valid: CartItem[] = [];
        for (const i of serverCart) {
          if (!i || !i.id) continue;
          const strId = String(i.id);
          const catProd = catalogMap.get(strId);
          const catName = i.category || catProd?.category || catProd?.mainCategory || 'Products';
          const itemName = i.name || catProd?.name || catProd?.title || 'Item';
          if (!isCartableCategory(catName, itemName)) continue;

          let formattedPrice = i.displayPrice !== undefined ? i.displayPrice : i.price;
          if (formattedPrice === undefined && catProd?.price !== undefined) {
            formattedPrice = catProd.price;
          }
          if (typeof formattedPrice === 'number') {
            formattedPrice = `₹${formattedPrice}`;
          } else if (typeof formattedPrice === 'string' && !formattedPrice.startsWith('₹') && /^\d/.test(formattedPrice)) {
            formattedPrice = `₹${formattedPrice}`;
          }

          valid.push({
            id: strId,
            name: itemName,
            price: formattedPrice || '₹0',
            category: catName,
            quantity: typeof i.quantity === 'number' && i.quantity > 0 ? i.quantity : 1,
            image: i.image || catProd?.image || catProd?.imageUrl || (Array.isArray(catProd?.images) ? catProd.images[0]?.url : undefined),
            variant: i.variant,
            seller: i.seller || catProd?.vendorName || catProd?.vendor,
            bookingDate: i.bookingDate,
            bookingTime: i.bookingTime,
            checkInDate: i.checkInDate,
            checkInTime: i.checkInTime,
            checkOutDate: i.checkOutDate,
            checkOutTime: i.checkOutTime,
            bookingType: i.bookingType,
            serviceTimingName: i.serviceTimingName,
            configurationDetails: i.configurationDetails,
          });
        }
        set({ cartItems: valid });
        setTimeout(() => {
          isRemoteCartUpdating = false;
        }, 300);
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

