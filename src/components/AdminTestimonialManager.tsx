import React, { useState } from 'react';
import {
  Quote,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Award,
  BookOpen,
  Calendar,
  Save,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { TestimonialItem } from '../types';
import { safeFetchJson } from '../lib/api.ts';

interface AdminTestimonialManagerProps {
  testimonials: TestimonialItem[];
  token: string;
  onRefreshTestimonials: () => void;
}

export const AdminTestimonialManager: React.FC<AdminTestimonialManagerProps> = ({
  testimonials,
  token,
  onRefreshTestimonials,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TestimonialItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    partnerName: string;
    location: string;
    tier: string;
    category: 'biashara' | 'ujenzi' | 'uponyaji' | 'agano' | 'familia' | 'huduma';
    categoryLabel: string;
    quote: string;
    fullTestimony: string;
    scripture: string;
    date: string;
    verified: boolean;
  }>({
    partnerName: '',
    location: 'Dar es Salaam',
    tier: 'Mshirika wa Dhahabu',
    category: 'biashara',
    categoryLabel: 'Baraka za Biashara',
    quote: '',
    fullTestimony: '',
    scripture: 'Malaki 3:10',
    date: 'Septemba 2026',
    verified: true,
  });

  const resetForm = () => {
    setFormData({
      partnerName: '',
      location: 'Dar es Salaam',
      tier: 'Mshirika wa Dhahabu',
      category: 'biashara',
      categoryLabel: 'Baraka za Biashara',
      quote: '',
      fullTestimony: '',
      scripture: 'Malaki 3:10',
      date: 'Septemba 2026',
      verified: true,
    });
    setEditingItem(null);
    setErrorMsg(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: TestimonialItem) => {
    setEditingItem(item);
    setFormData({
      partnerName: item.partnerName,
      location: item.location || '',
      tier: item.tier || 'Mshirika wa Injili',
      category: item.category || 'agano',
      categoryLabel: item.categoryLabel || 'Agano la Sadaka',
      quote: item.quote,
      fullTestimony: item.fullTestimony,
      scripture: item.scripture || 'Zaburi 50:5',
      date: item.date || 'Septemba 2026',
      verified: item.verified,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleCategoryChange = (category: typeof formData.category) => {
    let label = 'Agano la Sadaka';
    let scripture = 'Zaburi 50:5';

    switch (category) {
      case 'biashara':
        label = 'Baraka za Biashara';
        scripture = 'Malaki 3:10';
        break;
      case 'uponyaji':
        label = 'Uponyaji & Amani ya Familia';
        scripture = 'Zaburi 20:1-3';
        break;
      case 'ujenzi':
        label = 'Dhabihu ya Ujenzi wa Hekalu';
        scripture = 'Hagai 1:8';
        break;
      case 'agano':
        label = 'Ukuaji wa Kiroho & Huduma';
        scripture = '2 Wakorintho 9:6-8';
        break;
      case 'familia':
        label = 'Muujiza wa Ndoa & Watoto';
        scripture = 'Zaburi 128:1-3';
        break;
      case 'huduma':
        label = 'Mikutano ya Injili Vijijini';
        scripture = 'Marko 16:15';
        break;
    }

    setFormData({
      ...formData,
      category,
      categoryLabel: label,
      scripture: formData.scripture || scripture,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partnerName.trim() || !formData.fullTestimony.trim()) {
      setErrorMsg('Tafadhali jaza Jina la Mshirika na Ushuhuda Kamili');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const endpoint = editingItem
        ? `/api/admin/testimonials/${editingItem.id}`
        : '/api/admin/testimonials';
      const method = editingItem ? 'PUT' : 'POST';

      const quoteToSave = formData.quote.trim()
        ? formData.quote.trim()
        : formData.fullTestimony.trim().slice(0, 110) + '...';

      const result = await safeFetchJson(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quote: quoteToSave,
        }),
      });

      if (result.ok) {
        setFeedback(editingItem ? 'Ushuhuda umesasishwa kikamilifu' : 'Ushuhuda mpya umeongezwa kikamilifu!');
        setTimeout(() => setFeedback(null), 4000);
        setIsModalOpen(false);
        resetForm();
        onRefreshTestimonials();
      } else {
        setErrorMsg(result.error || 'Imeshindwa kuhifadhi ushuhuda');
      }
    } catch (err: any) {
      setErrorMsg('Hitilafu ya mawasiliano: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVerified = async (item: TestimonialItem) => {
    try {
      const res = await safeFetchJson(`/api/admin/testimonials/${item.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified: !item.verified }),
      });
      if (res.ok) {
        onRefreshTestimonials();
        setFeedback(`Ushuhuda sasa ${!item.verified ? 'umethibitishwa' : 'umeondolewa hewani'}`);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setErrorMsg(res.error || 'Imeshindwa kubadili hali ya ushuhuda');
      }
    } catch (e: any) {
      console.error('Failed to toggle testimonial verification:', e);
      setErrorMsg('Hitilafu ya kubadili hali: ' + e.message);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const res = await safeFetchJson(`/api/admin/testimonials/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback('Ushuhuda umefutwa kikamilifu!');
        setTimeout(() => setFeedback(null), 3000);
        onRefreshTestimonials();
      } else {
        setErrorMsg(res.error || 'Imeshindwa kufuta ushuhuda');
      }
    } catch (e: any) {
      console.error('Failed to delete testimonial:', e);
      setErrorMsg('Hitilafu ya kufuta ushuhuda: ' + e.message);
    } finally {
      setItemToDelete(null);
    }
  };

  const filteredTestimonials = testimonials.filter((item) => {
    // Search query
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchName = item.partnerName.toLowerCase().includes(term);
      const matchLoc = (item.location || '').toLowerCase().includes(term);
      const matchText = (item.fullTestimony || '').toLowerCase().includes(term);
      const matchScripture = (item.scripture || '').toLowerCase().includes(term);
      if (!matchName && !matchLoc && !matchText && !matchScripture) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (statusFilter === 'verified' && !item.verified) return false;
    if (statusFilter === 'unverified' && item.verified) return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-900 border border-amber-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Quote className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold font-cinzel text-white">
              Usimamizi wa Shuhuda za Washirika (Testimonies)
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Weka, hariri, thibitisha au futa shuhuda za washirika wanaomtolea Bwana dhabihu. 
            Mabadiliko yote yanahifadhiwa mara moja kwenye hifadhidata ya Supabase na kuonekana moja kwa moja kwenye ukurasa mkuu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshTestimonials}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200 border border-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Sasisha Orodha ya Shuhuda"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Pakia Upya</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Rekodi Ushuhuda Mpya</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-[#120420] border border-amber-500/20">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta kwa jina la mshirika, mji, au maneno ya ushuhuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'Makundi Yote' },
            { id: 'biashara', label: 'Biashara' },
            { id: 'ujenzi', label: 'Ujenzi' },
            { id: 'uponyaji', label: 'Uponyaji' },
            { id: 'agano', label: 'Agano' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-black'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 flex items-center gap-1.5 justify-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Zote ({testimonials.length})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'verified'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Zilizothibitishwa ({testimonials.filter((t) => t.verified).length})
          </button>
          <button
            onClick={() => setStatusFilter('unverified')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'unverified'
                ? 'bg-amber-600 text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Bado ({testimonials.filter((t) => !t.verified).length})
          </button>
        </div>
      </div>

      {/* Testimonials List */}
      {filteredTestimonials.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#120420] border border-dashed border-amber-500/20">
          <Quote className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Hakuna shuhuda zilizopatikana</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Hujarekodi ushuhuda unaolingana na vigezo ulivyochagua. Bonyeza kitufe hapa chini ili kuongeza ushuhuda mpya.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300"
          >
            Rekodi Ushuhuda Mpya Sasa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTestimonials.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                item.verified
                  ? 'bg-gradient-to-b from-[#19062b] to-[#120320] border-amber-500/25 hover:border-amber-500/40'
                  : 'bg-black/40 border-slate-700/50 opacity-80'
              }`}
            >
              <div>
                {/* Header: Partner Name & Category Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white font-cinzel">
                        {item.partnerName}
                      </span>
                      {item.verified && (
                        <span title="Imethibitishwa na Mchungaji Kiongozi" className="inline-flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {item.location || 'Tanzania'}
                      </span>
                      <span>•</span>
                      <span className="text-amber-300 font-medium">
                        {item.tier || 'Mshirika wa Injili'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {item.categoryLabel || item.category}
                  </span>
                </div>

                {/* Quote Quote Box */}
                <div className="my-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs italic text-amber-100/90 relative">
                  <Quote className="w-3.5 h-3.5 text-amber-400/40 absolute top-2 left-2" />
                  <p className="pl-4 font-serif">{item.quote}</p>
                </div>

                {/* Full testimony summary */}
                <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed">
                  {item.fullTestimony}
                </p>

                {/* Scripture Reference */}
                {item.scripture && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
                    <BookOpen className="w-3 h-3 text-amber-400" />
                    <span>Neno: {item.scripture}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleVerified(item)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                      item.verified
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60'
                    }`}
                    title="Badili Hali ya Uthibitisho"
                  >
                    {item.verified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Imethibitishwa</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-amber-400" />
                        <span>Haijathibitishwa</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-slate-500">
                    {item.date}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-300 border border-white/5 transition-all"
                    title="Hariri Ushuhuda"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-all"
                    title="Futa Ushuhuda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-red-500/40 bg-[#150424] space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold font-cinzel text-white">
                  Thibitisha Kufuta Ushuhuda
                </h3>
                <span className="text-xs text-red-300 font-sans">
                  Hatua hii itafuta ushuhuda moja kwa moja kwenye mfumo na Supabase.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <p className="font-bold text-white mb-1">{itemToDelete.partnerName}</p>
              <p className="italic text-slate-400 line-clamp-2">"{itemToDelete.quote}"</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
              >
                Ghairi
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-950/50"
              >
                Futa Ushuhuda Sasa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-3xl border border-amber-500/30 bg-[#160528] space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold font-cinzel text-white">
                  {editingItem ? 'Hariri Ushuhuda wa Mshirika' : 'Rekodi Ushuhuda Mpya wa Mshirika'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Partner Name */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Jina Kamili la Mshirika *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mf. Daniel Mrema au Mama Grace"
                    value={formData.partnerName}
                    onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Eneo / Mji / Mkoa
                  </label>
                  <input
                    type="text"
                    placeholder="mf. Dar es Salaam, Arusha, Mwanza"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Partnership Tier */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Kiwango cha Ushirika (Tier)
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#1f0b34] border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Mshirika wa Dhahabu">Mshirika wa Dhahabu</option>
                    <option value="Mshirika wa Fedha">Mshirika wa Fedha</option>
                    <option value="Mshirika wa Shaba">Mshirika wa Shaba</option>
                    <option value="Mshirika wa Injili">Mshirika wa Injili</option>
                    <option value="Msimamizi Mkuu">Msimamizi Mkuu</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Kundi la Ushuhuda (Category)
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#1f0b34] border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="biashara">Baraka za Biashara / Ajira</option>
                    <option value="uponyaji">Uponyaji & Amani ya Familia</option>
                    <option value="ujenzi">Dhabihu ya Ujenzi wa Hekalu</option>
                    <option value="agano">Agano la Sadaka / Ukuaji wa Kiroho</option>
                    <option value="familia">Muujiza wa Ndoa & Watoto</option>
                    <option value="huduma">Mikutano ya Injili Vijijini</option>
                  </select>
                </div>

                {/* Scripture Reference */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Mstari wa Neno la Mungu (Scripture)
                  </label>
                  <input
                    type="text"
                    placeholder="mf. Malaki 3:10 au Zaburi 50:5"
                    value={formData.scripture}
                    onChange={(e) => setFormData({ ...formData, scripture: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Tarehe au Mwezi
                  </label>
                  <input
                    type="text"
                    placeholder="mf. Septemba 2026"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Short Quote */}
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Nukuu Fupi ya Ushuhuda (Quote ya Muhtasari)
                </label>
                <input
                  type="text"
                  placeholder="Sentensi 1 yenye nguvu, mf. Milango ya zabuni iliyofungwa kwa miaka mitatu ilifunguka kimiujiza!"
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Full Testimony */}
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  Ushuhuda Kamili (Full Testimony) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Eleza kwa undani jinsi Bwana alivyotenda baada ya kuingia agano la sadaka ya dhabihu..."
                  value={formData.fullTestimony}
                  onChange={(e) => setFormData({ ...formData, fullTestimony: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Verified Checkbox */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="chk-verified"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 border-white/20 bg-black/40"
                />
                <label htmlFor="chk-verified" className="text-xs text-slate-200 font-medium cursor-pointer">
                  Thibitisha na Uonyeshe Ushuhuda Huu kwenye Ukurasa wa Mbele (Live on Public Portal)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Inahifadhi...' : editingItem ? 'Hifadhi Mabadiliko' : 'Chapisha Ushuhuda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
