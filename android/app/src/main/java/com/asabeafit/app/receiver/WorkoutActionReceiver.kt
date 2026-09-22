package com.asabeafit.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.asabeafit.app.MainActivity
import com.asabeafit.app.service.WorkoutForegroundService

/**
 * Handles action clicks (PAUSE, RESUME, FINISH) directly from the
 * ASABEA FIT persistent ongoing workout notification.
 */
class WorkoutActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        when (action) {
            "com.asabeafit.app.ACTION_PAUSE" -> {
                val serviceIntent = Intent(context, WorkoutForegroundService::class.java).apply {
                    this.action = WorkoutForegroundService.ACTION_PAUSE_WORKOUT
                }
                context.startService(serviceIntent)
                broadcastToWebView(context, "pause")
            }

            "com.asabeafit.app.ACTION_RESUME" -> {
                val serviceIntent = Intent(context, WorkoutForegroundService::class.java).apply {
                    this.action = WorkoutForegroundService.ACTION_RESUME_WORKOUT
                }
                context.startService(serviceIntent)
                broadcastToWebView(context, "resume")
            }

            "com.asabeafit.app.ACTION_FINISH" -> {
                val serviceIntent = Intent(context, WorkoutForegroundService::class.java).apply {
                    this.action = WorkoutForegroundService.ACTION_STOP_WORKOUT
                }
                context.startService(serviceIntent)
                broadcastToWebView(context, "finish")

                // Bring MainActivity to the front so user sees the workout summary
                val appIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("navigate_to", "workout_summary")
                }
                context.startActivity(appIntent)
            }
        }
    }

    private fun broadcastToWebView(context: Context, actionName: String) {
        val webViewIntent = Intent("com.asabeafit.app.WEBVIEW_ACTION").apply {
            putExtra("action", actionName)
        }
        context.sendBroadcast(webViewIntent)
    }
}
