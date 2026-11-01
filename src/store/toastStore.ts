import { create } from 'zustand';

interface ToastState {
  visible: boolean;
  message: string;
  actionText?: string;
  onAction?: () => void;
  showToast: (message: string, actionText?: string, onAction?: () => void, duration?: number) => void;
  hideToast: () => void;
}

let autoHideTimer: any = null;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  actionText: undefined,
  onAction: undefined,
  showToast: (message, actionText, onAction, duration = 15000) => {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    set({
      visible: true,
      message,
      actionText,
      onAction,
    });

    // Automatically dismiss the in-app notification popup after 15 seconds
    autoHideTimer = setTimeout(() => {
      set({ visible: false });
    }, duration);
  },
  hideToast: () => {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    set({ visible: false });
  },
}));
