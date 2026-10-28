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
        var pendingNotificationData: Bundle? = null
    }

    override fun getName(): String = "SystemNotification"

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
        try {
            val channelId = channelIdParam ?: "connect_orders_realtime_channel"
            val channelName = if (channelId.contains("account") || channelId.contains("membership")) {
                "Account & Membership"
            } else {
                "Orders & Bookings"
            }
            val channelDesc = if (channelId.contains("account") || channelId.contains("membership")) {
                "Membership, wallet, and account notifications"
            } else {
                "Real-time updates about your orders and bookings"
            }

            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = channelDesc
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 150, 250)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val targetScreen = screen ?: "Orders"
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)?.apply {
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
                    reactContext,
                    requestCode,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            } else null

            val iconResId = reactContext.applicationInfo.icon.let {
                if (it != 0) it else R.mipmap.ic_launcher
            }

            val builder = NotificationCompat.Builder(reactContext, channelId)
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

    @ReactMethod
    fun getPendingNotificationData(promise: Promise) {
        try {
            val extras = pendingNotificationData
            if (extras != null && extras.containsKey("screen")) {
                val map = Arguments.createMap()
                for (key in extras.keySet()) {
                    val value = extras.get(key)
                    map.putString(key, value?.toString() ?: "")
                }
                pendingNotificationData = null
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}
