import React, { useState } from 'react';
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
  HeartHandshake
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

  // Calculate today's recorded metrics
  const todayWorkouts = workouts.filter((w) => w.date === TODAY_STR);
  const totalWorkoutMinutes = todayWorkouts.reduce((acc, w) => acc + Math.round(w.durationSeconds / 60), 0);
  const totalWorkoutDistanceKm = todayWorkouts.reduce((acc, w) => acc + w.distanceKm, 0);
  const totalWorkoutCalories = todayWorkouts.reduce((acc, w) => acc + w.calories, 0);

  const todayWaterTotalMl = waterLogs
    .filter((w) => w.date === TODAY_STR)
    .reduce((acc, w) => acc + w.amountMl, 0);

  const todayWeightEntry = weights.find((w) => w.date === TODAY_STR);
  const latestWeight = todayWeightEntry?.weightKg ?? weights[0]?.weightKg ?? profile.currentWeight ?? profile.startingWeight;

  const todayHabit = habits[TODAY_STR];

  // Weight Journey Progress calculation
  const startWeight = profile.startingWeight;
  const goalWeight = profile.goalWeight;
  const totalToLose = Math.max(0.1, startWeight - goalWeight);
  const lostSoFar = Math.max(0, startWeight - latestWeight);
  const progressPercent = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));

  // Today's Wins: ONLY actual completed items recorded by the user!
  const recordedWins: { label: string; done: boolean }[] = [];
  if (todayHabit?.noZeroDay || dayNumber >= 1) {
    recordedWins.push({ label: 'I showed up', done: true });
  }
  if (todayWorkouts.length > 0 || todayHabit?.workout) {
    recordedWins.push({ label: 'I moved my body', done: true });
  }
  if (todayWaterTotalMl > 0 || todayHabit?.water) {
    recordedWins.push({ label: `I drank water (${todayWaterTotalMl > 0 ? (todayWaterTotalMl >= 1000 ? `${(todayWaterTotalMl / 1000).toFixed(1)}L` : `${todayWaterTotalMl}ml`) : 'logged'})`, done: true });
  }
  if (todayHabit?.healthyMeal || state.foodEntries.some((f) => f.date === TODAY_STR)) {
    recordedWins.push({ label: 'I nourished myself with a healthy meal', done: true });
  }
  if (todayHabit?.sleep) {
    recordedWins.push({ label: 'I prioritized rest and sleep', done: true });
  }

  // Active streak calculation
  const streak = Object.keys(habits).filter((d) => habits[d]?.noZeroDay || habits[d]?.workout).length || 1;

  return (
    <div className="space-y-5 pb-20 max-w-xl mx-auto px-4 pt-2">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E96A8D] via-[#F07A9A] to-[#FF8FA8] text-white p-6 shadow-xl shadow-[#E96A8D]/20">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
              <Sparkles className="w-3.5 h-3.5" />
              Day {dayNumber} of 90
            </span>
            <span className="text-xs font-medium text-white/90 italic font-serif">
              "Same girl. Bigger goals."
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight font-display">
            Small Steps. Big Results.
          </h2>

          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md font-medium leading-relaxed">
            A healthier me is coming. One walk, one glass of water, one conscious choice at a time.
          </p>

          {/* Progress Ring / Journey Bar */}
          <div className="mt-5 bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-[11px] font-medium text-white/80 uppercase tracking-wider block">
                  Weight-Loss Goal Progress
                </span>
                <span className="text-lg font-extrabold text-white">
                  {latestWeight.toFixed(1)} kg <span className="text-xs font-normal text-white/80">current</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white bg-white/25 px-2 py-0.5 rounded-full">
                  {progressPercent}% towards goal
                </span>
                <span className="text-[11px] block text-white/80 mt-0.5 font-medium">
                  Goal: {goalWeight.toFixed(1)} kg
                </span>
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Large START WORKOUT Button */}
      <button
        id="start-workout-main-btn"
        onClick={onStartWorkout}
        className="w-full py-4 px-6 rounded-2xl bg-[#E96A8D] text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#E96A8D]/30 hover:bg-[#d85579] active:scale-[0.99] transition-all transform"
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Flame className="w-5 h-5 fill-white text-white animate-pulse" />
        </div>
        <span className="tracking-wide">START WORKOUT</span>
        <ArrowRight className="w-5 h-5 ml-1" />
      </button>

      {/* Today's Statistics Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Today's Statistics
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Real recorded data</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Steps */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Steps</span>
              <Footprints className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="mt-2">
              {todayHabit?.steps ? (
                <div className="text-xl font-bold text-[#252525]">Target Met ✓</div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">Not recorded</div>
              )}
            </div>
          </div>

          {/* Distance */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Distance</span>
              <Zap className="w-4 h-4 text-[#E96A8D]" />
            </div>
            <div className="mt-2">
              {totalWorkoutDistanceKm > 0 ? (
                <div className="text-xl font-extrabold text-[#252525]">
                  {totalWorkoutDistanceKm.toFixed(2)} <span className="text-xs font-semibold text-gray-500">km</span>
                </div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">Not recorded</div>
              )}
            </div>
          </div>

          {/* Active Minutes */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Active Min</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              {totalWorkoutMinutes > 0 ? (
                <div className="text-xl font-extrabold text-[#252525]">
                  {totalWorkoutMinutes} <span className="text-xs font-semibold text-gray-500">min</span>
                </div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">Not recorded</div>
              )}
            </div>
          </div>

          {/* Calories */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Calories</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2">
              {totalWorkoutCalories > 0 ? (
                <div className="text-xl font-extrabold text-[#252525]">
                  {totalWorkoutCalories} <span className="text-xs font-semibold text-gray-500">kcal</span>
                </div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">Not recorded</div>
              )}
            </div>
          </div>

          {/* Water */}
          <div
            onClick={() => onNavigateTab('progress')}
            className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#3B82F6]/40 transition"
          >
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Water</span>
              <Droplets className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="mt-2">
              {todayWaterTotalMl > 0 ? (
                <div className="text-xl font-extrabold text-[#252525]">
                  {todayWaterTotalMl >= 1000 ? (todayWaterTotalMl / 1000).toFixed(1) : todayWaterTotalMl}
                  <span className="text-xs font-semibold text-gray-500 ml-1">
                    {todayWaterTotalMl >= 1000 ? 'L' : 'ml'}
                  </span>
                </div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">Not recorded</div>
              )}
            </div>
          </div>

          {/* Weight */}
          <div
            onClick={onOpenWeightModal}
            className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#E96A8D]/40 transition"
          >
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold">Weight</span>
              <Scale className="w-4 h-4 text-[#65A87A]" />
            </div>
            <div className="mt-2">
              {todayWeightEntry ? (
                <div className="text-xl font-extrabold text-[#252525]">
                  {todayWeightEntry.weightKg.toFixed(1)} <span className="text-xs font-semibold text-gray-500">kg</span>
                </div>
              ) : (
                <div className="text-xs font-medium text-gray-400 italic">
                  {latestWeight ? `${latestWeight.toFixed(1)} kg (prev)` : 'Not recorded'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Streak Pill */}
        <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-[#252525]">
                {streak}-Day Active Streak
              </div>
              <div className="text-[11px] text-gray-500">
                Consistency over perfection. Every single day counts.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('progress')}
            className="text-xs font-bold text-[#3B82F6] hover:underline"
          >
            View
          </button>
        </div>
      </div>

      {/* TODAY'S WINS */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#65A87A]" />
            <h3 className="font-bold text-sm tracking-wide text-[#252525] uppercase">
              TODAY'S WINS
            </h3>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {recordedWins.length} recorded
          </span>
        </div>

        {recordedWins.length > 0 ? (
          <div className="space-y-2.5">
            {recordedWins.map((win, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#65A87A] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">{win.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              No activity recorded yet today. Complete a workout, drink water, or check in to log your wins!
            </p>
          </div>
        )}
      </div>

      {/* Quick Action Bar */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
          Quick Actions
        </span>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onQuickWater(250)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-[#3B82F6]/50 active:bg-blue-50 transition"
          >
            <Droplets className="w-5 h-5 text-[#3B82F6] mb-1" />
            <span className="text-[11px] font-bold text-[#252525]">+250ml</span>
            <span className="text-[9px] text-gray-400">Water</span>
          </button>

          <button
            onClick={onOpenWeightModal}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-[#65A87A]/50 active:bg-green-50 transition"
          >
            <Scale className="w-5 h-5 text-[#65A87A] mb-1" />
            <span className="text-[11px] font-bold text-[#252525]">Weight</span>
            <span className="text-[9px] text-gray-400">Log kg</span>
          </button>

          <button
            onClick={onOpenFoodModal}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-[#E96A8D]/50 active:bg-pink-50 transition"
          >
            <Zap className="w-5 h-5 text-[#E96A8D] mb-1" />
            <span className="text-[11px] font-bold text-[#252525]">Food</span>
            <span className="text-[9px] text-gray-400">Ghana Log</span>
          </button>

          <button
            onClick={onOpenMoodModal}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-amber-500/50 active:bg-amber-50 transition"
          >
            <HeartHandshake className="w-5 h-5 text-amber-500 mb-1" />
            <span className="text-[11px] font-bold text-[#252525]">Mood</span>
            <span className="text-[9px] text-gray-400">Energy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
