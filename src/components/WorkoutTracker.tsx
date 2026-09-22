import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Plus,
  Flame,
  Clock,
  Compass,
  Zap,
  Activity,
  Trash2,
  AlertCircle,
  Shield,
  Share2,
  Smartphone,
  Globe,
  Info,
  MapPin,
  Navigation,
  CheckCircle2,
  Copy,
  ExternalLink,
  Droplets
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Workout, WorkoutType, RoutePoint } from '../types';
import { calculateCalories, calculatePace, TODAY_STR } from '../lib/store';
import { nativeWorkoutBridge } from '../lib/nativeWorkoutBridge';
import { updateLiveWorkoutLocation, clearLiveWorkoutLocation } from '../lib/firestoreService';

interface WorkoutTrackerProps {
  workouts: Workout[];
  onSaveWorkout: (workout: Omit<Workout, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
  initialType?: WorkoutType;
  userId?: string;
  onActiveStateChange?: (isActive: boolean, summary?: { type: WorkoutType; durationSec: number; distanceKm: number }) => void;
  hydrationReminderEnabled?: boolean;
  hydrationReminderIntervalMin?: number;
  onOpenProfileSettings?: () => void;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({
  workouts,
  onSaveWorkout,
  onDeleteWorkout,
  initialType = 'JOG',
  userId = 'asabea-primary',
  onActiveStateChange,
  hydrationReminderEnabled = true,
  hydrationReminderIntervalMin = 30,
  onOpenProfileSettings
}) => {
  const [selectedType, setSelectedType] = useState<WorkoutType>(initialType);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);

  // Active workout state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [useGps, setUseGps] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'searching' | 'interrupted'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);

  // Safe Jog & Live Sharing
  const [isSafeJogEnabled, setIsSafeJogEnabled] = useState(true);
  const [liveShareCopied, setLiveShareCopied] = useState(false);

  // Completed Workout Summary Modal
  const [completedSummary, setCompletedSummary] = useState<Workout | null>(null);

  // Hydration Reminder State for Walk, Jog, Run
  const [showHydrationBanner, setShowHydrationBanner] = useState(false);
  const lastHydrationReminderCycleRef = useRef<number>(0);

  // Architecture & Background Tracking Info Dialog
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);

  // Manual entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<WorkoutType>('JOG');
  const [manualDistance, setManualDistance] = useState('2.0');
  const [manualMinutes, setManualMinutes] = useState('20');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [manualCalories, setManualCalories] = useState('140');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(TODAY_STR);

  // Refs for resilient wall-clock timing across app switches, calls, and screen locks
  const startTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const routePointsRef = useRef<RoutePoint[]>([]);

  const isNative = nativeWorkoutBridge.isNativeAndroid();

  const onActiveStateChangeRef = useRef(onActiveStateChange);
  useEffect(() => {
    onActiveStateChangeRef.current = onActiveStateChange;
  });

  // Notify parent of active state safely without causing re-render loops
  const lastEmittedSummaryRef = useRef<string>('inactive');
  useEffect(() => {
    if (!isActive) {
      if (lastEmittedSummaryRef.current !== 'inactive') {
        lastEmittedSummaryRef.current = 'inactive';
        onActiveStateChangeRef.current?.(false);
      }
      return;
    }

    const summaryKey = `${isActive}-${selectedType}-${Math.floor(elapsedSeconds / 2)}-${distanceKm.toFixed(2)}`;
    if (lastEmittedSummaryRef.current !== summaryKey) {
      lastEmittedSummaryRef.current = summaryKey;
      onActiveStateChangeRef.current?.(isActive, {
        type: selectedType,
        durationSec: elapsedSeconds,
        distanceKm: distanceKm
      });
    }
  }, [isActive, elapsedSeconds, distanceKm, selectedType]);

  // Keep route points ref in sync
  useEffect(() => {
    routePointsRef.current = routePoints;
  }, [routePoints]);

  // Sync metrics to native notification and web notification
  useEffect(() => {
    if (isActive && !isPaused) {
      const pace = calculatePace(elapsedSeconds, distanceKm);
      const calories = calculateCalories(selectedType, elapsedSeconds, distanceKm);
      nativeWorkoutBridge.updateMetrics({
        durationSeconds: elapsedSeconds,
        distanceKm,
        paceMinPerKm: pace,
        calories,
        workoutType: selectedType
      });
    }
  }, [elapsedSeconds, distanceKm, isActive, isPaused, selectedType]);

