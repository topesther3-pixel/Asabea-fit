import React from 'react';
import { Home, Flame, TrendingUp, BookHeart, User } from 'lucide-react';

export type TabType = 'home' | 'workout' | 'progress' | 'journal' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'HOME', icon: Home },
    { id: 'workout' as TabType, label: 'WORKOUT', icon: Flame },
    { id: 'progress' as TabType, label: 'PROGRESS', icon: TrendingUp },
    { id: 'journal' as TabType, label: 'JOURNAL', icon: BookHeart },
    { id: 'profile' as TabType, label: 'PROFILE', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#FCECEF] shadow-[0_-4px_20px_rgba(233,106,141,0.08)] pb-safe">
      <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#E96A8D] font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-[#FCECEF]' : 'bg-transparent'}`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
              </div>
              <span className="text-[10px] tracking-wider mt-0.5 whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
