export type WorkoutType = 'WALK' | 'JOG' | 'RUN';
export type MoodType = 'Great' | 'Good' | 'Okay' | 'Low' | 'Exhausted';
export type EnergyType = 'Low' | 'Medium' | 'High';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type PhotoStage = 'START' | '30_DAYS' | '60_DAYS' | '90_DAYS';
export type ActivityLevel = 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';

export interface UserProfile {
  uid?: string; // Firebase Auth UID
  userId: string; // Firebase Auth UID
  firstName: string; // User first name
  displayName: string;
  personalizedBrand?: string; // e.g. "KOJO FIT♡"
  email: string;
  age: number; // e.g. 28
  height: number; // in cm
  heightCm?: number; // alias
  weight: number; // in kg (current weight)
  startingWeight: number; // in kg
  goalWeight: number; // in kg
  currentWeight?: number; // alias
  activityLevel: ActivityLevel;
  dailyStepGoal: number; // e.g. 10000
  dailyWaterGoal: number; // e.g. 2500 ml
  waterDailyGoalMl?: number; // alias
  dailyCalorieGoal?: number; // e.g. 450 kcal
  dailyActiveMinutesGoal?: number; // e.g. 30 min
  avatar: string; // photo URL or avatar avatar string
  journeyStartDate: string; // ISO date string (YYYY-MM-DD)
  workoutHydrationReminderEnabled?: boolean; // default true
  workoutHydrationReminderIntervalMin?: number; // default 30 minutes
  createdAt: string;
  updatedAt?: string;
}

export function getPersonalizedBrand(firstName?: string): string {
  const clean = firstName?.trim() || 'ASABEA';
  return `${clean.toUpperCase()} FIT♡`;
}

export interface HeartRateEntry {
  id: string;
  userId: string;
  bpm: number;
  condition?: string; // e.g. 'Resting' | 'Post-workout' | 'Walking'
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  userId: string;
  hours: number;
  minutes: number;
  quality?: string; // e.g. 'Deep & Restful' | 'Good' | 'Fair' | 'Restless'
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface Workout {
  id: string;
  userId: string;
  type: WorkoutType;
  distanceKm: number;
  durationSeconds: number;
  paceMinPerKm: string;
  calories: number;
  date: string; // YYYY-MM-DD
  isManual: boolean;
  notes?: string;
  createdAt: string;
  route?: RoutePoint[];
  healthConnectSynced?: boolean;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  waistCm?: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  userId: string;
  amountMl: number;
  date: string; // YYYY-MM-DD
  timestamp: string;
}

export interface HabitLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  workout: boolean;
  water: boolean;
  healthyMeal: boolean;
  steps: boolean;
  sleep: boolean;
  noZeroDay: boolean;
  updatedAt: string;
}

export interface FoodEntry {
  id: string;
  userId: string;
  mealType: MealType;
  foodItems: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface MoodLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mood: MoodType;
  energy: EnergyType;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  content: string;
  prompt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MilestoneItem {
  key: string;
  title: string;
  description: string;
  category: 'journey' | 'workout' | 'streak' | 'weight';
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  stage: PhotoStage;
  photoUrl: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface DailyWins {
  showedUp: boolean;
  movedBody: boolean;
  drankWater: boolean;
  ateHealthy: boolean;
  restedWell: boolean;
}

export interface DayTimelineItem {
  dayNumber: number;
  date: string;
  workout?: Workout;
  waterMl?: number;
  steps?: number;
  mood?: MoodType;
  energy?: EnergyType;
  weightKg?: number;
  journalContent?: string;
  habitsCompletedCount: number;
}
