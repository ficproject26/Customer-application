package com.connectmobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val PREFS_NAME = "CustomerMobilePrefs"
        const val KEY_CUSTOMER_ID = "customer_id"
        const val KEY_AUTH_TOKEN = "auth_token"
        const val KEY_API_URL = "api_url"
        const val KEY_EMAIL = "email"
        const val KEY_PHONE = "phone"
        const val KEY_HANDLED_NOTIFICATIONS = "handled_notifications_csv"

        var pendingNotificationData: Bundle? = null

        fun initNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                val channels = listOf(
                    NotificationChannel(
                        "connect_orders_realtime_channel",
                        "Orders & Bookings",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Real-time updates about your orders, deliveries, and bookings"
                        enableVibration(true)
                        vibrationPattern = longArrayOf(0, 250, 150, 250)
                    },
                    NotificationChannel(
                        "connect_offers_channel",
                        "Offers & Promotions",
                        NotificationManager.IMPORTANCE_DEFAULT
                    ).apply {
                        description = "Special discounts, promotional campaigns, and exclusive deals"
                    },
                    NotificationChannel(
                        "connect_account_channel",
                        "Account & Membership",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Membership tier updates, wallet transactions, and security alerts"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        "connect_default_channel",
                        "General & Important Updates",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Important announcements and general application notices"
                    }
                )

                channels.forEach { notificationManager.createNotificationChannel(it) }
            }
        }

        fun postSystemNotification(
            context: Context,
            title: String,
            message: String,
            screen: String?,
            targetId: String?,
            channelIdParam: String?
        ) {
            try {
                initNotificationChannels(context)

                val channelId = when {
                    channelIdParam != null && channelIdParam.isNotEmpty() -> channelIdParam
                    title.contains("Offer", true) || message.contains("Offer", true) || title.contains("Discount", true) || title.contains("Sale", true) -> "connect_offers_channel"
                    title.contains("Membership", true) || title.contains("Diamond", true) || title.contains("Gold", true) || title.contains("Wallet", true) -> "connect_account_channel"
                    else -> "connect_orders_realtime_channel"
                }

                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                val targetScreen = screen ?: "Orders"
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("screen", targetScreen)
                    if (!targetId.isNullOrEmpty()) {
                        putExtra("targetId", targetId)
                        putExtra("orderId", targetId)
                    }
                }

                val requestCode = (System.currentTimeMillis() % 100000).toInt()
                val pendingIntent = if (launchIntent != null) {
                    PendingIntent.getActivity(
                        context,
                        requestCode,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                } else null

                val iconResId = context.applicationInfo.icon.let {
                    if (it != 0) it else R.mipmap.ic_launcher
                }

                val builder = NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(iconResId)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setAutoCancel(true)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)

                if (pendingIntent != null) {
                    builder.setContentIntent(pendingIntent)
                }

                val notificationId = ((System.currentTimeMillis() + title.hashCode()) % 100000).toInt().let {
                    if (it < 0) -it else it
                }
                notificationManager.notify(notificationId, builder.build())
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun getName(): String = "SystemNotification"

    @ReactMethod
    fun initializeChannels(promise: Promise) {
        try {
            initNotificationChannels(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun showNotification(title: String, message: String) {
        showSystemNotification(title, message, "Orders", null, "connect_orders_realtime_channel")
    }

    @ReactMethod
    fun showSystemNotification(
        title: String,
        message: String,
        screen: String?,
        targetId: String?,
        channelIdParam: String?
    ) {
        postSystemNotification(reactContext, title, message, screen, targetId, channelIdParam)
    }

    @ReactMethod
    fun syncCustomerSession(customerId: String, token: String, apiUrl: String, email: String?, phone: String?) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_CUSTOMER_ID, customerId)
                putString(KEY_AUTH_TOKEN, token)
                putString(KEY_API_URL, apiUrl)
                if (email != null) putString(KEY_EMAIL, email)
                if (phone != null) putString(KEY_PHONE, phone)
                apply()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun clearCustomerSession() {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            CustomerKeepAliveService.knownNotificationIds.clear()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun getPendingNotificationData(promise: Promise) {
        try {
            val extras = pendingNotificationData
            if (extras != null) {
                val hasNotif = extras.containsKey("screen") ||
                    extras.containsKey("targetScreen") ||
                    extras.containsKey("orderId") ||
                    extras.containsKey("bookingId") ||
                    extras.containsKey("targetId") ||
                    extras.containsKey("category")

                if (hasNotif) {
                    val map = Arguments.createMap()
                    for (key in extras.keySet()) {
                        val value = extras.get(key)
                        map.putString(key, value?.toString() ?: "")
                    }
                    if (!extras.containsKey("screen")) {
                        val resolvedScreen = extras.getString("targetScreen")
                            ?: if (extras.containsKey("orderId") || extras.containsKey("bookingId") || extras.containsKey("targetId")) "Orders" else "Home"
                        map.putString("screen", resolvedScreen)
                    }
                    pendingNotificationData = null
                    promise.resolve(map)
                    return
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun startKeepAliveService() {
        try {
            CustomerKeepAliveService.start(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopKeepAliveService() {
        try {
            CustomerKeepAliveService.stop(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
