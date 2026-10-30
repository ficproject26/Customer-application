import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, clearApiCache } from '../services/api';
import { useCartStore } from './cartStore';
import { useWishlistStore } from './wishlistStore';
import { useActivityStore } from './activityStore';
import { useNotificationStore } from './notificationStore';
import { useOrderStore } from './orderStore';

export function clearSessionAndUserData() {
  try { useCartStore.getState().clearCart(false); } catch {}
  try { useWishlistStore.getState().clearWishlist(false); } catch {}
  try { useActivityStore.getState().clearActivity(); } catch {}
  try { useNotificationStore.getState().clearAll(); } catch {}
  try { useOrderStore.getState().clearOrders(); } catch {}
  try { clearApiCache(); } catch {}
}

export function isUserAuthenticated(user: User | null): boolean {
  if (!user) return false;
  if (user.isGuest || user.id === 'guest_user' || user.id === 'guest') return false;
  if (user.name && user.name.toLowerCase().includes('guest')) return false;
  return true;
}

export interface UserAddress {
  address: string;
  city: string;
  state: string;
  pincode: string;
  house?: string;
  street?: string;
}

export interface User {
  id: string;
  customerId?: string;
  registrationId?: string;
  name: string;
  email: string;
  role: 'customer' | 'delivery' | 'vendor';
  membership?: 'silver' | 'gold' | 'diamond';
  membershipTier?: string;
  status?: string;
  availability?: boolean;
  phone?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  avatar?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  address?: UserAddress;
  addresses?: any[];
  membershipHistory?: any[];
  walletBalance?: number;
  isGuest?: boolean;
}

interface AuthState {
  currentUser: User | null;
  token: string | null;
  pendingPurchaseProduct: any | null;
  isOnboarded: boolean;
  setOnboarded: (val: boolean) => void;
  setPendingPurchaseProduct: (product: any | null) => void;
  setSession: (user: User, token?: string | null) => void;
  login: (email: string, role: User['role'], callback?: (user: User) => void) => void;
  loginGuest: (callback?: (user: User) => void) => void;
  logout: () => void;
  register: (
    formData: {
      name: string;
      email: string;
      phone?: string;
      gender?: 'Male' | 'Female' | 'Other';
      businessName?: string;
      address?: { house?: string; street?: string; city?: string; state?: string; pincode?: string };
    },
    role: User['role'],
    callback?: (user: User) => void
  ) => void;
  updateUserStatus: (status: string, availability?: boolean) => void;
  updateMembership: (tier: 'silver' | 'gold' | 'diamond') => void;
  addWalletBalance: (amount: number) => void;
  deductWalletBalance: (amount: number) => boolean;
  getWalletBalance: () => number;
  fetchProfile: () => Promise<User | null>;
  updateProfile: (fields: Partial<User>) => Promise<User | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      pendingPurchaseProduct: null,
      isOnboarded: true,

  setOnboarded: (val) => set({ isOnboarded: val }),
  setPendingPurchaseProduct: (product) => set({ pendingPurchaseProduct: product }),
  setSession: (user, token) => {
    clearSessionAndUserData();
    if (token) {
      const { setAuthToken } = require('../services/api');
      setAuthToken(token);
    }
    set({ currentUser: user, token: token || null, isOnboarded: true });
    try {
      const socketService = require('../services/socket').default;
      socketService.connect(user.id, user.role || 'customer', token || undefined, user.customerId || user.registrationId);
    } catch {}
    if (user.id && !user.isGuest) {
      setTimeout(() => {
        get().fetchProfile().catch(() => {});
      }, 50);
    }
  },

