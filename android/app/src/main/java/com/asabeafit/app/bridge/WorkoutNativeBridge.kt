package com.asabeafit.app.bridge

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.asabeafit.app.health.HealthConnectManager
import com.asabeafit.app.service.WorkoutForegroundService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant

/**
 * JavaScript interface exposed to ASABEA FIT web app as `window.AndroidWorkoutBridge`.
 *
 * Bridges user interactions in the UI directly to:
 * 1. WorkoutForegroundService (location tracking, ongoing sticky notification)
 * 2. HealthConnectManager (saving exercise session, distance, route)
 */
class WorkoutNativeBridge(
    private val context: Context,
    private val webView: WebView
) {
    private val healthConnectManager = HealthConnectManager(context)
    private val coroutineScope = CoroutineScope(Dispatchers.Main)

    @JavascriptInterface
    fun startWorkout(type: String, optionsJson: String): Boolean {
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
            action = WorkoutForegroundService.ACTION_START_WORKOUT
            putExtra(WorkoutForegroundService.EXTRA_WORKOUT_TYPE, type)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        return true
    }

    @JavascriptInterface
    fun pauseWorkout(): Boolean {
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
            action = WorkoutForegroundService.ACTION_PAUSE_WORKOUT
        }
        context.startService(intent)
        return true
    }

    @JavascriptInterface
    fun resumeWorkout(): Boolean {
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
            action = WorkoutForegroundService.ACTION_RESUME_WORKOUT
        }
        context.startService(intent)
        return true
    }

    @JavascriptInterface
    fun stopWorkout(): String {
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
            action = WorkoutForegroundService.ACTION_STOP_WORKOUT
        }
        context.startService(intent)
        return JSONObject().put("status", "stopped").toString()
    }

    @JavascriptInterface
    fun updateMetrics(metricsJson: String): Boolean {
        try {
            val json = JSONObject(metricsJson)
            val durationSeconds = json.optLong("durationSeconds", 0L)
            val distanceKm = json.optDouble("distanceKm", 0.0)
            val pace = json.optString("paceMinPerKm", "0:00")

            val intent = Intent(context, WorkoutForegroundService::class.java).apply {
                action = WorkoutForegroundService.ACTION_UPDATE_METRICS
                putExtra(WorkoutForegroundService.EXTRA_DURATION_SECONDS, durationSeconds)
                putExtra(WorkoutForegroundService.EXTRA_DISTANCE_KM, distanceKm)
                putExtra(WorkoutForegroundService.EXTRA_PACE, pace)
            }
            context.startService(intent)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    @JavascriptInterface
    fun showHydrationReminder(message: String): Boolean {
        try {
            val intent = Intent(context, WorkoutForegroundService::class.java).apply {
                action = WorkoutForegroundService.ACTION_SHOW_HYDRATION_REMINDER
                putExtra(WorkoutForegroundService.EXTRA_HYDRATION_MESSAGE, message)
            }
            context.startService(intent)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    @JavascriptInterface
    fun syncHealthConnect(workoutJson: String): Boolean {
        if (!healthConnectManager.isAvailable()) return false

        coroutineScope.launch {
            try {
                val json = JSONObject(workoutJson)
                val type = json.optString("type", "JOG")
                val distanceKm = json.optDouble("distanceKm", 0.0)
                val distanceMeters = distanceKm * 1000.0
                val durationSec = json.optLong("durationSeconds", 0L)
                val calories = json.optDouble("calories", 0.0)
                val routeJson = json.optJSONArray("route")?.toString()

                val endTime = Instant.now()
                val startTime = endTime.minusSeconds(durationSec)

                healthConnectManager.writeWorkoutRecord(
                    workoutType = type,
                    startTime = startTime,
                    endTime = endTime,
                    distanceMeters = distanceMeters,
                    caloriesKcal = calories,
                    stepsCount = null,
                    routePointsJson = routeJson
                )
            } catch (e: Exception) {
                // Logged or handled
            }
        }
        return true
    }

    @JavascriptInterface
    fun isHealthConnectAvailable(): Boolean {
        return healthConnectManager.isAvailable()
    }

    /**
     * Helper to dispatch action event back to Web JavaScript
     */
    fun dispatchActionToWeb(action: String) {
        val script = "window.dispatchEvent(new CustomEvent('asabea_workout_action', { detail: { action: '$action' } }));"
        webView.evaluateJavascript(script, null)
    }
}
