package com.connectmobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(NotificationPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
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
          NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = "Special discounts, promotional campaigns, and exclusive deals"
          enableVibration(true)
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
          enableVibration(true)
        }
      )
      channels.forEach { notificationManager?.createNotificationChannel(it) }
    }
  }

}