  // Listen to actions from Android Notification (PAUSE, RESUME, FINISH)
  useEffect(() => {
    const unsubscribe = nativeWorkoutBridge.onNativeAction((action) => {
      if (action === 'pause') {
        handlePause();
      } else if (action === 'resume') {
        handleResume();
      } else if (action === 'finish') {
        handleFinish();
      }
    });
    return () => unsubscribe();
  }, [isActive, isPaused, elapsedSeconds, distanceKm]);

  // Hydration Reminder Trigger for WALK, JOG, or RUN
  const hydrationIntervalMin = hydrationReminderIntervalMin || 30;
  const hydrationIntervalSec = Math.max(60, hydrationIntervalMin * 60);

  useEffect(() => {
    // If disabled, not active, or paused: pause/skip hydration reminders
    if (!hydrationReminderEnabled || !isActive || isPaused || elapsedSeconds <= 0) {
      return;
    }

    // Only for Walk, Jog, or Run
    if (selectedType !== 'WALK' && selectedType !== 'JOG' && selectedType !== 'RUN') {
      return;
    }

    const currentCycle = Math.floor(elapsedSeconds / hydrationIntervalSec);
    if (currentCycle > 0 && currentCycle > lastHydrationReminderCycleRef.current) {
      lastHydrationReminderCycleRef.current = currentCycle;
      setShowHydrationBanner(true);
      nativeWorkoutBridge.showHydrationReminder('💧 Hydration check! Take a few sips of water.');
    }
  }, [elapsedSeconds, isActive, isPaused, hydrationReminderEnabled, hydrationIntervalSec, selectedType]);

  // Wall-Clock Time Recalculation Engine
  const recalculateElapsedTime = () => {
    if (!startTimeRef.current || !isActive) return;

    if (isPaused) {
      // In paused state, duration is frozen up to last pause time
      return;
    }

    const now = Date.now();
    const totalElapsedMs = now - startTimeRef.current - pausedDurationRef.current;
    const computedSeconds = Math.max(0, Math.floor(totalElapsedMs / 1000));
    setElapsedSeconds(computedSeconds);
  };

  // Resilient interval + Event listeners for phone calls, WhatsApp, screen lock recovery
  useEffect(() => {
    if (isActive && !isPaused) {
      // Recalculate on regular intervals
      timerRef.current = window.setInterval(() => {
        recalculateElapsedTime();
      }, 1000);

      // CRITICAL: When user returns from a phone call, WhatsApp, Maps, or unlocks screen
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          recalculateElapsedTime();
          // Attempt to re-secure wake lock if lost
          nativeWorkoutBridge.requestWakeLock();
        }
      };

      const handleFocus = () => {
        recalculateElapsedTime();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isActive, isPaused]);

