import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';

export type OrderCategory = 'Daily Needs' | 'Food' | 'Products' | 'Services' | 'Stay' | 'Travel' | 'Jobs' | 'Electronics' | 'Fashion' | 'Healthcare';
export type OrderType = 'order' | 'booking';

export interface OrderItemDetail {
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  mrp?: number;
  variant?: string;
  image?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  order_number: string;
  vendor_id: string;
  vendor_name?: string;
  category?: OrderCategory;
  order_type?: OrderType;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude: number;
  customer_longitude: number;
  product_details: string;
  amount: number;
  finalAmount?: number;
  status: string;
  created_at: string;

  // Pricing & Breakdown details
  listing_price?: number;
  original_amount?: number;
  mrp_amount?: number;
  selling_price?: number;
  platform_fee?: number;
  delivery_fee?: number;
  discount?: number;
  coupon_code?: string;
  coupon_discount?: number;
  member_discount?: number;

  // Category-specific extensions
  application_id?: string;
  image?: string;
  brand_or_seller?: string;
  items?: OrderItemDetail[];
  item_count?: number;

  // Service / Healthcare specifics
  provider_name?: string;
  appointment_slot?: string;
  patient_name?: string;
  consultation_type?: string;

  // Travel / Stay specifics
  operator_name?: string;
  vehicle_number?: string;
  vehicleNumber?: string;
  vehicleRegNo?: string;
  busNumber?: string;
  bus_name?: string;
  bus_type?: string;
  boarding_point?: string;
  dropping_point?: string;
  travelers?: any[];
  seat?: string;
  allocated_seat?: string;
  seat_status?: string;
  route?: string;
  travel_date?: string;
  passenger_count?: number;
  hotel_name?: string;
  check_in?: string;
  check_out?: string;
  guests_count?: string;
  room_type?: string;

  // Payment & Delivery metadata
  payment_method?: string;
  payment_status?: 'Paid' | 'Pending' | 'Refunded';
  expected_delivery?: string;
  delivered_at?: string;
  tax?: number;
  rating?: number;
  review_note?: string;
  tracking_updates?: Array<{
    title?: string;
    status?: string;
    message?: string;
    timestamp?: string | Date;
  }>;

  // Job application specifics
  job_id?: string;
  salary?: string;
  location?: string;
  department?: string;
  work_mode?: string;
  experience?: string;
  resume_name?: string;
  applicant_education?: string;
  applicant_experience?: string;
  applicant_email?: string;
  application_status?: string;
  candidateName?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  candidateEducation?: string;
  candidateExperience?: string;
  candidateResume?: string;
  [key: string]: any;
}

export interface Assignment {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
  assigned_at: string;
}

interface OrderState {
  allOrders: Order[];
  activeAssignment: Assignment | null;
  activeOrder: Order | null;
  incomingAssignment: any | null;
  incomingTimer: number;
  earningsLogs: any[];
  todayCompleted: number;
  todayEarnings: number;
  rating: number;

  setIncomingAssignment: (asg: any | null) => void;
  decrementIncomingTimer: () => void;
  addLocalOrder: (order: Order) => void;
  loadAllOrders: (force?: boolean) => Promise<void>;
  loadDashboard: (userId: string) => Promise<void>;
  claimOrder: (orderId: string, partnerId: string) => Promise<boolean>;
  respondToAssignment: (asgId: string, partnerId: string, action: 'accept' | 'reject') => Promise<boolean>;
  stepMilestone: (orderId: string, partnerId: string, step: string, otp?: string, photoProof?: string | null) => Promise<{ success: boolean; message?: string }>;
  cancelCustomerOrder: (orderId: string, reason?: string) => Promise<boolean>;
  rateOrder: (orderId: string, rating: number, review?: string) => Promise<boolean>;
  updateOrderStatusLocally: (orderId: string, newStatus: string, extra?: any) => void;
  updateDeliveryDetails: (
    orderId: string,
    details: {
      customer_address?: string;
      address_label?: string;
      customer_name?: string;
      customer_phone?: string;
    }
  ) => Promise<boolean>;
  clearActive: () => void;
}

let _lastOrderFetchTime = 0;
let _isFetchingOrders = false;


