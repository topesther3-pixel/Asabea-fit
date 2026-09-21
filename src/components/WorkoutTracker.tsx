import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Workout, WorkoutType } from '../types';
import { calculateCalories, calculatePace, TODAY_STR } from '../lib/store';

interface WorkoutTrackerProps {
  workouts: Workout[];
  onSaveWorkout: (workout: Omit<Workout, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
  initialType?: WorkoutType;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({
  workouts,
  onSaveWorkout,
  onDeleteWorkout,
  initialType = 'JOG'
}) => {
  const [selectedType, setSelectedType] = useState<WorkoutType>(initialType);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);

  // Active workout state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [simulatedDistanceKm, setSimulatedDistanceKm] = useState(0);
  const [useGps, setUseGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Manual entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<WorkoutType>('JOG');
  const [manualDistance, setManualDistance] = useState('2.0');
  const [manualMinutes, setManualMinutes] = useState('20');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [manualCalories, setManualCalories] = useState('140');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(TODAY_STR);

  // Timer reference
  const timerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Stopwatch effect
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);

        // If GPS is not available or disabled, calculate realistic estimate based on pace
        if (!useGps) {
          setSimulatedDistanceKm((prev) => {
            // Realistic speed: WALK ~ 5km/h = 0.00138 km/s; JOG ~ 8km/h = 0.00222 km/s; RUN ~ 11km/h = 0.00305 km/s
            const speedKmPerSec =
              selectedType === 'WALK' ? 0.00138 : selectedType === 'JOG' ? 0.00222 : 0.00305;
            return prev + speedKmPerSec;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, useGps, selectedType]);

  // GPS tracking
  const startGpsTracking = () => {
    if ('geolocation' in navigator) {
      setUseGps(true);
      setGpsError(null);
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (prevCoordsRef.current) {
              const d = getDistanceFromLatLonInKm(
                prevCoordsRef.current.lat,
                prevCoordsRef.current.lng,
                latitude,
                longitude
              );
              if (d > 0.001 && d < 0.1) {
                setSimulatedDistanceKm((prev) => prev + d);
              }
            }
            prevCoordsRef.current = { lat: latitude, lng: longitude };
          },
          (err) => {
            console.warn('GPS position error:', err);
            setGpsError('GPS signal unavailable. Using estimated cadence distance.');
            setUseGps(false);
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
        );
      } catch (e) {
        setGpsError('GPS error on this device. Using estimated cadence.');
        setUseGps(false);
      }
    } else {
      setGpsError('GPS not supported in this browser.');
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    prevCoordsRef.current = null;
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSimulatedDistanceKm(0);
    startGpsTracking();
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleFinish = () => {
    stopGpsTracking();
    const pace = calculatePace(elapsedSeconds, simulatedDistanceKm);
    const calories = calculateCalories(selectedType, elapsedSeconds, simulatedDistanceKm);

    onSaveWorkout({
      userId: 'asabea-primary',
      type: selectedType,
      distanceKm: parseFloat(simulatedDistanceKm.toFixed(2)),
      durationSeconds: elapsedSeconds,
      paceMinPerKm: pace,
      calories: calories,
      date: TODAY_STR,
      isManual: false,
      notes: targetMinutes ? `Busy day session (${targetMinutes}m target)` : 'Live workout session'
    });

    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSimulatedDistanceKm(0);
  };

  const handleCancel = () => {
    stopGpsTracking();
    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSimulatedDistanceKm(0);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationSec = parseInt(manualMinutes || '0', 10) * 60 + parseInt(manualSeconds || '0', 10);
    const distKm = parseFloat(manualDistance || '0');
    const pace = calculatePace(durationSec, distKm);

    onSaveWorkout({
      userId: 'asabea-primary',
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

  // Format seconds to MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPace = calculatePace(elapsedSeconds, simulatedDistanceKm);
  const currentCalories = calculateCalories(selectedType, elapsedSeconds, simulatedDistanceKm);

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#252525]">Workout Tracker</h2>
          <p className="text-xs text-gray-500 font-medium">
            Walk, Jog, or Run at your pace
          </p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E96A8D]/40 text-[#E96A8D] font-bold text-xs shadow-xs hover:bg-[#FCECEF] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Manual Entry</span>
        </button>
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

      {/* Active Workout Screen / Start Controller */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md text-center">
        {isActive ? (
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] text-xs font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-[#E96A8D] animate-ping" />
              Active {selectedType} Session {targetMinutes ? `(${targetMinutes}m target)` : ''}
            </div>

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
                  {simulatedDistanceKm.toFixed(2)}
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

            {/* Live GPS / Sensor indicator */}
            <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>{useGps ? 'GPS live positioning active' : 'Cadence-based distance calculation'}</span>
            </div>
            {gpsError && (
              <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                {gpsError}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:bg-amber-600 active:scale-95 transition"
                  title="Pause Workout"
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
              >
                <Check className="w-5 h-5 stroke-[3px]" />
                FINISH
              </button>

              <button
                onClick={handleCancel}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition"
                title="Discard"
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
            {workouts.map((w, idx) => {
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
                            Manual entry
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 font-semibold">
                            Tracked
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
