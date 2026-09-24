import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  UserProfile,
  Workout,
  WeightEntry,
  WaterLog,
  HabitLog,
  FoodEntry,
  MoodLog,
  JournalEntry,
  ProgressPhoto,
  HeartRateEntry,
  SleepEntry,
  MilestoneItem
} from '../types';

// Utility to recursively strip any undefined keys or nested array values to prevent Firestore unsupported field errors
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (Array.isArray(val)) {
      cleaned[key] = val
        .filter((item) => item !== undefined)
        .map((item) => (typeof item === 'object' && item !== null ? cleanFirestorePayload(item) : item));
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = cleanFirestorePayload(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

// Sync Profile - writes to users/{userId} as well as profiles/{userId}
export async function syncProfileToFirestore(profile: UserProfile, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const usersPath = `users/${userId}`;
  try {
    const rawName = profile.displayName?.trim() || profile.firstName?.trim() || 'Fitness Friend';
    const firstName = profile.firstName?.trim() || rawName.split(' ')[0] || 'Fitness Friend';
    const personalizedBrand = `${firstName.toUpperCase()} FIT♡`;
    const payload = {
      uid: userId,
      userId,
      firstName,
      displayName: rawName,
      personalizedBrand,
      email: profile.email || auth.currentUser?.email || '',
      age: Number(profile.age) || 26,
      height: Number(profile.height || profile.heightCm) || 168,
      heightCm: Number(profile.heightCm || profile.height) || 168,
      weight: Number(profile.weight || profile.currentWeight || profile.startingWeight) || 70,
      startingWeight: Number(profile.startingWeight || profile.weight) || 70,
      goalWeight: Number(profile.goalWeight) || 65,
      currentWeight: Number(profile.currentWeight || profile.weight || profile.startingWeight) || 70,
      activityLevel: profile.activityLevel || 'Moderately Active',
      dailyStepGoal: Number(profile.dailyStepGoal) || 10000,
      dailyWaterGoal: Number(profile.dailyWaterGoal || profile.waterDailyGoalMl) || 2500,
      waterDailyGoalMl: Number(profile.waterDailyGoalMl || profile.dailyWaterGoal) || 2500,
      dailyCalorieGoal: Number(profile.dailyCalorieGoal) || 450,
      dailyActiveMinutesGoal: Number(profile.dailyActiveMinutesGoal) || 30,
      avatar: profile.avatar || auth.currentUser?.photoURL || '',
      journeyStartDate: profile.journeyStartDate || new Date().toISOString().split('T')[0],
      workoutHydrationReminderEnabled: profile.workoutHydrationReminderEnabled !== false,
      workoutHydrationReminderIntervalMin: Number(profile.workoutHydrationReminderIntervalMin) || 30,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const cleaned = cleanFirestorePayload(payload);
    await setDoc(doc(db, 'users', userId), cleaned, { merge: true });
    await setDoc(doc(db, 'profiles', userId), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, usersPath);
  }
}

// Workouts
export async function saveWorkoutToFirestore(workout: Workout, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `workouts/${workout.id}`;
  try {
    const payload = {
      ...workout,
      userId,
      distanceKm: Number(workout.distanceKm),
      durationSeconds: Number(workout.durationSeconds),
      calories: Number(workout.calories)
    };
    await setDoc(doc(db, 'workouts', workout.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWorkoutFromFirestore(workoutId: string) {
  const path = `workouts/${workoutId}`;
  try {
    await deleteDoc(doc(db, 'workouts', workoutId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Weights
export async function saveWeightToFirestore(entry: WeightEntry, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `weights/${entry.id}`;
  try {
    const payload = {
      ...entry,
      userId,
      weightKg: Number(entry.weightKg),
      waistCm: entry.waistCm ? Number(entry.waistCm) : null
    };
    await setDoc(doc(db, 'weights', entry.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWeightFromFirestore(weightId: string) {
  if (!auth?.currentUser) return;
  const path = `weights/${weightId}`;
  try {
    await deleteDoc(doc(db, 'weights', weightId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Water
export async function saveWaterLogToFirestore(log: WaterLog, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `water/${log.id}`;
  try {
    const payload = {
      ...log,
      userId,
      amountMl: Number(log.amountMl)
    };
    await setDoc(doc(db, 'water', log.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWaterLogFromFirestore(waterId: string) {
  if (!auth?.currentUser) return;
  const path = `water/${waterId}`;
  try {
    await deleteDoc(doc(db, 'water', waterId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Habits
export async function saveHabitLogToFirestore(habit: HabitLog, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const habitDocId = `${userId}_${habit.date}`;
  const path = `habits/${habitDocId}`;
  try {
    const payload = {
      ...habit,
      id: habitDocId,
      userId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'habits', habitDocId), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Food
export async function saveFoodEntryToFirestore(food: FoodEntry, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `foodEntries/${food.id}`;
  try {
    const payload = {
      ...food,
      userId
    };
    await setDoc(doc(db, 'foodEntries', food.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFoodEntryFromFirestore(foodId: string) {
  if (!auth?.currentUser) return;
  const path = `foodEntries/${foodId}`;
  try {
    await deleteDoc(doc(db, 'foodEntries', foodId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Moods
export async function saveMoodLogToFirestore(mood: MoodLog, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const moodDocId = `${userId}_${mood.date}`;
  const path = `moods/${moodDocId}`;
  try {
    const payload = {
      ...mood,
      id: moodDocId,
      userId
    };
    await setDoc(doc(db, 'moods', moodDocId), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Journal
export async function saveJournalEntryToFirestore(journal: JournalEntry, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `journalEntries/${journal.id}`;
  try {
    const payload = {
      ...journal,
      userId
    };
    await setDoc(doc(db, 'journalEntries', journal.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalEntryFromFirestore(journalId: string) {
  if (!auth?.currentUser) return;
  const path = `journalEntries/${journalId}`;
  try {
    await deleteDoc(doc(db, 'journalEntries', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Milestones
export async function saveMilestoneToFirestore(milestoneKey: string, unlockedAt: string, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const milestoneDocId = `${userId}_${milestoneKey}`;
  const path = `milestones/${milestoneDocId}`;
  try {
    const payload = {
      userId,
      milestoneKey,
      unlockedAt
    };
    await setDoc(doc(db, 'milestones', milestoneDocId), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Progress Photos
export async function saveProgressPhotoToFirestore(photo: ProgressPhoto, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `progressPhotos/${photo.id}`;
  try {
    const payload = {
      ...photo,
      userId
    };
    await setDoc(doc(db, 'progressPhotos', photo.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProgressPhotoFromFirestore(photoId: string) {
  if (!auth?.currentUser) return;
  const path = `progressPhotos/${photoId}`;
  try {
    await deleteDoc(doc(db, 'progressPhotos', photoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Heart Rate Logs
export async function saveHeartRateToFirestore(entry: HeartRateEntry, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `heartRates/${entry.id}`;
  try {
    const payload = {
      ...entry,
      userId,
      bpm: Number(entry.bpm)
    };
    await setDoc(doc(db, 'heartRates', entry.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHeartRateFromFirestore(entryId: string) {
  if (!auth?.currentUser) return;
  const path = `heartRates/${entryId}`;
  try {
    await deleteDoc(doc(db, 'heartRates', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Sleep Logs
export async function saveSleepLogToFirestore(entry: SleepEntry, userId: string) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || userId === 'asabea-primary') {
    return;
  }
  const path = `sleepLogs/${entry.id}`;
  try {
    const payload = {
      ...entry,
      userId,
      hours: Number(entry.hours),
      minutes: Number(entry.minutes)
    };
    await setDoc(doc(db, 'sleepLogs', entry.id), cleanFirestorePayload(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSleepLogFromFirestore(entryId: string) {
  if (!auth?.currentUser) return;
  const path = `sleepLogs/${entryId}`;
  try {
    await deleteDoc(doc(db, 'sleepLogs', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time listener subscriber
export function subscribeToUserData(
  userId: string,
  callbacks: {
    onProfile?: (profile: UserProfile | null) => void;
    onWorkouts?: (workouts: Workout[]) => void;
    onWeights?: (weights: WeightEntry[]) => void;
    onWater?: (water: WaterLog[]) => void;
    onHabits?: (habits: Record<string, HabitLog>) => void;
    onFood?: (food: FoodEntry[]) => void;
    onMoods?: (moods: Record<string, MoodLog>) => void;
    onJournal?: (journal: JournalEntry[]) => void;
    onMilestones?: (milestones: Record<string, { unlocked: boolean; unlockedAt?: string }>) => void;
    onPhotos?: (photos: ProgressPhoto[]) => void;
    onHeartRates?: (heartRates: HeartRateEntry[]) => void;
    onSleepLogs?: (sleepLogs: SleepEntry[]) => void;
  }
) {
  const unsubscribers: (() => void)[] = [];

  // Profile listener (primary: users/{userId}, fallback: profiles/{userId})
  const userPath = `users/${userId}`;
  const unsubUser = onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      if (snapshot.exists()) {
        callbacks.onProfile?.(snapshot.data() as UserProfile);
      } else {
        // Fallback to profiles/{userId}
        onSnapshot(
          doc(db, 'profiles', userId),
          (profSnap) => {
            if (profSnap.exists()) {
              callbacks.onProfile?.(profSnap.data() as UserProfile);
            }
          },
          () => {}
        );
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, userPath)
  );
  unsubscribers.push(unsubUser);

  // Workouts
  const workoutsPath = 'workouts';
  const workoutsQuery = query(collection(db, 'workouts'), where('userId', '==', userId));
  const unsubWorkouts = onSnapshot(
    workoutsQuery,
    (snapshot) => {
      const items: Workout[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as Workout));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onWorkouts?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, workoutsPath)
  );
  unsubscribers.push(unsubWorkouts);

  // Weights
  const weightsPath = 'weights';
  const weightsQuery = query(collection(db, 'weights'), where('userId', '==', userId));
  const unsubWeights = onSnapshot(
    weightsQuery,
    (snapshot) => {
      const items: WeightEntry[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as WeightEntry));
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callbacks.onWeights?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, weightsPath)
  );
  unsubscribers.push(unsubWeights);

  // Water
  const waterPath = 'water';
  const waterQuery = query(collection(db, 'water'), where('userId', '==', userId));
  const unsubWater = onSnapshot(
    waterQuery,
    (snapshot) => {
      const items: WaterLog[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as WaterLog));
      callbacks.onWater?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, waterPath)
  );
  unsubscribers.push(unsubWater);

  // Habits
  const habitsPath = 'habits';
  const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
  const unsubHabits = onSnapshot(
    habitsQuery,
    (snapshot) => {
      const map: Record<string, HabitLog> = {};
      snapshot.forEach((docSnap) => {
        const h = docSnap.data() as HabitLog;
        if (h.date) map[h.date] = h;
      });
      callbacks.onHabits?.(map);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, habitsPath)
  );
  unsubscribers.push(unsubHabits);

  // Food
  const foodPath = 'foodEntries';
  const foodQuery = query(collection(db, 'foodEntries'), where('userId', '==', userId));
  const unsubFood = onSnapshot(
    foodQuery,
    (snapshot) => {
      const items: FoodEntry[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as FoodEntry));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onFood?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, foodPath)
  );
  unsubscribers.push(unsubFood);

  // Moods
  const moodsPath = 'moods';
  const moodsQuery = query(collection(db, 'moods'), where('userId', '==', userId));
  const unsubMoods = onSnapshot(
    moodsQuery,
    (snapshot) => {
      const map: Record<string, MoodLog> = {};
      snapshot.forEach((docSnap) => {
        const m = docSnap.data() as MoodLog;
        if (m.date) map[m.date] = m;
      });
      callbacks.onMoods?.(map);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, moodsPath)
  );
  unsubscribers.push(unsubMoods);

  // Journal
  const journalPath = 'journalEntries';
  const journalQuery = query(collection(db, 'journalEntries'), where('userId', '==', userId));
  const unsubJournal = onSnapshot(
    journalQuery,
    (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as JournalEntry));
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callbacks.onJournal?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, journalPath)
  );
  unsubscribers.push(unsubJournal);

  // Milestones
  const milestonesPath = 'milestones';
  const milestonesQuery = query(collection(db, 'milestones'), where('userId', '==', userId));
  const unsubMilestones = onSnapshot(
    milestonesQuery,
    (snapshot) => {
      const map: Record<string, { unlocked: boolean; unlockedAt?: string }> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.milestoneKey) {
          map[data.milestoneKey] = {
            unlocked: true,
            unlockedAt: data.unlockedAt
          };
        }
      });
      callbacks.onMilestones?.(map);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, milestonesPath)
  );
  unsubscribers.push(unsubMilestones);

  // Photos
  const photosPath = 'progressPhotos';
  const photosQuery = query(collection(db, 'progressPhotos'), where('userId', '==', userId));
  const unsubPhotos = onSnapshot(
    photosQuery,
    (snapshot) => {
      const items: ProgressPhoto[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as ProgressPhoto));
      callbacks.onPhotos?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, photosPath)
  );
  unsubscribers.push(unsubPhotos);

  // Heart Rates
  const heartRatesPath = 'heartRates';
  const heartRatesQuery = query(collection(db, 'heartRates'), where('userId', '==', userId));
  const unsubHeartRates = onSnapshot(
    heartRatesQuery,
    (snapshot) => {
      const items: HeartRateEntry[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as HeartRateEntry));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onHeartRates?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, heartRatesPath)
  );
  unsubscribers.push(unsubHeartRates);

  // Sleep Logs
  const sleepLogsPath = 'sleepLogs';
  const sleepLogsQuery = query(collection(db, 'sleepLogs'), where('userId', '==', userId));
  const unsubSleepLogs = onSnapshot(
    sleepLogsQuery,
    (snapshot) => {
      const items: SleepEntry[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as SleepEntry));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onSleepLogs?.(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, sleepLogsPath)
  );
  unsubscribers.push(unsubSleepLogs);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Live Location Sharing for Safe Jog
export interface LiveLocationData {
  userId: string;
  workoutType: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  distanceKm: number;
  durationSeconds: number;
  isActive: boolean;
  updatedAt: string;
}

export async function updateLiveWorkoutLocation(data: LiveLocationData) {
  // CRITICAL: Only sync to Firestore if the user is authenticated and matches the document userId
  if (!auth?.currentUser || !data.userId || data.userId === 'asabea-primary' || auth.currentUser.uid !== data.userId) {
    return;
  }
  const path = `live_locations/${data.userId}`;
  try {
    const rawPayload: Record<string, any> = {
      userId: data.userId,
      workoutType: data.workoutType || 'WALK',
      lat: Number(data.lat),
      lng: Number(data.lng),
      distanceKm: Number(data.distanceKm || 0),
      durationSeconds: Number(data.durationSeconds || 0),
      isActive: Boolean(data.isActive),
      updatedAt: new Date().toISOString()
    };
    if (typeof data.accuracy === 'number' && !isNaN(data.accuracy)) {
      rawPayload.accuracy = data.accuracy;
    }
    if (typeof data.speed === 'number' && !isNaN(data.speed) && data.speed >= 0) {
      rawPayload.speed = data.speed;
    }
    await setDoc(doc(db, 'live_locations', data.userId), cleanFirestorePayload(rawPayload), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearLiveWorkoutLocation(userId: string) {
  if (!auth?.currentUser || !userId || userId === 'asabea-primary' || auth.currentUser.uid !== userId) {
    return;
  }
  const path = `live_locations/${userId}`;
  try {
    const payload = {
      isActive: false,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'live_locations', userId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

