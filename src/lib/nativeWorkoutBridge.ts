/**
 * ASABEA FIT - Native & Web Continuous Workout Tracking Bridge
 *
 * ARCHITECTURAL SPECIFICATION:
 * - On Web/PWA:
 *   - Uses wall-clock timestamp offsets so phone calls, app switching (WhatsApp, Music, Maps),
 *     or screen locking do NOT pause or drift the timer.
 *   - Uses HTML5 Geolocation API with accuracy filtering and signal loss detection.
 *   - Uses Screen Wake Lock API (navigator.wakeLock) to keep tracking awake while screen is on.
 *   - Uses Web Notifications API with ongoing tag and PAUSE/FINISH action prompts.
 *   - Honestly reflects that Web/PWA cannot guarantee continuous GPS execution once Android OS
 *     suspends background browser tabs.
 *
 * - On Android Native (TWA / WebView / Capacitor / Standalone):
 *   - Calls Android Native Foreground Service (WorkoutForegroundService) with type="location".
 *   - Runs continuous background GPS via FusedLocationProviderClient with PARTIAL_WAKE_LOCK.
 *   - Displays persistent, non-dismissible Ongoing Android Notification with live metrics and PAUSE / FINISH actions.
 *   - Bridges directly to Android Health Connect (ExerciseSessionRecord, ExerciseRoute, DistanceRecord, StepsRecord, Calories).
 */

import { Workout, RoutePoint } from '../types';

export interface NativeWorkoutMetrics {
  durationSeconds: number;
  distanceKm: number;
  paceMinPerKm: string;
  calories: number;
  workoutType: string;
}

export interface NativeBridgeState {
  isNative: boolean;
  platform: 'android-native' | 'web-pwa';
  foregroundServiceRunning: boolean;
  healthConnectAvailable: boolean;
}

// Global declaration for window.AndroidWorkoutBridge injected by Android WebView
declare global {
  interface Window {
    AndroidWorkoutBridge?: {
      startWorkout: (type: string, optionsJson: string) => boolean;
      pauseWorkout: () => boolean;
      resumeWorkout: () => boolean;
      stopWorkout: () => string; // returns JSON with final stats/route
      updateMetrics: (metricsJson: string) => boolean;
      syncHealthConnect: (workoutJson: string) => boolean;
      isHealthConnectAvailable: () => boolean;
      showHydrationReminder?: (message: string) => boolean;
    };
  }
}

class WorkoutTrackingBridge {
  private activeNotification: Notification | null = null;
  private wakeLockSentinel: any = null;
  private isNativeAndroidEnv: boolean = false;
  private actionListeners: Array<(action: 'pause' | 'resume' | 'finish') => void> = [];

