import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';

export interface BannerItem {
  id: string;
  categoryTag: string;
  iconName: string;
  badgeText: string;
  title: string;
  subtitle: string;
  points: string[];
  buttonText: string;
  targetCategory: string;
  image: string;
  bgColor: string;
  vendorId?: string;
  vendorName?: string;
}

interface BannerStore {
  banners: BannerItem[];
  isLoading: boolean;
  loadBanners: () => Promise<void>;
  addVendorBanner: (newBannerData: Omit<BannerItem, 'id'>) => Promise<BannerItem>;
  removeBanner: (bannerId: string) => Promise<void>;
}

export const useBannerStore = create<BannerStore>()(
  persist(
    (set, get) => ({
      banners: [],
      isLoading: false,

      loadBanners: async () => {
        set({ isLoading: true });
        try {
          let res: any = await apiFetch('/public/banners');
          if (!res || (Array.isArray(res) && res.length === 0) || (res.data && Array.isArray(res.data) && res.data.length === 0)) {
            res = await apiFetch('/banners');
          }
          const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.banners) ? res.banners : []));
          if (Array.isArray(rawList) && rawList.length > 0) {
            const mappedBanners: BannerItem[] = rawList.map((b: any, index: number) => ({
              id: b._id || b.id || `banner_${index}`,
              categoryTag: b.categoryTag || b.targetCategory || 'FEATURED',
              iconName: b.iconName || 'Sparkles',
              badgeText: b.badgeText || (b.discount ? `${b.discount}% OFF` : 'Special Offer'),
              title: b.title || 'Exclusive Deals',
              subtitle: b.subtitle || b.description || b.redirectLink || 'Explore top verified providers in your city',
              points: Array.isArray(b.points) ? b.points : [],
              buttonText: b.buttonText || 'Explore Now',
              targetCategory: b.targetCategory || 'Products',
              image: b.imageUrl || b.image || '',
              bgColor: b.bgColor || '#1E293B',
              vendorId: b.vendorId || b.vendor_id,
              vendorName: b.vendorName,
            }));
            set({ banners: mappedBanners, isLoading: false });
          } else {
            set({ banners: [], isLoading: false });
          }
        } catch (err) {
          console.warn('[BannerStore] Failed to load banners from backend:', err);
          set({ banners: [], isLoading: false });
        }
      },

      addVendorBanner: async (newBannerData) => {
        const newBanner: BannerItem = {
          ...newBannerData,
          id: `banner_${Date.now()}`,
        };
        // 1. Immediate memory-first update (0ms UI delay)
        set((state) => ({
          banners: [newBanner, ...state.banners],
        }));

        // 2. Background sync
        apiFetch('/banners', {
          method: 'POST',
          body: JSON.stringify(newBanner),
        }).catch((err) => {
          console.warn('[BannerStore] Background banner sync notice:', err);
        });

        return newBanner;
      },

      removeBanner: async (bannerId) => {
        // 1. Immediate memory-first update
        set((state) => ({
          banners: state.banners.filter((b) => b.id !== bannerId),
        }));

        // 2. Background sync
        apiFetch(`/banners/${bannerId}`, {
          method: 'DELETE',
        }).catch((err) => {
          console.warn('[BannerStore] Background remove banner notice:', err);
        });
      },
    }),
    {
      name: 'connect_app_banner_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ banners: state.banners }),
    }
  )
);

