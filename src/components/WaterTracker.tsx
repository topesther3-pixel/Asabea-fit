import React, { useState } from 'react';
import { Droplets, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { WaterLog } from '../types';
import { TODAY_STR } from '../lib/store';

interface WaterTrackerProps {
  waterLogs: WaterLog[];
  dailyGoalMl: number;
  onAddWater: (amountMl: number) => void;
  onResetTodayWater: () => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  waterLogs,
  dailyGoalMl = 2500,
  onAddWater,
  onResetTodayWater
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const todayLogs = waterLogs.filter((w) => w.date === TODAY_STR);
  const totalMl = todayLogs.reduce((acc, w) => acc + w.amountMl, 0);
  const totalLitres = (totalMl / 1000).toFixed(2);
  const goalLitres = (dailyGoalMl / 1000).toFixed(1);
  const progressPercent = Math.min(100, Math.round((totalMl / dailyGoalMl) * 100));

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(customAmount, 10);
    if (amt && amt > 0) {
      onAddWater(amt);
      setCustomAmount('');
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
            <Droplets className="w-4 h-4 fill-[#3B82F6]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
              Today's Water
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">Hydration & vitality</span>
          </div>
        </div>

        {todayLogs.length > 0 && (
          <button
            onClick={onResetTodayWater}
            className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition flex items-center gap-1"
            title="Reset today's water"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Hydration Progress Card */}
      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE]/60 overflow-hidden">
        <div className="flex items-end justify-between relative z-10">
          <div>
            <span className="text-3xl sm:text-4xl font-black text-[#1E3A8A]">
              {totalMl >= 1000 ? `${totalLitres} L` : `${totalMl} ml`}
            </span>
            <span className="text-xs font-bold text-[#3B82F6] block mt-0.5">
              Target: {goalLitres} L ({dailyGoalMl} ml)
            </span>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-xs font-black text-[#3B82F6] shadow-xs">
              {progressPercent >= 100 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Goal Met!
                </>
              ) : (
                `${progressPercent}%`
              )}
            </span>
          </div>
        </div>

        {/* Liquid Progress Fill */}
        <div className="w-full h-3 rounded-full bg-white/70 mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(3, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onAddWater(250)}
          className="py-2.5 px-1 rounded-xl bg-[#EFF6FF] text-[#1E40AF] font-extrabold text-xs hover:bg-[#DBEAFE] active:scale-95 transition text-center shadow-2xs border border-[#BFDBFE]/40"
        >
          +250 ml
        </button>

        <button
          onClick={() => onAddWater(500)}
          className="py-2.5 px-1 rounded-xl bg-[#EFF6FF] text-[#1E40AF] font-extrabold text-xs hover:bg-[#DBEAFE] active:scale-95 transition text-center shadow-2xs border border-[#BFDBFE]/40"
        >
          +500 ml
        </button>

        <button
          onClick={() => onAddWater(750)}
          className="py-2.5 px-1 rounded-xl bg-[#EFF6FF] text-[#1E40AF] font-extrabold text-xs hover:bg-[#DBEAFE] active:scale-95 transition text-center shadow-2xs border border-[#BFDBFE]/40"
        >
          +750 ml
        </button>

        <button
          onClick={() => setShowCustom(!showCustom)}
          className="py-2.5 px-1 rounded-xl bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition text-center shadow-2xs border border-gray-200"
        >
          Custom
        </button>
      </div>

      {/* Custom Amount Form */}
      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="flex gap-2 pt-1 animate-in fade-in duration-150">
          <input
            type="number"
            min="50"
            max="3000"
            step="50"
            placeholder="Amount in ml (e.g. 350)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#252525]"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white font-bold text-xs hover:bg-[#2563EB] transition"
          >
            Add
          </button>
        </form>
      )}

      {/* Micro Log history for today */}
      {todayLogs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {todayLogs.map((log) => (
            <span
              key={log.id}
              className="text-[10px] font-semibold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100"
            >
              +{log.amountMl}ml ({log.timestamp.slice(11, 16)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
