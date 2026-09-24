import React, { useState } from 'react';
import { Download, Check, Cloud, CloudCheck, LogIn, LogOut, ShieldCheck, Droplets } from 'lucide-react';
import { UserProfile } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { User } from 'firebase/auth';

interface ProfileModalProps {
  profile: UserProfile;
  user: User | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
  onResetData: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  user,
  onUpdateProfile,
  onSignInWithGoogle,
  onSignOut,
  onClose,
  onResetData
}) => {
  const [firstName, setFirstName] = useState(
    profile.firstName || (user?.displayName ? user.displayName.split(' ')[0] : (profile.displayName ? profile.displayName.split(' ')[0] : 'Friend'))
  );
  const [displayName, setDisplayName] = useState(profile.displayName || profile.firstName || user?.displayName || 'Fitness Friend');
  const [age, setAge] = useState((profile.age || 26).toString());
  const [height, setHeight] = useState((profile.height || profile.heightCm || 165).toString());
  const [weight, setWeight] = useState(
    (profile.weight || profile.currentWeight || profile.startingWeight || 70.0).toString()
  );
  const [goalWeight, setGoalWeight] = useState(profile.goalWeight.toString());
  const [activityLevel, setActivityLevel] = useState<string>(
    profile.activityLevel || 'Moderately Active'
  );
  const [dailyStepGoal, setDailyStepGoal] = useState(
    (profile.dailyStepGoal || 10000).toString()
  );
  const [dailyWaterGoal, setDailyWaterGoal] = useState(
    (profile.dailyWaterGoal || profile.waterDailyGoalMl || 2500).toString()
  );
  const [journeyStartDate, setJourneyStartDate] = useState(profile.journeyStartDate);
  const [workoutHydrationReminderEnabled, setWorkoutHydrationReminderEnabled] = useState(
    profile.workoutHydrationReminderEnabled !== false
  );
  const [workoutHydrationReminderIntervalMin, setWorkoutHydrationReminderIntervalMin] = useState<number>(
    profile.workoutHydrationReminderIntervalMin || 30
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await onSignInWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign in with Google');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await onSignOut();
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign out');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirstName = firstName.trim() || 'Fitness Friend';
    const parsedWeight = parseFloat(weight) || 70.0;
    const parsedGoal = parseFloat(goalWeight) || 65.0;
    const parsedHeight = parseFloat(height) || 168;
    const parsedWater = parseInt(dailyWaterGoal, 10) || 2500;
    const parsedSteps = parseInt(dailyStepGoal, 10) || 10000;
    const parsedAge = parseInt(age, 10) || 26;

    onUpdateProfile({
      firstName: cleanFirstName,
      displayName: displayName.trim() || cleanFirstName,
      age: parsedAge,
      height: parsedHeight,
      heightCm: parsedHeight,
      weight: parsedWeight,
      currentWeight: parsedWeight,
      startingWeight: profile.startingWeight || parsedWeight,
      goalWeight: parsedGoal,
      activityLevel: activityLevel as any,
      dailyStepGoal: parsedSteps,
      dailyWaterGoal: parsedWater,
      waterDailyGoalMl: parsedWater,
      workoutHydrationReminderEnabled,
      workoutHydrationReminderIntervalMin: Number(workoutHydrationReminderIntervalMin),
      journeyStartDate
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center font-bold text-xs uppercase">
              {(firstName || 'A').charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#252525]">Profile & Cloud Sync</h3>
              <span className="text-[11px] font-extrabold text-[#E96A8D] font-mono tracking-wider block">
                {firstName.toUpperCase()} FIT♡
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Firebase Account & Cloud Sync Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF5F7] to-[#F3F8FF] border border-[#FCECEF] mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CloudCheck className="w-4 h-4 text-[#E96A8D]" />
              <span className="text-xs font-bold text-[#252525]">Firebase Cloud Storage</span>
            </div>
            <span className="text-[10px] font-bold text-[#65A87A] bg-[#DCFCE7] px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Connected
            </span>
          </div>

          {user ? (
            <div className="space-y-2 pt-1 border-t border-pink-100">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E96A8D] text-white text-xs font-bold flex items-center justify-center">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#252525] truncate">{user.displayName || firstName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  <p className="text-[9px] font-mono text-[#E96A8D] font-bold truncate">users/{user.uid}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={authLoading}
                className="w-full py-1.5 px-3 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3 h-3 text-gray-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1 border-t border-pink-100">
              <p className="text-[11px] text-gray-600 leading-tight">
                Sign in with Google to back up your workouts, weight logs, and journey milestones to Firestore securely. No API keys needed.
              </p>
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full py-2 px-3 rounded-xl bg-white border border-gray-300 text-[#252525] hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{authLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {authError && (
            <p className="text-[10px] text-red-500 font-medium">{authError}</p>
          )}
        </div>

        {/* PWA Install status */}
        <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]/60 mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E40AF]">PWA Offline Support</span>
            {isInstalled ? (
              <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                Installed ✓
              </span>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#3B82F6] px-2.5 py-1 rounded-full hover:bg-[#2563EB]"
              >
                <Download className="w-3 h-3" />
                Install App
              </button>
            ) : isIOS ? (
              <span className="text-[10px] text-gray-500 font-medium">Safari Share</span>
            ) : (
              <span className="text-[10px] text-[#3B82F6] font-semibold">Active</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (!displayName || displayName === firstName) {
                    setDisplayName(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#252525]"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Age</label>
              <input
                type="number"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#252525]"
                placeholder="26"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Goal Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Height (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#252525] bg-white"
              >
                <option value="Sedentary">Sedentary</option>
                <option value="Lightly Active">Lightly Active</option>
                <option value="Moderately Active">Moderately Active</option>
                <option value="Very Active">Very Active</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Daily Steps Goal</label>
              <input
                type="number"
                step="500"
                value={dailyStepGoal}
                onChange={(e) => setDailyStepGoal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#3B82F6]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Daily Water (ml)</label>
              <input
                type="number"
                step="100"
                value={dailyWaterGoal}
                onChange={(e) => setDailyWaterGoal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Journey Start Date</label>
            <input
              type="date"
              value={journeyStartDate}
              onChange={(e) => setJourneyStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
            />
          </div>

          {/* Workout Hydration Reminder Settings */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F0FDF4] border border-[#BFDBFE]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#252525]">Workout Hydration Check</h4>
                  <p className="text-[10px] text-gray-500">Walk, Jog & Run reminders</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={workoutHydrationReminderEnabled}
                  onChange={(e) => setWorkoutHydrationReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
              </label>
            </div>

            {workoutHydrationReminderEnabled ? (
              <div className="pt-2 border-t border-blue-100/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-700">Reminder Interval</label>
                  <span className="text-[11px] font-extrabold text-[#3B82F6]">
                    Every {workoutHydrationReminderIntervalMin} min
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setWorkoutHydrationReminderIntervalMin(mins)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                        workoutHydrationReminderIntervalMin === mins
                          ? 'bg-[#3B82F6] text-white shadow-xs'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {mins}m {mins === 30 ? '★' : ''}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">
                  Shows a gentle banner <span className="font-semibold text-gray-700">"💧 Hydration check! Take a few sips of water."</span> and notifies in background without pausing your timer or GPS.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 italic">
                Hydration reminders are currently muted during active workouts.
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#E96A8D] text-white font-bold text-xs shadow-md hover:bg-[#d85579] transition flex items-center justify-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium">ASABEA FIT Platform • Multi-User</span>
          <button
            onClick={onResetData}
            className="text-red-400 hover:text-red-600 font-semibold"
          >
            Reset Data
          </button>
        </div>
      </div>
    </div>
  );
};
