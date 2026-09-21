import React from 'react';
import { MoodType, EnergyType, MoodLog } from '../types';
import { TODAY_STR } from '../lib/store';

interface MoodEnergyProps {
  currentMoodLog?: MoodLog;
  onSaveMood: (mood: MoodType, energy: EnergyType) => void;
}

export const MoodEnergy: React.FC<MoodEnergyProps> = ({ currentMoodLog, onSaveMood }) => {
  const moods: { type: MoodType; emoji: string; label: string }[] = [
    { type: 'Great', emoji: '😊', label: 'Great' },
    { type: 'Good', emoji: '🙂', label: 'Good' },
    { type: 'Okay', emoji: '😐', label: 'Okay' },
    { type: 'Low', emoji: '😔', label: 'Low' },
    { type: 'Exhausted', emoji: '😫', label: 'Exhausted' }
  ];

  const energies: { type: EnergyType; label: string; icon: string }[] = [
    { type: 'Low', label: 'Low', icon: '🔋' },
    { type: 'Medium', label: 'Medium', icon: '⚡' },
    { type: 'High', label: 'High', icon: '🔥' }
  ];

  const selectedMood = currentMoodLog?.mood;
  const selectedEnergy = currentMoodLog?.energy;

  const handleMoodSelect = (m: MoodType) => {
    onSaveMood(m, selectedEnergy || 'Medium');
  };

  const handleEnergySelect = (e: EnergyType) => {
    onSaveMood(selectedMood || 'Good', e);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
            Mood & Energy
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">How are you feeling today?</span>
        </div>

        {selectedMood && selectedEnergy && (
          <span className="text-[11px] font-bold text-[#65A87A] bg-[#F0FDF4] px-2.5 py-1 rounded-full">
            Checked in ✓
          </span>
        )}
      </div>

      {/* Mood Selector */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Mood
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {moods.map(({ type, emoji, label }) => {
            const isSelected = selectedMood === type;
            return (
              <button
                key={type}
                onClick={() => handleMoodSelect(type)}
                className={`py-2 px-1 rounded-2xl border transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-[#FCECEF] border-[#E96A8D] shadow-xs scale-105'
                    : 'bg-[#FAF9F6] border-gray-100 hover:bg-white text-gray-600'
                }`}
              >
                <span className="text-xl sm:text-2xl">{emoji}</span>
                <span className="text-[10px] font-bold mt-1 tracking-tight text-[#252525]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Energy Selector */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Energy Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {energies.map(({ type, label, icon }) => {
            const isSelected = selectedEnergy === type;
            return (
              <button
                key={type}
                onClick={() => handleEnergySelect(type)}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1D4ED8] shadow-xs'
                    : 'bg-[#FAF9F6] border-gray-100 text-gray-600 hover:bg-white'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
