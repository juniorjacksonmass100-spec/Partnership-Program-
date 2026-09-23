import React from 'react';
import { LogoEmblem } from './LogoEmblem.tsx';
import { UserProfile } from '../types.ts';
import { LogOut, ShieldAlert, User, Wifi, Sparkles, BookOpen, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  isSynced: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenAuth,
  isSynced,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-amber-500/20 px-3 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Logo */}
        <LogoEmblem size="md" showText={true} />

        {/* Center: Scripture & Sync Badge (visible on medium+ screens) */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-cinzel tracking-wider text-[11px] font-semibold">
              ZABURI 50:5
            </span>
            <span className="text-amber-200/80 italic text-[11px] hidden xl:inline">
              "Nikusanyieni wacha Mungu wangu waliofanya agano nami kwa dhabihu"
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSynced ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSynced ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-[11px] text-slate-300 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400 inline" />
              {isSynced ? 'Data Inaoanishwa Moja kwa Moja' : 'Inajaribu Kuunganisha...'}
            </span>
          </div>
        </div>

        {/* Right: Auth / Profile info & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Badilisha kwenda Mandhari Meupe (Light Mode)' : 'Badilisha kwenda Mandhari Meusi (Dark Mode)'}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center text-xs shadow-inner"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User profile tag */}
              <div className="flex items-center gap-2 bg-[#220a3d]/80 border border-amber-500/30 rounded-xl px-2.5 py-1.5 shadow-inner">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    user.role === 'admin'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-700 text-amber-950 shadow-md shadow-amber-900/50'
                      : 'bg-purple-800 text-purple-200 border border-purple-600/40'
                  }`}
                >
                  {user.role === 'admin' ? (
                    <ShieldAlert className="w-4 h-4 text-amber-950" />
                  ) : (
                    <User className="w-4 h-4 text-amber-300" />
                  )}
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-slate-100 max-w-[130px] sm:max-w-[170px] truncate">
                      {user.fullName}
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500 text-black px-1.5 py-0.2 rounded-md font-cinzel">
                        Msimamizi
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-300/80 truncate max-w-[130px] sm:max-w-[170px]">
                    {user.role === 'admin'
                      ? 'Msimamizi Mkuu wa Mfumo'
                      : user.partnershipTier || 'Mshirika wa Gospel'}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                title="Ondoka kwenye mfumo"
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-100 transition-all flex items-center gap-1 text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Ondoka</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-open-login"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-200 hover:text-white bg-purple-900/40 hover:bg-purple-800/60 border border-amber-400/30 transition-all shadow"
              >
                Ingia Mfomoni
              </button>
              <button
                id="btn-open-register"
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 transition-all shadow-md shadow-amber-900/30 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-950" />
                Jisajili Mshirika
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
