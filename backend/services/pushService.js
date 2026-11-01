const fs = require('fs');
const path = require('path');
const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');

let admin = null;
let isFirebaseInitialized = false;

// Initialize Firebase Admin SDK safely
try {
  admin = require('firebase-admin');
  if (!admin.apps || admin.apps.length === 0) {
    const defaultKeyPath = path.join(__dirname, '..', 'config', 'serviceAccountKey.json');
    const customKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const finalKeyPath = customKeyPath && fs.existsSync(customKeyPath) ? customKeyPath : (fs.existsSync(defaultKeyPath) ? defaultKeyPath : null);

    if (finalKeyPath) {
      const serviceAccount = require(finalKeyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFirebaseInitialized = true;
      console.log('[PushService] Initialized Firebase Admin SDK with Service Account:', finalKeyPath);
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'connect-mobile-app-fcm',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      isFirebaseInitialized = true;
      console.log('[PushService] Initialized Firebase Admin SDK with Environment Key credentials.');
    } else {
      console.log('[PushService] Firebase Admin credentials not found; push notifications will operate in live-socket + gateway mode.');
    }
  } else {
    isFirebaseInitialized = true;
  }
} catch (err) {
  console.warn('[PushService] Firebase Admin initialization note:', err.message);
}

/**
 * Resolves Android notification channel based on recipient role and notification category
 */
function resolveAndroidChannel(role, category) {
  const cat = String(category || '').toLowerCase();
  const r = String(role || '').toLowerCase();

  if (r === 'vendor') {
    if (cat.includes('booking') || cat.includes('stay') || cat.includes('travel') || cat.includes('service')) {
      return 'vendor_booking_alerts_v3';
    }
    if (cat.includes('job') || cat.includes('applicant')) {
      return 'vendor_job_alerts_v3';
    }
    if (cat.includes('general') || cat.includes('system') || cat.includes('announcement')) {
      return 'vendor_general_alerts_v3';
    }
    return 'vendor_order_alerts_v3';
  }

  if (r === 'agent') {
    if (cat.includes('routine') || cat.includes('daily') || cat.includes('info')) {
      return 'agent_routine_updates_v1';
    }
    return 'agent_important_alerts_v4';
  }

  if (r === 'manager') {
    if (cat.includes('routine') || cat.includes('info')) {
      return 'manager_routine_channel';
    }
    return 'manager_alerts_channel';
  }

  // Customer role (default)
  if (cat.includes('offer') || cat.includes('promotion') || cat.includes('discount')) {
    return 'connect_offers_channel';
  }
  if (cat.includes('account') || cat.includes('membership') || cat.includes('wallet')) {
    return 'connect_account_channel';
  }
  if (cat.includes('system') || cat.includes('announcement')) {
    return 'connect_default_channel';
  }
  return 'connect_orders_realtime_channel';
}

/**
 * Clean up invalid or expired FCM tokens from database
 */
async function cleanupInvalidTokens(invalidTokens = []) {
  if (!Array.isArray(invalidTokens) || invalidTokens.length === 0) return;
  try {
    const res = await DeviceToken.updateMany(
      { fcmToken: { $in: invalidTokens } },
      { $set: { isActive: false, lastSeenAt: new Date() } }
    );
    console.log(`[PushService] Deactivated ${res.modifiedCount} invalid FCM token(s).`);
  } catch (err) {
    console.warn('[PushService] Token cleanup notice:', err.message);
  }
}

/**
 * Dispatches an Android push notification to specific users or roles
 */
const recentDispatches = new Map();

async function sendPushNotification({
  userId,
  userIds = [],
  role = 'customer',
  title,
  body,
  category = 'order',
  screen = 'Orders',
  targetId = '',
  dedupeKey = null,
  data = {},
  socketServer = null,
}) {
  try {
    const targetUserIds = [];
    if (userId) targetUserIds.push(String(userId));
    if (Array.isArray(userIds)) userIds.forEach((id) => id && targetUserIds.push(String(id)));

    // Duplicate Notification Prevention Guard (5-second throttle window)
    const effectiveDedupeKey = dedupeKey || `${role}_${targetUserIds.sort().join(',')}_${title}_${targetId}`;
    const now = Date.now();
    const lastSentTime = recentDispatches.get(effectiveDedupeKey) || 0;
    if (now - lastSentTime < 5000) {
      console.log(`[PushService] Throttling duplicate push for key "${effectiveDedupeKey}" within 5s window.`);
      return { success: true, deliveredVia: 'deduplicated' };
    }
    recentDispatches.set(effectiveDedupeKey, now);

    // Evict expired deduplication entries
    if (recentDispatches.size > 200) {
      const cutoff = now - 30000;
      recentDispatches.forEach((val, k) => {
        if (val < cutoff) recentDispatches.delete(k);
      });
    }
    if (userId) targetUserIds.push(String(userId));
    if (Array.isArray(userIds)) userIds.forEach((id) => id && targetUserIds.push(String(id)));

    // 1. Persist notification records to MongoDB for each recipient
    if (targetUserIds.length > 0) {
      try {
        const notifDocs = targetUserIds.map((uId) => ({
          userId: uId,
          role,
          title,
          body,
          category,
          targetScreen: screen,
          targetId: String(targetId || ''),
          isRead: false,
          data,
          createdAt: new Date(),
        }));
        await Notification.insertMany(notifDocs);
      } catch (dbErr) {
        console.warn('[PushService] MongoDB notification history save warning:', dbErr.message);
      }
    }

    // 2. Immediate WebSocket broadcast for 0ms foreground delivery
    if (socketServer) {
      try {
        const socketPayload = {
          title,
          body,
          category,
          screen,
          targetId: String(targetId || ''),
          data,
          timestamp: new Date().toISOString(),
        };
        targetUserIds.forEach((uId) => {
          socketServer.to(uId).emit('notification', socketPayload);
          socketServer.to(`user_${uId}`).emit('notification', socketPayload);
        });
        if (targetUserIds.length === 0) {
          socketServer.emit('notification', socketPayload);
        }
      } catch (wsErr) {
        console.warn('[PushService] Socket emission notice:', wsErr.message);
      }
    }

    // 3. Find active FCM tokens for the recipients
    const query = { isActive: true };
    if (targetUserIds.length > 0) {
      query.userId = { $in: targetUserIds };
    }
    if (role && role !== 'all') {
      query.role = role;
    }

    const deviceRecords = await DeviceToken.find(query).select('fcmToken userId platform role');
    const tokens = Array.from(new Set(deviceRecords.map((d) => d.fcmToken).filter(Boolean)));

    if (tokens.length === 0) {
      console.log(`[PushService] No active FCM tokens found for recipients (${targetUserIds.join(', ')}). In-app event delivered.`);
      return { success: true, deliveredVia: 'in-app/socket', tokenCount: 0 };
    }

    const channelId = resolveAndroidChannel(role, category);

    // 4. Construct high-priority FCM payload for Android OS system tray
    const fcmDataPayload = {
      title: String(title || ''),
      body: String(body || ''),
      screen: String(screen || 'Orders'),
      targetId: String(targetId || ''),
      category: String(category || 'order'),
      role: String(role || 'customer'),
      timestamp: String(Date.now()),
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(typeof v === 'object' ? JSON.stringify(v) : v)])),
    };

    // 5. Send via Firebase Admin SDK multicast if configured
    if (admin && admin.apps && admin.apps.length > 0) {
      const messagePayload = {
        tokens,
        notification: {
          title,
          body,
        },
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: 'default',
            priority: 'high',
            visibility: 'public',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        data: fcmDataPayload,
      };

      const response = await admin.messaging().sendEachForMulticast(messagePayload);
      console.log(`[PushService] FCM Multicast Result: ${response.successCount} success, ${response.failureCount} failed.`);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const deadTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errCode = resp.error.code || '';
            if (
              errCode.includes('registration-token-not-registered') ||
              errCode.includes('invalid-registration-token') ||
              errCode.includes('invalid-argument')
            ) {
              deadTokens.push(tokens[idx]);
            }
          }
        });
        if (deadTokens.length > 0) {
          cleanupInvalidTokens(deadTokens);
        }
      }

      return {
        success: true,
        deliveredVia: 'fcm-admin-multicast',
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    }

    // 6. Fallback to FCM Gateway API if FCM_SERVER_KEY is set in .env
    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    if (fcmServerKey) {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          registration_ids: tokens,
          priority: 'high',
          notification: {
            title,
            body,
            sound: 'default',
            android_channel_id: channelId,
          },
          data: fcmDataPayload,
        }),
      });
      const resJson = await response.json();
      console.log('[PushService] FCM Gateway Send Response:', resJson);
      return { success: true, deliveredVia: 'fcm-gateway', response: resJson };
    }

    console.log(`[PushService] Prepared push notification "${title}" for ${tokens.length} device(s) on channel "${channelId}". (Firebase credentials can be added to serviceAccountKey.json to enable Google FCM cloud routing)`);
    return { success: true, deliveredVia: 'local-fcm-ready', tokenCount: tokens.length };
  } catch (err) {
    console.error('[PushService] Error dispatching push notification:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPushNotification,
  resolveAndroidChannel,
  cleanupInvalidTokens,
};
