import React, { useState, useEffect } from 'react';
import {
  Flame,
  Droplets,
  Scale,
  Footprints,
  Clock,
  Zap,
  CheckCircle2,
  Plus,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Moon,
  Heart,
  Activity,
  MapPin,
  X
} from 'lucide-react';
import { AppState, TODAY_STR } from '../lib/store';
import { TabType } from './BottomNav';

interface HomeDashboardProps {
  state: AppState;
  dayNumber: number;
  onNavigateTab: (tab: TabType) => void;
  onStartWorkout: () => void;
  onQuickWater: (amountMl: number) => void;
  onOpenWeightModal: () => void;
  onOpenFoodModal: () => void;
  onOpenMoodModal: () => void;
}

// Reusable Circular Progress Ring Component in ASABEA FIT Pink & Blue
interface CircularMetricProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color: string; // e.g. '#E96A8D' (pink) or '#3B82F6' (blue)
  trackColor: string; // e.g. '#FCECEF' (light pink) or '#EFF6FF' (light blue)
  icon: React.ReactNode;
}

const CircularProgressRing: React.FC<CircularMetricProps> = ({
  size = 46,
  strokeWidth = 4,
  progress,
  color,
  trackColor,
  icon
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Centered Icon */}
      <div className="absolute inset-0 flex items-center justify-center text-xs">
        {icon}
      </div>
    </div>
  );
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  state,
  dayNumber,
  onNavigateTab,
  onStartWorkout,
  onQuickWater,
  onOpenWeightModal,
  onOpenFoodModal,
  onOpenMoodModal
}) => {
  const { profile, workouts, weights, waterLogs, habits } = state;

  // Real recorded metrics from user's workouts today
  const todayWorkouts = workouts.filter((w) => w.date === TODAY_STR);
  const totalWorkoutMinutes = todayWorkouts.reduce(
    (acc, w) => acc + Math.round(w.durationSeconds / 60),
    0
  );
  const totalWorkoutDistanceKm = todayWorkouts.reduce((acc, w) => acc + w.distanceKm, 0);
  const totalWorkoutCalories = todayWorkouts.reduce((acc, w) => acc + w.calories, 0);

  // Steps: Real steps calculated from recorded workouts (average 1,300 steps per km) or 0 if no workout recorded
  const stepsFromWorkouts = totalWorkoutDistanceKm > 0 ? Math.round(totalWorkoutDistanceKm * 1300) : 0;
  const stepTarget = 8000;
  const stepProgress = Math.min(100, Math.round((stepsFromWorkouts / stepTarget) * 100));

  const calorieTarget = 430;
  const calorieProgress = Math.min(100, Math.round((totalWorkoutCalories / calorieTarget) * 100));

  const activeTargetMin = 30;
  const activeProgress = Math.min(100, Math.round((totalWorkoutMinutes / activeTargetMin) * 100));

  // Hydration real data
  const todayWaterTotalMl = waterLogs
    .filter((w) => w.date === TODAY_STR)
    .reduce((acc, w) => acc + w.amountMl, 0);
  const waterGoalMl = profile.waterDailyGoalMl || 2500;
  const waterProgress = Math.min(100, Math.round((todayWaterTotalMl / waterGoalMl) * 100));

  // Weight real data
  const todayWeightEntry = weights.find((w) => w.date === TODAY_STR);
  const latestWeight =
    todayWeightEntry?.weightKg ?? weights[0]?.weightKg ?? profile.currentWeight ?? profile.startingWeight;

  const todayHabit = habits[TODAY_STR];

  // Weight Journey calculations
  const startWeight = profile.startingWeight;
  const goalWeight = profile.goalWeight;
  const totalToLose = Math.max(0.1, startWeight - goalWeight);
  const lostSoFar = Math.max(0, startWeight - latestWeight);
  const progressPercent = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));

  // Local storage for real Sleep and Heart Rate logs (so user can record actual measurements without inventing fake data)
  const [sleepData, setSleepData] = useState<{ hours: number; minutes: number; quality?: string } | null>(null);
  const [heartRateData, setHeartRateData] = useState<{ bpm: number; condition?: string } | null>(null);

  // Modals for optional manual entry of real Sleep and Heart Rate
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showHeartRateModal, setShowHeartRateModal] = useState(false);
  const [inputSleepHours, setInputSleepHours] = useState('7');
  const [inputSleepMinutes, setInputSleepMinutes] = useState('30');
  const [inputSleepQuality, setInputSleepQuality] = useState('Good');
  const [inputBpm, setInputBpm] = useState('72');
  const [inputBpmCondition, setInputBpmCondition] = useState('Resting');

  useEffect(() => {
    try {
      const storedSleep = localStorage.getItem(`asabea_fit_sleep_${TODAY_STR}`);
      if (storedSleep) {
        setSleepData(JSON.parse(storedSleep));
      }
      const storedHeart = localStorage.getItem(`asabea_fit_heart_${TODAY_STR}`);
      if (storedHeart) {
        setHeartRateData(JSON.parse(storedHeart));
      }
    } catch (e) {
      console.error('Error loading local health data:', e);
    }
  }, []);

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(inputSleepHours) || 0;
    const minutes = parseInt(inputSleepMinutes, 10) || 0;
    if (hours > 0 || minutes > 0) {
      const data = { hours, minutes, quality: inputSleepQuality };
      setSleepData(data);
      localStorage.setItem(`asabea_fit_sleep_${TODAY_STR}`, JSON.stringify(data));
    }
    setShowSleepModal(false);
  };

  const handleSaveHeartRate = (e: React.FormEvent) => {
    e.preventDefault();
    const bpm = parseInt(inputBpm, 10) || 0;
    if (bpm > 30 && bpm < 250) {
      const data = { bpm, condition: inputBpmCondition };
      setHeartRateData(data);
      localStorage.setItem(`asabea_fit_heart_${TODAY_STR}`, JSON.stringify(data));
    }
    setShowHeartRateModal(false);
  };

  // Today's Wins: ONLY real recorded items!
  const recordedWins: { label: string; done: boolean }[] = [];
  if (todayHabit?.noZeroDay || dayNumber >= 1) {
    recordedWins.push({ label: 'I showed up', done: true });
  }
  if (todayWorkouts.length > 0 || todayHabit?.workout) {
    recordedWins.push({ label: 'I moved my body', done: true });
  }
  if (todayWaterTotalMl > 0 || todayHabit?.water) {
    recordedWins.push({
      label: `I drank water (${
        todayWaterTotalMl >= 1000
          ? `${(todayWaterTotalMl / 1000).toFixed(1)}L`
          : `${todayWaterTotalMl}ml`
      })`,
      done: true
    });
  }
  if (todayHabit?.healthyMeal || state.foodEntries.some((f) => f.date === TODAY_STR)) {
    recordedWins.push({ label: 'I nourished myself with a healthy meal', done: true });
  }
  if (sleepData || todayHabit?.sleep) {
    recordedWins.push({ label: 'I prioritized rest and sleep', done: true });
  }

  // Active streak
  const streak =
    Object.keys(habits).filter((d) => habits[d]?.noZeroDay || habits[d]?.workout).length || 1;

  // Date formatting for the top header
  const todayDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const firstName = profile.displayName ? profile.displayName.split(' ')[0] : 'Asabea';

  return (
    <div className="space-y-4 pb-24 max-w-xl mx-auto px-4 pt-1">
      {/* ======================================================== */}
      {/* 1. TOP HEADER SECTION: Brand, Greeting, Tagline, Date & Weather */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-[#FCECEF] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] font-extrabold text-[11px] tracking-wider uppercase">
            <span>ASABEA FIT</span>
            <span className="text-xs">♡</span>
          </div>

          {/* Date and Weather */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">
              {todayDateFormatted}
            </span>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#DBEAFE] text-xs font-bold shadow-2xs">
              <span>🌤️</span>
              <span>28°C</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#252525] tracking-tight flex items-center gap-1.5">
              <span>Hi {firstName}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-sm font-extrabold text-[#E96A8D] tracking-wide mt-0.5">
              "Small Steps. Big Results."
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Day {dayNumber}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN ACTIVITY AREA: Large White Card with Pink/Blue Accents */}
      {/*    Left: Steps, Calories, Active Indicators              */}
      {/*    Right: Friendly 3D Female Fitness Avatar              */}
      {/*    Bottom: Distance Pill                                 */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#FCECEF] p-5 shadow-sm">
        {/* Subtle decorative background gradient glows */}
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-[#FCECEF]/40 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-[#EFF6FF]/60 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Left Column: 3 Circular Progress Indicators */}
          <div className="space-y-4 flex-1">
            {/* 1. Steps Indicator */}
            <div className="flex items-center gap-3">
              <CircularProgressRing
                progress={stepProgress}
                color="#3B82F6"
                trackColor="#EFF6FF"
                icon={<Footprints className="w-4 h-4 text-[#3B82F6]" />}
              />
              <div>
                <div className="text-base sm:text-lg font-black text-[#252525] leading-tight flex items-baseline gap-1">
                  <span>{stepsFromWorkouts.toLocaleString()}</span>
                  <span className="text-xs font-bold text-[#3B82F6]/75">
                    / {stepTarget.toLocaleString()} Steps
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {stepsFromWorkouts > 0 ? 'From recorded workouts' : 'Goal: 8,000 steps'}
                </div>
              </div>
            </div>

            {/* 2. Calories Indicator */}
            <div className="flex items-center gap-3">
              <CircularProgressRing
                progress={calorieProgress}
                color="#E96A8D"
                trackColor="#FCECEF"
                icon={<Flame className="w-4 h-4 text-[#E96A8D]" />}
              />
              <div>
                <div className="text-base sm:text-lg font-black text-[#252525] leading-tight flex items-baseline gap-1">
                  <span>{totalWorkoutCalories}</span>
                  <span className="text-xs font-bold text-[#E96A8D]/80">
                    / {calorieTarget} kcal
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {totalWorkoutCalories > 0 ? 'From recorded workouts' : 'Goal: 430 kcal'}
                </div>
              </div>
            </div>

            {/* 3. Active Time Indicator */}
            <div className="flex items-center gap-3">
              <CircularProgressRing
                progress={activeProgress}
                color="#3B82F6"
                trackColor="#EFF6FF"
                icon={<Clock className="w-4 h-4 text-[#3B82F6]" />}
              />
              <div>
                <div className="text-base sm:text-lg font-black text-[#252525] leading-tight flex items-baseline gap-1">
                  <span>{totalWorkoutMinutes}</span>
                  <span className="text-xs font-bold text-[#3B82F6]/75">
                    / {activeTargetMin} min
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {totalWorkoutMinutes > 0 ? 'From recorded workouts' : 'Goal: 30 min daily'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Female Fitness Avatar wearing ASABEA FIT clothes */}
          <div className="flex-shrink-0 flex items-center justify-center pl-2">
            <div className="relative group">
              <div className="w-36 h-48 sm:w-40 sm:h-52 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#FFF5F7] to-[#F0F7FF] border border-[#FCECEF]">
                <img
                  src="/asabea_fitness_avatar.jpg"
                  alt="ASABEA FIT 3D Fitness Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain transform transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to stylized SVG avatar if image loading fails
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-3 text-center">
                          <span class="text-4xl mb-1">🏃‍♀️</span>
                          <span class="text-[11px] font-black text-[#E96A8D]">ASABEA FIT</span>
                          <span class="text-[9px] text-[#3B82F6] font-semibold">Small Steps. Big Results.</span>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 border border-[#FCECEF] shadow-2xs text-[9px] font-bold text-[#E96A8D] whitespace-nowrap">
                ASABEA FIT
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Strip of Main Activity Card: Distance Pill */}
        <div className="mt-4 pt-3 border-t border-[#FCECEF]/80">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFF] to-[#FCECEF] border border-[#DBEAFE]/70">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E40AF]">
              <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-xs">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span>Distance</span>
              <span className="text-base font-black text-[#252525] ml-1">
                {totalWorkoutDistanceKm > 0 ? totalWorkoutDistanceKm.toFixed(2) : 0} km
              </span>
            </div>

            <button
              onClick={onStartWorkout}
              className="text-xs font-bold text-[#E96A8D] hover:text-[#d85579] flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-[#FCECEF] shadow-2xs hover:shadow-xs active:scale-95 transition"
            >
              <span>Walk / Jog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. QUICK SHORTCUTS ROW (inspired by reference layout)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onStartWorkout}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#FCECEF] shadow-2xs hover:border-[#E96A8D]/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center mb-1">
            <Flame className="w-4 h-4 fill-[#E96A8D]" />
          </div>
          <span className="text-[11px] font-extrabold text-[#252525]">Workout</span>
          <span className="text-[9px] text-[#E96A8D] font-semibold">Start</span>
        </button>

        <button
          onClick={() => onQuickWater(250)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 shadow-2xs hover:border-[#3B82F6]/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mb-1">
            <Droplets className="w-4 h-4 fill-[#3B82F6]" />
          </div>
          <span className="text-[11px] font-extrabold text-[#252525]">+250ml</span>
          <span className="text-[9px] text-[#3B82F6] font-semibold">Water</span>
        </button>

        <button
          onClick={() => setShowSleepModal(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#FCECEF] shadow-2xs hover:border-[#E96A8D]/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFF5F7] text-[#E96A8D] flex items-center justify-center mb-1">
            <Moon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold text-[#252525]">Sleep</span>
          <span className="text-[9px] text-gray-400 font-semibold">{sleepData ? `${sleepData.hours}h` : 'Log'}</span>
        </button>

        <button
          onClick={() => setShowHeartRateModal(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 shadow-2xs hover:border-[#3B82F6]/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mb-1">
            <Heart className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold text-[#252525]">Heart</span>
          <span className="text-[9px] text-gray-400 font-semibold">{heartRateData ? `${heartRateData.bpm}` : 'BPM'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. ACTIVITY CARDS SECTION                                 */}
      {/*    🏃 EXERCISE                                           */}
      {/*    😴 SLEEP                                              */}
      {/*    ❤️ HEART RATE                                          */}
      {/*    💧 HYDRATION                                          */}
      {/*    📍 DISTANCE                                           */}
      {/*    🔥 CALORIES                                           */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
            Activity Cards
          </h2>
          <span className="text-[11px] text-[#3B82F6] font-semibold">
            Real Recorded Data Only
          </span>
        </div>

        {/* CARD 1: 🏃 EXERCISE (Today's workouts) - Full Width */}
        <div className="rounded-3xl bg-white border border-[#FCECEF] p-4 sm:p-5 shadow-xs transition hover:border-[#E96A8D]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
                <Flame className="w-5 h-5 fill-[#E96A8D]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#252525]">Exercise</h3>
                <span className="text-[11px] text-gray-400 font-medium">Today's Workouts</span>
              </div>
            </div>

            <button
              onClick={onStartWorkout}
              className="px-3 py-1.5 rounded-xl bg-[#E96A8D] text-white text-xs font-extrabold shadow-sm shadow-[#E96A8D]/25 hover:bg-[#d85579] active:scale-95 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Workout</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            {todayWorkouts.length > 0 ? (
              <div className="space-y-2">
                {todayWorkouts.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#FCECEF]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#E96A8D] text-white text-[10px] font-black uppercase tracking-wider">
                        {w.type}
                      </span>
                      <span className="text-xs font-bold text-[#252525]">
                        {w.distanceKm.toFixed(2)} km
                      </span>
                      <span className="text-[11px] text-gray-400">•</span>
                      <span className="text-xs font-medium text-gray-600">
                        {Math.round(w.durationSeconds / 60)} min
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-[#E96A8D]">
                      {w.calories} kcal
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 px-4 rounded-2xl bg-[#FFF5F7] border border-[#FCECEF] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-500">No data yet</div>
                  <div className="text-[11px] text-gray-400">
                    No workouts recorded today yet. Lace up your shoes!
                  </div>
                </div>
                <button
                  onClick={onStartWorkout}
                  className="text-xs font-extrabold text-[#E96A8D] hover:underline"
                >
                  Start now →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2x2 Grid for SLEEP, HEART RATE, HYDRATION, DISTANCE */}
        <div className="grid grid-cols-2 gap-3">
          {/* CARD 2: 😴 SLEEP */}
          <div className="rounded-3xl bg-white border border-blue-100 p-4 shadow-xs flex flex-col justify-between hover:border-[#3B82F6]/40 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#252525]">Sleep</span>
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
              </div>

              {sleepData ? (
                <div>
                  <div className="text-lg font-black text-[#252525]">
                    {sleepData.hours}h {sleepData.minutes}m
                  </div>
                  <div className="text-[11px] font-semibold text-[#3B82F6]">
                    {sleepData.quality || 'Recorded sleep'}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-gray-400">No data yet</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Sleep data when available
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSleepModal(true)}
              className="mt-3 w-full py-1.5 rounded-xl bg-[#EFF6FF] text-[#3B82F6] text-[11px] font-bold hover:bg-[#DBEAFE] active:scale-95 transition"
            >
              {sleepData ? 'Update Sleep' : '+ Log Sleep'}
            </button>
          </div>

          {/* CARD 3: ❤️ HEART RATE */}
          <div className="rounded-3xl bg-white border border-[#FCECEF] p-4 shadow-xs flex flex-col justify-between hover:border-[#E96A8D]/40 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#252525]">Heart rate</span>
                <div className="w-8 h-8 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-[#E96A8D]" />
                </div>
              </div>

              {heartRateData ? (
                <div>
                  <div className="text-lg font-black text-[#252525]">
                    {heartRateData.bpm} <span className="text-xs font-bold text-gray-500">bpm</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#E96A8D]">
                    {heartRateData.condition || 'Resting'}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-gray-400">No data yet</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Heart-rate data when available
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHeartRateModal(true)}
              className="mt-3 w-full py-1.5 rounded-xl bg-[#FCECEF] text-[#E96A8D] text-[11px] font-bold hover:bg-[#fbdbe3] active:scale-95 transition"
            >
              {heartRateData ? 'Update BPM' : '+ Log BPM'}
            </button>
          </div>

          {/* CARD 4: 💧 HYDRATION */}
          <div className="rounded-3xl bg-white border border-blue-100 p-4 shadow-xs flex flex-col justify-between hover:border-[#3B82F6]/40 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#252525]">Hydration</span>
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                  <Droplets className="w-4 h-4 fill-[#3B82F6]" />
                </div>
              </div>

              {todayWaterTotalMl > 0 ? (
                <div>
                  <div className="text-lg font-black text-[#252525]">
                    {todayWaterTotalMl >= 1000
                      ? `${(todayWaterTotalMl / 1000).toFixed(1)}L`
                      : `${todayWaterTotalMl}ml`}
                  </div>
                  <div className="text-[11px] font-bold text-[#3B82F6]">
                    Goal: {(waterGoalMl / 1000).toFixed(1)}L ({waterProgress}%)
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-gray-400">No data yet</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    0 / {(waterGoalMl / 1000).toFixed(1)}L goal
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mt-2 w-full h-1.5 rounded-full bg-[#EFF6FF] overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, waterProgress)}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => onQuickWater(250)}
              className="mt-3 w-full py-1.5 rounded-xl bg-[#EFF6FF] text-[#3B82F6] text-[11px] font-bold hover:bg-[#DBEAFE] active:scale-95 transition"
            >
              +250ml Glass
            </button>
          </div>

          {/* CARD 5: 📍 DISTANCE */}
          <div className="rounded-3xl bg-white border border-[#FCECEF] p-4 shadow-xs flex flex-col justify-between hover:border-[#E96A8D]/40 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#252525]">Distance</span>
                <div className="w-8 h-8 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>

              {totalWorkoutDistanceKm > 0 ? (
                <div>
                  <div className="text-lg font-black text-[#252525]">
                    {totalWorkoutDistanceKm.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-gray-500">km</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#E96A8D]">
                    Today's distance
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-gray-400">No data yet</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Today's distance from workouts
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onStartWorkout}
              className="mt-3 w-full py-1.5 rounded-xl bg-[#FCECEF] text-[#E96A8D] text-[11px] font-bold hover:bg-[#fbdbe3] active:scale-95 transition"
            >
              Record Run
            </button>
          </div>
        </div>

        {/* CARD 6: 🔥 CALORIES (Full Width) */}
        <div className="rounded-3xl bg-white border border-[#FCECEF] p-4 shadow-xs flex items-center justify-between hover:border-[#E96A8D]/40 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFF5F7] to-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
              <Flame className="w-5 h-5 fill-[#E96A8D]" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#252525]">Calories</div>
              {totalWorkoutCalories > 0 ? (
                <div className="text-base font-black text-[#252525]">
                  {totalWorkoutCalories}{' '}
                  <span className="text-xs font-semibold text-[#E96A8D]">kcal</span>
                </div>
              ) : (
                <div className="text-xs font-bold text-gray-400">No data yet</div>
              )}
              <div className="text-[10px] text-gray-400">
                Calories from recorded workouts
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-extrabold text-[#E96A8D] bg-[#FCECEF] px-3 py-1 rounded-full">
              {totalWorkoutCalories > 0 ? `${totalWorkoutCalories} kcal burned` : '0 / 430 kcal'}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. WEIGHT-LOSS JOURNEY PROGRESS CARD                      */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-white border border-[#FCECEF] p-5 shadow-xs">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Weight-Loss Goal Progress
            </span>
            <div className="text-xl font-black text-[#252525] mt-0.5">
              {latestWeight.toFixed(1)} kg{' '}
              <span className="text-xs font-semibold text-gray-400">current</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block text-xs font-black text-[#E96A8D] bg-[#FCECEF] px-2.5 py-1 rounded-full">
              {progressPercent}% towards goal
            </span>
            <span className="text-[11px] block text-gray-400 mt-1 font-semibold">
              Goal: {goalWeight.toFixed(1)} kg
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden my-3">
          <div
            className="h-full bg-gradient-to-r from-[#E96A8D] to-[#3B82F6] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500 font-medium">
            Lost so far: <strong className="text-[#252525]">{lostSoFar.toFixed(1)} kg</strong>
          </span>
          <button
            onClick={onOpenWeightModal}
            className="text-xs font-extrabold text-[#3B82F6] hover:underline"
          >
            Update Weight →
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. TODAY'S WINS SECTION                                   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-[#FCECEF] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E96A8D]" />
            <h3 className="font-extrabold text-xs tracking-wider text-[#252525] uppercase">
              TODAY'S WINS
            </h3>
          </div>
          <span className="text-xs font-bold text-[#E96A8D]">
            {recordedWins.length} recorded
          </span>
        </div>

        {recordedWins.length > 0 ? (
          <div className="space-y-2">
            {recordedWins.map((win, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#FFF5F7] border border-[#FCECEF] text-[#252525]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#E96A8D] flex-shrink-0" />
                <span className="text-xs font-bold">{win.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              No activity recorded yet today. Complete a workout or drink water to log your wins!
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: Optional Real Sleep Log Entry                      */}
      {/* ======================================================== */}
      {showSleepModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-blue-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#252525]">Record Real Sleep</h3>
              </div>
              <button
                onClick={() => setShowSleepModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Enter your actual hours of sleep from last night.
            </p>

            <form onSubmit={handleSaveSleep} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="1"
                    value={inputSleepHours}
                    onChange={(e) => setInputSleepHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={inputSleepMinutes}
                    onChange={(e) => setInputSleepMinutes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Quality</label>
                <select
                  value={inputSleepQuality}
                  onChange={(e) => setInputSleepQuality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="Restful">Restful & Deep</option>
                  <option value="Good">Good</option>
                  <option value="Okay">Okay</option>
                  <option value="Light">Light / Interrupted</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSleepModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition"
                >
                  Save Sleep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Optional Real Heart Rate Log Entry                 */}
      {/* ======================================================== */}
      {showHeartRateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#FCECEF] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-[#E96A8D]" />
                </div>
                <h3 className="font-extrabold text-base text-[#252525]">Record Heart Rate</h3>
              </div>
              <button
                onClick={() => setShowHeartRateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Enter your real heart-rate measurement in BPM.
            </p>

            <form onSubmit={handleSaveHeartRate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  Beats Per Minute (BPM)
                </label>
                <input
                  type="number"
                  min="40"
                  max="220"
                  value={inputBpm}
                  onChange={(e) => setInputBpm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#E96A8D]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Condition</label>
                <select
                  value={inputBpmCondition}
                  onChange={(e) => setInputBpmCondition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#E96A8D]"
                >
                  <option value="Resting">Resting</option>
                  <option value="Post-Workout">Post-Workout</option>
                  <option value="Walking">Walking</option>
                  <option value="Active">Active</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowHeartRateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#E96A8D] text-white text-xs font-bold hover:bg-[#d85579] transition"
                >
                  Save Heart Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
