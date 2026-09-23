import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { WorkoutTracker } from './components/WorkoutTracker';
import { WeightLossJourney } from './components/WeightLossJourney';
import { WaterTracker } from './components/WaterTracker';
import { HabitTracker } from './components/HabitTracker';
import { MoodEnergy } from './components/MoodEnergy';
import { FoodJournal } from './components/FoodJournal';
import { JournalView } from './components/JournalView';
import { MilestonesView } from './components/MilestonesView';
import { JourneyTimeline } from './components/JourneyTimeline';
import { WeeklyMonthlySummary } from './components/WeeklyMonthlySummary';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import {
  AppState,
  loadStoredState,
  saveStoredState,
  getJourneyDay,
  TODAY_STR,
  INITIAL_PROFILE
} from './lib/store';
import { Workout, WeightEntry, MoodType, EnergyType, PhotoStage, HabitLog, FoodEntry, JournalEntry, ProgressPhoto } from './types';
import confetti from 'canvas-confetti';
import { auth, signInWithGoogle, signOutUser } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  syncProfileToFirestore,
  saveWorkoutToFirestore,
  deleteWorkoutFromFirestore,
  saveWeightToFirestore,
  deleteWeightFromFirestore,
  saveWaterLogToFirestore,
  deleteWaterLogFromFirestore,
  saveHabitLogToFirestore,
  saveFoodEntryToFirestore,
  deleteFoodEntryFromFirestore,
  saveMoodLogToFirestore,
  saveJournalEntryToFirestore,
  deleteJournalEntryFromFirestore,
  saveMilestoneToFirestore,
  saveProgressPhotoToFirestore,
  deleteProgressPhotoFromFirestore,
  subscribeToUserData
} from './lib/firestoreService';

