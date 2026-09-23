import React, { useState } from 'react';
import { Sparkles, Radio, Play, Pause, ExternalLink, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { MinistryNewsItem } from '../types';

interface MinistryNewsTickerProps {
  news: MinistryNewsItem[];
  onSelectNews?: (item: MinistryNewsItem) => void;
  onOpenAllNews?: () => void;
  className?: string;
  speed?: 'normal' | 'slow' | 'fast';
}

export const MinistryNewsTicker: React.FC<MinistryNewsTickerProps> = ({
  news,
  onSelectNews,
  onOpenAllNews,
  className = '',
  speed = 'normal',
}) => {
  const [isPaused, setIsPaused] = useState(false);

  // Filter active news
  const activeNews = news.filter((n) => n.isActive);

  if (activeNews.length === 0) {
    return null;
  }

  // Duplicate list to create a seamless infinite scrolling marquee loop
  const displayItems = [...activeNews, ...activeNews];

  const getCategoryColor = (category: string, priority?: string) => {
    if (priority === 'urgent') {
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    }
    switch (category) {
      case 'mradi':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'injili':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'matangazo':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'huduma_jamii':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  const getSpeedClass = () => {
    if (speed === 'slow') return 'animate-marquee-slow';
    if (speed === 'fast') return 'animate-marquee-fast';
    return 'animate-marquee';
  };

  return (
    <section 
      aria-label="Habari na Miradi ya Jerusalem Ministry"
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#1b0630] via-[#240a42] to-[#160426] border border-amber-500/30 shadow-lg shadow-purple-950/40 my-3 select-none ${className}`}
    >
      {/* Subtle background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      <div className="relative flex items-center h-12 sm:h-14">
        {/* Left Broadcast Headline Anchor */}
        <div 
          onClick={onOpenAllNews}
          className="relative z-20 flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 h-full bg-gradient-to-r from-red-950 via-red-900 to-amber-950 border-r border-amber-500/40 cursor-pointer group shadow-md transition-all"
          title="Bofya kuona miradi yote ya huduma"
        >
          {/* Pulsing Live Beacon */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>

          <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />

          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-black font-cinzel tracking-wider text-amber-200 uppercase whitespace-nowrap">
              HABARI ZA HUDUMA
            </span>
            <span className="hidden sm:inline text-[8px] uppercase tracking-widest text-red-200 font-bold -mt-0.5">
              MIRADI INAYOENDELEA
            </span>
          </div>

          <div className="hidden lg:flex items-center text-[10px] text-amber-400/80 group-hover:text-amber-300 font-bold ml-1">
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Marquee Track Container */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          {/* Gradient edge fades for television ticker finish */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1b0630] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#160426] to-transparent z-10 pointer-events-none" />

          {/* Marquee Moving Content */}
          <div 
            className={`flex items-center py-1 ${getSpeedClass()} ${isPaused ? '[animation-play-state:paused]' : ''}`}
          >
            {displayItems.map((item, index) => {
              const colorClass = getCategoryColor(item.category, item.priority);

              return (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => onSelectNews && onSelectNews(item)}
                  className="flex items-center gap-3 px-4 sm:px-6 cursor-pointer group whitespace-nowrap transition-colors"
                  title="Bofya kusoma taarifa kamili na maendeleo ya mradi huu"
                >
                  {/* Badge & Category */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold font-cinzel uppercase shadow-xs ${colorClass}`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{item.badge || 'MRADI WA HUDUMA'}</span>
                  </span>

                  {/* Progress Indicator if applicable */}
                  {typeof item.progressPercent === 'number' && item.progressPercent > 0 && (
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-slate-300">
                      {item.progressPercent >= 100 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-400" />
                      )}
                      <span className="font-mono font-bold text-amber-300">{item.progressPercent}%</span>
                      {/* Mini Progress Bar */}
                      <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Headline Title */}
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    {item.title}
                  </span>

                  {/* Snippet / Location */}
                  {item.location && (
                    <span className="text-[10px] text-slate-400 hidden md:inline">
                      ({item.location})
                    </span>
                  )}

                  {/* Elegant Separator */}
                  <span className="text-amber-400/50 font-serif text-sm px-2">✦</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Action Controls: Play/Pause & Full Modal Button */}
        <div className="relative z-20 flex-shrink-0 flex items-center gap-1 px-2 sm:px-3 h-full bg-[#160426]/90 border-l border-amber-500/30">
          {/* Pause / Play Toggle */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-all text-xs"
            title={isPaused ? "Endeleza usogezaji" : "Sitisha usogezaji"}
            aria-label={isPaused ? "Play news ticker" : "Pause news ticker"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* View All Projects Modal Button */}
          {onOpenAllNews && (
            <button
              onClick={onOpenAllNews}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] sm:text-xs flex items-center gap-1 transition-all"
              title="Fungua orodha kamili ya miradi"
            >
              <span>Miradi Yote</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