  login: (identifier, role, callback) => {
    clearSessionAndUserData();
    const isEmail = identifier.includes('@');
    let displayName = isEmail ? identifier.split('@')[0] : identifier;
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    const cleanId = identifier.replace(/[^\w]/g, '').toLowerCase() || 'user';
    const uId = `${role}_${cleanId}`;
    const user: User = {
      id: uId,
      name: displayName || 'Connect Member',
      email: isEmail ? identifier : '',
      phone: !isEmail ? identifier : '',
      role: role,
      membership: undefined,
      walletBalance: 0,
      status: role === 'delivery' ? 'Online' : undefined,
      availability: role === 'delivery' ? true : undefined,
      emailVerified: true,
      phoneVerified: true,
    };

    // Immediate memory-first state update
    set({ currentUser: user, isOnboarded: true });
    if (callback) callback(user);
    if (!user.isGuest) {
      setTimeout(() => {
        get().fetchProfile().catch(() => {});
      }, 50);
    }

    // Non-blocking background check for user-scoped cached overrides
    AsyncStorage.getItem(`connect_user_membership_${uId}`)
      .then((cachedTier) => {
        if (cachedTier && ['silver', 'gold', 'diamond'].includes(cachedTier)) {
          set((s) => s.currentUser && s.currentUser.id === uId ? { currentUser: { ...s.currentUser, membership: cachedTier as any } } : s);
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(`connect_user_wallet_balance_${uId}`)
      .then((balStr) => {
        if (balStr !== null) {
          const bal = parseFloat(balStr);
          if (!isNaN(bal)) {
            set((s) => s.currentUser && s.currentUser.id === uId ? { currentUser: { ...s.currentUser, walletBalance: bal } } : s);
          }
        }
      })
      .catch(() => {});
  },

  loginGuest: (callback) => {
    clearSessionAndUserData();
    const { setAuthToken } = require('../services/api');
    setAuthToken(null);
    set({ currentUser: null, token: null, isOnboarded: true });
    if (callback) callback({ id: 'guest', name: 'Guest', email: '', role: 'customer', isGuest: true });
  },
  logout: () => {
    clearSessionAndUserData();
    const { setAuthToken } = require('../services/api');
    setAuthToken(null);
    set({ currentUser: null, token: null });
    try {
      const socketService = require('../services/socket').default;
      socketService.disconnect();
    } catch {}
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  },
  register: (formData, role, callback) => {
    clearSessionAndUserData();
    let displayName = formData.name;
    if (role === 'vendor') {
      displayName = formData.businessName || formData.name || 'Elite Vendor';
    }

    const uId = role === 'vendor' ? 'v1' : role === 'delivery' ? 'dp1' : `cust_${formData.name.toLowerCase().replace(/\s+/g, '')}_${Date.now().toString().slice(-4)}`;

    const houseStr = formData.address?.house || '';
    const streetStr = formData.address?.street || '';
    const addrStr = streetStr || houseStr
      ? `${houseStr ? houseStr + ', ' : ''}${streetStr}`
      : undefined;

    const user: User = {
      id: uId,
      name: displayName || 'Connect Member',
      email: formData.email,
      phone: formData.phone || '',
      gender: formData.gender,
      role: role,
      membership: undefined,
      walletBalance: 0,
      status: role === 'delivery' ? 'Online' : undefined,
      availability: role === 'delivery' ? true : undefined,
      emailVerified: true,
      phoneVerified: true,
      address: addrStr
        ? {
            address: addrStr,
            house: houseStr,
            street: streetStr,
            city: formData.address?.city || 'Bengaluru',
            state: formData.address?.state || 'Karnataka',
            pincode: formData.address?.pincode || '560034',
          }
        : undefined,
    };

    // Immediate optimistic update
    set({ currentUser: user, isOnboarded: true });
    if (callback) callback(user);

    // Non-blocking background address persistence
    if (formData.address && (formData.address.street || formData.address.house)) {
      const newAddr = {
        id: `addr_${Date.now()}`,
        userId: user.id,
        label: 'Home' as const,
        name: user.name,
        phone: user.phone || '',
        house: houseStr,
        street: streetStr || formData.address?.city || 'Bengaluru',
        city: formData.address?.city || 'Bengaluru',
        state: formData.address?.state || 'Karnataka',
        pincode: formData.address?.pincode || '560034',
        isDefault: true,
      };
      const storageKey = `connect_user_addresses_${user.id}`;
      AsyncStorage.setItem(storageKey, JSON.stringify([newAddr])).catch(() => {});
    }
  },
  updateUserStatus: (status, availability) => set((state) => {
    if (!state.currentUser) return state;
    return {
      currentUser: {
        ...state.currentUser,
        status,
        availability: availability !== undefined ? availability : (status === 'Available')
      }
    };
  }),
  updateMembership: async (tier: 'silver' | 'gold' | 'diamond') => {
    const state = get();
    if (!state.currentUser || !state.currentUser.id) return;
    const isGuest = Boolean(state.currentUser.isGuest || (state.currentUser.name && state.currentUser.name.toLowerCase().includes('guest')));
    const uId = state.currentUser.id;

    // 1. Immediately update store with 0ms UI delay
    const updatedUser = state.currentUser ? { ...state.currentUser, membership: tier, membershipTier: tier } : null;
    set({ currentUser: updatedUser });

    // 2. Non-blocking async persistence and remote sync in background
    const storageKey = isGuest ? 'connect_guest_membership_tier' : `connect_user_membership_${uId}`;
    AsyncStorage.setItem(storageKey, tier).catch(() => {});

    if (!isGuest) {
      apiFetch('/auth/customer-profile', {
        method: 'PUT',
        body: { membership: tier, membershipTier: tier, userId: uId, id: uId },
      })
        .then((response) => {
          if (response && (response.status === 'success' || response.success) && (response.data || response.user)) {
            const profData = response.data || response.user;
            set((s) => s.currentUser && s.currentUser.id === uId ? { currentUser: { ...s.currentUser, ...profData, membership: tier, membershipTier: tier } } : s);
          }
        })
        .catch((err) => {
          console.warn('Background membership update notice:', err);
        });
    }
  },
  addWalletBalance: (amount: number) => {
    set((state) => {
      if (!state.currentUser) return state;
      const isGuest = Boolean(state.currentUser.isGuest || (state.currentUser.name && state.currentUser.name.toLowerCase().includes('guest')));
      const uId = state.currentUser.id;
      const current = state.currentUser.walletBalance ?? 0;
      const updated = current + amount;
      const storageKey = isGuest ? 'connect_guest_wallet_balance' : `connect_user_wallet_balance_${uId}`;
      AsyncStorage.setItem(storageKey, updated.toString()).catch(() => {});
      return {
        currentUser: {
          ...state.currentUser,
          walletBalance: updated,
        },
      };
    });
  },
  deductWalletBalance: (amount: number) => {
    const state = get();
    if (!state.currentUser) return false;
    const isGuest = Boolean(state.currentUser.isGuest || (state.currentUser.name && state.currentUser.name.toLowerCase().includes('guest')));
    const uId = state.currentUser.id;
    const current = state.currentUser.walletBalance ?? 0;
    if (current < amount) return false;
    const updated = current - amount;
    set({
      currentUser: {
        ...state.currentUser,
        walletBalance: updated,
      },
    });
    const storageKey = isGuest ? 'connect_guest_wallet_balance' : `connect_user_wallet_balance_${uId}`;
    AsyncStorage.setItem(storageKey, updated.toString()).catch(() => {});
    return true;
  },
  getWalletBalance: () => {
    const state = get();
    if (!state.currentUser) return 0;
    return state.currentUser?.walletBalance ?? 0;
  },
  fetchProfile: async () => {
    const state = get();
    if (!state.currentUser || !state.currentUser.id) return null;
    const uId = state.currentUser.id;

    try {
      let response: any = await apiFetch(`/auth/customer-profile?userId=${encodeURIComponent(uId)}`, {
        method: 'GET',
        skipCache: true,
      });
      if (!response || response.status === 'error' || response.error || response.code === 'FORBIDDEN_IDOR' || response.status === 403) {
        response = await apiFetch('/auth/customer-profile', { method: 'GET', skipCache: true });
      }

      const membershipRes: any = await apiFetch('/membership/status', { method: 'GET', skipCache: true }).catch(() => null);

      if (response && (response.status === 'success' || response.success) && (response.data || response.user)) {
        const profData = response.data || response.user;

        // Synchronize remote cart without triggering circular outbound sync
        if (Array.isArray(profData.cart)) {
          try {
            useCartStore.getState().syncFromServer(profData.cart);
          } catch {}
        }

        // Synchronize remote favorites / wishlist without triggering circular outbound sync
        if (Array.isArray(profData.favorites)) {
          try {
            useWishlistStore.getState().syncFromServer(profData.favorites);
          } catch {}
        }

        let confirmedTier = profData.membership || state.currentUser?.membership;
        if (membershipRes && membershipRes.success) {
          const rawTier = (membershipRes.membershipTier || '').toLowerCase();
          if (rawTier.includes('diamond')) confirmedTier = 'diamond';
          else if (rawTier.includes('gold')) confirmedTier = 'gold';
          else if (rawTier.includes('silver')) confirmedTier = 'silver';
          else if (rawTier === 'none') confirmedTier = undefined;
        }

        let normalizedAddr = state.currentUser?.address;
        if (typeof profData.address === 'string' && profData.address) {
          normalizedAddr = {
            address: profData.address,
            city: profData.city || state.currentUser?.address?.city || 'Bengaluru',
            state: profData.state || state.currentUser?.address?.state || 'Karnataka',
            pincode: profData.pincode || state.currentUser?.address?.pincode || '',
            house: profData.address,
            street: profData.city || 'Bengaluru',
          };
        } else if (typeof profData.address === 'object' && profData.address) {
          normalizedAddr = {
            ...state.currentUser?.address,
            ...profData.address,
          };
        }

        const mergedUser: User = {
          ...state.currentUser,
          ...profData,
          customerId: profData.customerId || profData.registrationId || state.currentUser?.customerId,
          registrationId: profData.registrationId || profData.customerId || state.currentUser?.registrationId,
          id: profData.id || profData._id || state.currentUser?.id,
          address: normalizedAddr,
          membership: confirmedTier,
          membershipTier: profData.membershipTier || membershipRes?.membershipTier || state.currentUser?.membershipTier,
          membershipHistory: Array.isArray(profData.membershipHistory) ? profData.membershipHistory : (state.currentUser?.membershipHistory || []),
          avatar: profData.avatar || state.currentUser?.avatar || '',
        };
        set({ currentUser: mergedUser });
        if (mergedUser.customerId && (!state.currentUser?.customerId || state.currentUser.customerId !== mergedUser.customerId)) {
          try {
            const socketService = require('../services/socket').default;
            socketService.connect(mergedUser.id, mergedUser.role || 'customer', state.token || undefined, mergedUser.customerId);
          } catch {}
        }
        return mergedUser;
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    }

    return state.currentUser;
  },
  updateProfile: async (fields) => {
    const state = get();
    if (!state.currentUser) return null;
    const updatedUser = { ...state.currentUser, ...fields };
    set({ currentUser: updatedUser });
    const uId = state.currentUser.id || 'guest_user';

    if (fields.avatar !== undefined) {
      AsyncStorage.setItem(`connect_user_avatar_${uId}`, fields.avatar || '').catch(() => {});
    }
    if (fields.membership) {
      AsyncStorage.setItem(`connect_user_membership_${uId}`, fields.membership).catch(() => {});
    }

    apiFetch('/auth/customer-profile', {
      method: 'PUT',
      body: { ...fields, userId: uId, id: uId },
    })
      .then((response) => {
        if (response && (response.status === 'success' || response.success) && (response.data || response.user)) {
          const profData = response.data || response.user;
          const finalUser = {
            ...updatedUser,
            ...profData,
            membership: fields.membership || profData.membership || updatedUser.membership,
            avatar: fields.avatar !== undefined ? fields.avatar : (profData.avatar || updatedUser.avatar),
          };
          set({ currentUser: finalUser });
        }
      })
      .catch((err) => {
        console.warn('Background profile sync notice:', err);
      });

    return updatedUser;
  },
}),
    {
      name: 'connect_app_auth_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ currentUser: state.currentUser, token: state.token, isOnboarded: state.isOnboarded }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          const { setAuthToken } = require('../services/api');
          setAuthToken(state.token);
        }
      },
    }
  )
);
