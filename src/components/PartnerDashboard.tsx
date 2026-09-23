import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Pledge,
  Contribution,
  UserSummary,
  ReminderNotification,
  InAppNotification,
  MinistryNewsItem,
} from '../types.ts';
import { safeFetchJson } from '../lib/api.ts';
import { exportPartnerHistoryToExcel } from '../utils/excelExport.ts';
import { MinistryNewsTicker } from './MinistryNewsTicker.tsx';
import { MinistryNewsModal } from './MinistryNewsModal.tsx';
import { TestimonialsSection } from './TestimonialsSection.tsx';
import {
  HandCoins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  PlusCircle,
  CreditCard,
  BellRing,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Inbox,
  Mail,
  MailOpen,
  CheckCheck,
  Check,
  MessageSquare,
  Phone,
  Radio,
  Building2,
  Flame,
  Megaphone,
  HandHeart,
  ExternalLink,
  MapPin,
  HeartHandshake,
} from 'lucide-react';

interface PartnerDashboardProps {
  user: UserProfile;
  token: string;
  onOpenNewPledge: (purpose?: string) => void;
  onOpenFulfillPledge: (pledge: Pledge) => void;
  lastSyncTime: string;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  user,
  token,
  onOpenNewPledge,
  onOpenFulfillPledge,
  lastSyncTime,
}) => {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [reminders, setReminders] = useState<ReminderNotification[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [newsList, setNewsList] = useState<MinistryNewsItem[]>([]);
  const [selectedNewsForModal, setSelectedNewsForModal] = useState<MinistryNewsItem | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'pledges' | 'history' | 'notifications' | 'reminders' | 'projects' | 'testimonials'
  >('pledges');
  const [timeframe, setTimeframe] = useState<'wiki' | 'mwezi' | 'mwaka' | 'yote'>('yote');
  const [pledgeFilter, setPledgeFilter] = useState<'all' | 'pending' | 'partial' | 'fulfilled' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [resSummary, resPledges, resContribs, resReminders, resNotifications, resNews] = await Promise.all([
        safeFetchJson('/api/user/summary', { headers }),
        safeFetchJson('/api/user/pledges', { headers }),
        safeFetchJson(`/api/user/contributions?timeframe=${timeframe}`, { headers }),
        safeFetchJson('/api/user/reminders', { headers }),
        safeFetchJson('/api/user/notifications', { headers }),
        safeFetchJson('/api/news'),
      ]);

      if (resSummary.ok && resSummary.data) setSummary(resSummary.data);
      if (resPledges.ok && resPledges.data) {
        setPledges(resPledges.data.pledges || []);
      }
      if (resContribs.ok && resContribs.data) {
        setContributions(resContribs.data.contributions || []);
      }
      if (resReminders.ok && resReminders.data) {
        setReminders(resReminders.data.reminders || []);
      }
      if (resNotifications.ok && resNotifications.data) {
        setNotifications(resNotifications.data.notifications || []);
      }
      if (resNews.ok && resNews.data) {
        setNewsList(resNews.data.news || []);
      }
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [token, timeframe, lastSyncTime]);

  // Filter pledges
  const filteredPledges = pledges.filter((p) => {
    const matchesFilter = pledgeFilter === 'all' || p.status === pledgeFilter;
    const matchesSearch =
      p.pledgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/user/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/user/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/user/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleDeletePledge = async (id: string, num: string) => {
    if (!window.confirm(`Je, una uhakika unataka kufuta ahadi hii (${num})?`)) return;
    try {
      const res = await fetch(`/api/user/pledges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPledges((prev) => prev.filter((p) => p.id !== id));
        fetchUserData();
      }
    } catch (err) {
      console.error('Failed to delete pledge:', err);
    }
  };

  const handleExportExcel = () => {
    exportPartnerHistoryToExcel(user.fullName, pledges, contributions);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-amber-500/25">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{user.partnershipTier || 'Mshirika wa Gospel'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-white">
              Karibu, <span className="gold-gradient-text">{user.fullName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80 mt-1 max-w-xl">
              "Kila mmoja wenu na atoe kadiri ya baraka ya BWANA Mungu wako aliyokupa." - Kumbukumbu la Torati 16:17
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {unreadNotificationsCount > 0 && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-2 animate-pulse"
              >
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Una Ujumbe {unreadNotificationsCount} Mpya!</span>
              </button>
            )}

            <button
              onClick={() => onOpenNewPledge()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Weka Ahadi ya Sadaka</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-amber-500/25 text-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Pakua Ripoti ya Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Animated Ministry News Ticker */}
      <MinistryNewsTicker
        news={newsList}
        onSelectNews={(item) => {
          setSelectedNewsForModal(item);
          setIsNewsModalOpen(true);
        }}
        onOpenAllNews={() => {
          setSelectedNewsForModal(null);
          setIsNewsModalOpen(true);
        }}
      />

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pledged */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-200/80 font-medium">Jumla ya Ahadi Ulizoweka</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <HandCoins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-cinzel text-white mt-2">
            TZS {summary?.totalPledged.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Jumla ya ahadi {pledges.length} zilizorekodiwa
          </div>
        </div>

        {/* Total Fulfilled */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-200/80 font-medium">Jumla Uliyotoa (Michango)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-cinzel text-emerald-400 mt-2">
            TZS {summary?.totalFulfilled.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Asilimia ya utimilifu: {summary && summary.totalPledged > 0 ? Math.round((summary.totalFulfilled / summary.totalPledged) * 100) : 0}%
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium">Salio Lililobaki (Baki)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-cinzel text-amber-400 mt-2">
            TZS {summary?.outstandingBalance.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Ahadi zinazosubiri kukamilishwa
          </div>
        </div>

        {/* Status Count */}
        <div className="glass-panel rounded-2xl p-5 border border-purple-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-200/80 font-medium">Hali ya Ahadi Zako</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-bold font-cinzel text-white">
              {summary?.activePledgesCount || 0}
            </span>
            <span className="text-xs text-slate-400">Zinaendelea</span>
            <span className="text-slate-500">|</span>
            <span className="text-base font-bold text-emerald-400">
              {summary?.fulfilledPledgesCount || 0}
            </span>
            <span className="text-xs text-slate-400">Zimekamilika</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Jumla ya miamala: {summary?.contributionsCount || 0}
          </div>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#120420] border border-amber-500/20">
          <button
            onClick={() => setActiveTab('pledges')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pledges'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Ahadi Zangu ({pledges.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Historia ya Michango ({contributions.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Jumbe & Taarifa</span>
            {unreadNotificationsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'notifications' ? 'bg-black text-amber-400' : 'bg-amber-400 text-black'
              }`}>
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'reminders'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Vikumbusho vya Tarehe ({reminders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-amber-500 text-black shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>Miradi & Habari ({newsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'testimonials'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Shuhuda za Washirika</span>
          </button>
        </div>

        {activeTab === 'pledges' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tafuta namba au kusudi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
            <select
              value={pledgeFilter}
              onChange={(e) => setPledgeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="all">Hali Zote</option>
              <option value="pending">Inasubiri</option>
              <option value="partial">Kiasi Kimetolewa</option>
              <option value="fulfilled">Imekamilika</option>
              <option value="overdue">Imepitiliza Ukomo</option>
            </select>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120420] border border-amber-500/20 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" />
              Chuja:
            </span>
            {(['wiki', 'mwezi', 'mwaka', 'yote'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  timeframe === tf
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB CONTENT: 1. Pledges */}
      {activeTab === 'pledges' && (
        <div className="space-y-4">
          {filteredPledges.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center border border-amber-500/20">
              <HandCoins className="w-12 h-12 text-amber-400/50 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">Hakuna ahadi zilizopatikana</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Bofya kitufe cha chini kuweka ahadi yako ya kwanza ya sadaka ya dhabihu kwa ajili ya injili.
              </p>
              <button
                onClick={() => onOpenNewPledge()}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow"
              >
                + Weka Ahadi Sasa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPledges.map((pledge) => {
                const remaining = Math.max(0, pledge.amount - pledge.fulfilledAmount);
                const percent = Math.min(100, Math.round((pledge.fulfilledAmount / pledge.amount) * 100));

                let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                let badgeText = 'Inasubiri';

                if (pledge.status === 'fulfilled') {
                  badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  badgeText = 'Imekamilika';
                } else if (pledge.status === 'partial') {
                  badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  badgeText = `Imetolewa (${percent}%)`;
                } else if (pledge.status === 'overdue') {
                  badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                  badgeText = 'Imepitiliza Ukomo';
                }

                return (
                  <div
                    key={pledge.id}
                    className="glass-card-interactive rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Pledge Number & Status badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                          {pledge.pledgeNumber}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug">
                        {pledge.purpose}
                      </h4>

                      {pledge.notes && (
                        <p className="text-xs text-slate-300 italic mb-3 line-clamp-2">
                          "{pledge.notes}"
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="my-3">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Maendeleo ya Utoaji</span>
                          <span className="text-amber-300 font-bold">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Amounts grid */}
                      <div className="grid grid-cols-3 gap-2 py-2 bg-[#120420]/60 rounded-xl border border-white/5 text-center text-xs mb-3">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Ahadi</span>
                          <span className="font-bold text-white">
                            TZS {pledge.amount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Umetoa</span>
                          <span className="font-bold text-emerald-400">
                            TZS {pledge.fulfilledAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-300/80 block">Baki</span>
                          <span className="font-bold text-amber-400">
                            TZS {remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Iliwekwa: <b className="text-slate-300">{pledge.pledgeDate}</b></span>
                        <span className={pledge.status === 'overdue' ? 'text-red-400 font-bold' : ''}>
                          Ukomo: <b className="text-slate-200">{pledge.dueDate}</b>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      {remaining > 0 ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => onOpenFulfillPledge(pledge)}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Toa Mchango / Sadaka Sasa</span>
                          </button>

                          {pledge.fulfilledAmount === 0 && (
                            <button
                              onClick={() => handleDeletePledge(pledge.id, pledge.pledgeNumber)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-red-950/60 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-300 transition-all"
                              title="Futa ahadi hii ikiwa iliingizwa kimakosa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full py-2 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ahadi Hii Imekamilika Kikamilifu</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. Giving History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-amber-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-cinzel text-white">
                  Kumbukumbu za Michango Yako Iliyotolewa
                </h3>
                <p className="text-xs text-amber-200/80">
                  Taarifa zote za risiti za sadaka na michango unayotoa
                </p>
              </div>

              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pakua Excel</span>
              </button>
            </div>

            {contributions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Hakuna rekodi za michango kwa kipindi hiki ulichochagua.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-300/90 font-cinzel">
                      <th className="py-2.5 px-3">Risiti Na.</th>
                      <th className="py-2.5 px-3">Ahadi Na.</th>
                      <th className="py-2.5 px-3">Kiasi (TZS)</th>
                      <th className="py-2.5 px-3">Tarehe ya Malipo</th>
                      <th className="py-2.5 px-3">Njia ya Malipo</th>
                      <th className="py-2.5 px-3">Muamala / Ref</th>
                      <th className="py-2.5 px-3">Maelezo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {contributions.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {c.receiptNumber}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {c.pledgeNumber}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400 text-sm">
                          TZS {c.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {c.paymentDate}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-200">
                            {c.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {c.reference || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                          {c.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. In-App Notifications & Messages from Admin */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-amber-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Jumbe na Taarifa za Uongozi wa Jerusalem Ministry ({notifications.length})</span>
                </h3>
                <p className="text-xs text-amber-200/80">
                  Vikumbusho na taarifa zote zilizotumwa kwako na Mchungaji Kiongozi au Msimamizi Mkuu kwa ajili ya ahadi zako.
                </p>
              </div>

              {unreadNotificationsCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Weka Zote Zimesomwa</span>
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-1" />
                <div className="font-semibold text-slate-300">Hakuna ujumbe au taarifa yoyote kwa sasa.</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Vikumbusho vyote na taarifa rasmi zinazotumwa kwa njia ya mfumo, simu, au barua pepe zitaonekana hapa pia.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const pledgeId = n.metadata?.pledgeId || n.pledgeId;
                  const pledgeNum = n.metadata?.pledgeNumber || n.pledgeNumber;
                  const sender = n.metadata?.senderName || n.senderName;
                  const remaining = n.metadata?.remainingAmount ?? n.remainingAmount;
                  const dueDate = n.metadata?.dueDate || n.dueDate;
                  const targetPledge = pledges.find((p) => p.id === pledgeId);

                  return (
                    <div
                      key={n.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        !n.isRead
                          ? 'bg-amber-950/40 border-amber-500/40 shadow-lg'
                          : 'bg-[#120420]/70 border-white/10'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            !n.isRead ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-400'
                          }`}>
                            {!n.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{n.title}</span>
                              {!n.isRead && (
                                <span className="px-2 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-extrabold uppercase">
                                  MPYA
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              Kutoka: <strong>{sender || 'Uongozi wa Jerusalem Ministry'}</strong> • {new Date(n.createdAt).toLocaleDateString('sw-TZ', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
                              title="Weka alama ya kusomwa"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Nimesoma</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-950/60 text-slate-400 hover:text-red-300"
                            title="Futa ujumbe huu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 leading-relaxed my-2.5 font-normal">
                        "{n.message}"
                      </div>

                      {/* Associated Pledge Details & Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
                        <div className="flex flex-wrap items-center gap-3 text-slate-300">
                          {pledgeNum && (
                            <span>
                              Ahadi Na: <strong className="font-mono text-amber-400">{pledgeNum}</strong>
                            </span>
                          )}
                          {remaining !== undefined && (
                            <span>
                              Salio: <strong className="text-amber-300">TZS {remaining.toLocaleString()}</strong>
                            </span>
                          )}
                          {dueDate && (
                            <span>
                              Ukomo: <strong className="text-slate-200">{dueDate}</strong>
                            </span>
                          )}
                        </div>

                        {targetPledge && targetPledge.amount > targetPledge.fulfilledAmount && (
                          <button
                            onClick={() => onOpenFulfillPledge(targetPledge)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 self-start sm:self-auto"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Lipa Ahadi Hii Sasa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. Automatic Due-Date Reminders */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-6 border border-amber-500/20">
            <h3 className="text-base font-bold font-cinzel text-white mb-1">
              Vikumbusho vya Ukomo wa Ahadi (Due-Date Reminders)
            </h3>
            <p className="text-xs text-amber-200/80 mb-5">
              Mfumo unakutahadharisha kiotomatiki ahadi zako zinapokaribia kufikia tarehe ya mwisho uliyopanga.
            </p>

            {reminders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
                <span>Hongera sana! Huna ahadi yoyote iliyopitiliza au inayokaribia ukomo kwa sasa.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => {
                  const targetPledge = pledges.find((p) => p.id === r.pledgeId);

                  return (
                    <div
                      key={r.pledgeId}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        r.type === 'overdue'
                          ? 'bg-red-950/40 border-red-500/40'
                          : r.type === 'today'
                          ? 'bg-amber-950/50 border-amber-500/50'
                          : 'bg-purple-950/40 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            r.type === 'overdue'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-300">
                              {r.pledgeNumber}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                r.type === 'overdue'
                                  ? 'bg-red-500 text-white'
                                  : r.type === 'today'
                                  ? 'bg-amber-500 text-black'
                                  : 'bg-purple-800 text-purple-200'
                              }`}
                            >
                              {r.type === 'overdue'
                                ? 'Imepitiliza Ukomo'
                                : r.type === 'today'
                                ? 'Ukomo ni Leo'
                                : 'Inakaribia Ukomo'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-white mt-0.5">
                            {r.purpose}
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {r.message} • Salio: <b className="text-amber-400">TZS {r.remainingAmount.toLocaleString()}</b>
                          </p>
                        </div>
                      </div>

                      {targetPledge && (
                        <button
                          onClick={() => onOpenFulfillPledge(targetPledge)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all shadow flex-shrink-0 flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Lipa Sasa</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ONGOING MINISTRY PROJECTS & NEWS TAB */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section Banner */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-amber-500/25 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Maendeleo & Matukio ya Moja kwa Moja</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                  Miradi ya Huduma na Michakato Inayoendelea
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Tazama hatua kwa hatua namna huduma ya Jerusalem Ministry inavyoendeleza ujenzi, ununuzi wa vyombo, na mikutano ya injili. Unaweza kuweka ahadi ya dhabihu moja kwa moja kwa mradi wowote unaougusa moyo wako.
                </p>
              </div>

              <button
                onClick={() => onOpenNewPledge()}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center gap-2 flex-shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Weka Ahadi ya Jumla</span>
              </button>
            </div>
          </div>

          {/* News & Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsList.map((item) => {
              const pct =
                item.targetAmount && item.targetAmount > 0
                  ? Math.min(100, Math.round(((item.currentAmount || 0) / item.targetAmount) * 100))
                  : null;

              return (
                <div
                  key={item.id}
                  className="glass-panel rounded-3xl p-5 border border-amber-500/20 hover:border-amber-500/45 transition-all flex flex-col justify-between group relative overflow-hidden shadow-lg shadow-black/40"
                >
                  <div>
                    {/* Category & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-amber-400" />
                        {item.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ongoing'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'upcoming'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {item.status === 'ongoing'
                          ? 'Inaendelea'
                          : item.status === 'upcoming'
                          ? 'Mpya'
                          : 'Imekamilika'}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold font-cinzel text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-2">
                      {item.title}
                    </h4>

                    {/* Content preview */}
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4">
                      {item.summary || item.content}
                    </p>

                    {/* Financial Progress if project has budget */}
                    {item.targetAmount && item.targetAmount > 0 && (
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 mb-4 space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Lengo la Fedha:</span>
                          <span className="font-bold text-amber-300 font-mono">
                            TZS {item.targetAmount.toLocaleString()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>
                            Iliyopatikana:{' '}
                            <strong className="text-emerald-400">
                              TZS {(item.currentAmount || 0).toLocaleString()}
                            </strong>
                          </span>
                          <span className="font-bold text-amber-300">{pct}%</span>
                        </div>
                      </div>
                    )}

                    {/* Metadata: Location and Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5 mb-4">
                      {item.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px]">
                        {new Date(item.publishDate || item.date || item.createdAt).toLocaleDateString('sw-TZ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedNewsForModal(item);
                        setIsNewsModalOpen(true);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Soma Zaidi</span>
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                    </button>

                    <button
                      onClick={() => onOpenNewPledge(item.title)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <HandHeart className="w-3.5 h-3.5" />
                      <span>Weka Ahadi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Testimonials Tab View */}
      {activeTab === 'testimonials' && (
        <div className="space-y-6 animate-fadeIn">
          <TestimonialsSection onJoinClick={() => setActiveTab('pledges')} />
        </div>
      )}

      {/* Detailed News Modal */}
      <MinistryNewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        news={newsList}
        selectedItem={selectedNewsForModal}
        onSelectPledgeForProject={(projectTitle: string) => onOpenNewPledge(projectTitle)}
      />
    </div>
  );
};