  // GPS Tracking Logic
  const startGpsTracking = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setUseGps(true);
      setGpsStatus('searching');
      setGpsError(null);

      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy, speed } = pos.coords;

            // Discard readings with very poor accuracy (>35 meters)
            if (accuracy && accuracy > 35) {
              setGpsStatus('searching');
              return;
            }

            setGpsStatus('active');
            setGpsError(null);

            const newPoint: RoutePoint = {
              lat: latitude,
              lng: longitude,
              timestamp: pos.timestamp || Date.now(),
              accuracy: accuracy || undefined,
              speed: speed !== null && speed !== undefined && speed >= 0 ? speed : undefined
            };

            // Calculate distance delta using Haversine
            if (prevCoordsRef.current) {
              const delta = getDistanceFromLatLonInKm(
                prevCoordsRef.current.lat,
                prevCoordsRef.current.lng,
                latitude,
                longitude
              );

              // Filter out stationary noise (< 2 meters) and impossible teleportation (> 120m in 1-2s)
              if (delta >= 0.002 && delta <= 0.12) {
                setDistanceKm((prev) => prev + delta);
              }
            }

            prevCoordsRef.current = { lat: latitude, lng: longitude };
            setRoutePoints((prev) => [...prev, newPoint]);

            // Safe Jog Live Location sync to Firestore
            if (isSafeJogEnabled) {
              updateLiveWorkoutLocation({
                userId,
                workoutType: selectedType,
                lat: latitude,
                lng: longitude,
                accuracy: accuracy || undefined,
                speed: speed || undefined,
                distanceKm: distanceKm,
                durationSeconds: elapsedSeconds,
                isActive: true,
                updatedAt: new Date().toISOString()
              });
            }
          },
          (err) => {
            console.warn('GPS location tracking error:', err);
            // Graceful recovery: clearly indicate missing data instead of inventing coordinates
            setGpsStatus('interrupted');
            setGpsError('GPS signal temporarily interrupted by surroundings or OS power saving. Tracking will resume automatically when signal locks.');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
          }
        );
      } catch (e) {
        setGpsStatus('interrupted');
        setGpsError('Geolocation initialization encountered an issue on this device.');
      }
    } else {
      setUseGps(false);
      setGpsStatus('idle');
      setGpsError('Geolocation is not supported on this browser.');
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    prevCoordsRef.current = null;
    setGpsStatus('idle');
  };

  // Start workout (MUST be an explicit user action)
  const handleStart = async () => {
    const now = Date.now();
    startTimeRef.current = now;
    pausedDurationRef.current = 0;
    lastPauseTimeRef.current = null;

    setIsActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setRoutePoints([]);
    routePointsRef.current = [];
    setShowHydrationBanner(false);
    lastHydrationReminderCycleRef.current = 0;
    nativeWorkoutBridge.clearHydrationReminder();

    // Start native or web tracking service
    await nativeWorkoutBridge.startService(selectedType, {
      enableGps: true,
      targetMinutes
    });

    startGpsTracking();
  };

  // Explicit user pause
  const handlePause = () => {
    if (isPaused) return;
    lastPauseTimeRef.current = Date.now();
    setIsPaused(true);
    nativeWorkoutBridge.pauseService();
  };

  // Explicit user resume
  const handleResume = () => {
    if (!isPaused) return;
    if (lastPauseTimeRef.current) {
      pausedDurationRef.current += (Date.now() - lastPauseTimeRef.current);
      lastPauseTimeRef.current = null;
    }
    setIsPaused(false);
    nativeWorkoutBridge.resumeService();
  };

  // Finish workout:
  // 1. Stop GPS tracking
  // 2. Stop foreground service
  // 3. Stop live location sharing
  // 4. Save completed workout
  // 5. Save route
  // 6. Show workout summary
  const handleFinish = async () => {
    // 1. Stop GPS
    stopGpsTracking();

    // 2. Stop foreground service
    await nativeWorkoutBridge.stopService();

    // 3. Stop live location sharing
    if (isSafeJogEnabled) {
      clearLiveWorkoutLocation(userId);
    }

    const pace = calculatePace(elapsedSeconds, distanceKm);
    const calories = calculateCalories(selectedType, elapsedSeconds, distanceKm);
    const finalRoute = [...routePointsRef.current];

    const completedWorkout: Workout = {
      id: `w-${Date.now()}`,
      userId,
      type: selectedType,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationSeconds: elapsedSeconds,
      paceMinPerKm: pace,
      calories,
      date: TODAY_STR,
      isManual: false,
      notes: targetMinutes ? `Busy day session (${targetMinutes}m target)` : 'Live workout session',
      createdAt: new Date().toISOString(),
      route: finalRoute.length > 0 ? finalRoute : undefined,
      healthConnectSynced: isNative
    };

    // 4 & 5. Save completed workout and route
    onSaveWorkout(completedWorkout);

    // Sync to Health Connect if on Android Native
    if (isNative) {
      nativeWorkoutBridge.syncToHealthConnect(completedWorkout);
    }

    // Trigger celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {
      // Ignored
    }

    // 6. Show completed workout summary
    setCompletedSummary(completedWorkout);

    // Reset active workout state
    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setRoutePoints([]);
    startTimeRef.current = null;
    pausedDurationRef.current = 0;
    setShowHydrationBanner(false);
    lastHydrationReminderCycleRef.current = 0;
    nativeWorkoutBridge.clearHydrationReminder();
  };

  const handleCancel = async () => {
    stopGpsTracking();
    await nativeWorkoutBridge.stopService();
    if (isSafeJogEnabled) {
      clearLiveWorkoutLocation(userId);
    }
    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setRoutePoints([]);
    startTimeRef.current = null;
    pausedDurationRef.current = 0;
    setShowHydrationBanner(false);
    lastHydrationReminderCycleRef.current = 0;
    nativeWorkoutBridge.clearHydrationReminder();
  };

  const handleCopyLiveLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/?live=${userId}`;
      navigator.clipboard.writeText(shareUrl);
      setLiveShareCopied(true);
      setTimeout(() => setLiveShareCopied(false), 2500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationSec = parseInt(manualMinutes || '0', 10) * 60 + parseInt(manualSeconds || '0', 10);
    const distKm = parseFloat(manualDistance || '0');
    const pace = calculatePace(durationSec, distKm);

    onSaveWorkout({
      userId,
      type: manualType,
      distanceKm: distKm,
      durationSeconds: durationSec,
      paceMinPerKm: pace,
      calories: parseInt(manualCalories || '0', 10) || calculateCalories(manualType, durationSec, distKm),
      date: manualDate,
      isManual: true,
      notes: manualNotes.trim() ? manualNotes : 'Manually recorded workout'
    });

    setShowManualModal(false);
    setManualNotes('');
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPace = calculatePace(elapsedSeconds, distanceKm);
  const currentCalories = calculateCalories(selectedType, elapsedSeconds, distanceKm);

  // SVG route path generator for active workout or summary
  const renderSvgRoute = (points: RoutePoint[], heightPx = 140) => {
    if (points.length < 2) {
      return (
        <div className="h-28 flex flex-col items-center justify-center bg-gray-50/80 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
          <Navigation className="w-5 h-5 mb-1 text-gray-300 animate-pulse" />
          <span>Recording GPS route points...</span>
        </div>
      );
    }

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);

    const width = 320;
    const height = heightPx;
    const padding = 20;

    const pathData = points
      .map((p, idx) => {
        const x = padding + ((p.lng - minLng) / lngSpan) * (width - 2 * padding);
        const y = height - (padding + ((p.lat - minLat) / latSpan) * (height - 2 * padding));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const startX = padding + ((points[0].lng - minLng) / lngSpan) * (width - 2 * padding);
    const startY = height - (padding + ((points[0].lat - minLat) / latSpan) * (height - 2 * padding));

    const endX = padding + ((points[points.length - 1].lng - minLng) / lngSpan) * (width - 2 * padding);
    const endY = height - (padding + ((points[points.length - 1].lat - minLat) / latSpan) * (height - 2 * padding));

    return (
      <div className="relative bg-[#FAF9F6] rounded-2xl p-2 border border-gray-100 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Subtle grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0efe9" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" rx="12" />

          {/* Route path */}
          <path
            d={pathData}
            fill="none"
            stroke="#E96A8D"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start marker */}
          <circle cx={startX} cy={startY} r="5" fill="#65A87A" stroke="#ffffff" strokeWidth="2" />

          {/* Current / End marker */}
          <circle cx={endX} cy={endY} r="6" fill="#E96A8D" stroke="#ffffff" strokeWidth="2" />
          <circle cx={endX} cy={endY} r="10" fill="none" stroke="#E96A8D" strokeWidth="1.5" className="animate-ping" />
        </svg>

        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] font-bold text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#65A87A]" /> Start
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#E96A8D]" /> {isActive ? 'Live Position' : 'Finish'}
          </span>
          <span className="text-gray-400 font-medium">({points.length} GPS points)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      {/* Title & Architecture Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#252525]">Workout Tracker</h2>
          <p className="text-xs text-gray-500 font-medium">
            Walk, Jog, or Run • Continuous background tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchitectureModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 font-bold text-xs hover:border-[#E96A8D] transition"
            title="Background & Android Architecture Details"
          >
            <Info className="w-3.5 h-3.5 text-[#E96A8D]" />
            <span className="hidden sm:inline">Background Info</span>
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E96A8D]/40 text-[#E96A8D] font-bold text-xs shadow-xs hover:bg-[#FCECEF] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>
      </div>

      {/* Architecture Status Badge */}
      <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-2xl p-3 flex items-start gap-2.5">
        {isNative ? (
          <Smartphone className="w-4 h-4 text-[#65A87A] shrink-0 mt-0.5" />
        ) : (
          <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        )}
        <div className="text-xs flex-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#252525]">
              {isNative ? 'Android Native Tracking Active' : 'Web & PWA Tracking Active'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
              {isNative ? 'Foreground Service' : 'Resilient Wall-Clock'}
            </span>
          </div>
          <p className="text-gray-500 mt-0.5 text-[11px] leading-relaxed">
            {isNative
              ? 'Using Android Location Foreground Service, persistent ongoing notification, and Health Connect.'
              : 'Continuous wall-clock timer & Screen Wake Lock enabled. Switching to WhatsApp, answering phone calls, or screen locking will NOT pause your workout.'}
          </p>
        </div>
      </div>

      {/* Busy Day Quick Options */}
      {!isActive && (
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#252525] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#E96A8D]" />
              Busy Day Mode
            </span>
            <span className="text-[11px] text-[#65A87A] font-semibold">
              Consistency over perfection
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map((mins) => {
              const isSelected = targetMinutes === mins;
              return (
                <button
                  key={mins}
                  onClick={() => setTargetMinutes(isSelected ? null : mins)}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border ${
                    isSelected
                      ? 'bg-[#E96A8D] text-white border-[#E96A8D] shadow-xs'
                      : 'bg-[#FCECEF]/60 text-[#E96A8D] border-transparent hover:bg-[#FCECEF]'
                  }`}
                >
                  {mins} MIN
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Type Selection */}
      {!isActive && (
        <div className="grid grid-cols-3 gap-2 bg-[#FAF9F6] p-1.5 rounded-2xl border border-gray-200/70">
          {(['WALK', 'JOG', 'RUN'] as WorkoutType[]).map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`py-2.5 rounded-xl font-extrabold text-xs tracking-wider transition-all ${
                  isSelected
                    ? 'bg-white text-[#E96A8D] shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-[#252525]'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Safe Jog Toggle */}
      {!isActive && (
        <div className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#252525] block">Safe Jog • Live Location</span>
              <span className="text-[11px] text-gray-500">Syncs live coordinates to trusted contacts</span>
            </div>
          </div>
          <button
            onClick={() => setIsSafeJogEnabled(!isSafeJogEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              isSafeJogEnabled ? 'bg-[#E96A8D]' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                isSafeJogEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Active Workout Screen / Start Controller */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md text-center">
        {isActive ? (
          <div className="space-y-5">
            {/* Header tag */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] text-xs font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-[#E96A8D] animate-ping" />
                Active {selectedType} Session {targetMinutes ? `(${targetMinutes}m)` : ''}
              </div>

              {isSafeJogEnabled && (
                <button
                  onClick={handleCopyLiveLink}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#65A87A] bg-[#65A87A]/10 px-2.5 py-1 rounded-full hover:bg-[#65A87A]/20 transition"
                  title="Share Live Jog Link"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{liveShareCopied ? 'Link Copied!' : 'Share Live'}</span>
                </button>
              )}
            </div>

            {/* Gentle In-App Hydration Reminder Banner */}
            {showHydrationBanner && (
              <div
                id="workout-hydration-reminder-banner"
                role="alert"
                className="bg-gradient-to-r from-[#EFF6FF] via-[#F0FDF4] to-[#EFF6FF] border border-[#93C5FD] p-3.5 rounded-2xl shadow-xs text-left flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-[#1E40AF] tracking-wide uppercase">
                        Hydration Check
                      </span>
                      <span className="text-[10px] font-semibold text-[#3B82F6] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        Every {hydrationIntervalMin}m
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1E293B] mt-0.5">
                      💧 Hydration check! Take a few sips of water.
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Workout timer & GPS continue uninterrupted.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    id="dismiss-hydration-banner-btn"
                    onClick={() => {
                      setShowHydrationBanner(false);
                      nativeWorkoutBridge.clearHydrationReminder();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-[#1E40AF] font-bold text-xs hover:bg-blue-50 active:scale-95 transition shadow-2xs cursor-pointer"
                    title="Dismiss reminder"
                  >
                    Dismiss
                  </button>
                  {onOpenProfileSettings && (
                    <button
                      type="button"
                      onClick={onOpenProfileSettings}
                      className="text-[10px] text-gray-400 hover:text-[#3B82F6] underline decoration-dotted transition"
                    >
                      Settings
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Big Timer */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                Duration
              </span>
              <div className="text-5xl sm:text-6xl font-black text-[#252525] font-mono tracking-tight">
                {formatTime(elapsedSeconds)}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3 pt-2 pb-2 border-y border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Distance</span>
                <span className="text-xl font-black text-[#252525]">
                  {distanceKm.toFixed(2)}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 block">km</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Pace</span>
                <span className="text-xl font-black text-[#252525]">{currentPace}</span>
                <span className="text-[10px] font-semibold text-gray-500 block">min/km</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Calories</span>
                <span className="text-xl font-black text-orange-500">{currentCalories}</span>
                <span className="text-[10px] font-semibold text-gray-500 block">est. kcal</span>
              </div>
            </div>

            {/* Live GPS Route Visualizer */}
            <div className="text-left space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Live Route & Coordinates
              </span>
              {renderSvgRoute(routePoints, 120)}
            </div>

            {/* Live GPS / Sensor indicator */}
            <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <Compass className={`w-3.5 h-3.5 ${gpsStatus === 'active' ? 'text-[#3B82F6] animate-spin' : 'text-gray-400'}`} />
              <span>
                {gpsStatus === 'active'
                  ? 'GPS high-accuracy live tracking'
                  : gpsStatus === 'searching'
                  ? 'Acquiring high-accuracy GPS lock...'
                  : gpsStatus === 'interrupted'
                  ? 'GPS signal interrupted (recovering)'
                  : 'Cadence calculation active'}
              </span>
            </div>

            {gpsError && (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1.5 rounded-xl text-left flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:bg-amber-600 active:scale-95 transition"
                  title="Pause Workout (Explicit Action)"
                >
                  <Pause className="w-6 h-6 fill-white" />
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="w-14 h-14 rounded-full bg-[#65A87A] text-white flex items-center justify-center shadow-lg hover:bg-[#528d65] active:scale-95 transition"
                  title="Resume Workout"
                >
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </button>
              )}

              <button
                onClick={handleFinish}
                className="px-6 py-4 rounded-full bg-[#E96A8D] text-white font-extrabold text-sm flex items-center gap-2 shadow-lg hover:bg-[#d85579] active:scale-95 transition"
                title="Finish Workout"
              >
                <Check className="w-5 h-5 stroke-[3px]" />
                FINISH
              </button>

              <button
                onClick={handleCancel}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition"
                title="Discard Workout"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center mx-auto mb-2">
              <Flame className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-[#252525]">
              Ready for a {selectedType}?
            </h3>

            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {targetMinutes
                ? `Quick ${targetMinutes}-minute consistency session selected. Tap start when ready!`
                : 'Put on your shoes. Even a 10-minute walk counts as a win.'}
            </p>

            {/* Pre-workout Hydration Reminder info badge */}
            <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#EFF6FF] rounded-xl border border-blue-100 text-gray-600 max-w-sm mx-auto">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span className="text-[11px] font-medium">Hydration check:</span>
                <span className="text-[11px] font-bold text-[#1E40AF]">
                  {hydrationReminderEnabled ? `Every ${hydrationIntervalMin} min` : 'Turned off'}
                </span>
              </div>
              {onOpenProfileSettings && (
                <button
                  type="button"
                  onClick={onOpenProfileSettings}
                  className="text-[11px] font-bold text-[#3B82F6] hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl bg-[#E96A8D] text-white font-extrabold text-base shadow-lg shadow-[#E96A8D]/25 hover:bg-[#d85579] active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              START {selectedType}
            </button>
          </div>
        )}
      </div>

      {/* Workout History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-600">
            Workout History
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            {workouts.length} recorded
          </span>
        </div>

        {workouts.length > 0 ? (
          <div className="space-y-2.5">
            {workouts.map((w) => {
              const mins = Math.floor(w.durationSeconds / 60);
              const secs = w.durationSeconds % 60;
              const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center font-black text-xs">
                      {w.type === 'RUN' ? '🏃🏽‍♀️' : w.type === 'JOG' ? '👟' : '🚶🏽‍♀️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#252525]">
                          {w.type}
                        </span>
                        {w.isManual ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-semibold">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 font-semibold">
                            Tracked {w.route ? '• GPS Route' : ''}
                          </span>
                        )}
                        {w.healthConnectSynced && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold">
                            Health Connect
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>{w.date}</span>
                        <span>•</span>
                        <span>{w.distanceKm} km</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                        <span>•</span>
                        <span>{w.paceMinPerKm}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-bold text-orange-500 block">
                        {w.calories} kcal
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteWorkout(w.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition"
                      title="Delete workout entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white border border-gray-100 text-center text-gray-400">
            <Activity className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">No workouts recorded yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Start your first walk, jog, or log one manually to start your history.
            </p>
          </div>
        )}
      </div>

      {/* Completed Workout Summary Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 className="w-8 h-8 text-[#E96A8D]" />
              </div>
              <h3 className="text-lg font-black text-[#252525]">Workout Complete!</h3>
              <p className="text-xs text-gray-500">
                Small steps. Big results. Every step adds up, Asabea.
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2.5 bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Distance</span>
                <span className="text-xl font-black text-[#252525]">{completedSummary.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Duration</span>
                <span className="text-xl font-black text-[#252525]">{formatTime(completedSummary.durationSeconds)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Average Pace</span>
                <span className="text-sm font-bold text-gray-700">{completedSummary.paceMinPerKm} /km</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Energy</span>
                <span className="text-sm font-bold text-orange-500">{completedSummary.calories} kcal</span>
              </div>
            </div>

            {/* Saved Route Map if available */}
            {completedSummary.route && completedSummary.route.length > 1 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Recorded Route</span>
                {renderSvgRoute(completedSummary.route, 110)}
              </div>
            )}

            {/* Safety & Sync Status */}
            <div className="text-[11px] text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-[#65A87A] font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Saved to ASABEA FIT Journal & Firestore</span>
              </div>
              {isSafeJogEnabled && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Shield className="w-3.5 h-3.5 text-[#E96A8D]" />
                  <span>Live location sharing closed safely</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCompletedSummary(null)}
              className="w-full py-3 rounded-xl bg-[#E96A8D] text-white font-extrabold text-sm shadow-md hover:bg-[#d85579] transition"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Architecture & Continuous Tracking Details Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center font-bold">
                  ⚙️
                </div>
                <h3 className="text-base font-extrabold text-[#252525]">Continuous Tracking Architecture</h3>
              </div>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-200">
                <h4 className="font-extrabold text-[#252525] mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#65A87A]" />
                  Uninterrupted Workout Rule
                </h4>
                <p>
                  ASABEA FIT does <strong>NOT</strong> pause when you switch apps (WhatsApp, Spotify, Google Maps), answer incoming phone calls, or lock your phone. The session, timer, and GPS route continue running until you explicitly tap <strong>PAUSE</strong> or <strong>FINISH</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#252525] mb-1">🌐 Web & PWA Tier</h4>
                <ul className="list-disc pl-4 space-y-1 text-gray-500">
                  <li><strong>Wall-Clock Timing:</strong> Uses true timestamp offsets so phone calls or app switching do not lose seconds.</li>
                  <li><strong>Screen Wake Lock:</strong> Prevents the screen from dimming while tracking.</li>
                  <li><strong>Signal Recovery:</strong> Recovers gracefully from GPS signal dips without inventing artificial coordinates.</li>
                  <li><strong>Honest Reality:</strong> Standard browser PWAs cannot guarantee background GPS if the Android OS puts the browser process into deep sleep.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#252525] mb-1">📱 Android Native Tier</h4>
                <ul className="list-disc pl-4 space-y-1 text-gray-500">
                  <li><strong>Location Foreground Service:</strong> Runs Android's recommended background service (<code className="bg-gray-100 px-1 py-0.5 rounded">foregroundServiceType="location"</code>) with CPU partial wake lock.</li>
                  <li><strong>Ongoing Sticky Notification:</strong> Displays live duration and distance in the Android notification drawer with instant <strong>PAUSE</strong> and <strong>FINISH</strong> action buttons.</li>
                  <li><strong>Health Connect:</strong> Writes verified sessions, routes, distances, and calories to Android Health Connect.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowArchitectureModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#FAF9F6] border border-gray-200 text-[#252525] font-extrabold text-xs hover:bg-gray-100 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#252525]">Manual Workout Entry</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Workout Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WALK', 'JOG', 'RUN'] as WorkoutType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setManualType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        manualType === t
                          ? 'bg-[#E96A8D] text-white border-[#E96A8D]'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={manualDistance}
                    onChange={(e) => setManualDistance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-[#252525]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-[#252525]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Min"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold"
                    />
                    <span className="text-[10px] text-gray-400 block mt-0.5">Minutes</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Sec"
                      value={manualSeconds}
                      onChange={(e) => setManualSeconds(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold"
                    />
                    <span className="text-[10px] text-gray-400 block mt-0.5">Seconds</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Estimated Calories (kcal)</label>
                <input
                  type="number"
                  min="0"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g., Morning jog around the park"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#E96A8D] text-white font-bold text-sm shadow-md hover:bg-[#d85579] transition"
                >
                  Save Manual Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
