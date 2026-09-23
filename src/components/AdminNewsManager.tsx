import React, { useState } from 'react';
import { 
  Radio, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Save, 
  X, 
  Building2, 
  Flame, 
  Megaphone, 
  HandHeart,
  Sliders
} from 'lucide-react';
import { MinistryNewsItem } from '../types';
import { safeFetchJson } from '../lib/api.ts';

interface AdminNewsManagerProps {
  news: MinistryNewsItem[];
  token: string;
  onRefreshNews: () => void;
  onPreviewItem?: (item: MinistryNewsItem) => void;
}

export const AdminNewsManager: React.FC<AdminNewsManagerProps> = ({
  news,
  token,
  onRefreshNews,
  onPreviewItem,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MinistryNewsItem | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    category: 'mradi' | 'injili' | 'matangazo' | 'huduma_jamii' | 'tangazo_muhimu';
    badge: string;
    progressPercent: number;
    targetAmount: number | '';
    currentAmount: number | '';
    location: string;
    status: 'ongoing' | 'completed' | 'upcoming';
    priority: 'urgent' | 'high' | 'normal';
    isActive: boolean;
  }>({
    title: '',
    content: '',
    category: 'mradi',
    badge: 'MRADI WA UJENZI',
    progressPercent: 50,
    targetAmount: '',
    currentAmount: '',
    location: 'Makao Makuu, Dar es Salaam',
    status: 'ongoing',
    priority: 'normal',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MinistryNewsItem | null>(null);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'mradi',
      badge: 'MRADI WA UJENZI',
      progressPercent: 50,
      targetAmount: '',
      currentAmount: '',
      location: 'Makao Makuu, Dar es Salaam',
      status: 'ongoing',
      priority: 'normal',
      isActive: true,
    });
    setEditingItem(null);
    setErrorMsg(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: MinistryNewsItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      badge: item.badge,
      progressPercent: item.progressPercent,
      targetAmount: item.targetAmount || '',
      currentAmount: item.currentAmount || '',
      location: item.location || '',
      status: item.status,
      priority: item.priority || 'normal',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (cat: 'mradi' | 'injili' | 'matangazo' | 'huduma_jamii' | 'tangazo_muhimu') => {
    let defaultBadge = 'MRADI WA UJENZI';
    if (cat === 'injili') defaultBadge = 'INJILI YA MOJA KWA MOJA';
    if (cat === 'matangazo') defaultBadge = 'HABARI & MATANGAZO';
    if (cat === 'huduma_jamii') defaultBadge = 'HUDUMA YA JAMII';
    if (cat === 'tangazo_muhimu') defaultBadge = 'TANGAZO MUHIMU';

    setFormData((prev) => ({
      ...prev,
      category: cat,
      badge: prev.badge ? prev.badge : defaultBadge,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setErrorMsg('Tafadhali jaza Kichwa cha Habari na Maelezo');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const endpoint = editingItem
        ? `/api/admin/news/${editingItem.id}`
        : '/api/admin/news';
      const method = editingItem ? 'PUT' : 'POST';

      const result = await safeFetchJson(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          progressPercent: Number(formData.progressPercent) || 0,
          targetAmount: formData.targetAmount ? Number(formData.targetAmount) : undefined,
          currentAmount: formData.currentAmount ? Number(formData.currentAmount) : undefined,
        }),
      });

      if (result.ok) {
        setFeedback(result.data?.message || 'Imehifadhiwa kikamilifu');
        setTimeout(() => setFeedback(null), 4000);
        setIsModalOpen(false);
        resetForm();
        onRefreshNews();
      } else {
        setErrorMsg(result.error || 'Imeshindwa kuhifadhi taarifa');
      }
    } catch (err: any) {
      setErrorMsg('Hitilafu ya mawasiliano: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: MinistryNewsItem) => {
    try {
      const res = await safeFetchJson(`/api/admin/news/${item.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        setFeedback(`Hali ya habari imebadilishwa (${!item.isActive ? 'Inaonekana' : 'Imefichwa'})`);
        setTimeout(() => setFeedback(null), 3000);
        onRefreshNews();
      } else {
        setErrorMsg(res.error || 'Imeshindwa kubadili hali ya habari');
      }
    } catch (e: any) {
      console.error('Failed to toggle news active state:', e);
      setErrorMsg('Hitilafu ya kubadili hali: ' + e.message);
    }
  };

  const handleQuickProgressAdjust = async (item: MinistryNewsItem, delta: number) => {
    const newPercent = Math.min(100, Math.max(0, item.progressPercent + delta));
    try {
      const res = await safeFetchJson(`/api/admin/news/${item.id}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ progressPercent: newPercent }),
      });
      if (res.ok) {
        setFeedback(`Maendeleo ya mradi yamebadilishwa kuwa ${newPercent}%`);
        setTimeout(() => setFeedback(null), 2500);
        onRefreshNews();
      } else {
        setErrorMsg(res.error || 'Imeshindwa kurekebisha asilimia ya maendeleo');
      }
    } catch (e: any) {
      console.error('Failed to adjust progress:', e);
      setErrorMsg('Hitilafu ya kurekebisha maendeleo: ' + e.message);
    }
  };

  const handleDelete = (item: MinistryNewsItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const res = await safeFetchJson(`/api/admin/news/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback('Taarifa ya mradi imefutwa kikamilifu!');
        setTimeout(() => setFeedback(null), 3000);
        onRefreshNews();
      } else {
        setErrorMsg(res.error || 'Imeshindwa kufuta habari');
      }
    } catch (e: any) {
      console.error('Failed to delete news:', e);
      setErrorMsg('Hitilafu ya kufuta: ' + e.message);
    } finally {
      setItemToDelete(null);
    }
  };

  const filteredNews = news.filter((item) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'active') return item.isActive;
    if (filterCategory === 'inactive') return !item.isActive;
    return item.category === filterCategory;
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

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="glass-panel rounded-3xl p-6 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span className="font-cinzel tracking-wider uppercase">
              UDHIBITI WA HABARI NA MIRADI INAYOENDELEA
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white leading-tight">
            Dashibodi ya Kudhibiti Habari Zinazosogea (News Ticker)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Kama Msimamizi Mkuu, hapa ndipo unapodhibiti taarifa, miradi na asilimia za maendeleo zinazoonekana kwenye kioo cha habari (ticker) kwa wageni wote na washirika walioingia kwenye mifumo yao.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Ongeza Mradi / Habari Mpya</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#120420] border border-amber-500/20">
        {[
          { id: 'all', label: `Zote (${news.length})` },
          { id: 'active', label: `Zinazoonekana (${news.filter(n => n.isActive).length})` },
          { id: 'inactive', label: `Zilizofichwa (${news.filter(n => !n.isActive).length})` },
          { id: 'mradi', label: 'Miradi ya Ujenzi' },
          { id: 'injili', label: 'Mikutano ya Injili' },
          { id: 'matangazo', label: 'Vyombo vya Habari' },
          { id: 'huduma_jamii', label: 'Huduma ya Jamii' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterCategory === tab.id
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* News & Projects List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.length === 0 ? (
          <div className="col-span-2 glass-panel rounded-3xl p-12 text-center text-slate-400">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
            <h3 className="text-base font-bold text-white mb-1">Hakuna taarifa zilizopatikana</h3>
            <p className="text-xs">Bofya kitufe cha juu kuongeza taarifa ya kwanza ya mradi.</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <div
              key={item.id}
              className={`glass-card rounded-2xl p-5 border transition-all duration-300 relative flex flex-col justify-between ${
                item.isActive
                  ? 'border-amber-500/30 hover:border-amber-500/60'
                  : 'border-white/5 opacity-60 bg-black/40'
              }`}
            >
              <div>
                {/* Card Top Row: Badge, Status, and Visibility Switch */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-cinzel bg-amber-500/15 border-amber-500/30 text-amber-300">
                      {getCategoryIcon(item.category)}
                      <span>{item.badge}</span>
                    </span>

                    {item.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold uppercase">
                        Kipaumbele
                      </span>
                    )}
                  </div>

                  {/* Active / Inactive Quick Toggle */}
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      item.isActive
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/10 hover:bg-white/20 text-slate-400 border border-white/10'
                    }`}
                    title={item.isActive ? "Bofya kuficha kwenye habari zinazosogea" : "Bofya kuweka wazi kwenye habari"}
                  >
                    {item.isActive ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inaonekana</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Imefichwa</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold font-cinzel text-white leading-snug mb-2">
                  {item.title}
                </h3>

                {/* Content snippet */}
                <p className="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed font-normal">
                  {item.content}
                </p>
              </div>

              {/* Progress & Quick Steppers */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Maendeleo:</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {item.progressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>

                {/* Quick Stepper Buttons for Admin (-10%, -5%, +5%, +10%) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  <span className="font-semibold px-1">Badili Haraka:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickProgressAdjust(item, -10)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono"
                      title="Punguza kwa 10%"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => handleQuickProgressAdjust(item, -5)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono"
                      title="Punguza kwa 5%"
                    >
                      -5%
                    </button>
                    <button
                      onClick={() => handleQuickProgressAdjust(item, 5)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono font-bold"
                      title="Ongeza kwa 5%"
                    >
                      +5%
                    </button>
                    <button
                      onClick={() => handleQuickProgressAdjust(item, 10)}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono font-bold"
                      title="Ongeza kwa 10%"
                    >
                      +10%
                    </button>
                  </div>
                </div>

                {/* Financial stats if available */}
                {(item.targetAmount || item.currentAmount) && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                    {item.targetAmount && (
                      <div>
                        Lengo: <span className="font-mono text-white font-bold">TZS {item.targetAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {item.currentAmount && (
                      <div>
                        Kimefikiwa: <span className="font-mono text-emerald-400 font-bold">TZS {item.currentAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Action Buttons (Edit, Delete, Preview) */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{item.location || 'Jerusalem'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onPreviewItem && (
                      <button
                        onClick={() => onPreviewItem(item)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all text-xs"
                        title="Tazama kama mtumiaji"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(item)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Hariri</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all text-xs"
                      title="Futa taarifa hii"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div 
            className="glass-panel w-full max-w-2xl rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-red-950/50 via-purple-950/60 to-[#130321]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-cinzel text-white">
                    {editingItem ? 'Hariri Taarifa ya Mradi / Habari' : 'Chapisha Mradi / Habari Mpya'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Taarifa hii itaonekana mara moja kwenye habari zinazosogea za huduma.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-cinzel">
                  Kichwa cha Habari / Jina la Mradi *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="mf. Ujenzi wa Hekalu Kuu la Ibada - Awamu ya 2"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-amber-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  required
                />
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-cinzel">
                    Kategoria ya Huduma
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#18052a] border border-amber-500/30 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="mradi">Ujenzi & Miundombinu</option>
                    <option value="injili">Mikutano ya Injili (Crusades)</option>
                    <option value="matangazo">Vyombo vya Habari & Mitandao</option>
                    <option value="huduma_jamii">Huduma ya Jamii, Yatima & Wajane</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-cinzel">
                    Lebo ya Kwenye Ticker (Badge)
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="mf. MRADI WA UJENZI"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-amber-500/30 text-white uppercase text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Progress Percentage & Slider */}
              <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/25 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-cinzel text-amber-300 font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Kiwango cha Utekelezaji (Progress Percentage)</span>
                  </span>
                  <span className="font-mono font-extrabold text-amber-300 text-base">
                    {formData.progressPercent}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progressPercent}
                  onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (Imeanza)</span>
                  <span>50% (Katikati)</span>
                  <span>100% (Imekamilika)</span>
                </div>
              </div>

              {/* Financial Goals (Target vs Current) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Lengo la Fedha (TZS) - Hiari
                  </label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="mf. 150000000"
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Kiasi Kilichofikiwa (TZS) - Hiari
                  </label>
                  <input
                    type="number"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="mf. 112500000"
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Location & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Eneo la Mradi (Location)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="mf. Makao Makuu, Dar es Salaam"
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Kiwango cha Kipaumbele
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl bg-[#18052a] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="normal">Kawaida (Normal)</option>
                    <option value="high">Kikubwa (High)</option>
                    <option value="urgent">Dharura / Muhimu Sana (Urgent - Inawekwa kwanza)</option>
                  </select>
                </div>
              </div>

              {/* Content / Narrative */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-cinzel">
                  Maelezo Kamili ya Maendeleo ya Kazi *
                </label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Eleza kinachoendelea, hatua iliyofikiwa, vifaa vinavyonunuliwa au maombi ya mradi..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-amber-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm leading-relaxed"
                  required
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-white font-medium cursor-pointer">
                  Washa taarifa hii ili ionekane hadharani mara moja kwenye habari zinazosogea (News Ticker)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  Ghairi
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSubmitting ? 'Inahifadhi...' : (editingItem ? 'Hifadhi Mabadiliko' : 'Chapisha Sasa')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1d0735] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-white">Thibitisha Kufuta</h3>
                <p className="text-xs text-red-300">Kitendo hiki hakirudishwi nyuma</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Je, una uhakika unataka kufuta taarifa ya mradi/habari: <strong className="text-amber-300">"{itemToDelete.title}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-lg shadow-red-950/50 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ndio, Futa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
