package com.connectmobile

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class CustomerKeepAliveService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var pollerThread: Thread? = null
    private val isServiceActive = AtomicBoolean(false)
    private var pollCycleCount = 0
    private val serviceStartTime = System.currentTimeMillis()
    private var isExplicitlyStopped = false

    companion object {
        const val CHANNEL_ID = "connect_keepalive_service_channel"
        const val CHANNEL_NAME = "Connect Real-Time Service"
        const val NOTIFICATION_ID = 88881

        const val ACTION_START = "ACTION_START_CUSTOMER_KEEPALIVE"
        const val ACTION_STOP = "ACTION_STOP_CUSTOMER_KEEPALIVE"

        var isRunning = false

        // Thread-safe set of known notification IDs to prevent duplicate alerts
        val knownNotificationIds: MutableSet<String> = Collections.newSetFromMap(ConcurrentHashMap())

        fun loadHandledNotifications(context: Context) {
            try {
                val prefs = context.getSharedPreferences(NotificationModule.PREFS_NAME, Context.MODE_PRIVATE)
                val csv = prefs.getString(NotificationModule.KEY_HANDLED_NOTIFICATIONS, "") ?: ""
                if (csv.isNotBlank()) {
                    csv.split(",").forEach { id ->
                        val trimmed = id.trim()
                        if (trimmed.isNotEmpty()) {
                            knownNotificationIds.add(trimmed)
                        }
                    }
                }
            } catch (e: Exception) {
                // Non-blocking
            }
        }

        fun persistHandledNotifications(context: Context) {
            try {
                val prefs = context.getSharedPreferences(NotificationModule.PREFS_NAME, Context.MODE_PRIVATE)
                val list = knownNotificationIds.toList()
                val recent = if (list.size > 500) list.takeLast(500) else list
                val csv = recent.joinToString(",")
                prefs.edit().putString(NotificationModule.KEY_HANDLED_NOTIFICATIONS, csv).apply()
            } catch (e: Exception) {
                // Non-blocking
            }
        }

        fun start(context: Context) {
            try {
                val intent = Intent(context, CustomerKeepAliveService::class.java).apply {
                    action = ACTION_START
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun stop(context: Context) {
            try {
                val intent = Intent(context, CustomerKeepAliveService::class.java).apply {
                    action = ACTION_STOP
                }
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun markNotificationHandled(context: Context?, notificationId: String?) {
            if (!notificationId.isNullOrBlank()) {
                val trimmed = notificationId.trim()
                knownNotificationIds.add(trimmed)
                if (context != null) {
                    persistHandledNotifications(context)
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        loadHandledNotifications(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            isExplicitlyStopped = true
            stopForegroundService()
            return START_NOT_STICKY
        }

        isExplicitlyStopped = false
        startForegroundServiceInternal()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        try {
            if (!isExplicitlyStopped) {
                val restartIntent = Intent(applicationContext, this.javaClass).apply {
                    setPackage(packageName)
                    action = ACTION_START
                }
                val pendingIntent = PendingIntent.getService(
                    applicationContext,
                    1,
                    restartIntent,
                    PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val triggerAt = System.currentTimeMillis() + 1500L
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                    )
                } else {
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        super.onTaskRemoved(rootIntent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Connect app active to deliver real-time order, tracking, and booking status alerts"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundServiceInternal() {
        try {
            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val smallIconResId = applicationInfo.icon.let {
                if (it != 0) it else R.mipmap.ic_launcher
            }

            val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Connect Live Tracking")
                .setContentText("Listening for live order, booking, and delivery updates")
                .setSmallIcon(smallIconResId)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isRunning = true

            // Acquire light partial wake lock for network persistence
            try {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectMobile::CustomerKeepAliveWakeLock").apply {
                    setReferenceCounted(false)
                    acquire(10 * 60 * 1000L) // 10 minute chunks, refreshed by OS
                }
            } catch (e: Exception) {}

            // Start autonomous background polling thread
            startPollerThread()

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startPollerThread() {
        if (isServiceActive.getAndSet(true)) {
            return // Already running
        }

        pollerThread = Thread {
            while (isServiceActive.get()) {
                try {
                    val prefs = getSharedPreferences(NotificationModule.PREFS_NAME, Context.MODE_PRIVATE)
                    val customerId = prefs.getString(NotificationModule.KEY_CUSTOMER_ID, "") ?: ""
                    val authToken = prefs.getString(NotificationModule.KEY_AUTH_TOKEN, "") ?: ""
                    val apiUrl = prefs.getString(NotificationModule.KEY_API_URL, "https://api.ficapp.in") ?: "https://api.ficapp.in"

                    if (customerId.isNotBlank() && authToken.isNotBlank()) {
                        pollCycleCount++

                        // 1. Poll customer notifications
                        pollCustomerNotifications(apiUrl, authToken, customerId)

                        // 2. Poll orders for real-time status transitions every 2nd cycle
                        if (pollCycleCount % 2 == 0) {
                            pollCustomerOrders(apiUrl, authToken, customerId)
                        }
                    }
                } catch (e: Exception) {
                    // Non-blocking background catch
                }

                try {
                    Thread.sleep(5500)
                } catch (ie: InterruptedException) {
                    break
                }
            }
        }.apply {
            isDaemon = true
            name = "CustomerBackgroundOrderPoller"
            start()
        }
    }

    private fun parseTimestamp(timeStr: String): Long {
        if (timeStr.isBlank()) return 0L
        return try {
            if (timeStr.contains("T")) {
                val clean = if (timeStr.endsWith("Z")) timeStr.substring(0, timeStr.length - 1) + "+0000" else timeStr
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                sdf.parse(clean.take(19))?.time ?: 0L
            } else {
                timeStr.toLongOrNull() ?: 0L
            }
        } catch (e: Exception) {
            0L
        }
    }

    private fun pollCustomerNotifications(baseUrl: String, token: String, customerId: String) {
        var connection: HttpURLConnection? = null
        try {
            val cleanBase = baseUrl.trimEnd('/')
            val fullUrl = "$cleanBase/api/customer/customer-notifications"
            val url = URL(fullUrl)

            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }

            val responseCode = connection.responseCode
            if (responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()

                val root = JSONObject(sb.toString())
                val notifsArr = root.optJSONArray("notifications")
                    ?: root.optJSONArray("data")
                    ?: JSONArray()

                for (i in 0 until notifsArr.length()) {
                    val item = notifsArr.optJSONObject(i) ?: continue
                    val notifId = item.optString("_id").ifBlank { item.optString("id") }
                    if (notifId.isBlank()) continue

                    val isRead = item.optBoolean("isRead", item.optBoolean("read", false))
                    val createdAtStr = item.optString("createdAt").ifBlank { item.optString("created_at") }
                    val itemTimestamp = parseTimestamp(createdAtStr)

                    // Historical item guard: seeded so only new events alert
                    if (itemTimestamp > 0 && itemTimestamp < (serviceStartTime - 30_000L)) {
                        knownNotificationIds.add(notifId)
                        continue
                    }

                    if (knownNotificationIds.contains(notifId)) {
                        continue
                    }

                    // Newly arrived notification!
                    knownNotificationIds.add(notifId)
                    persistHandledNotifications(this@CustomerKeepAliveService)

                    if (!isRead) {
                        val title = item.optString("title", "Connect Alert")
                        val body = item.optString("body").ifBlank {
                            item.optString("message", "You have a new update.")
                        }
                        val targetId = item.optString("targetId").ifBlank {
                            item.optString("orderId")
                        }
                        val category = item.optString("category", "Orders")
                        val targetScreen = if (category.contains("offer", true)) "Home" else "Orders"

                        NotificationModule.postSystemNotification(
                            this@CustomerKeepAliveService,
                            title,
                            body,
                            targetScreen,
                            targetId,
                            "connect_orders_realtime_channel"
                        )
                    }
                }
            }
        } catch (e: Exception) {
            // Non-blocking
        } finally {
            connection?.disconnect()
        }
    }

    private fun pollCustomerOrders(baseUrl: String, token: String, customerId: String) {
        var connection: HttpURLConnection? = null
        try {
            val cleanBase = baseUrl.trimEnd('/')
            val fullUrl = "$cleanBase/api/orders?customerId=$customerId"
            val url = URL(fullUrl)

            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }

            val responseCode = connection.responseCode
            if (responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()

                val raw = sb.toString().trim()
                val ordersArr = if (raw.startsWith("[")) {
                    JSONArray(raw)
                } else {
                    val root = JSONObject(raw)
                    root.optJSONArray("orders") ?: root.optJSONArray("data") ?: JSONArray()
                }

                for (i in 0 until ordersArr.length()) {
                    val order = ordersArr.optJSONObject(i) ?: continue
                    val orderId = order.optString("id").ifBlank { order.optString("_id") }
                    val status = order.optString("status", "")
                    if (orderId.isBlank() || status.isBlank()) continue

                    val stateKey = "${orderId}_$status"
                    val updatedAtStr = order.optString("updatedAt").ifBlank {
                        order.optString("updated_at").ifBlank {
                            order.optString("createdAt").ifBlank { order.optString("created_at") }
                        }
                    }
                    val updateTime = parseTimestamp(updatedAtStr)

                    if (updateTime > 0 && updateTime < (serviceStartTime - 30_000L)) {
                        knownNotificationIds.add(stateKey)
                        continue
                    }

                    if (knownNotificationIds.contains(stateKey)) {
                        continue
                    }

                    // Newly updated order state!
                    knownNotificationIds.add(stateKey)
                    persistHandledNotifications(this@CustomerKeepAliveService)

                    val orderNum = order.optString("order_number", orderId)
                    val title = "Order Update: $status"
                    val body = "Your order #$orderNum status is now $status."

                    NotificationModule.postSystemNotification(
                        this@CustomerKeepAliveService,
                        title,
                        body,
                        "Orders",
                        orderId,
                        "connect_orders_realtime_channel"
                    )
                }
            }
        } catch (e: Exception) {
            // Non-blocking
        } finally {
            connection?.disconnect()
        }
    }

    private fun stopForegroundService() {
        isRunning = false
        isServiceActive.set(false)
        pollerThread?.interrupt()
        pollerThread = null

        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) {}

        try {
            stopForeground(true)
            stopSelf()
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        if (!isExplicitlyStopped) {
            try {
                val restartIntent = Intent(applicationContext, this.javaClass).apply {
                    setPackage(packageName)
                    action = ACTION_START
                }
                val pendingIntent = PendingIntent.getService(
                    applicationContext,
                    2,
                    restartIntent,
                    PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + 2000L,
                    pendingIntent
                )
            } catch (e: Exception) {}
        }

        stopForegroundService()
        super.onDestroy()
    }
}
