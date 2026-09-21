import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  Edit2,
  Camera,
  Image as ImageIcon,
  TrendingDown,
  Info,
  Calendar,
  Sparkles,
  Lock
} from 'lucide-react';
import { WeightEntry, ProgressPhoto, PhotoStage, UserProfile } from '../types';
import { TODAY_STR } from '../lib/store';

interface WeightLossJourneyProps {
  profile: UserProfile;
  weights: WeightEntry[];
  progressPhotos: ProgressPhoto[];
  onSaveWeight: (entry: Omit<WeightEntry, 'id' | 'createdAt'>) => void;
  onDeleteWeight: (id: string) => void;
  onSavePhoto: (stage: PhotoStage, photoUrl: string, notes?: string) => void;
  onDeletePhoto: (id: string) => void;
  onUpdateProfileGoals: (startingKg: number, goalKg: number) => void;
}

export const WeightLossJourney: React.FC<WeightLossJourneyProps> = ({
  profile,
  weights,
  progressPhotos,
  onSaveWeight,
  onDeleteWeight,
  onSavePhoto,
  onDeletePhoto,
  onUpdateProfileGoals
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [weightKg, setWeightKg] = useState('78.0');
  const [waistCm, setWaistCm] = useState('83');
  const [date, setDate] = useState(TODAY_STR);
  const [notes, setNotes] = useState('');

  // Upload photo modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoStage, setPhotoStage] = useState<PhotoStage>('START');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoNotes, setPhotoNotes] = useState('');

  // Goal calculation
  const startWeight = profile.startingWeight;
  const goalWeight = profile.goalWeight;
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latestWeight = sortedWeights[0]?.weightKg ?? startWeight;

  const totalToLose = Math.max(0.1, startWeight - goalWeight);
  const totalLost = Math.max(0, startWeight - latestWeight);
  const remaining = Math.max(0, latestWeight - goalWeight);
  const percentCompleted = Math.min(100, Math.round((totalLost / totalToLose) * 100));

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWeight({
      userId: 'asabea-primary',
      weightKg: parseFloat(weightKg),
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      date,
      notes: notes.trim() || undefined
    });
    setShowLogModal(false);
    setNotes('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) return;
    onSavePhoto(photoStage, photoDataUrl, photoNotes);
    setShowPhotoModal(false);
    setPhotoDataUrl(null);
    setPhotoNotes('');
  };

  const stages: { id: PhotoStage; label: string; sub: string }[] = [
    { id: 'START', label: 'START', sub: 'Baseline Day 1' },
    { id: '30_DAYS', label: '30 DAYS', sub: '1 Month In' },
    { id: '60_DAYS', label: '60 DAYS', sub: '2 Months In' },
    { id: '90_DAYS', label: '90 DAYS', sub: '3 Months In' }
  ];

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#252525]">Weight Loss Journey</h2>
          <p className="text-xs text-gray-500 font-medium">
            Steady progress, measured in health and strength
          </p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E96A8D] text-white font-bold text-xs shadow-xs hover:bg-[#d85579] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Weight</span>
        </button>
      </div>

      {/* Target Triad Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Starting
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-[#252525] mt-1 block">
            {startWeight.toFixed(1)} <span className="text-xs font-semibold text-gray-400">kg</span>
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">Day 1 baseline</span>
        </div>

        <div className="bg-[#FCECEF]/60 p-3.5 rounded-2xl border border-[#E96A8D]/20 shadow-xs text-center">
          <span className="text-[10px] font-bold text-[#E96A8D] uppercase tracking-wider block">
            Current
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#E96A8D] mt-0.5 block">
            {latestWeight.toFixed(1)} <span className="text-xs font-semibold text-[#E96A8D]/80">kg</span>
          </span>
          <span className="text-[10px] font-bold text-[#65A87A] block mt-0.5">
            -{totalLost.toFixed(1)} kg lost
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Goal Weight
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-[#3B82F6] mt-1 block">
            {goalWeight.toFixed(1)} <span className="text-xs font-semibold text-gray-400">kg</span>
          </span>
          <span className="text-[10px] text-gray-500 block mt-0.5">
            {remaining.toFixed(1)} kg left
          </span>
        </div>
      </div>

      {/* Progress Toward Goal Bar */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#252525] flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-[#65A87A]" />
            Goal Progress
          </span>
          <span className="font-extrabold text-[#E96A8D]">{percentCompleted}% Complete</span>
        </div>

        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E96A8D] to-[#65A87A] rounded-full transition-all duration-700"
            style={{ width: `${Math.max(4, percentCompleted)}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
          <span>{startWeight} kg</span>
          <span>Target: {goalWeight} kg</span>
        </div>
      </div>

      {/* Real Weight History Chart */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
            Weight Trend
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">
            {weights.length} measurements
          </span>
        </div>

        {weights.length > 1 ? (
          <div className="h-40 w-full relative pt-2">
            {/* Simple SVG Trendline */}
            <WeightChart weights={weights} goalWeight={goalWeight} />
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <Scale className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">Initial measurement recorded</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Add another weight entry in a few days to visualize your trend line!
            </p>
          </div>
        )}
      </div>

      {/* Progress Photos Comparison Section */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#E96A8D]" />
              Progress Photos
            </h3>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3 text-[#65A87A]" />
              100% Private to your personal session
            </p>
          </div>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#FCECEF] text-[#E96A8D] font-bold text-xs hover:bg-[#E96A8D] hover:text-white transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Photo</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stages.map((st) => {
            const photo = progressPhotos.find((p) => p.stage === st.id);
            return (
              <div
                key={st.id}
                className="relative rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex flex-col items-center justify-center min-h-[140px] text-center p-2 group"
              >
                {photo ? (
                  <>
                    <img
                      src={photo.photoUrl}
                      alt={st.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2 text-white text-left">
                      <span className="text-[11px] font-extrabold">{st.label}</span>
                      <span className="text-[9px] text-white/80">{photo.date}</span>
                    </div>
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-red-500 rounded-full text-white transition opacity-0 group-hover:opacity-100"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div
                    onClick={() => {
                      setPhotoStage(st.id);
                      setShowPhotoModal(true);
                    }}
                    className="cursor-pointer flex flex-col items-center justify-center p-3 text-gray-400 hover:text-[#E96A8D] transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs mb-2">
                      <Camera className="w-5 h-5 text-gray-300 group-hover:text-[#E96A8D]" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">{st.label}</span>
                    <span className="text-[10px] text-gray-400">{st.sub}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History Log Table */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-600 px-1">
          Measurement Log
        </h3>
        <div className="space-y-2">
          {sortedWeights.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[#252525]">
                    {w.weightKg.toFixed(1)} kg
                  </span>
                  {w.waistCm && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      Waist: {w.waistCm} cm
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 font-medium mt-0.5">
                  {w.date} {w.notes ? `• ${w.notes}` : ''}
                </div>
              </div>

              {w.id !== 'init-weight' && (
                <button
                  onClick={() => onDeleteWeight(w.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Log Weight Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#252525]">Record Measurement</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWeightSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Weight (kg) <span className="text-[#E96A8D]">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-base font-extrabold text-[#252525]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Waist Measurement (cm, optional)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="200"
                  placeholder="E.g. 82.5"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-[#252525]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-[#252525]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Morning weigh-in before breakfast"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#E96A8D] text-white font-bold text-sm shadow-md hover:bg-[#d85579] transition"
              >
                Save Measurement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Progress Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#252525]">Add Progress Photo</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePhotoSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Stage</label>
                <select
                  value={photoStage}
                  onChange={(e) => setPhotoStage(e.target.value as PhotoStage)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                >
                  <option value="START">START (Baseline)</option>
                  <option value="30_DAYS">30 DAYS</option>
                  <option value="60_DAYS">60 DAYS</option>
                  <option value="90_DAYS">90 DAYS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Upload Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FCECEF] file:text-[#E96A8D] hover:file:bg-[#f6d8df]"
                />
              </div>

              {photoDataUrl && (
                <div className="h-40 rounded-xl overflow-hidden border border-gray-200 relative">
                  <img src={photoDataUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Feeling confident and energized"
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={!photoDataUrl}
                className="w-full py-3 rounded-xl bg-[#E96A8D] text-white font-bold text-sm shadow-md hover:bg-[#d85579] disabled:opacity-50 transition"
              >
                Save Progress Photo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Clean SVG Weight Chart
const WeightChart: React.FC<{ weights: WeightEntry[]; goalWeight: number }> = ({ weights, goalWeight }) => {
  const sorted = [...weights].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  if (sorted.length < 2) return null;

  const minKg = Math.min(...sorted.map((w) => w.weightKg), goalWeight) - 1;
  const maxKg = Math.max(...sorted.map((w) => w.weightKg)) + 1;
  const rangeKg = maxKg - minKg || 1;

  const width = 450;
  const height = 130;
  const padding = 20;

  const points = sorted.map((w, idx) => {
    const x = padding + (idx / (sorted.length - 1)) * (width - padding * 2);
    const y = height - padding - ((w.weightKg - minKg) / rangeKg) * (height - padding * 2);
    return { x, y, weight: w.weightKg, date: w.date };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const goalY = height - padding - ((goalWeight - minKg) / rangeKg) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {/* Goal line */}
      <line
        x1={padding}
        y1={goalY}
        x2={width - padding}
        y2={goalY}
        stroke="#3B82F6"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.6"
      />
      <text x={width - padding + 5} y={goalY + 4} fill="#3B82F6" fontSize="10" fontWeight="bold">
        {goalWeight}kg
      </text>

      {/* Gradient under curve */}
      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E96A8D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E96A8D" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
        fill="url(#weightGrad)"
      />

      {/* Main line */}
      <path d={pathD} fill="none" stroke="#E96A8D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#E96A8D" strokeWidth="2.5" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#252525" fontSize="10" fontWeight="bold">
            {p.weight}
          </text>
        </g>
      ))}
    </svg>
  );
};
