import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Radio, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Layers, 
  Building2, 
  HeartHandshake, 
  Megaphone, 
  Flame, 
  HandHeart,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { MinistryNewsItem } from '../types';

interface MinistryNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  news: MinistryNewsItem[];
  selectedItem?: MinistryNewsItem | null;
  onSelectPledgeForProject?: (projectName: string) => void;
  isAdmin?: boolean;
  onNavigateToAdminNews?: () => void;
}

export const MinistryNewsModal: React.FC<MinistryNewsModalProps> = ({
  isOpen,
  onClose,
  news,
  selectedItem: initialSelected,
  onSelectPledgeForProject,
  isAdmin,
  onNavigateToAdminNews,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id || null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Update selected if initialSelected changes
  React.useEffect(() => {
    if (initialSelected) {
      setSelectedId(initialSelected.id);
    } else if (news.length > 0 && !selectedId) {
      setSelectedId(news[0].id);
    }
  }, [initialSelected, news]);

  if (!isOpen) return null;

  const filteredNews = news.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  const currentItem = news.find((n) => n.id === selectedId) || (filteredNews.length > 0 ? filteredNews[0] : null);

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

  const getCategoryBadgeClass = (category: string, priority?: string) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-5xl rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-amber-500/20 bg-gradient-to-r from-red-950/40 via-purple-950/60 to-[#130321]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-cinzel uppercase tracking-widest text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  HUDUMA YA HABARI & MIRADI
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Jerusalem Ministry Live Broadcast
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-cinzel text-white leading-tight">
                Shughuli na Miradi Inayoendelea
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onNavigateToAdminNews && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAdminNews();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
              >
                <span>Dhibiti kama Admin</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              aria-label="Funga"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="px-5 sm:px-8 py-2.5 bg-[#120320] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'Miradi Yote' },
            { id: 'mradi', label: 'Ujenzi & Maendeleo' },
            { id: 'injili', label: 'Mikutano ya Injili' },
            { id: 'matangazo', label: 'Studio & Vyombo vya Habari' },
            { id: 'huduma_jamii', label: 'Huduma ya Jamii & Yatima' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === cat.id
                  ? 'bg-amber-500 text-black shadow font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Content Layout (Sidebar + Detail) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Project List */}
          <div className="md:col-span-5 border-r border-white/10 overflow-y-auto p-4 space-y-2.5 bg-[#11021f]/50">
            {filteredNews.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Hakuna taarifa za kategoria hii kwa sasa.
              </div>
            ) : (
              filteredNews.map((item) => {
                const isSelected = item.id === currentItem?.id;
                const badgeStyle = getCategoryBadgeClass(item.category, item.priority);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase font-cinzel ${badgeStyle}`}>
                        {getCategoryIcon(item.category)}
                        <span>{item.badge}</span>
                      </span>

                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        {item.progressPercent}%
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1.5 leading-snug line-clamp-2 font-cinzel">
                      {item.title}
                    </h4>

                    {/* Progress line */}
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{item.location || 'Jerusalem Ministry'}</span>
                      </span>
                      <span>{item.publishDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed View of Selected Project */}
          <div className="md:col-span-7 overflow-y-auto p-5 sm:p-8 bg-[#18062b]/80 flex flex-col justify-between">
            {currentItem ? (
              <div className="space-y-6">
                {/* Header info */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase font-cinzel ${getCategoryBadgeClass(currentItem.category, currentItem.priority)}`}>
                      {getCategoryIcon(currentItem.category)}
                      <span>{currentItem.badge}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs text-slate-300 font-mono">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{currentItem.status === 'completed' ? 'Imekamilika' : 'Inaendelea'}</span>
                    </span>

                    {currentItem.location && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs text-slate-300">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{currentItem.location}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{currentItem.publishDate}</span>
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-extrabold font-cinzel text-white leading-tight">
                    {currentItem.title}
                  </h3>
                </div>

                {/* Progress & Financial Goals Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-cinzel text-amber-300 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <span>Kiwango cha Utekelezaji</span>
                    </span>
                    <span className="text-xl font-mono font-extrabold text-amber-300">
                      {currentItem.progressPercent}%
                    </span>
                  </div>

                  {/* Big Progress Bar */}
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 rounded-full transition-all duration-700 shadow-lg shadow-amber-500/50"
                      style={{ width: `${currentItem.progressPercent}%` }}
                    />
                  </div>

                  {/* Target vs Collected Amounts if available */}
                  {(currentItem.targetAmount || currentItem.currentAmount) && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                      {currentItem.targetAmount && (
                        <div>
                          <div className="text-slate-400">Lengo la Mradi:</div>
                          <div className="text-sm font-mono font-bold text-slate-200">
                            TZS {currentItem.targetAmount.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {currentItem.currentAmount && (
                        <div>
                          <div className="text-slate-400">Kiasi Kilichofikiwa:</div>
                          <div className="text-sm font-mono font-bold text-emerald-400">
                            TZS {currentItem.currentAmount.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Description / Update Content */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-amber-400 font-bold font-cinzel mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Taarifa Kamili ya Maendeleo</span>
                  </h4>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-normal">
                    {currentItem.content}
                  </div>
                </div>

                {/* Call to action for partners */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    Unaweza kushiriki kubarikiwa kupitia mradi huu kwa kutoa sadaka au kuweka ahadi ya dhabihu.
                  </div>

                  {onSelectPledgeForProject && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectPledgeForProject(currentItem.title);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all shrink-0"
                    >
                      <HeartHandshake className="w-4 h-4 text-black" />
                      <span>Weka Ahadi ya Mradi Huu</span>
                      <ArrowRight className="w-3.5 h-3.5 text-black" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <Layers className="w-10 h-10 mb-2 opacity-40 text-amber-400" />
                <p>Chagua mradi wowote upande wa kushoto kusoma taarifa zake.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#0d0117] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Jerusalem Ministry of Gospel • Taarifa Rasmi za Ufalme</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
          >
            Funga
          </button>
        </div>
      </div>
    </div>
  );
};
