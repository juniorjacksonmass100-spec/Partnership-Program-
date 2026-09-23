import React, { useState } from 'react';
import { 
  Building2, 
  Flame, 
  Megaphone, 
  HandHeart, 
  Sparkles, 
  MapPin, 
  ChevronRight, 
  TrendingUp, 
  Radio, 
  ExternalLink 
} from 'lucide-react';
import { MinistryNewsItem } from '../types';

interface MinistryNewsLandingSectionProps {
  news: MinistryNewsItem[];
  onSelectNews: (item: MinistryNewsItem) => void;
  onOpenRegister?: () => void;
  onPledgeForProject?: (projectName: string) => void;
}

export const MinistryNewsLandingSection: React.FC<MinistryNewsLandingSectionProps> = ({
  news,
  onSelectNews,
  onOpenRegister,
  onPledgeForProject,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const activeNews = news.filter((n) => n.isActive);

  if (activeNews.length === 0) return null;

  const filteredNews = activeNews.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mradi':
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'injili':
        return <Flame className="w-4 h-4 text-emerald-400" />;
      case 'matangazo':
        return <Megaphone className="w-4 h-4 text-cyan-400" />;
      case 'huduma_jamii':
        return <HandHeart className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

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

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-amber-500/30 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
              <span className="font-cinzel tracking-wider uppercase">
                TAARIFA ZA SASA & MAENDELEO YA HUDUMA
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-white leading-tight">
              Miradi na Shughuli Zinazoendelea
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Tazama maendeleo halisi ya kazi ya Mungu, ujenzi wa hekalu, mikutano ya injili, upanuzi wa studio za matangazo na misaada kwa jamii.
            </p>
          </div>

          {/* Category Pill Filters */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            {[
              { id: 'all', label: 'Yote' },
              { id: 'mradi', label: 'Ujenzi' },
              { id: 'injili', label: 'Injili' },
              { id: 'matangazo', label: 'Vyombo vya Habari' },
              { id: 'huduma_jamii', label: 'Jamii & Yatima' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                    : 'bg-[#1b0630] hover:bg-[#280a47] text-slate-300 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNews.map((item) => {
            const badgeClass = getCategoryColor(item.category, item.priority);

            return (
              <div
                key={item.id}
                onClick={() => onSelectNews(item)}
                className="glass-card rounded-2xl p-5 sm:p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase font-cinzel ${badgeClass}`}>
                      {getCategoryIcon(item.category)}
                      <span>{item.badge}</span>
                    </span>

                    <div className="flex items-center gap-1 text-xs text-amber-300 font-mono font-bold">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.progressPercent}%</span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold font-cinzel text-white group-hover:text-amber-300 transition-colors leading-snug mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4 font-normal">
                    {item.content}
                  </p>
                </div>

                <div>
                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Hatua ya Utekelezaji:</span>
                      <span className="font-bold text-amber-300 font-mono">{item.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Stats & Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{item.location || 'Jerusalem Ministry'}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNews(item);
                      }}
                      className="inline-flex items-center gap-1 text-amber-400 font-bold hover:text-amber-300 group-hover:translate-x-1 transition-all"
                    >
                      <span>Soma Zaidi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner to Invite Partnership */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-[#270b47] to-purple-950/50 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-cinzel">
                Ungependa kuunga mkono mmoja wa miradi hii?
              </h4>
              <p className="text-xs text-slate-300">
                Jiunge kama Mshirika wa Injili leo na upokee namba rasmi ya uthibitisho kwa kila dhabihu.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRegister}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-950/50 flex items-center gap-1.5 transition-all shrink-0"
          >
            <span>Jiunge na Ushirika Sasa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
