import React from 'react';
import { Trophy, CheckCircle, Lock, Share2, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MilestoneItem } from '../types';

interface MilestonesViewProps {
  milestones: Record<string, MilestoneItem>;
  onTriggerConfetti?: () => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({ milestones }) => {
  const milestoneList = Object.values(milestones);

  const fireCelebration = (title: string) => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E96A8D', '#3B82F6', '#65A87A', '#FCECEF', '#FFD700']
      });
    } catch (e) {
      console.warn('Confetti effect:', e);
    }
  };

  const handleShareWhatsApp = (m: MilestoneItem) => {
    const text = `🎉 ASABEA FIT Milestone Unlocked! ✨\n\n🏆 "${m.title}"\n${m.description}\n\n"Small Steps. Big Results. Same girl. Bigger goals."\n#AsabeaFit #AsabeaCreates`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const unlockedCount = milestoneList.filter((m) => m.unlocked).length;

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      <div>
        <h2 className="text-xl font-extrabold text-[#252525]">Journey Milestones</h2>
        <p className="text-xs text-gray-500 font-medium">
          Celebrating every single victory along the path
        </p>
      </div>

      {/* Progress Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#FCECEF] via-white to-[#EFF6FF] border border-[#FCECEF] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E96A8D] text-white flex items-center justify-center shadow-md shadow-[#E96A8D]/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-black text-[#252525]">
              {unlockedCount} of {milestoneList.length} Unlocked
            </span>
            <span className="text-xs text-gray-500 block">
              Keep moving. Every step unlocks another tier.
            </span>
          </div>
        </div>

        <button
          onClick={() => fireCelebration('Celebrate!')}
          className="p-2.5 rounded-full bg-white text-[#E96A8D] shadow-xs hover:scale-110 active:scale-95 transition"
          title="Celebration cheer"
        >
          <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
        </button>
      </div>

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {milestoneList.map((m) => (
          <div
            key={m.key}
            className={`p-4 rounded-3xl border transition-all ${
              m.unlocked
                ? 'bg-white border-[#E96A8D]/30 shadow-sm relative overflow-hidden'
                : 'bg-gray-50/70 border-gray-100 opacity-70'
            }`}
          >
            {m.unlocked && (
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FCECEF] rounded-full blur-md" />
            )}

            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    m.unlocked
                      ? 'bg-[#E96A8D] text-white shadow-xs'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {m.unlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>

                <div>
                  <h4 className="text-xs font-black text-[#252525]">{m.title}</h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#E96A8D]">
                    {m.category}
                  </span>
                </div>
              </div>

              {m.unlocked ? (
                <button
                  onClick={() => handleShareWhatsApp(m)}
                  className="p-1.5 rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25 transition"
                  title="Share to WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] font-semibold text-gray-400">Locked</span>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-3 relative z-10 leading-relaxed">
              {m.description}
            </p>

            {m.unlocked && m.unlockedAt && (
              <div className="text-[10px] font-semibold text-[#65A87A] mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Unlocked on {m.unlockedAt.slice(0, 10)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
