import React, { useState } from 'react';
import { Utensils, Plus, Trash2, Info, Check } from 'lucide-react';
import { FoodEntry, MealType } from '../types';
import { GHANA_FOOD_SUGGESTIONS, TODAY_STR } from '../lib/store';

interface FoodJournalProps {
  foodEntries: FoodEntry[];
  onAddFood: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  onDeleteFood: (id: string) => void;
}

export const FoodJournal: React.FC<FoodJournalProps> = ({
  foodEntries,
  onAddFood,
  onDeleteFood
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Lunch');
  const [foodText, setFoodText] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(TODAY_STR);
  const [showAddForm, setShowAddForm] = useState(false);

  const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const handleChipClick = (item: string) => {
    if (foodText.includes(item)) return;
    setFoodText((prev) => (prev ? `${prev}, ${item}` : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodText.trim()) return;

    onAddFood({
      userId: 'asabea-primary',
      mealType: selectedMeal,
      foodItems: foodText.trim(),
      date,
      notes: notes.trim() || undefined
    });

    setFoodText('');
    setNotes('');
    setShowAddForm(false);
  };

  const todayEntries = foodEntries.filter((f) => f.date === TODAY_STR);

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#252525] uppercase tracking-wider">
              Ghana-Friendly Food Journal
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">Mindful daily nourishment</span>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#E96A8D] text-white text-xs font-bold shadow-xs hover:bg-[#d85579] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Close' : 'Log Meal'}</span>
        </button>
      </div>

      {/* Mindful Disclaimer */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-amber-800 text-[11px]">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          This journal is for mindful self-tracking only. No restrictive diet prescriptions or medical diagnoses. Honor your body.
        </p>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-[#FAF9F6] border border-gray-200 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Meal</label>
            <div className="grid grid-cols-4 gap-1.5">
              {mealTypes.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setSelectedMeal(m)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedMeal === m
                      ? 'bg-[#E96A8D] text-white border-[#E96A8D]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Food Items (tap suggestions or type)
            </label>
            <input
              type="text"
              required
              placeholder="E.g., Waakye with fish, egg, and shito"
              value={foodText}
              onChange={(e) => setFoodText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-[#252525] bg-white"
            />
          </div>

          {/* Ghana Quick Suggestions */}
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Popular Ghana Foods
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {GHANA_FOOD_SUGGESTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleChipClick(item)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white text-gray-700 border border-gray-200 hover:border-[#E96A8D] hover:text-[#E96A8D] transition"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs bg-white font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Notes (Portion / Feel)</label>
              <input
                type="text"
                placeholder="Balanced portion, plenty of water"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#E96A8D] text-white font-bold text-xs shadow-sm hover:bg-[#d85579] transition"
          >
            Save Meal Entry
          </button>
        </form>
      )}

      {/* Food Entries List */}
      <div className="space-y-2">
        {todayEntries.length > 0 ? (
          todayEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#FCECEF] text-[#E96A8D]">
                    {entry.mealType}
                  </span>
                  <span className="text-xs font-bold text-[#252525]">{entry.foodItems}</span>
                </div>
                {entry.notes && (
                  <p className="text-[11px] text-gray-400 mt-1 italic pl-1">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => onDeleteFood(entry.id)}
                className="p-1 text-gray-300 hover:text-red-500 transition"
                title="Delete entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-gray-400 text-xs">
            No meals recorded for today yet. Tap "Log Meal" to record your food.
          </div>
        )}
      </div>
    </div>
  );
};
