import React, { useState } from 'react';
import { BarChart3, TrendingDown, Flame, Footprints, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { AppState } from '../lib/store';

interface WeeklyMonthlySummaryProps {
  state: AppState;
  userFirstName?: string;
  personalizedBrand?: string;
}

export const WeeklyMonthlySummary: React.FC<WeeklyMonthlySummaryProps> = ({
  state,
  userFirstName,
  personalizedBrand
}) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const { workouts, weights } = state;
  const brand = personalizedBrand || (userFirstName ? `${userFirstName.toUpperCase()} FIT♡` : 'ASABEA FIT♡');

  const now = new Date();
  const daysThreshold = period === 'weekly' ? 7 : 30;
  const cutoffTime = now.getTime() - daysThreshold * 24 * 60 * 60 * 1000;

  const filteredWorkouts = workouts.filter(
    (w) => new Date(w.date).getTime() >= cutoffTime
  );

  const totalKm = filteredWorkouts.reduce((acc, w) => acc + w.distanceKm, 0);
  const totalSecs = filteredWorkouts.reduce((acc, w) => acc + w.durationSeconds, 0);
  const totalMins = Math.round(totalSecs / 60);
  const totalCalories = filteredWorkouts.reduce((acc, w) => acc + w.calories, 0);

  const hasSufficientData = filteredWorkouts.length > 0;

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
            Performance Summary
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Aggregated real metrics</span>
        </div>

        <div className="flex rounded-xl bg-[#FAF9F6] p-1 border border-gray-200">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              period === 'weekly'
                ? 'bg-white text-[#E96A8D] shadow-xs'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              period === 'monthly'
                ? 'bg-white text-[#E96A8D] shadow-xs'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {hasSufficientData ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-[#FCECEF]/60 text-center border border-[#E96A8D]/20">
              <span className="text-[10px] font-bold text-[#E96A8D] uppercase block">
                Total Distance
              </span>
              <span className="text-lg font-black text-[#252525] mt-0.5 block">
                {totalKm.toFixed(1)} <span className="text-xs font-semibold text-gray-400">km</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#EFF6FF] text-center border border-[#BFDBFE]/60">
              <span className="text-[10px] font-bold text-[#3B82F6] uppercase block">
                Total Time
              </span>
              <span className="text-lg font-black text-[#252525] mt-0.5 block">
                {totalMins} <span className="text-xs font-semibold text-gray-400">min</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50 text-center border border-orange-100">
              <span className="text-[10px] font-bold text-orange-600 uppercase block">
                Est. Burn
              </span>
              <span className="text-lg font-black text-[#252525] mt-0.5 block">
                {totalCalories} <span className="text-xs font-semibold text-gray-400">kcal</span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-gray-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">
              Workouts in this {period === 'weekly' ? 'week' : 'month'}:
            </span>
            <span className="font-extrabold text-[#E96A8D] bg-white px-2 py-0.5 rounded-md shadow-2xs">
              {filteredWorkouts.length} completed
            </span>
          </div>

          <button
            onClick={() => {
              const cleanTag = (userFirstName || 'Friend').replace(/[^a-zA-Z0-9]/g, '');
              const text = `📊 ${brand} ${period.toUpperCase()} Fitness Report ✨\n\n📍 Total Distance: ${totalKm.toFixed(1)} km\n⏱️ Active Time: ${totalMins} min\n🔥 Calories Burned: ${totalCalories} kcal\n💪 Workouts: ${filteredWorkouts.length}\n\n"Small Steps. Big Results."\n#${cleanTag}Fit #SmallStepsBigResults`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="w-full py-2.5 rounded-xl bg-[#25D366]/15 text-[#128C7E] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#25D366]/25 transition"
          >
            <span>Share {period === 'weekly' ? 'Weekly' : 'Monthly'} Report to WhatsApp</span>
          </button>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center">
          <BarChart3 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-bold text-gray-600">
            Keep going — your {period} summary will appear as you record more activity.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Data integrity guaranteed: no simulated or fabricated numbers.
          </p>
        </div>
      )}
    </div>
  );
};
