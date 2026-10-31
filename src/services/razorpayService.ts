import { apiFetch } from './api';
import { RAZORPAY_KEY_ID } from './env';
import { RazorpayOrderDetails } from '../components/RazorpayModal';

export const RAZORPAY_TEST_KEY_ID = RAZORPAY_KEY_ID;

export interface LaunchRazorpayOptions {
  amount: number; // in Rupees (e.g. 5999)
  planType?: string;
  planName: string;
  priceText?: string;
  userId?: string;
  onOrderReady: (order: RazorpayOrderDetails) => void;
}

export async function prepareRazorpayOrder(options: LaunchRazorpayOptions): Promise<RazorpayOrderDetails | null> {
  const numericAmount = Math.max(1, Math.round(options.amount));
  const amountPaise = numericAmount * 100;
  const isMembership = options.planType && ['silver', 'gold', 'diamond'].includes(options.planType.toLowerCase());

  try {
    let res: any;
    if (isMembership) {
      res = await apiFetch('/membership/create-order', {
        method: 'POST',
        body: {
          planKey: options.planType?.toLowerCase(),
          userId: options.userId || '',
        },
      });
    } else {
      res = await apiFetch('/orders/create-razorpay-order', {
        method: 'POST',
        body: {
          amount: numericAmount,
          currency: 'INR',
          planType: options.planType || 'order',
          userId: options.userId || '',
        },
      });
    }

    const orderId = res?.order_id || res?.orderId || res?.data?.orderId;
    if (res && (res.success || res.status === 'success') && orderId) {
      const serverOrder: RazorpayOrderDetails = {
        orderId: orderId,
        amount: res.amount || res.data?.amount || amountPaise,
        currency: res.currency || res.data?.currency || 'INR',
        keyId: res.key_id || res.keyId || res.data?.keyId || RAZORPAY_TEST_KEY_ID,
        planType: res.planType || res.data?.planType || options.planType || 'order',
        planName: options.planName,
        priceText: options.priceText || `₹${numericAmount.toLocaleString('en-IN')}`,
      };
      options.onOrderReady(serverOrder);
      return serverOrder;
    } else {
      throw new Error(res?.error || res?.message || 'Failed to create payment order');
    }
  } catch (err) {
    console.warn('[razorpayService] Server order creation unavailable, using fallback:', err);
    const fallbackOrder: RazorpayOrderDetails = {
      orderId: `order_dev_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      amount: amountPaise,
      currency: 'INR',
      keyId: RAZORPAY_TEST_KEY_ID,
      planType: options.planType || 'order',
      planName: options.planName,
      priceText: options.priceText || `₹${numericAmount.toLocaleString('en-IN')}`,
    };
    options.onOrderReady(fallbackOrder);
    return fallbackOrder;
  }
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  planType?: string;
  planKey?: string;
  userId?: string;
  items?: any[];
  totalAmount?: number;
  address?: string;
}

export async function verifyRazorpayPayment(payload: VerifyPaymentPayload) {
  const isMembership = payload.planType && ['silver', 'gold', 'diamond'].includes(payload.planType.toLowerCase());
  if (isMembership) {
    const res = await apiFetch('/membership/verify-payment', {
      method: 'POST',
      body: {
        ...payload,
        planKey: payload.planKey || payload.planType?.toLowerCase(),
      },
    });
    return res;
  }
  const res = await apiFetch('/orders', {
    method: 'POST',
    body: payload,
  });
  return res;
}