export function App() {
  const [state, setState] = useState<AppState>(() => loadStoredState());
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [activeWorkoutInfo, setActiveWorkoutInfo] = useState<{ type: any; durationSec: number; distanceKm: number } | null>(null);
  const isMigratingRef = useRef(false);

  const handleActiveWorkoutChange = useCallback(
    (active: boolean, summary?: { type: any; durationSec: number; distanceKm: number }) => {
      setIsWorkoutActive((prev) => (prev !== active ? active : prev));
      if (!active) {
        setActiveWorkoutInfo((prev) => (prev !== null ? null : prev));
      } else if (summary) {
        setActiveWorkoutInfo((prev) => {
          if (
            prev &&
            prev.type === summary.type &&
            prev.durationSec === summary.durationSec &&
            prev.distanceKm === summary.distanceKm
          ) {
            return prev;
          }
          return summary;
        });
      }
    },
    []
  );

  // Save to local storage whenever state changes
  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('ASABEA FIT SW registered:', reg.scope))
          .catch((err) => console.warn('ASABEA FIT SW registration notice:', err));
      });
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        // Subscribe to real-time updates from Firestore
        const unsubFirestore = subscribeToUserData(user.uid, {
          onProfile: (cloudProfile) => {
            if (cloudProfile) {
              setState((prev) => ({ ...prev, profile: { ...prev.profile, ...cloudProfile } }));
            }
          },
          onWorkouts: (cloudWorkouts) => {
            if (cloudWorkouts && cloudWorkouts.length > 0) {
              setState((prev) => ({ ...prev, workouts: cloudWorkouts }));
            }
          },
          onWeights: (cloudWeights) => {
            if (cloudWeights && cloudWeights.length > 0) {
              setState((prev) => ({ ...prev, weights: cloudWeights }));
            }
          },
          onWater: (cloudWater) => {
            if (cloudWater && cloudWater.length > 0) {
              setState((prev) => ({ ...prev, waterLogs: cloudWater }));
            }
          },
          onHabits: (cloudHabits) => {
            if (cloudHabits && Object.keys(cloudHabits).length > 0) {
              setState((prev) => ({ ...prev, habits: { ...prev.habits, ...cloudHabits } }));
            }
          },
          onFood: (cloudFood) => {
            if (cloudFood && cloudFood.length > 0) {
              setState((prev) => ({ ...prev, foodEntries: cloudFood }));
            }
          },
          onMoods: (cloudMoods) => {
            if (cloudMoods && Object.keys(cloudMoods).length > 0) {
              setState((prev) => ({ ...prev, moods: { ...prev.moods, ...cloudMoods } }));
            }
          },
          onJournal: (cloudJournal) => {
            if (cloudJournal && cloudJournal.length > 0) {
              setState((prev) => ({ ...prev, journalEntries: cloudJournal }));
            }
          },
          onMilestones: (cloudMilestones) => {
            if (cloudMilestones && Object.keys(cloudMilestones).length > 0) {
              setState((prev) => {
                const nextMilestones = { ...prev.milestones };
                Object.entries(cloudMilestones).forEach(([key, val]) => {
                  if (nextMilestones[key]) {
                    nextMilestones[key] = { ...nextMilestones[key], ...val };
                  }
                });
                return { ...prev, milestones: nextMilestones };
              });
            }
          },
          onPhotos: (cloudPhotos) => {
            if (cloudPhotos && cloudPhotos.length > 0) {
              setState((prev) => ({ ...prev, progressPhotos: cloudPhotos }));
            }
          }
        });

        // If newly signed in and we have local data, sync initial profile & records to Firestore
        if (!isMigratingRef.current) {
          isMigratingRef.current = true;
          try {
            await syncProfileToFirestore(
              {
                ...state.profile,
                displayName: user.displayName || state.profile.displayName,
                email: user.email || state.profile.email,
                userId: user.uid
              },
              user.uid
            );
            // Migrate any local workouts that don't have user.uid
            state.workouts.forEach((w) => {
              if (w.userId !== user.uid) {
                saveWorkoutToFirestore({ ...w, userId: user.uid }, user.uid);
              }
            });
            // Migrate local weights
            state.weights.forEach((wt) => {
              if (wt.userId !== user.uid) {
                saveWeightToFirestore({ ...wt, userId: user.uid }, user.uid);
              }
            });
          } catch (e) {
            console.warn('Initial cloud migration notice:', e);
          }
        }

        setIsSyncing(false);

        return () => {
          unsubFirestore();
        };
      }
    });

    return () => unsubscribe();
  }, []);

  // Check milestones whenever workouts or weights change
  useEffect(() => {
    const totalWorkouts = state.workouts.length;
    const sortedWeights = [...state.weights].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestWeight = sortedWeights[0]?.weightKg ?? state.profile.startingWeight;
    const weightLost = state.profile.startingWeight - latestWeight;

    let updated = false;
    const newMilestones = { ...state.milestones };

    // Milestone: FIRST_WORKOUT
    if (totalWorkouts >= 1 && !newMilestones.FIRST_WORKOUT?.unlocked) {
      newMilestones.FIRST_WORKOUT = {
        ...newMilestones.FIRST_WORKOUT,
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      updated = true;
      if (currentUser) {
        saveMilestoneToFirestore('FIRST_WORKOUT', newMilestones.FIRST_WORKOUT.unlockedAt!, currentUser.uid);
      }
    }

    // Milestone: WORKOUTS_5
    if (totalWorkouts >= 5 && !newMilestones.WORKOUTS_5?.unlocked) {
      newMilestones.WORKOUTS_5 = {
        ...newMilestones.WORKOUTS_5,
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      updated = true;
      if (currentUser) {
        saveMilestoneToFirestore('WORKOUTS_5', newMilestones.WORKOUTS_5.unlockedAt!, currentUser.uid);
      }
    }

    // Milestone: WORKOUTS_10
    if (totalWorkouts >= 10 && !newMilestones.WORKOUTS_10?.unlocked) {
      newMilestones.WORKOUTS_10 = {
        ...newMilestones.WORKOUTS_10,
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      updated = true;
      if (currentUser) {
        saveMilestoneToFirestore('WORKOUTS_10', newMilestones.WORKOUTS_10.unlockedAt!, currentUser.uid);
      }
    }

    // Milestone: FIRST_WEIGHT_MILESTONE (2kg lost)
    if (weightLost >= 2.0 && !newMilestones.FIRST_WEIGHT_MILESTONE?.unlocked) {
      newMilestones.FIRST_WEIGHT_MILESTONE = {
        ...newMilestones.FIRST_WEIGHT_MILESTONE,
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      updated = true;
      if (currentUser) {
        saveMilestoneToFirestore('FIRST_WEIGHT_MILESTONE', newMilestones.FIRST_WEIGHT_MILESTONE.unlockedAt!, currentUser.uid);
      }
    }

    if (updated) {
      setState((prev) => ({ ...prev, milestones: newMilestones }));
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [state.workouts.length, state.weights, currentUser]);

  const dayNumber = getJourneyDay(state.profile.journeyStartDate);

  // Handlers for Workout
  const handleSaveWorkout = (workoutData: Omit<Workout, 'id' | 'createdAt'>) => {
    const workoutId = `w-${Date.now()}`;
    const uid = currentUser?.uid || 'asabea-primary';
    const newWorkout: Workout = {
      ...workoutData,
      id: workoutId,
      userId: uid,
      createdAt: new Date().toISOString()
    };

    // Auto-check today's habit workout
    const todayHabit: HabitLog = state.habits[TODAY_STR] || {
      id: `habit-${TODAY_STR}`,
      userId: uid,
      date: TODAY_STR,
      workout: false,
      water: false,
      healthyMeal: false,
      steps: false,
      sleep: false,
      noZeroDay: true,
      updatedAt: new Date().toISOString()
    };

    const updatedHabit = {
      ...todayHabit,
      workout: true,
      noZeroDay: true,
      updatedAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      workouts: [newWorkout, ...prev.workouts],
      habits: {
        ...prev.habits,
        [TODAY_STR]: updatedHabit
      }
    }));

    if (currentUser) {
      saveWorkoutToFirestore(newWorkout, currentUser.uid);
      saveHabitLogToFirestore(updatedHabit, currentUser.uid);
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  const handleDeleteWorkout = (id: string) => {
    setState((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((w) => w.id !== id)
    }));
    if (currentUser) {
      deleteWorkoutFromFirestore(id);
    }
  };

  // Handlers for Weight
  const handleSaveWeight = (entry: Omit<WeightEntry, 'id' | 'createdAt'>) => {
    const weightId = `weight-${Date.now()}`;
    const uid = currentUser?.uid || 'asabea-primary';
    const newEntry: WeightEntry = {
      ...entry,
      id: weightId,
      userId: uid,
      createdAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      weights: [newEntry, ...prev.weights],
      profile: {
        ...prev.profile,
        currentWeight: entry.weightKg
      }
    }));

    if (currentUser) {
      saveWeightToFirestore(newEntry, currentUser.uid);
      syncProfileToFirestore({ ...state.profile, currentWeight: entry.weightKg }, currentUser.uid);
    }
  };

  const handleDeleteWeight = (id: string) => {
    setState((prev) => ({
      ...prev,
      weights: prev.weights.filter((w) => w.id !== id)
    }));
    if (currentUser) {
      deleteWeightFromFirestore(id);
    }
  };

  // Handlers for Photos
  const handleSavePhoto = (stage: PhotoStage, photoUrl: string, notes?: string) => {
    const photoId = `photo-${Date.now()}`;
    const uid = currentUser?.uid || 'asabea-primary';
    const newPhoto: ProgressPhoto = {
      id: photoId,
      userId: uid,
      stage,
      photoUrl,
      notes,
      date: TODAY_STR,
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      progressPhotos: [...prev.progressPhotos.filter((p) => p.stage !== stage), newPhoto]
    }));

    if (currentUser) {
      saveProgressPhotoToFirestore(newPhoto, currentUser.uid);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setState((prev) => ({
      ...prev,
      progressPhotos: prev.progressPhotos.filter((p) => p.id !== id)
    }));
    if (currentUser) {
      deleteProgressPhotoFromFirestore(id);
    }
  };

  // Handlers for Water
  const handleAddWater = (amountMl: number) => {
    const waterId = `water-${Date.now()}`;
    const uid = currentUser?.uid || 'asabea-primary';
    const newLog = {
      id: waterId,
      userId: uid,
      amountMl,
      date: TODAY_STR,
      timestamp: new Date().toISOString()
    };

    const todayHabit: HabitLog = state.habits[TODAY_STR] || {
      id: `habit-${TODAY_STR}`,
      userId: uid,
      date: TODAY_STR,
      workout: false,
      water: false,
      healthyMeal: false,
      steps: false,
      sleep: false,
      noZeroDay: true,
      updatedAt: new Date().toISOString()
    };

    const currentTotal = state.waterLogs
      .filter((w) => w.date === TODAY_STR)
      .reduce((acc, w) => acc + w.amountMl, 0);

    const isGoalMet = currentTotal + amountMl >= state.profile.waterDailyGoalMl;
    const updatedHabit = {
      ...todayHabit,
      water: isGoalMet ? true : todayHabit.water,
      noZeroDay: true,
      updatedAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      waterLogs: [...prev.waterLogs, newLog],
      habits: {
        ...prev.habits,
        [TODAY_STR]: updatedHabit
      }
    }));

    if (currentUser) {
      saveWaterLogToFirestore(newLog, currentUser.uid);
      saveHabitLogToFirestore(updatedHabit, currentUser.uid);
    }
  };

  const handleResetTodayWater = () => {
    const todayLogs = state.waterLogs.filter((w) => w.date === TODAY_STR);
    setState((prev) => ({
      ...prev,
      waterLogs: prev.waterLogs.filter((w) => w.date !== TODAY_STR)
    }));
    if (currentUser) {
      todayLogs.forEach((l) => deleteWaterLogFromFirestore(l.id));
    }
  };

  // Handlers for Habits
  const handleToggleHabit = (key: keyof Omit<HabitLog, 'id' | 'userId' | 'date' | 'updatedAt'>) => {
    const uid = currentUser?.uid || 'asabea-primary';
    const todayHabit: HabitLog = state.habits[TODAY_STR] || {
      id: `habit-${TODAY_STR}`,
      userId: uid,
      date: TODAY_STR,
      workout: false,
      water: false,
      healthyMeal: false,
      steps: false,
      sleep: false,
      noZeroDay: true,
      updatedAt: new Date().toISOString()
    };

    const updated: HabitLog = {
      ...todayHabit,
      [key]: !todayHabit[key],
      updatedAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      habits: {
        ...prev.habits,
        [TODAY_STR]: updated
      }
    }));

    if (currentUser) {
      saveHabitLogToFirestore(updated, currentUser.uid);
    }
  };

  // Handlers for Mood & Energy
  const handleSaveMood = (mood: MoodType, energy: EnergyType) => {
    const uid = currentUser?.uid || 'asabea-primary';
    const newMoodLog = {
      id: `mood-${Date.now()}`,
      userId: uid,
      date: TODAY_STR,
      mood,
      energy,
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      moods: {
        ...prev.moods,
        [TODAY_STR]: newMoodLog
      }
    }));

    if (currentUser) {
      saveMoodLogToFirestore(newMoodLog, currentUser.uid);
    }
  };

  // Handlers for Food
  const handleAddFood = (foodData: any) => {
    const uid = currentUser?.uid || 'asabea-primary';
    const newFood: FoodEntry = {
      ...foodData,
      id: `food-${Date.now()}`,
      userId: uid,
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      foodEntries: [newFood, ...prev.foodEntries]
    }));

    if (currentUser) {
      saveFoodEntryToFirestore(newFood, currentUser.uid);
    }
  };

  const handleDeleteFood = (id: string) => {
    setState((prev) => ({
      ...prev,
      foodEntries: prev.foodEntries.filter((f) => f.id !== id)
    }));
    if (currentUser) {
      deleteFoodEntryFromFirestore(id);
    }
  };

  // Handlers for Journal
  const handleSaveJournal = (content: string, prompt: string, date: string) => {
    const uid = currentUser?.uid || 'asabea-primary';
    const newEntry: JournalEntry = {
      id: `j-${Date.now()}`,
      userId: uid,
      content,
      prompt,
      date,
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      journalEntries: [newEntry, ...prev.journalEntries]
    }));

    if (currentUser) {
      saveJournalEntryToFirestore(newEntry, currentUser.uid);
    }
  };

  const handleDeleteJournal = (id: string) => {
    setState((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.filter((j) => j.id !== id)
    }));
    if (currentUser) {
      deleteJournalEntryFromFirestore(id);
    }
  };

  const handleUpdateProfile = (updated: Partial<typeof state.profile>) => {
    const newProfile = {
      ...state.profile,
      ...updated
    };
    setState((prev) => ({
      ...prev,
      profile: newProfile
    }));

    if (currentUser) {
      syncProfileToFirestore(newProfile, currentUser.uid);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to baseline?')) {
      localStorage.removeItem('asabea_fit_data_v1');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#252525] font-sans antialiased selection:bg-[#FCECEF] selection:text-[#E96A8D]">
      {/* Top Header */}
      <Header
        displayName={state.profile.displayName}
        dayNumber={dayNumber}
        user={currentUser}
        isSyncing={isSyncing}
        onOpenProfile={() => setShowProfileModal(true)}
        onSignIn={() => setShowProfileModal(true)}
      />

      {/* Main Tab Content */}
      <main className="pt-2 pb-16">
        {currentTab === 'home' && (
          <HomeDashboard
            state={state}
            dayNumber={dayNumber}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onStartWorkout={() => setCurrentTab('workout')}
            onQuickWater={handleAddWater}
            onOpenWeightModal={() => {
              setCurrentTab('progress');
            }}
            onOpenFoodModal={() => {
              setCurrentTab('journal');
            }}
            onOpenMoodModal={() => {
              setCurrentTab('journal');
            }}
          />
        )}

        {/* Workout Tracker - Kept mounted to ensure continuous tracking across tabs */}
        <div style={{ display: currentTab === 'workout' ? 'block' : 'none' }}>
          <WorkoutTracker
            workouts={state.workouts}
            onSaveWorkout={handleSaveWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            userId={currentUser?.uid || 'asabea-primary'}
            onActiveStateChange={handleActiveWorkoutChange}
            hydrationReminderEnabled={state.profile.workoutHydrationReminderEnabled !== false}
            hydrationReminderIntervalMin={state.profile.workoutHydrationReminderIntervalMin || 30}
            onOpenProfileSettings={() => setShowProfileModal(true)}
          />
        </div>

        {currentTab === 'progress' && (
          <div className="space-y-6 max-w-xl mx-auto px-4 pt-2 pb-24">
            <WeightLossJourney
              profile={state.profile}
              weights={state.weights}
              progressPhotos={state.progressPhotos}
              onSaveWeight={handleSaveWeight}
              onDeleteWeight={handleDeleteWeight}
              onSavePhoto={handleSavePhoto}
              onDeletePhoto={handleDeletePhoto}
              onUpdateProfileGoals={(startingKg, goalKg) => {
                handleUpdateProfile({ startingWeight: startingKg, goalWeight: goalKg });
              }}
            />

            <WaterTracker
              waterLogs={state.waterLogs}
              dailyGoalMl={state.profile.waterDailyGoalMl}
              onAddWater={handleAddWater}
              onResetTodayWater={handleResetTodayWater}
            />

            <HabitTracker
              habits={state.habits}
              onToggleHabit={handleToggleHabit}
            />

            <MilestonesView milestones={state.milestones} />

            <WeeklyMonthlySummary state={state} />

            <JourneyTimeline state={state} />
          </div>
        )}

        {currentTab === 'journal' && (
          <div className="space-y-6 max-w-xl mx-auto px-4 pt-2 pb-24">
            <MoodEnergy
              currentMoodLog={state.moods[TODAY_STR]}
              onSaveMood={handleSaveMood}
            />

            <FoodJournal
              foodEntries={state.foodEntries}
              onAddFood={handleAddFood}
              onDeleteFood={handleDeleteFood}
            />

            <JournalView
              entries={state.journalEntries}
              todayMood={state.moods[TODAY_STR]}
              onSaveJournal={handleSaveJournal}
              onDeleteJournal={handleDeleteJournal}
            />
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="max-w-xl mx-auto px-4 pt-2 pb-24 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E96A8D] to-[#FF8FA8] text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-[#E96A8D]/20 overflow-hidden">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Profile'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{state.profile.displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-[#252525]">{currentUser?.displayName || state.profile.displayName}</h2>
                <p className="text-xs text-[#E96A8D] font-bold">
                  Day {dayNumber} of healthier-me journey
                </p>
                <p className="text-xs text-gray-400 mt-1">{currentUser?.email || state.profile.email}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                <div className="p-2 bg-[#FAF9F6] rounded-xl">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Start</span>
                  <span className="text-sm font-extrabold text-[#252525]">{state.profile.startingWeight} kg</span>
                </div>
                <div className="p-2 bg-[#FCECEF] rounded-xl">
                  <span className="text-[10px] text-[#E96A8D] uppercase font-bold block">Current</span>
                  <span className="text-sm font-extrabold text-[#E96A8D]">{state.profile.currentWeight || state.profile.startingWeight} kg</span>
                </div>
                <div className="p-2 bg-[#EFF6FF] rounded-xl">
                  <span className="text-[10px] text-[#3B82F6] uppercase font-bold block">Goal</span>
                  <span className="text-sm font-extrabold text-[#3B82F6]">{state.profile.goalWeight} kg</span>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full py-3 rounded-2xl bg-[#E96A8D] text-white font-bold text-xs shadow-xs hover:bg-[#d85579] transition"
              >
                Edit Profile, Goals & Cloud Sync
              </button>
            </div>

            <MilestonesView milestones={state.milestones} />
          </div>
        )}
      </main>

      {/* Floating Active Workout Banner if navigating outside Workout Tab */}
      {isWorkoutActive && currentTab !== 'workout' && activeWorkoutInfo && (
        <div
          onClick={() => setCurrentTab('workout')}
          className="fixed bottom-20 left-4 right-4 max-w-xl mx-auto z-40 bg-[#252525] text-white p-3 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center justify-between cursor-pointer hover:bg-black transition animate-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E96A8D] animate-ping" />
            <div>
              <span className="text-xs font-black block">Active {activeWorkoutInfo.type} in Progress</span>
              <span className="text-[11px] text-gray-300 font-mono">
                {Math.floor(activeWorkoutInfo.durationSec / 60)}:{(activeWorkoutInfo.durationSec % 60).toString().padStart(2, '0')} • {activeWorkoutInfo.distanceKm.toFixed(2)} km
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#E96A8D] bg-white/10 px-3 py-1.5 rounded-xl">
            Return to Workout →
          </span>
        </div>
      )}

      {/* Fixed Bottom Navigation for mobile-first PWA */}
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Profile & Settings Modal with Google Auth & Firebase Cloud Sync */}
      {showProfileModal && (
        <ProfileModal
          profile={state.profile}
          user={currentUser}
          onUpdateProfile={handleUpdateProfile}
          onSignInWithGoogle={async () => {
            await signInWithGoogle();
          }}
          onSignOut={signOutUser}
          onClose={() => setShowProfileModal(false)}
          onResetData={handleResetData}
        />
      )}

      {/* First-run Onboarding if needed */}
      {showOnboarding && (
        <OnboardingModal
          initialProfile={state.profile}
          onComplete={(newProfile) => {
            setState((prev) => ({
              ...prev,
              profile: newProfile,
              onboardingCompleted: true
            }));
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
