import { create } from 'zustand';

interface AuthGuardState {
  isOpen: boolean;
  actionText: string;
  onSuccessCallback?: () => void;
  showAuthModal: (actionText?: string, onSuccess?: () => void) => void;
  hideAuthModal: () => void;
}

export const useAuthGuardStore = create<AuthGuardState>((set) => ({
  isOpen: false,
  actionText: 'place an order',
  onSuccessCallback: undefined,
  showAuthModal: (actionText = 'place an order', onSuccess) =>
    set({ isOpen: true, actionText, onSuccessCallback: onSuccess }),
  hideAuthModal: () => set({ isOpen: false, onSuccessCallback: undefined }),
}));
