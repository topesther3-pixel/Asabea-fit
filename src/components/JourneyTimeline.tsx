import React from 'react';
import { Calendar, CheckCircle2, Flame, Droplets, Scale, BookOpen } from 'lucide-react';
import { AppState, getJourneyDay } from '../lib/store';

interface JourneyTimelineProps {
  state: AppState;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ state }) => {
  const { profile, workouts, weights, waterLogs, habits, journalEntries } = state;

  // Aggregate dates that have actual recorded activity
  const allRecordedDates = new Set<string>();

  workouts.forEach((w) => allRecordedDates.add(w.date));
  weights.forEach((w) => allRecordedDates.add(w.date));
  waterLogs.forEach((w) => allRecordedDates.add(w.date));
  journalEntries.forEach((j) => allRecordedDates.add(j.date));
  Object.keys(habits).forEach((d) => {
    const h = habits[d];
    if (h.noZeroDay || h.workout || h.water || h.healthyMeal || h.steps || h.sleep) {
      allRecordedDates.add(d);
    }
  });

  // Sort descending
  const sortedDates = Array.from(allRecordedDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
            Journey Timeline
          </h3>
          <p className="text-[11px] text-gray-400">
            Real days where you showed up and moved the needle
          </p>
        </div>
        <span className="text-xs font-bold text-[#E96A8D] bg-[#FCECEF] px-2.5 py-1 rounded-full">
          {sortedDates.length} Days Recorded
        </span>
      </div>

      {sortedDates.length > 0 ? (
        <div className="relative border-l-2 border-[#FCECEF] ml-3 pl-5 space-y-6">
          {sortedDates.map((dateStr) => {
            const dayNum = getJourneyDay(profile.journeyStartDate);
            const dayWorkouts = workouts.filter((w) => w.date === dateStr);
            const dayWeight = weights.find((w) => w.date === dateStr);
            const dayWater = waterLogs
              .filter((w) => w.date === dateStr)
              .reduce((acc, w) => acc + w.amountMl, 0);
            const dayHabit = habits[dateStr];
            const dayJournals = journalEntries.filter((j) => j.date === dateStr);

            return (
              <div key={dateStr} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full bg-[#E96A8D] ring-4 ring-[#FAF9F6]" />

                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-[#E96A8D] uppercase tracking-wider">
                        {dateStr === state.profile.journeyStartDate ? 'Day 1 • Baseline' : `Recorded Date`}
                      </span>
                      <h4 className="text-sm font-bold text-[#252525]">{dateStr}</h4>
                    </div>

                    <span className="text-[10px] font-bold text-[#65A87A] bg-[#F0FDF4] px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Showed Up
                    </span>
                  </div>

                  {/* Summary of what happened on this day */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {dayWorkouts.map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 font-semibold border border-orange-100"
                      >
                        <Flame className="w-3 h-3 text-orange-500" />
                        {w.type}: {w.distanceKm}km ({Math.round(w.durationSeconds / 60)}m)
                      </span>
                    ))}

                    {dayWeight && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-green-50 text-green-700 font-semibold border border-green-100">
                        <Scale className="w-3 h-3 text-green-600" />
                        {dayWeight.weightKg}kg
                      </span>
                    )}

                    {dayWater > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                        <Droplets className="w-3 h-3 text-blue-600" />
                        {dayWater >= 1000 ? `${(dayWater / 1000).toFixed(1)}L` : `${dayWater}ml`}
                      </span>
                    )}

                    {dayJournals.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-50 text-pink-700 font-semibold border border-pink-100">
                        <BookOpen className="w-3 h-3 text-pink-600" />
                        Journal logged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white border border-gray-100 text-center text-gray-400">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">Timeline starting</p>
          <p className="text-[11px] text-gray-400 mt-1">
            As you log workouts and daily check-ins, your chronological timeline will assemble here.
          </p>
        </div>
      )}
    </div>
  );
};
