# ASABEA FIT - Android Native Workout & Background Architecture

## Architecture Overview

ASABEA FIT separates continuous workout tracking into two tiers:

1. **Web / PWA Tier**:
   - Resilient wall-clock elapsed timers (`startTimestamp` and pause deltas), preventing time loss when answering calls, switching apps (WhatsApp, Spotify, Google Maps), or locking the screen.
   - Screen Wake Lock API (`navigator.wakeLock`) prevents screen sleep during active workouts.
   - HTML5 Geolocation with speed/distance filtering and signal interruption detection.
   - Web Notifications API for ongoing status updates.
   - **Important Reality**: Browser PWAs cannot guarantee continuous background GPS once Android puts the browser process into deep sleep. ASABEA FIT honestly discloses this to the user.

2. **Android Native Tier (Foreground Service + Health Connect)**:
   - Uses Android's official recommended fitness architecture (`ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION`).
   - Started **only** when the user explicitly taps "START WORKOUT" inside ASABEA FIT.
   - Holds a partial wake lock (`PowerManager.PARTIAL_WAKE_LOCK`) so GPS location updates continue even when:
     - The user receives or makes phone calls
     - The user opens WhatsApp, Spotify, or Maps
     - The user locks their phone and puts it in their pocket
   - Persistent, ongoing Notification:
     ```
     ASABEA FIT
     🏃 Jog in progress
     Duration: 18:42
     Distance: 2.03 km

     [PAUSE]  [FINISH]
     ```
   - Integrated with **Android Health Connect**:
     - `ExerciseSessionRecord` (Walking / Jogging / Running)
     - `DistanceRecord`
     - `TotalCaloriesBurnedRecord`
     - `ExerciseRoute` (GPS path)
     - `StepsRecord`

## Android Directory Structure

```
/android
├── AndroidManifest.xml
└── app/src/main/java/com/asabeafit/app
    ├── service/
    │   └── WorkoutForegroundService.kt   # Continuous location foreground service
    ├── receiver/
    │   └── WorkoutActionReceiver.kt      # PAUSE & FINISH notification action receiver
    ├── health/
    │   └── HealthConnectManager.kt       # Health Connect integration (Route, Session, Distance)
    └── bridge/
        └── WorkoutNativeBridge.kt        # WebView JavaScript Interface (window.AndroidWorkoutBridge)
```

## How to Package

When bundling ASABEA FIT into an Android APK / AAB (via Capacitor, TWA, or custom Android shell):
1. Include the provided `AndroidManifest.xml` permissions.
2. Register `WorkoutNativeBridge` in the Android WebView:
   ```kotlin
   webView.addJavascriptInterface(WorkoutNativeBridge(this, webView), "AndroidWorkoutBridge")
   ```
3. The ASABEA FIT web app will automatically detect `window.AndroidWorkoutBridge` and delegate all background GPS tracking, notifications, and Health Connect syncing to the native service.
