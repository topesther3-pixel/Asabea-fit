package com.asabeafit.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.asabeafit.app.MainActivity
import com.asabeafit.app.receiver.WorkoutActionReceiver
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject

/**
 * Continuous Workout Tracking Foreground Service for ASABEA FIT.
 *
 * Guarantees uninterrupted GPS location collection and session timing
 * when the user switches apps (WhatsApp, Maps, Music), answers phone calls,
 * or locks the screen.
 *
 * Runs strictly with foregroundServiceType="location" and persistent Ongoing Notification.
 */
class WorkoutForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "asabea_fit_workout_channel"
        const val CHANNEL_HYDRATION_ID = "asabea_fit_hydration_channel"
        const val NOTIFICATION_ID = 1001
        const val NOTIFICATION_HYDRATION_ID = 1002

        const val ACTION_START_WORKOUT = "com.asabeafit.app.START_WORKOUT"
        const val ACTION_PAUSE_WORKOUT = "com.asabeafit.app.PAUSE_WORKOUT"
        const val ACTION_RESUME_WORKOUT = "com.asabeafit.app.RESUME_WORKOUT"
        const val ACTION_STOP_WORKOUT = "com.asabeafit.app.STOP_WORKOUT"
        const val ACTION_UPDATE_METRICS = "com.asabeafit.app.UPDATE_METRICS"
        const val ACTION_SHOW_HYDRATION_REMINDER = "com.asabeafit.app.SHOW_HYDRATION_REMINDER"

        const val EXTRA_WORKOUT_TYPE = "workout_type"
        const val EXTRA_DURATION_SECONDS = "duration_seconds"
        const val EXTRA_DISTANCE_KM = "distance_km"
        const val EXTRA_PACE = "pace"
        const val EXTRA_CALORIES = "calories"
        const val EXTRA_HYDRATION_MESSAGE = "hydration_message"

        var isServiceRunning = false
            private set
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var wakeLock: PowerManager.WakeLock? = null

    private var workoutType: String = "Jog"
    private var durationSeconds: Long = 0
    private var distanceKm: Double = 0.0
    private var paceMinPerKm: String = "0:00"
    private var isPaused: Boolean = false

    // Route recording: list of GPS points
    private val recordedRoute = mutableListOf<LocationPoint>()

    data class LocationPoint(
        val lat: Double,
        val lng: Double,
        val altitude: Double,
        val accuracy: Float,
        val speed: Float,
        val timestamp: Long
    )

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        // Setup high-precision GPS callback
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                if (isPaused) return

                for (location in locationResult.locations) {
                    processNewLocation(location)
                }
            }
        }

        // Acquire partial wake lock so CPU does not sleep when screen is locked or in call
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "AsabeaFit::WorkoutWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(4 * 60 * 60 * 1000L) // Safe 4-hour max limit
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_STICKY

        when (action) {
            ACTION_START_WORKOUT -> {
                workoutType = intent.getStringExtra(EXTRA_WORKOUT_TYPE) ?: "Jog"
                durationSeconds = 0
                distanceKm = 0.0
                isPaused = false
                recordedRoute.clear()
                isServiceRunning = true

                // Start as Android foreground service with sticky notification
                val notification = buildWorkoutNotification()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }

                startLocationUpdates()
            }

            ACTION_PAUSE_WORKOUT -> {
                isPaused = true
                updateNotification()
            }

            ACTION_RESUME_WORKOUT -> {
                isPaused = false
                updateNotification()
            }

            ACTION_UPDATE_METRICS -> {
                durationSeconds = intent.getLongExtra(EXTRA_DURATION_SECONDS, durationSeconds)
                distanceKm = intent.getDoubleExtra(EXTRA_DISTANCE_KM, distanceKm)
                paceMinPerKm = intent.getStringExtra(EXTRA_PACE) ?: paceMinPerKm
                updateNotification()
            }

            ACTION_SHOW_HYDRATION_REMINDER -> {
                val message = intent.getStringExtra(EXTRA_HYDRATION_MESSAGE) ?: "💧 Hydration check! Take a few sips of water."
                showHydrationNotification(message)
            }

            ACTION_STOP_WORKOUT -> {
                stopWorkoutService()
            }
        }

        // START_STICKY ensures Android OS restarts service if temporarily killed under memory pressure
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2000L)
            .setMinUpdateIntervalMillis(1000L)
            .setMinUpdateDistanceMeters(2.0f) // filter small stationary jitters
            .setWaitForAccurateLocation(false)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (unlikely: SecurityException) {
            // Missing permission handled gracefully
        }
    }

    private fun processNewLocation(location: Location) {
        // Discard low-accuracy GPS points (>25m margin)
        if (location.hasAccuracy() && location.accuracy > 25.0f) {
            return
        }

        val point = LocationPoint(
            lat = location.latitude,
            lng = location.longitude,
            altitude = location.altitude,
            accuracy = location.accuracy,
            speed = location.speed,
            timestamp = location.time
        )

        // Calculate distance delta from previous point
        if (recordedRoute.isNotEmpty()) {
            val last = recordedRoute.last()
            val results = FloatArray(1)
            Location.distanceBetween(last.lat, last.lng, point.lat, point.lng, results)
            val deltaKm = results[0] / 1000.0

            // Filter out anomalous GPS teleports (>100m in 1-2s)
            if (deltaKm in 0.002..0.15) {
                distanceKm += deltaKm
            }
        }

        recordedRoute.add(point)

        // Broadcast to WebView / UI
        broadcastLocationUpdate(point)
    }

    private fun broadcastLocationUpdate(point: LocationPoint) {
        val intent = Intent("com.asabeafit.app.LOCATION_UPDATE").apply {
            putExtra("lat", point.lat)
            putExtra("lng", point.lng)
            putExtra("accuracy", point.accuracy)
            putExtra("speed", point.speed)
            putExtra("distanceKm", distanceKm)
        }
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val workoutChannel = NotificationChannel(
                CHANNEL_ID,
                "Active Workout Tracking",
                NotificationManager.IMPORTANCE_LOW // Low ensures silent ongoing updates without chime
            ).apply {
                description = "Shows live duration and distance while workout is in progress."
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(workoutChannel)

            val hydrationChannel = NotificationChannel(
                CHANNEL_HYDRATION_ID,
                "Hydration Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Gentle water reminders during active walk, jog, and run sessions."
                setShowBadge(true)
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(hydrationChannel)
        }
    }

    /**
     * Builds the persistent workout notification:
     *
     * ASABEA FIT
     * 🏃 Jog in progress
     * Duration: 18:42
     * Distance: 2.03 km
     *
     * Actions: PAUSE | FINISH
     */
    private fun buildWorkoutNotification(): Notification {
        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingContentIntent = PendingIntent.getActivity(
            this, 0, contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // PAUSE Action
        val pauseIntent = Intent(this, WorkoutActionReceiver::class.java).apply {
            action = if (isPaused) "com.asabeafit.app.ACTION_RESUME" else "com.asabeafit.app.ACTION_PAUSE"
        }
        val pausePendingIntent = PendingIntent.getBroadcast(
            this, 1, pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // FINISH Action
        val finishIntent = Intent(this, WorkoutActionReceiver::class.java).apply {
            action = "com.asabeafit.app.ACTION_FINISH"
        }
        val finishPendingIntent = PendingIntent.getBroadcast(
            this, 2, finishIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val mins = durationSeconds / 60
        val secs = durationSeconds % 60
        val timeStr = String.format("%02d:%02d", mins, secs)
        val distStr = String.format("%.2f km", distanceKm)

        val statusText = if (isPaused) "⏸️ ${workoutType} paused" else "🏃 ${workoutType} in progress"
        val bodyText = "Duration: $timeStr\nDistance: $distStr"

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ASABEA FIT")
            .setSubText(statusText)
            .setContentText("Duration: $timeStr  •  Distance: $distStr")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .setBigContentTitle("ASABEA FIT")
                    .setSummaryText(statusText)
                    .bigText("Duration: $timeStr\nDistance: $distStr\nPace: $paceMinPerKm/km")
            )
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentIntent(pendingContentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        // Add Actions: PAUSE and FINISH
        val pauseActionLabel = if (isPaused) "RESUME" else "PAUSE"
        builder.addAction(android.R.drawable.ic_media_pause, pauseActionLabel, pausePendingIntent)
        builder.addAction(android.R.drawable.ic_menu_save, "FINISH", finishPendingIntent)

        return builder.build()
    }

    private fun updateNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildWorkoutNotification())
    }

    private fun showHydrationNotification(message: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingContentIntent = PendingIntent.getActivity(
            this, 99, contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_HYDRATION_ID)
            .setContentTitle("ASABEA FIT • Hydration Check")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingContentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        manager.notify(NOTIFICATION_HYDRATION_ID, notification)
    }

    private fun stopWorkoutService() {
        isServiceRunning = false
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {
            // Ignored
        }

        wakeLock?.let {
            if (it.isHeld) it.release()
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_HYDRATION_ID)

        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        stopWorkoutService()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
