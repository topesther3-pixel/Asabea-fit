import React from 'react';
import { Check, Flame, Award, Sparkles } from 'lucide-react';
import { HabitLog } from '../types';
import { TODAY_STR } from '../lib/store';

interface HabitTrackerProps {
  habits: Record<string, HabitLog>;
  onToggleHabit: (habitKey: keyof Omit<HabitLog, 'id' | 'userId' | 'date' | 'updatedAt'>) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, onToggleHabit }) => {
  const todayHabit = habits[TODAY_STR] || {
    id: `habit-${TODAY_STR}`,
    userId: 'asabea-primary',
    date: TODAY_STR,
    workout: false,
    water: false,
    healthyMeal: false,
    steps: false,
    sleep: false,
    noZeroDay: true,
    updatedAt: new Date().toISOString()
  };

  const habitItems: {
    key: keyof Omit<HabitLog, 'id' | 'userId' | 'date' | 'updatedAt'>;
    title: string;
    description: string;
    icon: string;
  }[] = [
    { key: 'workout', title: 'Workout', description: 'Walk, jog, run, or stretch', icon: '👟' },
    { key: 'water', title: 'Water Hydration', description: '2.5L daily target', icon: '💧' },
    { key: 'healthyMeal', title: 'Healthy Meal', description: 'Nourishing, mindful choices', icon: '🥗' },
    { key: 'steps', title: 'Daily Movement / Steps', description: 'Intentional physical steps', icon: '👣' },
    { key: 'sleep', title: 'Sleep & Recovery', description: '7+ hours restful recovery', icon: '🌙' },
    { key: 'noZeroDay', title: 'No Zero Day', description: 'Even 5 minutes of effort counts', icon: '✨' }
  ];

  const completedCount = habitItems.filter((h) => todayHabit[h.key]).length;
  const percent = Math.round((completedCount / habitItems.length) * 100);

  // Past 7 days streak dots
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const habit = habits[dStr];
    const isCompleted = habit && (habit.noZeroDay || habit.workout);
    return {
      date: dStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      isCompleted: Boolean(isCompleted),
      isToday: dStr === TODAY_STR
    };
  });

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
            Habit Tracker
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Daily consistency builder</span>
        </div>

        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D]">
          {completedCount} of {habitItems.length} Done ({percent}%)
        </span>
      </div>

      {/* 7-Day Consistency Streak Indicator */}
      <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
          Past 7 Days
        </span>
        <div className="flex items-center gap-2">
          {past7Days.map((d) => (
            <div key={d.date} className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 font-semibold mb-1">{d.dayName}</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  d.isCompleted
                    ? 'bg-[#65A87A] text-white shadow-2xs'
                    : d.isToday
                    ? 'border-2 border-dashed border-[#E96A8D] text-[#E96A8D]'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {d.isCompleted ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {habitItems.map(({ key, title, description, icon }) => {
          const isDone = Boolean(todayHabit[key]);
          return (
            <div
              key={key}
              onClick={() => onToggleHabit(key)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isDone
                  ? 'bg-[#F0FDF4] border-[#86EFAC]/60 shadow-2xs'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{icon}</span>
                <div>
                  <h4
                    className={`text-xs font-bold ${
                      isDone ? 'text-[#166534]' : 'text-[#252525]'
                    }`}
                  >
                    {title}
                  </h4>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-[#65A87A] text-white'
                    : 'border-2 border-gray-200 bg-white'
                }`}
              >
                {isDone && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
