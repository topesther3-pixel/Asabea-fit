import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Flag,
  Navigation,
  Compass,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Footprints,
  Flame,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { RoutePoint, WorkoutType } from '../types';
import { AsabeaCompanionFigure, CompanionMode } from './AsabeaCompanionFigure';

interface LiveCompanionMapProps {
  workoutType: WorkoutType;
  isActive: boolean;
  isPaused: boolean;
  isCompleted?: boolean;
  elapsedSeconds: number;
  distanceKm: number;
  paceMinPerKm: string;
  calories: number;
  routePoints: RoutePoint[];
  gpsStatus: 'idle' | 'active' | 'searching' | 'interrupted';
  targetMinutes?: number | null;
  targetDistanceKm?: number;
  userFirstName?: string;
  personalizedBrand?: string;
  onPauseToggle?: () => void;
  onFinish?: () => void;
  onSimulatedPoint?: (point: RoutePoint, simulatedDeltaKm: number) => void;
}

export const LiveCompanionMap: React.FC<LiveCompanionMapProps> = ({
  workoutType,
  isActive,
  isPaused,
  isCompleted = false,
  elapsedSeconds,
  distanceKm,
  paceMinPerKm,
  calories,
  routePoints,
  gpsStatus,
  targetMinutes,
  targetDistanceKm = 2.0,
  userFirstName,
  personalizedBrand,
  onPauseToggle,
  onFinish,
  onSimulatedPoint
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDemoModeActive, setIsDemoModeActive] = useState(false);
  const [mapTheme, setMapTheme] = useState<'asabea' | 'satellite'>('asabea');
  const [celebrationActive, setCelebrationActive] = useState(false);

  // Trigger celebration on completion
  useEffect(() => {
    if (isCompleted) {
      setCelebrationActive(true);
    }
  }, [isCompleted]);

  // Steps calculated from real recorded workout distance (average 1,300 steps per km)
  const stepsCount = Math.round(distanceKm * 1300);

  // Calculate route progress towards target
  const targetKm = targetDistanceKm || (targetMinutes ? (targetMinutes / 60) * 5.0 : 2.0);
  const routeProgressPct = Math.min(100, Math.round((distanceKm / targetKm) * 100));

  // Determine current companion heading & movement state
  const { companionHeading, isMoving } = useMemo(() => {
    if (routePoints.length < 2) {
      return { companionHeading: 90, isMoving: isActive && !isPaused && routePoints.length > 0 };
    }

    const last = routePoints[routePoints.length - 1];
    const prev = routePoints[routePoints.length - 2];

    const dLat = last.lat - prev.lat;
    const dLng = last.lng - prev.lng;

    // Movement detection: did position change?
    const hasPositionDelta = Math.abs(dLat) > 0.00002 || Math.abs(dLng) > 0.00002;
    const moving = isActive && !isPaused && (hasPositionDelta || (last.speed !== undefined && last.speed > 0.3));

    // Screen-space heading angle (0 = North, 90 = East, 180 = South, 270 = West)
    // Note: latitude increases North (Up), Longitude increases East (Right)
    const angleRad = Math.atan2(dLng, dLat);
    let heading = (angleRad * 180) / Math.PI;
    if (heading < 0) heading += 360;

    return { companionHeading: heading, isMoving: moving };
  }, [routePoints, isActive, isPaused]);

  // Determine current CompanionMode
  const companionMode: CompanionMode = useMemo(() => {
    if (celebrationActive || isCompleted) return 'CELEBRATE';
    if (!isActive) return 'IDLE';
    if (isPaused) return 'PAUSE';
    if (!isMoving && routePoints.length > 2) return 'PAUSE'; // User stopped moving on the route
    return workoutType; // 'WALK' | 'JOG' | 'RUN'
  }, [celebrationActive, isCompleted, isActive, isPaused, isMoving, routePoints.length, workoutType]);

  // Map Bounds and SVG projection
  const width = 480;
  const height = 300;
  const padding = 45;

  const { pathData, startPoint, currentPoint, destPoint, pointsCount } = useMemo(() => {
    if (routePoints.length === 0) {
      return { pathData: '', startPoint: null, currentPoint: null, destPoint: null, pointsCount: 0 };
    }

    const lats = routePoints.map((p) => p.lat);
    const lngs = routePoints.map((p) => p.lng);

    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    // Ensure a minimum bounding box so single points or tiny distances don't break projection
    const minSpan = 0.0008; // ~80 meters
    if (maxLat - minLat < minSpan) {
      const midLat = (maxLat + minLat) / 2;
      minLat = midLat - minSpan / 2;
      maxLat = midLat + minSpan / 2;
    }
    if (maxLng - minLng < minSpan) {
      const midLng = (maxLng + minLng) / 2;
      minLng = midLng - minSpan / 2;
      maxLng = midLng + minSpan / 2;
    }

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    const project = (lat: number, lng: number) => {
      const x = padding + ((lng - minLng) / lngSpan) * (width - 2 * padding);
      const y = height - (padding + ((lat - minLat) / latSpan) * (height - 2 * padding));
      return { x, y };
    };

    const projectedPoints = routePoints.map((p) => project(p.lat, p.lng));

    const path = projectedPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

    const start = projectedPoints[0];
    const current = projectedPoints[projectedPoints.length - 1];

    // Estimated destination point (e.g. forward projection or loop turnaround)
    // If route is short, estimate a forward destination along current trajectory
    let dest = null;
    if (projectedPoints.length >= 2) {
      const first = projectedPoints[0];
      // Destination marker placed at turnaround or farthest point
      let maxDistFromStart = 0;
      let farthestPt = current;
      projectedPoints.forEach((pt) => {
        const d = Math.hypot(pt.x - first.x, pt.y - first.y);
        if (d > maxDistFromStart) {
          maxDistFromStart = d;
          farthestPt = pt;
        }
      });
      dest = farthestPt;
    }

    return {
      pathData: path,
      startPoint: start,
      currentPoint: current,
      destPoint: dest,
      pointsCount: routePoints.length
    };
  }, [routePoints, width, height, padding]);

  // Real-time speed in km/h
  const speedKmH = useMemo(() => {
    if (routePoints.length < 2) return 0;
    const last = routePoints[routePoints.length - 1];
    if (last.speed !== undefined && last.speed >= 0) {
      return last.speed * 3.6; // convert m/s to km/h
    }
    // Estimate from pace
    if (paceMinPerKm && paceMinPerKm.includes("'")) {
      const [m, s] = paceMinPerKm.replace('"', '').split("'").map(Number);
      const totalMin = m + (s || 0) / 60;
      if (totalMin > 0) return 60 / totalMin;
    }
    return workoutType === 'WALK' ? 4.5 : workoutType === 'JOG' ? 8.5 : 11.0;
  }, [routePoints, paceMinPerKm, workoutType]);

  // =========================================================================
  // DEMO / SIMULATION MODE ENGINE
  // Allows testing all 12 behaviors without physically walking outside!
  // =========================================================================
  const demoIntervalRef = useRef<number | null>(null);
  const demoStepRef = useRef<number>(0);

  // Pre-planned scenic loop coordinates for demo testing
  const demoLoopCoordinates = useMemo(() => [
    { lat: 5.6037, lng: -0.1870 }, // Start
    { lat: 5.6042, lng: -0.1868 }, // Walking forward
    { lat: 5.6048, lng: -0.1865 }, // Heading North-East
    { lat: 5.6053, lng: -0.1862 }, // Continuing
    { lat: 5.6058, lng: -0.1856 }, // Turning East
    { lat: 5.6060, lng: -0.1848 }, // Along park
    { lat: 5.6062, lng: -0.1840 }, // Turning South-East
    { lat: 5.6058, lng: -0.1834 }, // Reaching Destination Turnaround
    { lat: 5.6052, lng: -0.1838 }, // Returning back (to-and-fro route)
    { lat: 5.6046, lng: -0.1845 }, // Return path
    { lat: 5.6041, lng: -0.1855 }, // Heading back towards start
    { lat: 5.6038, lng: -0.1865 }, // Almost back
    { lat: 5.6037, lng: -0.1870 }  // Back at start (finish celebration!)
  ], []);

  const handleStartDemo = () => {
    setIsDemoModeActive(true);
    demoStepRef.current = 0;

    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);

    // Initial point
    const firstCoord = demoLoopCoordinates[0];
    onSimulatedPoint?.(
      {
        lat: firstCoord.lat,
        lng: firstCoord.lng,
        timestamp: Date.now(),
        speed: workoutType === 'WALK' ? 1.3 : 2.5
      },
      0
    );

    demoIntervalRef.current = window.setInterval(() => {
      demoStepRef.current += 1;
      const step = demoStepRef.current;

      if (step < demoLoopCoordinates.length) {
        const coord = demoLoopCoordinates[step];
        const delta = workoutType === 'WALK' ? 0.08 : 0.15;
        onSimulatedPoint?.(
          {
            lat: coord.lat,
            lng: coord.lng,
            timestamp: Date.now(),
            speed: workoutType === 'WALK' ? 1.3 : 2.5
          },
          delta
        );
      } else {
        // Destination reached! Show celebration
        setCelebrationActive(true);
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      }
    }, 1200);
  };

  const handleStopDemo = () => {
    setIsDemoModeActive(false);
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  // Format mode title based on workout mode
  const companionDisplayName = userFirstName || 'FIT';
  const modeTitle =
    workoutType === 'WALK'
      ? `Walking with ${companionDisplayName} 💗`
      : workoutType === 'JOG'
      ? `Jogging with ${companionDisplayName} 💗`
      : `Running with ${companionDisplayName} 💗`;

  return (
    <div className="rounded-3xl bg-white border border-[#FCECEF] shadow-sm overflow-hidden text-[#252525]">
      {/* ================================================================= */}
      {/* 1. TOP HEADER: "Walking with Asabea 💗" + Status Pill             */}
      {/* ================================================================= */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFF5F7] via-white to-[#EFF6FF] border-b border-[#FCECEF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center font-bold shadow-2xs">
              {workoutType === 'RUN' ? '🏃🏽‍♀️' : workoutType === 'JOG' ? '👟' : '🚶🏽‍♀️'}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#252525] tracking-tight flex items-center gap-1.5">
                <span>{modeTitle}</span>
              </h3>
              <p className="text-[11px] font-bold text-[#E96A8D] -mt-0.5">
                Live Animated Workout Companion
              </p>
            </div>
          </div>

          {/* Active status pill */}
          <div className="flex items-center gap-1.5">
            {isActive ? (
              isPaused ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 animate-pulse">
                  <Pause className="w-3 h-3 fill-amber-700" />
                  Paused
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#E96A8D] animate-ping" />
                  Live Sync
                </span>
              )
            ) : isCompleted ? (
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Completed 🎉
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                Ready
              </span>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* 2. LIVE METRICS BAR: Distance, Duration, Pace, Steps, Progress   */}
        {/* =============================================================== */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-[#FCECEF]/80 text-center">
          {/* Distance */}
          <div className="p-2 rounded-2xl bg-white/80 border border-[#FCECEF] shadow-2xs">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
              Distance
            </span>
            <div className="text-sm sm:text-base font-black text-[#252525] mt-0.5 leading-none">
              {distanceKm.toFixed(2)}
            </div>
            <span className="text-[9px] font-bold text-[#E96A8D]">km</span>
          </div>

          {/* Duration */}
          <div className="p-2 rounded-2xl bg-white/80 border border-[#FCECEF] shadow-2xs">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
              Duration
            </span>
            <div className="text-sm sm:text-base font-black text-[#252525] mt-0.5 font-mono leading-none">
              {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
              {(elapsedSeconds % 60).toString().padStart(2, '0')}
            </div>
            <span className="text-[9px] font-bold text-gray-500">time</span>
          </div>

          {/* Pace */}
          <div className="p-2 rounded-2xl bg-white/80 border border-[#FCECEF] shadow-2xs">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
              Pace
            </span>
            <div className="text-sm sm:text-base font-black text-[#252525] mt-0.5 leading-none">
              {paceMinPerKm || '0\'00"'}
            </div>
            <span className="text-[9px] font-bold text-gray-500">/km</span>
          </div>

          {/* Steps */}
          <div className="p-2 rounded-2xl bg-white/80 border border-[#DBEAFE] shadow-2xs">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
              Steps
            </span>
            <div className="text-sm sm:text-base font-black text-[#1E40AF] mt-0.5 leading-none">
              {stepsCount.toLocaleString()}
            </div>
            <span className="text-[9px] font-bold text-[#3B82F6]">steps</span>
          </div>

          {/* Route Progress */}
          <div className="p-2 rounded-2xl bg-white/80 border border-[#FCECEF] shadow-2xs">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">
              Progress
            </span>
            <div className="text-sm sm:text-base font-black text-[#E96A8D] mt-0.5 leading-none">
              {routeProgressPct}%
            </div>
            <span className="text-[9px] font-bold text-gray-500">of goal</span>
          </div>
        </div>

        {/* Thin Route Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#E96A8D] to-[#3B82F6] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, routeProgressPct)}%` }}
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. ACTUAL WORKOUT MAP & LIVE COMPANION CANVAS                     */}
      {/* ================================================================= */}
      <div className="relative bg-[#F9FBF9] overflow-hidden min-h-[300px]">
        {/* Map Grid / Tile Background Simulation */}
        <div
          className={`absolute inset-0 transition-opacity ${
            mapTheme === 'satellite' ? 'bg-[#1E293B]' : 'bg-[#FAF9F6]'
          }`}
        >
          {/* Street and Park texture */}
          <svg className="w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="streetMapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                {/* Roads */}
                <path d="M 0 30 L 60 30 M 30 0 L 30 60" stroke="#E2E8F0" strokeWidth="6" />
                <path d="M 0 30 L 60 30 M 30 0 L 30 60" stroke="#FFFFFF" strokeWidth="4" />
                {/* Secondary pathways */}
                <path d="M 10 10 L 50 50" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#streetMapGrid)" />
            {/* Soft green park area */}
            <circle cx="20%" cy="40%" r="90" fill="#DCFCE7" opacity="0.6" />
            <circle cx="75%" cy="65%" r="110" fill="#DCFCE7" opacity="0.5" />
            <circle cx="50%" cy="20%" r="60" fill="#DBEAFE" opacity="0.4" />
          </svg>
        </div>

        {/* Real GPS Route Path and Points SVG */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="relative z-10 w-full h-[300px] sm:h-[340px] pointer-events-none"
        >
          <defs>
            {/* Glow filter for route */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradient along the route */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="60%" stopColor="#E96A8D" />
              <stop offset="100%" stopColor="#FF4A7A" />
            </linearGradient>
          </defs>

          {/* 1. Recorded Route Path Line */}
          {pathData && (
            <>
              {/* Outer pink glow */}
              <path
                d={pathData}
                fill="none"
                stroke="#E96A8D"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                filter="url(#routeGlow)"
              />
              {/* Main crisp vibrant route line */}
              <path
                d={pathData}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* 2. 🏁 Start Marker */}
          {startPoint && (
            <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
              {/* Shadow */}
              <ellipse cx="0" cy="2" rx="7" ry="3" fill="#000000" opacity="0.15" />
              {/* Pin */}
              <circle cx="0" cy="-6" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <text x="0" y="-3.5" fontSize="6" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
                S
              </text>
            </g>
          )}

          {/* 3. 📍 Destination Marker */}
          {destPoint && (destPoint.x !== startPoint?.x || destPoint.y !== startPoint?.y) && (
            <g transform={`translate(${destPoint.x}, ${destPoint.y})`}>
              <ellipse cx="0" cy="2" rx="7" ry="3" fill="#000000" opacity="0.15" />
              <circle cx="0" cy="-6" r="6" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
              <text x="0" y="-3.5" fontSize="6" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
                ★
              </text>
            </g>
          )}

          {/* 4. 📍 User's Real Location Marker (Pulsing Blue Radar Ring) */}
          {currentPoint && (
            <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
              {/* Radar pulse rings */}
              <circle cx="0" cy="0" r="14" fill="#3B82F6" opacity="0.15" className="animate-ping" />
              <circle cx="0" cy="0" r="8" fill="#3B82F6" opacity="0.25" />
              {/* Center device location dot */}
              <circle cx="0" cy="0" r="4.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* 5. 🏃🏾‍♀️ ANIMATED ASABEA FIT 3D COMPANION (HTML Overlay on Route) */}
        {currentPoint && (
          <div
            className="absolute z-20 pointer-events-auto transition-all duration-700 ease-out"
            style={{
              left: `${(currentPoint.x / width) * 100}%`,
              top: `${(currentPoint.y / height) * 100}%`,
              transform: 'translate(-50%, -90%)'
            }}
          >
            <AsabeaCompanionFigure
              mode={companionMode}
              headingDeg={companionHeading}
              size={64}
              showBubble={isPaused || celebrationActive || isCompleted}
              speedKmH={speedKmH}
              bubbleText={
                celebrationActive || isCompleted
                  ? 'Workout Complete! 🎉'
                  : isPaused
                  ? 'Paused ⏸️'
                  : isMoving
                  ? `${speedKmH.toFixed(1)} km/h 💗`
                  : 'Catching breath 💨'
              }
              onClick={() => {
                if (isActive && onPauseToggle) {
                  onPauseToggle();
                }
              }}
            />
          </div>
        )}

        {/* Waiting for GPS Lock Overlay if no points yet */}
        {pointsCount === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-white/70 backdrop-blur-2xs">
            <div className="w-14 h-14 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center mb-3 shadow-sm">
              <Navigation className="w-6 h-6 animate-spin text-[#E96A8D]" />
            </div>
            <h4 className="text-base font-black text-[#252525]">
              Connecting GPS & Walking Route
            </h4>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Acquiring high-accuracy satellite lock. Start walking and your companion will travel with you along your route!
            </p>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleStartDemo}
                className="px-3.5 py-1.5 rounded-full bg-[#E96A8D] text-white text-xs font-extrabold shadow-sm hover:bg-[#d85579] active:scale-95 transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Test Demo Route</span>
              </button>
            </div>
          </div>
        )}

        {/* Map Overlays: Map Legend & Compass */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-[#FCECEF] shadow-2xs flex items-center gap-2 text-[10px] font-black text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Start
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> You
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E96A8D]" /> Companion
            </span>
          </div>

          {/* GPS accuracy status */}
          <div className="px-2.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-[9px] font-bold text-gray-500 flex items-center gap-1">
            <Compass className={`w-3 h-3 ${gpsStatus === 'active' ? 'text-[#3B82F6]' : 'text-gray-400'}`} />
            <span>
              {gpsStatus === 'active'
                ? `${pointsCount} GPS points recorded`
                : gpsStatus === 'searching'
                ? 'Acquiring GPS...'
                : 'GPS Ready'}
            </span>
          </div>
        </div>

        {/* Map Control Buttons: Theme Toggle & Demo Simulation */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {/* Demo Simulation Toggle */}
          <button
            onClick={() => {
              if (isDemoModeActive) {
                handleStopDemo();
              } else {
                handleStartDemo();
              }
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs transition flex items-center gap-1 ${
              isDemoModeActive
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-white/90 text-gray-700 hover:text-[#E96A8D] border border-gray-200'
            }`}
            title="Toggle Demo Simulated Route"
          >
            <span>🧪</span>
            <span>{isDemoModeActive ? 'Stop Demo' : 'Test Demo'}</span>
          </button>

          {/* Map Style Toggle */}
          <button
            onClick={() => setMapTheme(mapTheme === 'asabea' ? 'satellite' : 'asabea')}
            className="p-1.5 rounded-full bg-white/90 border border-gray-200 text-gray-600 hover:text-[#E96A8D] shadow-2xs"
            title="Toggle Map Style"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Celebration Banner when reaching destination or finishing */}
        {celebrationActive && (
          <div className="absolute inset-x-4 bottom-4 z-40 p-4 rounded-2xl bg-white/95 border border-[#FCECEF] shadow-lg text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-2xl block mb-1">🎉 🏃🏽‍♀️ ✨</span>
            <h4 className="text-base font-black text-[#252525]">
              Workout Complete! 🎉
            </h4>
            <p className="text-xs text-[#E96A8D] font-bold mt-0.5">
              Fantastic effort! Small steps, big results.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => {
                  setCelebrationActive(false);
                  onFinish?.();
                }}
                className="px-4 py-2 rounded-xl bg-[#E96A8D] text-white text-xs font-black shadow-md hover:bg-[#d85579] transition"
              >
                View Workout Summary
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 4. BOTTOM WORKOUT CONTROLS & COMPANION TIPS                       */}
      {/* ================================================================= */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#FCECEF] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center font-bold text-xs">
            ♡
          </div>
          <div>
            <span className="text-xs font-extrabold text-[#252525] block">
              {isPaused ? 'Workout Paused' : `${workoutType} in Progress`}
            </span>
            <span className="text-[10px] text-gray-500">
              {isPaused
                ? 'Companion is resting. Tap resume to continue.'
                : 'Companion follows your real GPS movement.'}
            </span>
          </div>
        </div>

        {/* Quick Pause / Resume & Finish Buttons */}
        {isActive && (
          <div className="flex items-center gap-2">
            {onPauseToggle && (
              <button
                onClick={onPauseToggle}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition shadow-xs ${
                  isPaused
                    ? 'bg-[#65A87A] text-white hover:bg-[#528d65]'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            )}

            {onFinish && (
              <button
                onClick={onFinish}
                className="px-3.5 py-2 rounded-xl bg-[#E96A8D] text-white text-xs font-extrabold hover:bg-[#d85579] active:scale-95 transition shadow-xs"
              >
                Finish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
