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

  try {
    const res = await apiFetch('/razorpay/create-order', {
      method: 'POST',
      body: {
        amount: numericAmount,
        currency: 'INR',
        planType: options.planType || 'order',
        userId: options.userId || '',
      },
    });

    if (res && res.status === 'success' && res.data?.orderId) {
      const serverOrder: RazorpayOrderDetails = {
        orderId: res.data.orderId,
        amount: res.data.amount || amountPaise,
        currency: res.data.currency || 'INR',
        keyId: res.data.keyId || RAZORPAY_TEST_KEY_ID,
        planType: res.data.planType || options.planType || 'order',
        planName: options.planName,
        priceText: options.priceText || `₹${numericAmount.toLocaleString('en-IN')}`,
      };
      options.onOrderReady(serverOrder);
      return serverOrder;
    } else {
      throw new Error(res?.message || 'Failed to create payment order');
    }
  } catch (err) {
    console.warn('[razorpayService] Failed to create payment order:', err);
    throw err;
  }
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  planType?: string;
  userId?: string;
  items?: any[];
  totalAmount?: number;
  address?: string;
}

export async function verifyRazorpayPayment(payload: VerifyPaymentPayload) {
  const res = await apiFetch('/razorpay/verify-payment', {
    method: 'POST',
    body: payload,
  });
  return res;
}
