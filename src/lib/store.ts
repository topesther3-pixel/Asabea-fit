import {
  UserProfile,
  Workout,
  WeightEntry,
  WaterLog,
  HabitLog,
  FoodEntry,
  MoodLog,
  JournalEntry,
  MilestoneItem,
  ProgressPhoto,
  HeartRateEntry,
  SleepEntry,
  WorkoutType,
  PhotoStage
} from '../types';
import { db, auth, isFirebaseConfigured } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';

export const TODAY_STR = new Date().toISOString().split('T')[0];

export const INITIAL_PROFILE: UserProfile = {
  uid: 'guest-primary',
  userId: 'guest-primary',
  firstName: '',
  displayName: 'Fitness Friend',
  personalizedBrand: 'ASABEA FIT♡',
  email: '',
  age: 26,
  height: 165,
  heightCm: 165,
  weight: 70.0,
  startingWeight: 70.0,
  goalWeight: 65.0,
  currentWeight: 70.0,
  activityLevel: 'Moderately Active',
  dailyStepGoal: 8000,
  dailyWaterGoal: 2500,
  waterDailyGoalMl: 2500,
  dailyCalorieGoal: 400,
  dailyActiveMinutesGoal: 30,
  avatar: '',
  journeyStartDate: TODAY_STR,
  workoutHydrationReminderEnabled: true,
  workoutHydrationReminderIntervalMin: 30,
  createdAt: new Date().toISOString()
};

export function createNewUserProfile(user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}): UserProfile {
  const rawName = user.displayName?.trim() || '';
  const firstName = rawName ? rawName.split(' ')[0] : 'Fitness Friend';
  const personalizedBrand = `${firstName.toUpperCase()} FIT♡`;
  return {
    uid: user.uid,
    userId: user.uid,
    firstName,
    displayName: rawName || firstName,
    personalizedBrand,
    email: user.email || '',
    age: 26,
    height: 168,
    heightCm: 168,
    weight: 68.0,
    startingWeight: 68.0,
    goalWeight: 62.0,
    currentWeight: 68.0,
    activityLevel: 'Moderately Active',
    dailyStepGoal: 10000,
    dailyWaterGoal: 2500,
    waterDailyGoalMl: 2500,
    dailyCalorieGoal: 450,
    dailyActiveMinutesGoal: 30,
    avatar: user.photoURL || '',
    journeyStartDate: TODAY_STR,
    workoutHydrationReminderEnabled: true,
    workoutHydrationReminderIntervalMin: 30,
    createdAt: new Date().toISOString()
  };
}

export const MILESTONE_DEFINITIONS: { key: string; title: string; description: string; category: MilestoneItem['category'] }[] = [
  { key: 'DAY_1', title: 'Day 1: Showed Up', description: 'Began the healthier-me journey with purpose.', category: 'journey' },
  { key: 'FIRST_WORKOUT', title: 'First Sweat', description: 'Completed workout #1.', category: 'workout' },
  { key: 'WORKOUTS_5', title: '5 Workouts Strong', description: 'Building the routine step by step.', category: 'workout' },
  { key: 'STREAK_7_DAY', title: '7-Day Streak', description: '7 uninterrupted days of showing up.', category: 'streak' },
  { key: 'WORKOUTS_10', title: '10 Workouts Milestone', description: 'Double digits of dedication.', category: 'workout' },
  { key: 'FIRST_WEIGHT_MILESTONE', title: 'First Weight Milestone', description: 'First 2.0 kg lost towards goal.', category: 'weight' },
  { key: 'DAYS_30', title: '30 Days of Consistency', description: 'One full month of showing up.', category: 'journey' },
  { key: 'DAYS_60', title: '60 Days of Transformation', description: 'Habits ingrained, endurance elevated.', category: 'journey' },
  { key: 'DAYS_90', title: '90 Days: New Lifestyle', description: '90 days of small steps and big results.', category: 'journey' }
];

export const GHANA_FOOD_SUGGESTIONS = [
  'Waakye',
  'Rice and stew',
  'Banku',
  'Kenkey',
  'Fish',
  'Grilled chicken',
  'Eggs',
  'Beans',
  'Yam',
  'Plantain',
  'Kontomire',
  'Oats',
  'Koko',
  'Bread',
  'Fruits'
];

