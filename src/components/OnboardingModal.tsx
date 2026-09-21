import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, Heart } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingModalProps {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [startingWeight, setStartingWeight] = useState(initialProfile.startingWeight.toString());
  const [goalWeight, setGoalWeight] = useState(initialProfile.goalWeight.toString());
  const [heightCm, setHeightCm] = useState((initialProfile.heightCm || 168).toString());

  const handleFinish = () => {
    onComplete({
      ...initialProfile,
      displayName: displayName.trim() || 'Asabea',
      startingWeight: parseFloat(startingWeight) || 78.5,
      goalWeight: parseFloat(goalWeight) || 68.0,
      currentWeight: parseFloat(startingWeight) || 78.5,
      heightCm: parseFloat(heightCm) || 168
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-200">
        {step === 1 && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#E96A8D] to-[#FF8FA8] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#E96A8D]/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#E96A8D] uppercase tracking-widest font-mono">
                ASABEA FIT
              </span>
              <h2 className="text-2xl font-black text-[#252525]">
                Welcome, Asabea!
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Your personal progressive web app fitness companion. Built to celebrate your dedication, track your walks, jogs, water, and weight loss.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#FCECEF] text-[#E96A8D] font-serif italic text-xs font-semibold">
              "Small Steps. Big Results. Same girl. Bigger goals."
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-2xl bg-[#E96A8D] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#E96A8D]/20 hover:bg-[#d85579] transition"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-left">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[#252525]">Confirm Your Goals</h3>
              <p className="text-xs text-gray-500">Metric measurements (kg & cm)</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-extrabold text-[#252525]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Starting (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={startingWeight}
                    onChange={(e) => setStartingWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-extrabold text-[#252525]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Goal (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-extrabold text-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-[#252525]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-2xl bg-[#E96A8D] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#d85579] transition"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[3px]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#252525]">You Are Ready!</h3>
              <p className="text-xs text-gray-500">
                Consistency, not perfection. Today is Day 1.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 text-left space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E96A8D]" />
                <span>Track walks, jogs, and runs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                <span>Log 2.5L daily water</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#65A87A]" />
                <span>Celebrate milestones & share to WhatsApp</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl bg-[#E96A8D] text-white font-extrabold text-sm shadow-md shadow-[#E96A8D]/25 hover:bg-[#d85579] transition"
            >
              Enter ASABEA FIT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
