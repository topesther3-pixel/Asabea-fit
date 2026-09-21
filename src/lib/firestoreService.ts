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
  MilestoneItem
} from '../types';

// Sync Profile
export async function syncProfileToFirestore(profile: UserProfile, userId: string) {
  const path = `profiles/${userId}`;
  try {
    const payload = {
      userId,
      displayName: profile.displayName || 'Asabea',
      email: profile.email || auth.currentUser?.email || '',
      startingWeight: Number(profile.startingWeight) || 78.5,
      goalWeight: Number(profile.goalWeight) || 68.0,
      currentWeight: Number(profile.currentWeight) || profile.startingWeight,
      heightCm: Number(profile.heightCm) || 168,
      journeyStartDate: profile.journeyStartDate,
      waterDailyGoalMl: Number(profile.waterDailyGoalMl) || 2500,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'profiles', userId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Workouts
export async function saveWorkoutToFirestore(workout: Workout, userId: string) {
  const path = `workouts/${workout.id}`;
  try {
    const payload = {
      ...workout,
      userId,
      distanceKm: Number(workout.distanceKm),
      durationSeconds: Number(workout.durationSeconds),
      calories: Number(workout.calories)
    };
    await setDoc(doc(db, 'workouts', workout.id), payload);
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
  const path = `weights/${entry.id}`;
  try {
    const payload = {
      ...entry,
      userId,
      weightKg: Number(entry.weightKg),
      waistCm: entry.waistCm ? Number(entry.waistCm) : null
    };
    await setDoc(doc(db, 'weights', entry.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWeightFromFirestore(weightId: string) {
  const path = `weights/${weightId}`;
  try {
    await deleteDoc(doc(db, 'weights', weightId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Water
export async function saveWaterLogToFirestore(log: WaterLog, userId: string) {
  const path = `water/${log.id}`;
  try {
    const payload = {
      ...log,
      userId,
      amountMl: Number(log.amountMl)
    };
    await setDoc(doc(db, 'water', log.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWaterLogFromFirestore(waterId: string) {
  const path = `water/${waterId}`;
  try {
    await deleteDoc(doc(db, 'water', waterId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Habits
export async function saveHabitLogToFirestore(habit: HabitLog, userId: string) {
  const habitDocId = `${userId}_${habit.date}`;
  const path = `habits/${habitDocId}`;
  try {
    const payload = {
      ...habit,
      id: habitDocId,
      userId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'habits', habitDocId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Food
export async function saveFoodEntryToFirestore(food: FoodEntry, userId: string) {
  const path = `foodEntries/${food.id}`;
  try {
    const payload = {
      ...food,
      userId
    };
    await setDoc(doc(db, 'foodEntries', food.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFoodEntryFromFirestore(foodId: string) {
  const path = `foodEntries/${foodId}`;
  try {
    await deleteDoc(doc(db, 'foodEntries', foodId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Moods
export async function saveMoodLogToFirestore(mood: MoodLog, userId: string) {
  const moodDocId = `${userId}_${mood.date}`;
  const path = `moods/${moodDocId}`;
  try {
    const payload = {
      ...mood,
      id: moodDocId,
      userId
    };
    await setDoc(doc(db, 'moods', moodDocId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Journal
export async function saveJournalEntryToFirestore(journal: JournalEntry, userId: string) {
  const path = `journalEntries/${journal.id}`;
  try {
    const payload = {
      ...journal,
      userId
    };
    await setDoc(doc(db, 'journalEntries', journal.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalEntryFromFirestore(journalId: string) {
  const path = `journalEntries/${journalId}`;
  try {
    await deleteDoc(doc(db, 'journalEntries', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Milestones
export async function saveMilestoneToFirestore(milestoneKey: string, unlockedAt: string, userId: string) {
  const milestoneDocId = `${userId}_${milestoneKey}`;
  const path = `milestones/${milestoneDocId}`;
  try {
    const payload = {
      userId,
      milestoneKey,
      unlockedAt
    };
    await setDoc(doc(db, 'milestones', milestoneDocId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Progress Photos
export async function saveProgressPhotoToFirestore(photo: ProgressPhoto, userId: string) {
  const path = `progressPhotos/${photo.id}`;
  try {
    const payload = {
      ...photo,
      userId
    };
    await setDoc(doc(db, 'progressPhotos', photo.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProgressPhotoFromFirestore(photoId: string) {
  const path = `progressPhotos/${photoId}`;
  try {
    await deleteDoc(doc(db, 'progressPhotos', photoId));
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
  }
) {
  const unsubscribers: (() => void)[] = [];

  // Profile listener
  const profilePath = `profiles/${userId}`;
  const unsubProfile = onSnapshot(
    doc(db, 'profiles', userId),
    (snapshot) => {
      if (snapshot.exists()) {
        callbacks.onProfile?.(snapshot.data() as UserProfile);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, profilePath)
  );
  unsubscribers.push(unsubProfile);

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

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