  constructor() {
    this.isNativeAndroidEnv = typeof window !== 'undefined' && !!window.AndroidWorkoutBridge;
    
    // Listen for events dispatched from native Android action receivers
    if (typeof window !== 'undefined') {
      window.addEventListener('asabea_workout_action', (event: any) => {
        const action = event.detail?.action;
        if (action === 'pause' || action === 'resume' || action === 'finish') {
          this.actionListeners.forEach((listener) => listener(action));
        }
      });

      // Listen for notification action clicks forwarded from Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'ASABEA_WORKOUT_ACTION') {
            const action = event.data.action;
            if (action === 'pause' || action === 'resume' || action === 'finish') {
              this.actionListeners.forEach((listener) => listener(action));
            }
          }
        });
      }

      // Re-request wake lock if window regains visibility during active workout
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.wakeLockSentinel === null) {
          // Handled externally if workout is marked active
        }
      });
    }
  }

  public isNativeAndroid(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidWorkoutBridge;
  }

  public onNativeAction(callback: (action: 'pause' | 'resume' | 'finish') => void): () => void {
    this.actionListeners.push(callback);
    return () => {
      this.actionListeners = this.actionListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Start workout service.
   * MUST only be called when the user actively and explicitly presses START WORKOUT.
   */
  public async startService(workoutType: string, options: { enableGps: boolean; targetMinutes?: number | null }): Promise<boolean> {
    if (this.isNativeAndroid()) {
      try {
        const success = window.AndroidWorkoutBridge!.startWorkout(
          workoutType,
          JSON.stringify(options)
        );
        return success;
      } catch (err) {
        console.warn('Native Android startWorkout error, falling back to Web mode:', err);
      }
    }

    // Web / PWA Fallback: Acquire Screen Wake Lock
    await this.requestWakeLock();

    // Request Notification permission if not yet granted
    await this.requestNotificationPermission();

    return true;
  }

  /**
   * Pause the active workout service.
   */
  public pauseService(): void {
    if (this.isNativeAndroid()) {
      try {
        window.AndroidWorkoutBridge!.pauseWorkout();
      } catch (e) {
        console.warn('Native Android pauseWorkout error:', e);
      }
    }
  }

  /**
   * Resume the active workout service.
   */
  public resumeService(): void {
    if (this.isNativeAndroid()) {
      try {
        window.AndroidWorkoutBridge!.resumeWorkout();
      } catch (e) {
        console.warn('Native Android resumeWorkout error:', e);
      }
    }
  }

  /**
   * Update active ongoing notification and metrics.
   * On Android: Updates the native persistent notification with custom remote views.
   * On Web: Updates the active Web Notification with ongoing tag.
   */
  public updateMetrics(metrics: NativeWorkoutMetrics): void {
    if (this.isNativeAndroid()) {
      try {
        window.AndroidWorkoutBridge!.updateMetrics(JSON.stringify(metrics));
        return;
      } catch (e) {
        console.warn('Native Android updateMetrics error:', e);
      }
    }

    // Web / PWA Notification update
    this.updateWebNotification(metrics);
  }

  /**
   * Stop the workout service completely.
   */
  public async stopService(): Promise<void> {
    if (this.isNativeAndroid()) {
      try {
        window.AndroidWorkoutBridge!.stopWorkout();
      } catch (e) {
        console.warn('Native Android stopWorkout error:', e);
      }
    }

    // Release Screen Wake Lock
    this.releaseWakeLock();

    // Clear Web Notification and Hydration Reminder
    this.clearWebNotification();
    this.clearHydrationReminder();
  }

  /**
   * Dispatch a gentle hydration reminder during active WALK, JOG, RUN
   */
  public showHydrationReminder(message: string = '💧 Hydration check! Take a few sips of water.'): void {
    // 1. Android Native Service
    if (this.isNativeAndroid() && window.AndroidWorkoutBridge?.showHydrationReminder) {
      try {
        window.AndroidWorkoutBridge.showHydrationReminder(message);
      } catch (e) {
        console.warn('Native showHydrationReminder error:', e);
      }
    }

    // 2. Web Notification (for background / locked screen / switched tab)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification('ASABEA FIT • Hydration Check', {
              body: message,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: 'asabea-hydration-reminder',
              renotify: true,
              silent: false,
              data: { url: '/?tab=workout' }
            } as any);
          });
        } else {
          new Notification('ASABEA FIT • Hydration Check', {
            body: message,
            icon: '/icon.svg',
            tag: 'asabea-hydration-reminder'
          });
        }
      } catch (e) {
        // Notification throttled or not allowed in background
      }
    }

    // 3. Gentle tactile vibration if device hardware supports it
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([180, 100, 180]);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Clear any active hydration reminder notification
   */
  public clearHydrationReminder(): void {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.getNotifications({ tag: 'asabea-hydration-reminder' }).then((notifications) => {
          notifications.forEach((n) => n.close());
        });
      }).catch(() => {});
    }
  }

  /**
   * Sync completed workout to Health Connect on Android.
   */
  public async syncToHealthConnect(workout: Workout): Promise<boolean> {
    if (this.isNativeAndroid() && window.AndroidWorkoutBridge?.syncHealthConnect) {
      try {
        return window.AndroidWorkoutBridge.syncHealthConnect(JSON.stringify(workout));
      } catch (err) {
        console.warn('Health Connect sync failed:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Screen Wake Lock API for Web/PWA
   */
  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.log('Wake Lock request notice (normal in background or restricted tabs):', err);
        return false;
      }
    }
    return false;
  }

  public releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {
        // Ignored
      }
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Web Notification Management
   */
  private async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    if (Notification.permission !== 'denied') {
      try {
        return await Notification.requestPermission();
      } catch (e) {
        return 'denied';
      }
    }
    return Notification.permission;
  }

  private updateWebNotification(metrics: NativeWorkoutMetrics): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const mins = Math.floor(metrics.durationSeconds / 60);
    const secs = metrics.durationSeconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const distStr = `${metrics.distanceKm.toFixed(2)} km`;

    const title = 'ASABEA FIT';
    const body = `🏃 ${metrics.workoutType} in progress\nDuration: ${timeStr} • Distance: ${distStr} • ${metrics.paceMinPerKm}/km`;

    try {
      // Use ServiceWorker registration if available for action support
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: 'asabea-active-workout',
            renotify: false,
            silent: true,
            data: { url: '/?tab=workout' }
          } as any);
        });
      } else {
        // Fallback standard Notification
        if (!this.activeNotification) {
          this.activeNotification = new Notification(title, {
            body,
            icon: '/icon.svg',
            tag: 'asabea-active-workout',
            silent: true
          });
        }
      }
    } catch (e) {
      // Notification throttling in browser
    }
  }

  private clearWebNotification(): void {
    if (this.activeNotification) {
      try {
        this.activeNotification.close();
      } catch (e) {
        // Ignored
      }
      this.activeNotification = null;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.getNotifications({ tag: 'asabea-active-workout' }).then((notifications) => {
          notifications.forEach((n) => n.close());
        });
      }).catch(() => {});
    }
  }
}

export const nativeWorkoutBridge = new WorkoutTrackingBridge();
