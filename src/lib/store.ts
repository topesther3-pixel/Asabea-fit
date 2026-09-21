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
  WorkoutType,
  PhotoStage
} from '../types';
import { db, auth, isFirebaseConfigured } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';

export const TODAY_STR = new Date().toISOString().split('T')[0];

export const INITIAL_PROFILE: UserProfile = {
  userId: 'asabea-primary',
  displayName: 'Asabea',
  email: 'estherasab@gmail.com',
  startingWeight: 78.5,
  goalWeight: 68.0,
  currentWeight: 78.5,
  heightCm: 168,
  journeyStartDate: TODAY_STR,
  waterDailyGoalMl: 2500,
  createdAt: new Date().toISOString()
};

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

const STORAGE_KEY = 'asabea_fit_data_v1';

export function loadStoredState(): AppState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure milestones exist
      const milestones = parsed.milestones || {};
      MILESTONE_DEFINITIONS.forEach(def => {
        if (!milestones[def.key]) {
          milestones[def.key] = {
            ...def,
            unlocked: def.key === 'DAY_1', // Day 1 unlocked by showing up
            unlockedAt: def.key === 'DAY_1' ? new Date().toISOString() : undefined
          };
        }
      });

      return {
        ...createDefaultState(),
        ...parsed,
        milestones
      };
    }
  } catch (err) {
    console.error('Error loading stored state:', err);
  }

  return createDefaultState();
}

export function saveStoredState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

function createDefaultState(): AppState {
  const defaultMilestones: Record<string, MilestoneItem> = {};
  MILESTONE_DEFINITIONS.forEach(def => {
    defaultMilestones[def.key] = {
      ...def,
      unlocked: def.key === 'DAY_1', // Day 1 unlocked!
      unlockedAt: def.key === 'DAY_1' ? new Date().toISOString() : undefined
    };
  });

  return {
    profile: INITIAL_PROFILE,
    workouts: [],
    weights: [
      {
        id: 'init-weight',
        userId: 'asabea-primary',
        weightKg: 78.5,
        waistCm: 84,
        date: TODAY_STR,
        notes: 'Starting baseline measurement',
        createdAt: new Date().toISOString()
      }
    ],
    waterLogs: [],
    habits: {
      [TODAY_STR]: {
        id: `habit-${TODAY_STR}`,
        userId: 'asabea-primary',
        date: TODAY_STR,
        workout: false,
        water: false,
        healthyMeal: false,
        steps: false,
        sleep: false,
        noZeroDay: true, // Showed up!
        updatedAt: new Date().toISOString()
      }
    },
    foodEntries: [],
    moods: {},
    journalEntries: [],
    milestones: defaultMilestones,
    progressPhotos: [],
    onboardingCompleted: true, // Ready to experience immediately
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