export interface AppState {
  profile: UserProfile;
  workouts: Workout[];
  weights: WeightEntry[];
  waterLogs: WaterLog[];
  habits: Record<string, HabitLog>; // key: YYYY-MM-DD
  foodEntries: FoodEntry[];
  moods: Record<string, MoodLog>; // key: YYYY-MM-DD
  journalEntries: JournalEntry[];
  milestones: Record<string, MilestoneItem>;
  progressPhotos: ProgressPhoto[];
  heartRates: HeartRateEntry[];
  sleepLogs: SleepEntry[];
  onboardingCompleted: boolean;
  activeWorkout: {
    isRunning: boolean;
    isPaused: boolean;
    type: WorkoutType;
    durationSeconds: number;
    distanceKm: number;
    startTime: number | null;
  } | null;
}

const STORAGE_KEY_PREFIX = 'asabea_fit_data_';

export function loadStoredState(userId?: string): AppState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const key = userId ? `${STORAGE_KEY_PREFIX}${userId}` : 'asabea_fit_data_v1';
    let raw = localStorage.getItem(key);
    if (!raw && userId) {
      raw = localStorage.getItem('asabea_fit_data_v1');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure milestones exist
      const milestones = parsed.milestones || {};
      MILESTONE_DEFINITIONS.forEach(def => {
        if (!milestones[def.key]) {
          milestones[def.key] = {
            ...def,
            unlocked: def.key === 'DAY_1',
            unlockedAt: def.key === 'DAY_1' ? new Date().toISOString() : undefined
          };
        }
      });

      return {
        ...createDefaultState(userId),
        ...parsed,
        profile: {
          ...INITIAL_PROFILE,
          ...(parsed.profile || {}),
          userId: userId || parsed.profile?.userId || 'asabea-primary'
        },
        heartRates: parsed.heartRates || [],
        sleepLogs: parsed.sleepLogs || [],
        milestones
      };
    }
  } catch (err) {
    console.error('Error loading stored state:', err);
  }

  return createDefaultState(userId);
}

export function saveStoredState(state: AppState, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const uid = userId || state.profile.userId || state.profile.uid;
    const key = uid ? `${STORAGE_KEY_PREFIX}${uid}` : 'asabea_fit_data_v1';
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

export function createDefaultState(userId?: string): AppState {
  const defaultMilestones: Record<string, MilestoneItem> = {};
  MILESTONE_DEFINITIONS.forEach(def => {
    defaultMilestones[def.key] = {
      ...def,
      unlocked: def.key === 'DAY_1',
      unlockedAt: def.key === 'DAY_1' ? new Date().toISOString() : undefined
    };
  });

  const uid = userId || 'guest-primary';
  const profile: UserProfile = {
    ...INITIAL_PROFILE,
    userId: uid,
    uid: uid
  };

  return {
    profile,
    workouts: [],
    weights: [
      {
        id: `init-weight-${uid}`,
        userId: uid,
        weightKg: profile.weight,
        waistCm: 84,
        date: TODAY_STR,
        notes: 'Starting baseline measurement',
        createdAt: new Date().toISOString()
      }
    ],
    waterLogs: [],
    habits: {
      [TODAY_STR]: {
        id: `habit-${TODAY_STR}-${uid}`,
        userId: uid,
        date: TODAY_STR,
        workout: false,
        water: false,
        healthyMeal: false,
        steps: false,
        sleep: false,
        noZeroDay: true,
        updatedAt: new Date().toISOString()
      }
    },
    foodEntries: [],
    moods: {},
    journalEntries: [],
    milestones: defaultMilestones,
    progressPhotos: [],
    heartRates: [],
    sleepLogs: [],
    onboardingCompleted: true,
    activeWorkout: null
  };
}

// Helpers for calculations
export function calculatePace(durationSec: number, distanceKm: number): string {
  if (distanceKm <= 0 || durationSec <= 0) return '0:00/km';
  const paceSecPerKm = durationSec / distanceKm;
  const minutes = Math.floor(paceSecPerKm / 60);
  const seconds = Math.floor(paceSecPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

export function calculateCalories(type: WorkoutType, durationSec: number, distanceKm: number, weightKg: number = 78): number {
  // Standard MET formula
  let met = 3.5; // Walk
  if (type === 'JOG') met = 7.0;
  if (type === 'RUN') met = 9.8;
  const durationHours = durationSec / 3600;
  return Math.round(met * weightKg * durationHours);
}

export function getJourneyDay(startDateStr: string): number {
  try {
    const start = new Date(startDateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}
