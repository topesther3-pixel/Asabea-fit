export type WorkoutType = 'WALK' | 'JOG' | 'RUN';
export type MoodType = 'Great' | 'Good' | 'Okay' | 'Low' | 'Exhausted';
export type EnergyType = 'Low' | 'Medium' | 'High';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type PhotoStage = 'START' | '30_DAYS' | '60_DAYS' | '90_DAYS';

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  startingWeight: number; // in kg
  goalWeight: number; // in kg
  currentWeight?: number; // in kg
  heightCm?: number; // in cm
  journeyStartDate: string; // ISO date string (YYYY-MM-DD)
  waterDailyGoalMl: number; // e.g. 2500
  workoutHydrationReminderEnabled?: boolean; // default true: remind during WALK, JOG, RUN
  workoutHydrationReminderIntervalMin?: number; // default 30 minutes
  createdAt: string;
  updatedAt?: string;
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
