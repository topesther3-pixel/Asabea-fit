import React, { useState } from 'react';
import { BookHeart, Send, Trash2, Calendar, Sparkles, Heart, Quote } from 'lucide-react';
import { JournalEntry, MoodLog } from '../types';
import { TODAY_STR } from '../lib/store';

interface JournalViewProps {
  entries: JournalEntry[];
  todayMood?: MoodLog;
  userFirstName?: string;
  personalizedBrand?: string;
  onSaveJournal: (content: string, prompt: string, date: string) => void;
  onDeleteJournal: (id: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  todayMood,
  userFirstName,
  personalizedBrand,
  onSaveJournal,
  onDeleteJournal
}) => {
  const brand = personalizedBrand || (userFirstName ? `${userFirstName.toUpperCase()} FIT♡` : 'ASABEA FIT♡');
  const [content, setContent] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('How did today feel?');
  const [journalDate, setJournalDate] = useState(TODAY_STR);

  const prompts = [
    'How did today feel?',
    'What was my biggest small win today?',
    'How is my body feeling after movement?',
    'What am I grateful for on this healthier-me journey?'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSaveJournal(content.trim(), selectedPrompt, journalDate);
    setContent('');
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      <div>
        <h2 className="text-xl font-extrabold text-[#252525]">Personal Journal</h2>
        <p className="text-xs text-gray-500 font-medium">
          Reflect, celebrate, and witness your growth
        </p>
      </div>

      {/* Inspiring Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#FCECEF] to-[#EFF6FF] border border-[#FCECEF] text-center">
        <Quote className="w-5 h-5 text-[#E96A8D] mx-auto mb-1 opacity-70" />
        <p className="font-serif italic text-sm text-[#252525] font-semibold">
          "A healthier me is coming. I showed up."
        </p>
        <span className="text-[10px] uppercase tracking-widest text-[#E96A8D] font-bold mt-1 block font-mono">
          {brand}
        </span>
      </div>

      {/* New Journal Entry Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookHeart className="w-4 h-4 text-[#E96A8D]" />
            <span className="font-extrabold text-xs text-[#252525] uppercase tracking-wider">
              Today's Reflection
            </span>
          </div>

          <input
            type="date"
            value={journalDate}
            onChange={(e) => setJournalDate(e.target.value)}
            className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200"
          />
        </div>

        {/* Prompt Pills */}
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setSelectedPrompt(p)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
                selectedPrompt === p
                  ? 'bg-[#E96A8D] text-white shadow-2xs'
                  : 'bg-[#FAF9F6] text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your honest thoughts here. No judgment, only love and forward momentum..."
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs sm:text-sm text-[#252525] placeholder:text-gray-400 focus:outline-none focus:border-[#E96A8D] resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            {todayMood ? (
              <span className="text-[11px] font-medium text-gray-500">
                Today's Vibe: {todayMood.mood} • Energy: {todayMood.energy}
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">Private to you</span>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E96A8D] text-white font-bold text-xs shadow-xs hover:bg-[#d85579] transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>

      {/* Journal History */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-600 px-1">
          Previous Entries
        </h3>

        {sortedEntries.length > 0 ? (
          <div className="space-y-3">
            {sortedEntries.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-2 relative group"
              >
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-[#252525]">{item.date}</span>
                  </div>

                  <button
                    onClick={() => onDeleteJournal(item.id)}
                    className="p-1 text-gray-300 hover:text-red-500 transition opacity-60 group-hover:opacity-100"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-bold text-[#E96A8D] italic">
                  "{item.prompt}"
                </div>

                <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white border border-gray-100 text-center text-gray-400">
            <BookHeart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">No journal entries yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Take 60 seconds to write how your body and mind feel today.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
