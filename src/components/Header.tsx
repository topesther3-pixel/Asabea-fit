import React, { useState } from 'react';
import { Download, Cloud, CloudCheck, LogIn } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { User } from 'firebase/auth';

interface HeaderProps {
  displayName: string;
  dayNumber: number;
  user: User | null;
  isSyncing: boolean;
  onOpenProfile: () => void;
  onSignIn: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayName,
  dayNumber,
  user,
  isSyncing,
  onOpenProfile,
  onSignIn
}) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  const initial = (user?.displayName || displayName || 'A').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#FCECEF] px-4 py-3 sm:px-6">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-[#E96A8D] uppercase font-mono flex items-center gap-1">
              ASABEA FIT <span className="text-[#E96A8D] text-xs">♡</span>
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E96A8D]" />
            {user ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#65A87A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                <CloudCheck className="w-3 h-3" />
                <span>Cloud Synced</span>
              </span>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#3B82F6] bg-[#EFF6FF] px-2 py-0.5 rounded-full hover:bg-[#DBEAFE] transition-colors"
                title="Sign in with Google to sync to Firebase"
              >
                <Cloud className="w-3 h-3" />
                <span>Sync with Google</span>
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525] tracking-tight flex items-center gap-1.5">
            Hi {user?.displayName ? user.displayName.split(' ')[0] : displayName} <span className="text-xl">👋🏽</span>
          </h1>
          <p className="text-xs font-medium text-[#E96A8D] mt-0.5">
            Small Steps. Big Results. • Day {dayNumber}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Weather Badge inspired by reference */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#FCECEF] text-xs font-semibold text-[#252525] shadow-2xs">
            <span>🌤️</span>
            <span className="font-bold">28°C</span>
          </div>
          {(isInstallable || isIOS) && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FCECEF] text-[#E96A8D] hover:bg-[#E96A8D] hover:text-white transition-all text-xs font-semibold shadow-xs"
              title="Install Asabea Fit PWA"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Install</span>
            </button>
          )}

          <button
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E96A8D] to-[#FF7597] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[#FCECEF] hover:scale-105 active:scale-95 transition-transform overflow-hidden"
            aria-label="User Profile"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{initial}</span>
            )}
          </button>
        </div>
      </div>

      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#FCECEF]">
            <h3 className="font-bold text-[#252525] text-lg mb-2">Install ASABEA FIT</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              1. Tap the <strong className="text-[#3B82F6]">Share</strong> icon at the bottom of Safari.<br/>
              2. Scroll down and tap <strong className="text-[#252525]">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2.5 rounded-xl bg-[#E96A8D] text-white font-semibold text-sm hover:bg-[#d85579] transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
