import React from 'react';
import goldenLogo from '../assets/images/jerusalem_golden_emblem_1789999247986.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const LogoEmblem: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`relative ${sizeClasses[size]} rounded-full p-0.5 shadow-2xl shadow-amber-950/60 border border-amber-400/50 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 flex-shrink-0 group overflow-hidden`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-[#18042b] flex items-center justify-center relative">
          <img
            src={goldenLogo}
            alt="Jerusalem Ministry of Gospel Emblem"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {/* Subtle gold sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent pointer-events-none" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-cinzel">
              Jerusalem Ministry of Gospel
            </span>
          </div>
          <span className="text-sm md:text-base font-extrabold tracking-wide text-white drop-shadow">
            Mpango wa Ushirika & Sadaka
          </span>
          <span className="text-[10px] text-amber-200/70 italic hidden sm:inline">
            Zaburi 50:5 • Agano la Sadaka
          </span>
        </div>
      )}
    </div>
  );
};
