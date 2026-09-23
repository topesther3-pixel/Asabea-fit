import React, { useState } from 'react';

export type CompanionMode = 'WALK' | 'JOG' | 'RUN' | 'PAUSE' | 'CELEBRATE' | 'IDLE';

interface AsabeaCompanionFigureProps {
  mode: CompanionMode;
  headingDeg?: number; // 0 to 360 degrees (0 is north/up, 90 east/right, 180 south/down, 270 west/left)
  size?: number; // Height in pixels (default 72)
  showBubble?: boolean;
  bubbleText?: string;
  className?: string;
  onClick?: () => void;
  speedKmH?: number;
}

export const AsabeaCompanionFigure: React.FC<AsabeaCompanionFigureProps> = ({
  mode,
  headingDeg = 90,
  size = 72,
  showBubble = false,
  bubbleText,
  className = '',
  onClick,
  speedKmH = 0
}) => {
  const [isWaving, setIsWaving] = useState(false);

  // Determine facing direction:
  // If heading is between 90° and 270°, she's traveling westward/leftward -> flip horizontally
  const normalizedHeading = ((headingDeg % 360) + 360) % 360;
  const isFacingLeft = normalizedHeading > 90 && normalizedHeading < 270;

  // Animation cadence speed based on mode & real speed
  let animationDuration = '1.2s';
  if (mode === 'WALK') {
    animationDuration = speedKmH > 5 ? '0.85s' : '1.1s';
  } else if (mode === 'JOG') {
    animationDuration = speedKmH > 9 ? '0.6s' : '0.75s';
  } else if (mode === 'RUN') {
    animationDuration = '0.5s';
  } else if (mode === 'CELEBRATE') {
    animationDuration = '0.7s';
  } else if (mode === 'PAUSE' || mode === 'IDLE') {
    animationDuration = '2.5s';
  }

  // Handle interaction when tapped on dashboard or map
  const handleClick = () => {
    if (mode === 'IDLE') {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 2000);
    }
    onClick?.();
  };

  const currentBubbleText = bubbleText || (
    mode === 'WALK' ? 'Walking together 💗' :
    mode === 'JOG' ? 'Good pace! 👟' :
    mode === 'RUN' ? 'You got this! 🔥' :
    mode === 'PAUSE' ? 'Paused ⏸️' :
    mode === 'CELEBRATE' ? 'Workout Complete! 🎉' :
    isWaving ? 'Small steps, big results! ✨' : 'Ready to move!'
  );

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex flex-col items-center select-none transition-transform duration-300 ${className} ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      }`}
      style={{
        width: size * 0.9,
        height: size
      }}
    >
      {/* Speech / Status Bubble */}
      {(showBubble || mode === 'PAUSE' || mode === 'CELEBRATE') && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap animate-bounce"
          style={{ animationDuration: '2s' }}
        >
          <div className="px-2.5 py-0.5 rounded-full bg-white/95 border border-[#FCECEF] shadow-md text-[10px] font-black tracking-tight text-[#E96A8D] flex items-center gap-1 backdrop-blur-xs">
            <span>{currentBubbleText}</span>
            {mode === 'CELEBRATE' && <span>✨</span>}
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-white rotate-45 border-r border-b border-[#FCECEF] mx-auto -mt-1" />
        </div>
      )}

      {/* Main 3D Styled SVG Rigged Figure */}
      <div
        className="w-full h-full relative flex items-center justify-center transition-transform duration-300"
        style={{
          transform: `${isFacingLeft ? 'scaleX(-1)' : 'scaleX(1)'}`,
          transformOrigin: 'center bottom'
        }}
      >
        <svg
          viewBox="0 0 100 130"
          className="w-full h-full overflow-visible drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for warm 3D shading */}
            {/* Skin tone 3D radial lighting */}
            <radialGradient id="asabeaSkin" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#A86E4F" />
              <stop offset="60%" stopColor="#8D5538" />
              <stop offset="100%" stopColor="#6C3E26" />
            </radialGradient>

            {/* Pink top 3D gradient */}
            <linearGradient id="asabeaPinkTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF85A5" />
              <stop offset="50%" stopColor="#E96A8D" />
              <stop offset="100%" stopColor="#C9476C" />
            </linearGradient>

            {/* Blue leggings 3D gradient */}
            <linearGradient id="asabeaBlueLeggings" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="45%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Hair dark gradient */}
            <linearGradient id="asabeaHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2D211A" />
              <stop offset="80%" stopColor="#19120E" />
              <stop offset="100%" stopColor="#0B0705" />
            </linearGradient>

            {/* White sneakers shadow gradient */}
            <linearGradient id="asabeaShoe" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* Dynamic CSS Keyframes Embedded in SVG for silky 60fps performance */}
            <style>{`
              @keyframes asabeaBounceWalk {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-4px); }
              }
              @keyframes asabeaBounceJog {
                0%, 100% { transform: translateY(0px) rotate(3deg); }
                50% { transform: translateY(-8px) rotate(-1deg); }
              }
              @keyframes asabeaBounceRun {
                0%, 100% { transform: translateY(0px) rotate(8deg); }
                50% { transform: translateY(-12px) rotate(5deg); }
              }
              @keyframes asabeaBounceCelebrate {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-14px) scale(1.05); }
              }
              @keyframes asabeaBreathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
              }
              @keyframes asabeaPonytailWalk {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-8deg); }
              }
              @keyframes asabeaPonytailJog {
                0%, 100% { transform: rotate(5deg); }
                50% { transform: rotate(-18deg); }
              }
              @keyframes asabeaArmSwingWalkA {
                0%, 100% { transform: rotate(-20deg); }
                50% { transform: rotate(25deg); }
              }
              @keyframes asabeaArmSwingWalkB {
                0%, 100% { transform: rotate(25deg); }
                50% { transform: rotate(-20deg); }
              }
              @keyframes asabeaArmJogA {
                0%, 100% { transform: rotate(-40deg); }
                50% { transform: rotate(35deg); }
              }
              @keyframes asabeaArmJogB {
                0%, 100% { transform: rotate(35deg); }
                50% { transform: rotate(-40deg); }
              }
              @keyframes asabeaArmCelebrate {
                0%, 100% { transform: rotate(-140deg); }
                50% { transform: rotate(-155deg); }
              }
              @keyframes asabeaLegWalkA {
                0%, 100% { transform: rotate(25deg); }
                50% { transform: rotate(-25deg); }
              }
              @keyframes asabeaLegWalkB {
                0%, 100% { transform: rotate(-25deg); }
                50% { transform: rotate(25deg); }
              }
              @keyframes asabeaLegJogA {
                0%, 100% { transform: rotate(45deg); }
                50% { transform: rotate(-35deg); }
              }
              @keyframes asabeaLegJogB {
                0%, 100% { transform: rotate(-35deg); }
                50% { transform: rotate(45deg); }
              }
              @keyframes asabeaShadowScale {
                0%, 100% { transform: scale(1); opacity: 0.25; }
                50% { transform: scale(0.7); opacity: 0.12; }
              }
              @keyframes asabeaWaveHand {
                0%, 100% { transform: rotate(-120deg); }
                50% { transform: rotate(-90deg); }
              }
            `}</style>
          </defs>

          {/* Dynamic Ground Shadow */}
          <ellipse
            cx="50"
            cy="124"
            rx={mode === 'CELEBRATE' || mode === 'RUN' ? '18' : '22'}
            ry="5"
            fill="#1E293B"
            style={{
              transformOrigin: '50px 124px',
              animation: (mode === 'WALK' || mode === 'JOG' || mode === 'RUN' || mode === 'CELEBRATE')
                ? `asabeaShadowScale ${animationDuration} ease-in-out infinite`
                : 'none',
              opacity: 0.2
            }}
          />

          {/* Main Rigged Body Group */}
          <g
            style={{
              transformOrigin: '50px 115px',
              animation:
                mode === 'WALK'
                  ? `asabeaBounceWalk ${animationDuration} ease-in-out infinite`
                  : mode === 'JOG'
                  ? `asabeaBounceJog ${animationDuration} ease-in-out infinite`
                  : mode === 'RUN'
                  ? `asabeaBounceRun ${animationDuration} ease-in-out infinite`
                  : mode === 'CELEBRATE'
                  ? `asabeaBounceCelebrate ${animationDuration} ease-in-out infinite`
                  : `asabeaBreathe ${animationDuration} ease-in-out infinite`
            }}
          >
            {/* Back Arm (Left Arm) */}
            <g
              style={{
                transformOrigin: '43px 56px',
                animation:
                  mode === 'WALK'
                    ? `asabeaArmSwingWalkB ${animationDuration} ease-in-out infinite`
                    : mode === 'JOG'
                    ? `asabeaArmJogB ${animationDuration} ease-in-out infinite`
                    : mode === 'RUN'
                    ? `asabeaArmJogB ${animationDuration} ease-in-out infinite`
                    : mode === 'CELEBRATE'
                    ? `asabeaArmCelebrate ${animationDuration} ease-in-out infinite`
                    : 'none'
              }}
            >
              {/* Upper arm */}
              <rect x="38" y="54" width="8" height="18" rx="4" fill="url(#asabeaSkin)" />
              {/* Forearm & fist */}
              <g transform="translate(38, 68)">
                <rect x="0" y="0" width="7" height="16" rx="3.5" fill="url(#asabeaSkin)" />
                {/* Hand/Fist */}
                <circle cx="3.5" cy="17" r="4" fill="url(#asabeaSkin)" />
                {/* Fitness wristband pink */}
                <rect x="0" y="11" width="7" height="3" rx="1.5" fill="#E96A8D" />
              </g>
            </g>

            {/* Back Leg (Left Leg) */}
            <g
              style={{
                transformOrigin: '44px 78px',
                animation:
                  mode === 'WALK'
                    ? `asabeaLegWalkB ${animationDuration} ease-in-out infinite`
                    : mode === 'JOG'
                    ? `asabeaLegJogB ${animationDuration} ease-in-out infinite`
                    : mode === 'RUN'
                    ? `asabeaLegJogB ${animationDuration} ease-in-out infinite`
                    : 'none'
              }}
            >
              {/* Thigh (Pastel blue leggings) */}
              <path
                d="M40 76 C40 76, 42 94, 43 96 C45 96, 49 94, 48 76 Z"
                fill="url(#asabeaBlueLeggings)"
              />
              {/* Shin & Calf */}
              <path
                d="M43 95 C43 95, 41 112, 42 115 C44 115, 47 113, 46 95 Z"
                fill="url(#asabeaBlueLeggings)"
              />
              {/* White running shoe with pink sole */}
              <g transform="translate(37, 114)">
                <path
                  d="M2 3 C2 1, 6 0, 11 1 C16 2, 17 5, 17 7 C14 8, 1 8, 2 3 Z"
                  fill="url(#asabeaShoe)"
                />
                {/* Pink sole */}
                <rect x="1" y="6" width="16" height="2.5" rx="1" fill="#E96A8D" />
              </g>
            </g>

            {/* Front Leg (Right Leg) */}
            <g
              style={{
                transformOrigin: '53px 78px',
                animation:
                  mode === 'WALK'
                    ? `asabeaLegWalkA ${animationDuration} ease-in-out infinite`
                    : mode === 'JOG'
                    ? `asabeaLegJogA ${animationDuration} ease-in-out infinite`
                    : mode === 'RUN'
                    ? `asabeaLegJogA ${animationDuration} ease-in-out infinite`
                    : 'none'
              }}
            >
              {/* Thigh with cute ASABEA white/pink side stripe */}
              <path
                d="M49 76 C49 76, 52 94, 53 96 C56 96, 59 94, 57 76 Z"
                fill="url(#asabeaBlueLeggings)"
              />
              <path d="M54 78 L56 94" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
              {/* Shin & Calf */}
              <path
                d="M52 95 C52 95, 54 112, 55 115 C58 115, 60 113, 58 95 Z"
                fill="url(#asabeaBlueLeggings)"
              />
              <path d="M56 96 L58 113" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
              {/* White running shoe with pink sole */}
              <g transform="translate(50, 114)">
                <path
                  d="M2 3 C2 1, 7 0, 13 1 C18 2, 19 5, 19 7 C16 8, 1 8, 2 3 Z"
                  fill="url(#asabeaShoe)"
                />
                {/* Pink sole */}
                <rect x="1" y="6.5" width="18" height="2.5" rx="1" fill="#E96A8D" />
                {/* Shoelace accent */}
                <line x1="8" y1="3" x2="12" y2="3" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
              </g>
            </g>

            {/* Torso & Hips */}
            {/* High-waisted leggings waist */}
            <path
              d="M41 74 C41 72, 45 71, 50 71 C55 71, 59 72, 59 74 L57 80 C55 81, 44 81, 42 80 Z"
              fill="url(#asabeaBlueLeggings)"
            />
            {/* Midriff skin */}
            <path
              d="M43 67 C43 67, 46 66, 50 66 C54 66, 57 67, 57 67 L57 72 C54 71, 46 71, 43 72 Z"
              fill="url(#asabeaSkin)"
            />
            {/* ASABEA FIT Pink Sports Crop Top */}
            <path
              d="M42 54 C42 52, 45 51, 50 51 C55 51, 58 52, 58 54 L57 67 C54 66, 46 66, 43 67 Z"
              fill="url(#asabeaPinkTop)"
            />
            {/* White trim & ASABEA logo */}
            <path d="M43 67 C46 66, 54 66, 57 67" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="50" cy="59" r="2.2" fill="#FFFFFF" opacity="0.9" />
            <text x="50" y="60.2" fontSize="2.8" fontWeight="bold" fill="#E96A8D" textAnchor="middle">♡</text>

            {/* Neck */}
            <rect x="47.5" y="45" width="5" height="8" rx="2.5" fill="url(#asabeaSkin)" />

            {/* Ponytail Hair (Back) */}
            <g
              style={{
                transformOrigin: '42px 34px',
                animation:
                  mode === 'WALK'
                    ? `asabeaPonytailWalk ${animationDuration} ease-in-out infinite`
                    : (mode === 'JOG' || mode === 'RUN')
                    ? `asabeaPonytailJog ${animationDuration} ease-in-out infinite`
                    : 'none'
              }}
            >
              {/* Hair tie pink */}
              <circle cx="41" cy="34" r="3" fill="#E96A8D" />
              {/* Ponytail swish */}
              <path
                d="M41 34 C33 36, 26 44, 28 54 C29 59, 32 60, 34 56 C33 49, 38 41, 43 38 Z"
                fill="url(#asabeaHair)"
              />
            </g>

            {/* 3D Cute Head & Face */}
            <g transform="translate(0, 0)">
              {/* Base Head */}
              <circle cx="50" cy="36" r="13" fill="url(#asabeaSkin)" />

              {/* Natural hair volume */}
              <path
                d="M38 33 C38 23, 44 21, 50 21 C57 21, 63 24, 62 33 C60 30, 56 28, 50 28 C44 28, 39 30, 38 33 Z"
                fill="url(#asabeaHair)"
              />

              {/* Pink Athletic Headband */}
              <path
                d="M37.5 32 C41 29, 58 29, 62 32 L62 35 C58 32, 41 32, 37.5 35 Z"
                fill="#E96A8D"
              />
              <line x1="38" y1="33.5" x2="61.5" y2="33.5" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.7" />

              {/* Cute 3D Smiling Eyes */}
              {mode === 'CELEBRATE' ? (
                // Happy curved eyes
                <g stroke="#2D211A" strokeWidth="1.8" strokeLinecap="round" fill="none">
                  <path d="M46 36 Q48 34 50 36" />
                  <path d="M53 36 Q55 34 57 36" />
                </g>
              ) : (
                <g>
                  {/* Left Eye */}
                  <ellipse cx="48" cy="36.5" rx="2" ry="2.4" fill="#24140D" />
                  <circle cx="47.3" cy="35.6" r="0.8" fill="#FFFFFF" />
                  {/* Right Eye */}
                  <ellipse cx="55" cy="36.5" rx="2" ry="2.4" fill="#24140D" />
                  <circle cx="54.3" cy="35.6" r="0.8" fill="#FFFFFF" />
                </g>
              )}

              {/* Rosy Cheeks */}
              <circle cx="45" cy="39" r="2.2" fill="#E96A8D" opacity="0.35" />
              <circle cx="58" cy="39" r="2.2" fill="#E96A8D" opacity="0.35" />

              {/* Cute Warm Smile */}
              <path
                d="M48.5 41 C50 43.5, 53 43.5, 54.5 41"
                stroke="#4A1E14"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Front Arm (Right Arm) */}
            <g
              style={{
                transformOrigin: '55px 56px',
                animation:
                  mode === 'WALK'
                    ? `asabeaArmSwingWalkA ${animationDuration} ease-in-out infinite`
                    : mode === 'JOG'
                    ? `asabeaArmJogA ${animationDuration} ease-in-out infinite`
                    : mode === 'RUN'
                    ? `asabeaArmJogA ${animationDuration} ease-in-out infinite`
                    : mode === 'CELEBRATE'
                    ? `asabeaArmCelebrate ${animationDuration} ease-in-out infinite`
                    : isWaving
                    ? 'asabeaWaveHand 0.8s ease-in-out infinite'
                    : 'none'
              }}
            >
              {/* Upper arm */}
              <rect x="52" y="54" width="8" height="18" rx="4" fill="url(#asabeaSkin)" />
              {/* Forearm & fist */}
              <g transform="translate(53, 68)">
                <rect x="0" y="0" width="7" height="16" rx="3.5" fill="url(#asabeaSkin)" />
                {/* Hand / Fist */}
                <circle cx="3.5" cy="17" r="4" fill="url(#asabeaSkin)" />
                {/* Blue wrist tracker */}
                <rect x="0" y="11" width="7" height="3" rx="1.5" fill="#3B82F6" />
              </g>
            </g>

            {/* Celebration Stars / Hearts / Sparkles overlay */}
            {mode === 'CELEBRATE' && (
              <g>
                <text x="22" y="30" fontSize="11" className="animate-ping" style={{ animationDuration: '1.2s' }}>💖</text>
                <text x="68" y="24" fontSize="12" className="animate-bounce" style={{ animationDuration: '0.8s' }}>✨</text>
                <text x="64" y="55" fontSize="10">🎉</text>
                <text x="18" y="58" fontSize="9">⭐</text>
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