export function normalizeStoredOrderCategory<T extends Partial<Order>>(order: T): T {
  if (!order) return order;
  const currentCat = String(order.category || '').trim();
  if (['Jobs', 'Services', 'Stay', 'Travel', 'Food', 'Daily Needs'].includes(currentCat)) {
    return order;
  }
  const details = (order.product_details || '').toLowerCase();
  const hasDailyNeeds =
    (order.items &&
      order.items.some((it: any) => {
        const n = String(it.name || '').toLowerCase();
        const c = String(it.category || '').toLowerCase();
        return c.includes('daily') || c.includes('grocery') || /\b(milk|lays|curd|bread|eggs?|butter|chips)\b/i.test(n);
      })) ||
    /\b(milk|lays|curd|bread|eggs?|butter|chips)\b/i.test(details);

  if (hasDailyNeeds) {
    return { ...order, category: 'Daily Needs' as OrderCategory };
  }
  return order;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      allOrders: [],
      activeAssignment: null,
      activeOrder: null,
      incomingAssignment: null,
      incomingTimer: 30,
      earningsLogs: [],
      todayCompleted: 0,
      todayEarnings: 0,
      rating: 4.9,

      setIncomingAssignment: (asg) => set({ incomingAssignment: asg, incomingTimer: 30 }),
      decrementIncomingTimer: () => set((state) => ({ incomingTimer: Math.max(0, state.incomingTimer - 1) })),

      addLocalOrder: (order: Order) => {
        let uId = 'guest_user';
        try {
          const authModule = require('./authStore');
          const curUser = authModule.useAuthStore.getState().currentUser;
          if (curUser) {
            uId = curUser.isGuest ? 'guest_user' : curUser.id;
          }
        } catch {}
        const scopedOrder = normalizeStoredOrderCategory({ ...order, user_id: order.user_id || uId });

        set((state) => {
          const current = state.allOrders || [];
          const filtered = current.filter(
            (o) => o.id !== scopedOrder.id && o.order_number !== scopedOrder.order_number
          );
          return { allOrders: [scopedOrder, ...filtered] };
        });
      },

      updateOrderStatusLocally: (orderId: string, newStatus: string, extra?: any) => {
        set((state) => {
          const current = state.allOrders || [];
          const updated = current.map((o) => {
            const matches =
              o.id === orderId ||
              o.order_number === orderId ||
              (o as any)._id === orderId ||
              (extra?.order?.order_number && o.order_number === extra.order.order_number) ||
              (extra?.order?.id && o.id === extra.order.id) ||
              (extra?.order?._id && (o as any)._id === extra.order._id);
            if (matches) {
              const currentUpdates = o.tracking_updates || [];
              const newUpdate = extra?.tracking_update || {
                title: extra?.title || `Order ${newStatus}`,
                status: newStatus,
                message: extra?.message || extra?.description || `Status updated to ${newStatus}`,
                timestamp: new Date().toISOString()
              };
              return {
                ...o,
                ...(extra?.order || {}),
                status: newStatus,
                tracking_updates: [...currentUpdates, newUpdate],
              };
            }
            return o;
          });
          return { allOrders: updated };
        });
      },

      updateDeliveryDetails: async (orderId: string, details: any) => {
        // Optimistically update locally for instantaneous response
        set((state) => {
          const current = state.allOrders || [];
          const updated = current.map((o) => {
            const matches = o.id === orderId || o.order_number === orderId || (o as any)._id === orderId;
            if (matches) {
              return {
                ...o,
                ...details,
                customer_address: details.customer_address || o.customer_address,
                customerAddress: details.customer_address || (o as any).customerAddress,
                address_label: details.address_label || (o as any).address_label,
                customer_name: details.customer_name || o.customer_name,
                memberName: details.customer_name || (o as any).memberName,
                customer_phone: details.customer_phone || o.customer_phone,
                customerPhone: details.customer_phone || (o as any).customerPhone,
                phone: details.customer_phone || (o as any).phone,
              };
            }
            return o;
          });
          return { allOrders: updated };
        });

        // Persist to backend API
        try {
          const res = await apiFetch(`/orders/${orderId}/delivery-details`, {
            method: 'PATCH',
            body: JSON.stringify(details),
          });
          return res?.success !== false;
        } catch (e) {
          console.warn('[OrderStore] Failed to update delivery details on backend:', e);
          return false;
        }
      },

      loadAllOrders: async (force = false) => {
        const now = Date.now();
        if (!force && (_isFetchingOrders || (now - _lastOrderFetchTime < 4000 && get().allOrders.length > 0))) {
          return;
        }

        _isFetchingOrders = true;
        try {
          const res = await apiFetch('/orders', { skipCache: true });
          _lastOrderFetchTime = Date.now();
          if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
            const current = get().allOrders || [];
            const backendIdSet = new Set<string>();
            const backendOrderNumSet = new Set<string>();

            res.data.forEach((o: any) => {
              if (o.id) backendIdSet.add(String(o.id));
              if (o._id) backendIdSet.add(String(o._id));
              if (o.order_number) backendOrderNumSet.add(String(o.order_number));
            });

            const localOnly = current.filter((o: any) => {
              const matchesBackend =
                (o.id && backendIdSet.has(String(o.id))) ||
                (o._id && backendIdSet.has(String(o._id))) ||
                (o.order_number && backendOrderNumSet.has(String(o.order_number)));
              return !matchesBackend;
            });

            set({ allOrders: [...res.data, ...localOnly].map(normalizeStoredOrderCategory) });
          }
        } catch (err) {
          console.warn('Failed to load all orders from API, using offline persistent state:', err);
          
        } finally {
          _isFetchingOrders = false;
        }
      },

  loadDashboard: async (userId) => {
    try {
      const res = await apiFetch(`/delivery-partners/${userId}/dashboard`);
      if (res.status === 'success') {
        const { stats, activeAssignment, activeOrder } = res.data;
        set({
          activeAssignment: activeAssignment || null,
          activeOrder: activeOrder || null,
          todayCompleted: stats?.todayCompleted || 0,
          todayEarnings: stats?.todayEarnings || 0,
          rating: stats?.rating || 4.9,
        });
      }

      const earnRes = await apiFetch(`/delivery-partners/${userId}/earnings`);
      if (earnRes.status === 'success') {
        set({ earningsLogs: earnRes.data || [] });
      }

      await get().loadAllOrders();
    } catch (err) {
      console.warn('Failed to load rider details:', err);
    }
  },

  claimOrder: async (orderId, partnerId) => {
    try {
      const res = await apiFetch('/delivery-partners/claim-order', {
        method: 'POST',
        body: JSON.stringify({ partnerId, orderId }),
      });
      if (res.status === 'success') {
        await get().loadDashboard(partnerId);
        return true;
      }
    } catch (err) {
      console.warn('Failed to claim order:', err);
    }
    return false;
  },

  respondToAssignment: async (asgId, partnerId, action) => {
    try {
      const res = await apiFetch(`/delivery-partners/assignments/${asgId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (res.status === 'success') {
        set({ incomingAssignment: null });
        await get().loadDashboard(partnerId);
        return true;
      }
    } catch (err) {
      console.warn('Failed to respond to assignment:', err);
    }
    return false;
  },

  stepMilestone: async (orderId, partnerId, step, otp, photoProof) => {
    try {
      const res = await apiFetch(`/delivery-partners/deliveries/${orderId}/step`, {
        method: 'POST',
        body: JSON.stringify({ step, partnerId, otp, photoProof }),
      });

      if (res.status === 'success') {
        if (step === 'complete') {
          set({ activeOrder: null, activeAssignment: null });
          await get().loadDashboard(partnerId);
        } else {
          await get().loadDashboard(partnerId);
        }
        return { success: true };
      } else {
        return { success: false, message: res.message || 'Milestone update failed' };
      }
    } catch (err: any) {
      console.warn('Failed to step milestone:', err);
      return { success: false, message: err.message || 'Network error' };
    }
  },

  cancelCustomerOrder: async (orderId, reason) => {
    // 1. Immediate optimistic local state update (0ms UI delay)
    set((state) => ({
      allOrders: state.allOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'Cancelled' } : o
      ),
    }));

    // 2. Background sync to backend
    apiFetch(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Customer requested cancellation' }),
    }).catch((err) => {
      console.warn('Background cancel order notice:', err);
    });

    return true;
  },

  rateOrder: async (orderId, rating, review) => {
    // 1. Immediate optimistic local state update (0ms UI delay)
    set((state) => ({
      allOrders: state.allOrders.map((o) =>
        o.id === orderId ? { ...o, rating, review_note: review } : o
      ),
    }));

    // 2. Background sync to backend
    apiFetch(`/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, review }),
    }).catch((err) => {
      console.warn('Background rate order notice:', err);
    });

    return true;
  },

  clearActive: () => set({ activeOrder: null, activeAssignment: null, incomingAssignment: null }),
}),
    {
      name: 'connect_app_orders_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
