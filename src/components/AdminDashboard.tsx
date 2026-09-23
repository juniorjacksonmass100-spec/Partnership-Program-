import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  AdminFinancialSummary,
  Pledge,
  Contribution,
  Expense,
  AuditLog,
  MinistryNewsItem,
  TestimonialItem,
} from '../types.ts';
import { exportAdminReportToExcel } from '../utils/excelExport.ts';
import { safeFetchJson } from '../lib/api.ts';
import { MinistryNewsTicker } from './MinistryNewsTicker.tsx';
import { AdminNewsManager } from './AdminNewsManager.tsx';
import { AdminTestimonialManager } from './AdminTestimonialManager.tsx';
import { MinistryNewsModal } from './MinistryNewsModal.tsx';
import { SupabaseManagementView } from './SupabaseManagementView.tsx';
import {
  ShieldAlert,
  Users,
  HandCoins,
  CheckCircle2,
  Clock,
  Receipt,
  Wallet,
  BellRing,
  History,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Download,
  RotateCcw,
  Upload,
  Database,
  AlertTriangle,
  Phone,
  Mail,
  Copy,
  Check,
  Send,
  MessageCircle,
  Radio,
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  token: string;
  onOpenNewExpense: () => void;
  lastSyncTime: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  token,
  onOpenNewExpense,
  lastSyncTime,
}) => {
  const [overview, setOverview] = useState<AdminFinancialSummary | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newsList, setNewsList] = useState<MinistryNewsItem[]>([]);
  const [testimonialsList, setTestimonialsList] = useState<TestimonialItem[]>([]);
  const [selectedNewsForModal, setSelectedNewsForModal] = useState<MinistryNewsItem | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'partners' | 'pledges' | 'contributions' | 'expenses' | 'reminders' | 'audit' | 'news' | 'testimonials' | 'supabase'
  >('overview');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reminderPledgeId, setReminderPledgeId] = useState<string | null>(null);
  const [reminderPartnerId, setReminderPartnerId] = useState<string | null>(null);
  const [customReminderMsg, setCustomReminderMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [sentNotificationInfo, setSentNotificationInfo] = useState<{
    message: string;
    actionUrls: { whatsapp: string; sms: string; email: string };
    recipient: { name: string; phone: string; email: string };
  } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Backup and Reset states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [
        resOverview,
        resPartners,
        resPledges,
        resContributions,
        resExpenses,
        resAudit,
        resNews,
        resTestimonials,
      ] = await Promise.all([
        safeFetchJson('/api/admin/overview', { headers }),
        safeFetchJson('/api/admin/partners', { headers }),
        safeFetchJson('/api/admin/pledges', { headers }),
        safeFetchJson('/api/admin/contributions', { headers }),
        safeFetchJson('/api/admin/expenses', { headers }),
        safeFetchJson('/api/admin/audit-logs', { headers }),
        safeFetchJson('/api/admin/news', { headers }),
        safeFetchJson('/api/admin/testimonials', { headers }),
      ]);

      if (resOverview.ok && resOverview.data) setOverview(resOverview.data);
      if (resPartners.ok && resPartners.data) {
        setPartners(resPartners.data.partners || []);
      }
      if (resPledges.ok && resPledges.data) {
        setPledges(resPledges.data.pledges || []);
      }
      if (resContributions.ok && resContributions.data) {
        setContributions(resContributions.data.contributions || []);
      }
      if (resExpenses.ok && resExpenses.data) {
        setExpenses(resExpenses.data.expenses || []);
      }
      if (resAudit.ok && resAudit.data) {
        setAuditLogs(resAudit.data.auditLogs || []);
      }
      if (resNews.ok && resNews.data?.news) {
        setNewsList(resNews.data.news);
      }
      if (resTestimonials.ok && resTestimonials.data?.testimonials) {
        setTestimonialsList(resTestimonials.data.testimonials);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token, lastSyncTime]);

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Je, una uhakika unataka kufuta rekodi hii ya matumizi?')) {
      return;
    }

    try {
      const res = await safeFetchJson(`/api/admin/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        fetchAdminData();
        setFeedbackMsg('Matumizi yamefutwa kikamilifu');
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        alert(res.error || 'Imeshindwa kufuta matumizi');
      }
    } catch (e: any) {
      console.error('Failed to delete expense:', e);
      alert('Hitilafu: ' + e.message);
    }
  };

  const handleDeletePledgeAdmin = async (id: string, pledgeNum: string) => {
    if (!window.confirm(`Je, una uhakika unataka kufuta ahadi hii (${pledgeNum})? Hatua hii itafuta ahadi hii kabisa.`)) {
      return;
    }
    try {
      const result = await safeFetchJson(`/api/admin/pledges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.ok) {
        setPledges((prev) => prev.filter((p) => p.id !== id));
        fetchAdminData();
        setFeedbackMsg(result.data?.message || 'Ahadi imefutwa kikamilifu');
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert(result.error || 'Imeshindwa kufuta ahadi');
      }
    } catch (e: any) {
      console.error('Failed to delete pledge:', e);
      alert('Hitilafu: ' + e.message);
    }
  };

  const handleSendReminder = async (
    target: { pledgeId?: string | null; userId?: string | null },
    channel: string = 'all'
  ) => {
    try {
      setIsSendingReminder(true);
      const result = await safeFetchJson('/api/admin/reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pledgeId: target.pledgeId || undefined,
          userId: target.userId || undefined,
          customMessage: customReminderMsg,
          channel,
        }),
      });
      if (result.ok) {
        setSentNotificationInfo({
          message: result.data?.message,
          actionUrls: result.data?.actionUrls,
          recipient: result.data?.recipient,
        });
        setFeedbackMsg(result.data?.message || 'Kikumbusho na ujumbe vimetumwa kikamilifu!');
        setTimeout(() => setFeedbackMsg(null), 5000);
      } else {
        alert(result.error || 'Imeshindwa kutuma ujumbe');
      }
    } catch (e: any) {
      console.error('Failed to send reminder:', e);
      alert('Hitilafu ya mtandao: ' + e.message);
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleExportAdminExcel = () => {
    if (!overview) return;
    exportAdminReportToExcel(
      overview,
      partners,
      pledges,
      contributions,
      expenses,
      auditLogs
    );
  };

  const handleBackupDatabase = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Hitilafu wakati wa kupakua backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const todayDate = new Date().toISOString().slice(0, 10);
      a.download = `Jerusalem_Ministry_Database_Backup_${todayDate}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setFeedbackMsg('Nakala ya mfumo (Database Backup) imepakuliwa kikamilifu!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Backup error:', err);
      alert('Hitilafu ya kupakua backup: ' + (err.message || ''));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setLoading(true);
      const result = await safeFetchJson('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!result.ok) throw new Error(result.error || 'Imeshindwa kuweka upya mfumo');
      setIsResetModalOpen(false);
      setResetConfirmWord('');
      setFeedbackMsg(result.data?.message || 'Mfumo umewekwa upya kikamilifu! Taarifa zote zimefutwa.');
      await fetchAdminData();
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      console.error('Reset error:', err);
      alert('Hitilafu ya kuweka upya: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Filtered partners based on searchTerm
  const filteredPartners = partners.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term) ||
      p.location?.toLowerCase().includes(term) ||
      p.partnershipTier?.toLowerCase().includes(term)
    );
  });

  // Overdue / Approaching pledges for admin monitoring
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const urgentPledges = pledges.filter(
    (p) => p.fulfilledAmount < p.amount && p.dueDate && p.dueDate <= in7DaysStr
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Admin Isolation Hero Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>DASHIBODI YA MSIMAMIZI MKUU (CONFIDENTIAL)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-white">
              Mfumo Mkuu wa <span className="gold-gradient-text">Usimamizi wa Injili</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Ufuatiliaji wa wakati halisi wa washirika wote, mapato ya sadaka, ahadi, matumizi ya huduma na kumbukumbu za matukio (Audit Log).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-admin-export-excel"
              onClick={handleExportAdminExcel}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all flex items-center gap-2 shadow"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ripoti Kuu (Excel)</span>
            </button>

            <button
              id="btn-admin-backup-database"
              onClick={handleBackupDatabase}
              disabled={isBackingUp}
              className="px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center gap-2 shadow"
              title="Pakua nakala kamili ya data ya mfumo (JSON Database Backup)"
            >
              <Database className="w-4 h-4 text-purple-400" />
              <span>{isBackingUp ? 'Inatengeneza...' : 'Hifadhi Nakala (Backup)'}</span>
            </button>

            <button
              id="btn-admin-reset-system"
              onClick={() => {
                setResetConfirmWord('');
                setIsResetModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 text-xs font-bold transition-all flex items-center gap-2 shadow"
              title="Weka upya mfumo na futa taarifa zote za majaribio kwa ajili ya kuanza upya"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Weka Upya Mfumo (Reset)</span>
            </button>

            <button
              id="btn-admin-new-expense"
              onClick={onOpenNewExpense}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-950/50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Rekodi Matumizi Mapya</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

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

      {/* 6 Financial & Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Washirika */}
        <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-200/80 font-medium">Washirika</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-cinzel text-white mt-1.5">
            {overview?.totalPartnersCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Waliosajiliwa rasmi</span>
        </div>

        {/* 2. Jumla ya Ahadi */}
        <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-200/80 font-medium">Jumla ya Ahadi</span>
            <HandCoins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-cinzel text-white mt-1.5 truncate">
            TZS {(overview?.totalPledgedAmount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Ahadi {overview?.totalPledgesCount || 0} zote</span>
        </div>

        {/* 3. Michango Iliyokusanywa */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-300 font-medium">Iliyokusanywa</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-cinzel text-emerald-400 mt-1.5 truncate">
            TZS {(overview?.totalFulfilledAmount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Miamala {overview?.totalContributionsCount || 0}</span>
        </div>

        {/* 4. Ahadi Zilizobaki */}
        <div className="glass-panel rounded-2xl p-4 border border-amber-500/25">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-300 font-medium">Ahadi Baki</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-cinzel text-amber-300 mt-1.5 truncate">
            TZS {(overview?.totalOutstandingAmount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Zinasubiri ukomo</span>
        </div>

        {/* 5. Matumizi ya Huduma (Admin Only) */}
        <div className="glass-panel rounded-2xl p-4 border border-red-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-red-300 font-medium">Matumizi (Siri)</span>
            <Receipt className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold font-cinzel text-red-400 mt-1.5 truncate">
            TZS {(overview?.totalExpensesAmount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Rekodi {overview?.totalExpensesCount || 0} za matumizi</span>
        </div>

        {/* 6. Salio Halisi la Mfuko */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-400/40 bg-[#0d2218]/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-200 font-medium">Salio la Mfuko</span>
            <Wallet className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-xl font-bold font-cinzel text-emerald-300 mt-1.5 truncate">
            TZS {(overview?.ministryNetBalance || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-200/60 block mt-0.5">Mapato - Matumizi</span>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#120420] border border-amber-500/20 overflow-x-auto">
        {[
          { id: 'overview', label: 'Muhtasari wa Fedha' },
          { id: 'news', label: `Miradi & Habari (${newsList.length})` },
          { id: 'testimonials', label: `Shuhuda za Washirika (${testimonialsList.length})` },
          { id: 'partners', label: `Washirika (${partners.length})` },
          { id: 'pledges', label: `Ahadi Zote (${pledges.length})` },
          { id: 'contributions', label: `Michango Yote (${contributions.length})` },
          { id: 'expenses', label: `Matumizi ya Huduma (${expenses.length})` },
          { id: 'reminders', label: `Vikumbusho vya Ukomo (${urgentPledges.length})` },
          { id: 'audit', label: `Kumbukumbu za Matukio (${auditLogs.length})` },
          { id: 'supabase', label: 'Database ya Supabase Cloud' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Breakdown Card */}
          <div className="glass-panel rounded-3xl p-6 border border-amber-500/20 space-y-4">
            <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              Mizania ya Fedha ya Jerusalem Ministry
            </h3>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
                <span className="text-slate-300">Jumla ya Sadaka na Michango Iliyopokelewa:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  + TZS {(overview?.totalFulfilledAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
                <span className="text-slate-300">Jumla ya Matumizi Yote ya Huduma (Expenses):</span>
                <span className="font-bold text-red-400 text-sm">
                  - TZS {(overview?.totalExpensesAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                <span className="font-bold text-emerald-200">
                  Salio Halisi la Mfuko Lililobaki (Net Balance):
                </span>
                <span className="font-extrabold text-emerald-300 text-base font-cinzel">
                  TZS {(overview?.ministryNetBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Ahadi Zinazosubiri Kukusanywa:</span>
              <span className="font-bold text-amber-400">
                TZS {(overview?.totalOutstandingAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Recent Audit Stream Card */}
          <div className="glass-panel rounded-3xl p-6 border border-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Matukio ya Karibuni ya Mfumo
                </h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs text-amber-300 hover:underline"
                >
                  Tazama Yote
                </button>
              </div>

              <div className="space-y-2.5">
                {auditLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs flex items-start gap-2.5"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 truncate">
                          {log.actorName} ({log.action})
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('sw-TZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate mt-0.5">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Taarifa za wakati halisi (Synchronized Realtime)
              </span>
              <button
                onClick={handleExportAdminExcel}
                className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Pakua Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PARTNERS TAB */}
      {activeTab === 'partners' && (
        <div className="glass-panel rounded-3xl p-5 border border-amber-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-cinzel text-white">
                Orodha ya Washirika Wote Waliosajiliwa ({partners.length})
              </h3>
              <p className="text-xs text-slate-400">
                Washirika hawa wana akaunti zao binafsi na taarifa zao zinalindwa kwa usalama
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tafuta jina, simu, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                onClick={handleExportAdminExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pakua Orodha (Excel)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-300 font-cinzel">
                  <th className="py-2.5 px-3">Mshirika</th>
                  <th className="py-2.5 px-3">Simu & Barua Pepe</th>
                  <th className="py-2.5 px-3">Mahali / Eneo</th>
                  <th className="py-2.5 px-3">Daraja</th>
                  <th className="py-2.5 px-3">Ahadi Zote</th>
                  <th className="py-2.5 px-3">Iliyotolewa</th>
                  <th className="py-2.5 px-3">Salio Baki</th>
                  <th className="py-2.5 px-3">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-500" />
                        <span className="text-sm font-semibold">
                          {searchTerm.trim() ? 'Hakuna mshirika aliyepatikana kwa utafutaji huo' : 'Bado hakuna washirika waliosajiliwa kwenye mfumo'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {searchTerm.trim() ? 'Jaribu kubadilisha jina au namba ya simu unayotafuta.' : 'Washirika wakijisajili kwenye akaunti zao, wataonekana hapa moja kwa moja.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((p) => {
                    const totalPledged = Number(p.totalPledged || 0);
                    const totalFulfilled = Number(p.totalFulfilled || 0);
                    const balance = Number(p.balance || Math.max(0, totalPledged - totalFulfilled));
                    const pledgesCount = Number(p.pledgesCount || 0);
                    const contributionsCount = Number(p.contributionsCount || 0);

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{p.fullName}</div>
                          <span className="text-[10px] text-slate-400">
                            Amejiunga: {p.createdAt?.slice(0, 10) || 'Leo'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-200">{p.phone}</div>
                          <div className="text-[11px] text-slate-400">{p.email}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {p.location || 'Tanzania'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            {p.partnershipTier || 'Mshirika'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          TZS {totalPledged.toLocaleString()} ({pledgesCount})
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          TZS {totalFulfilled.toLocaleString()} ({contributionsCount})
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-400">
                          TZS {balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setReminderPartnerId(p.id);
                              setReminderPledgeId(null);
                              setSentNotificationInfo(null);
                              setCustomReminderMsg(
                                `Bwana asifiwe Ndugu Mshirika ${p.fullName}, Uongozi wa Jerusalem Ministry of Gospel unakusalimu na kukushukuru kwa moyo wako wa dhabihu. Tunakukumbusha kwa upendo kuhusu ahadi zako za sadaka zenye salio la TZS ${balance.toLocaleString()}. Mungu azidi kukufanikisha na kukubariki sana (Zaburi 50:5).`
                              );
                            }}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="Tuma ujumbe/kikumbusho kwa namba ya simu, email au kwenye akaunti"
                          >
                            <BellRing className="w-3 h-3" />
                            <span>Kumbusha</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PLEDGES TAB */}
      {activeTab === 'pledges' && (
        <div className="glass-panel rounded-3xl p-5 border border-amber-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-cinzel text-white">
                Ahadi Zote za Sadaka / Michango
              </h3>
              <p className="text-xs text-slate-400">
                Kila ahadi ina Namba Maalum (e.g. JMG-2026-0001) inayotambuliwa katika mfumo
              </p>
            </div>
            <button
              onClick={handleExportAdminExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pakua Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-300 font-cinzel">
                  <th className="py-2.5 px-3">Namba ya Ahadi</th>
                  <th className="py-2.5 px-3">Mshirika & Simu</th>
                  <th className="py-2.5 px-3">Kusudi / Lengo</th>
                  <th className="py-2.5 px-3">Kiasi cha Ahadi</th>
                  <th className="py-2.5 px-3">Iliyotolewa</th>
                  <th className="py-2.5 px-3">Salio Baki</th>
                  <th className="py-2.5 px-3">Tarehe ya Ukomo</th>
                  <th className="py-2.5 px-3">Hali</th>
                  <th className="py-2.5 px-3">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pledges.map((p) => {
                  const baki = Math.max(0, p.amount - p.fulfilledAmount);

                  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  let badgeText = 'Inasubiri';
                  if (p.status === 'fulfilled') {
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    badgeText = 'Imekamilika';
                  } else if (p.status === 'partial') {
                    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                    badgeText = 'Kiasi Kimetolewa';
                  } else if (p.status === 'overdue') {
                    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                    badgeText = 'Imepitiliza';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {p.pledgeNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{p.userName}</div>
                        <div className="text-[11px] text-slate-400">{p.userPhone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-200 max-w-xs truncate">
                        {p.purpose}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        TZS {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        TZS {p.fulfilledAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-400">
                        TZS {baki.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {p.dueDate}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {baki > 0 && (
                            <button
                              onClick={() => {
                                setReminderPledgeId(p.id);
                                setCustomReminderMsg(
                                  `Shalom Mshirika ${p.userName}, tunakukumbusha kwa upendo kuhusu ahadi ya dhabihu Na: ${p.pledgeNumber} ya TZS ${baki.toLocaleString()} kwa ajili ya "${p.purpose}". Ubarikiwe sana!`
                                );
                              }}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Tuma kikumbusho kwa mshirika"
                            >
                              <BellRing className="w-3 h-3" />
                              <span>Kumbusha</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePledgeAdmin(p.id, p.pledgeNumber)}
                            className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-100 transition-all text-[10px]"
                            title="Futa ahadi hii (kwa mfano nakala au duplicate)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CONTRIBUTIONS TAB */}
      {activeTab === 'contributions' && (
        <div className="glass-panel rounded-3xl p-5 border border-amber-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-cinzel text-white">
                Michango & Sadaka Zote Zilizokusanywa
              </h3>
              <p className="text-xs text-slate-400">
                Orodha ya malipo halisi yaliyofanywa na washirika na kuthibitishwa
              </p>
            </div>
            <button
              onClick={handleExportAdminExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pakua Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-300 font-cinzel">
                  <th className="py-2.5 px-3">Risiti Na.</th>
                  <th className="py-2.5 px-3">Ahadi Na.</th>
                  <th className="py-2.5 px-3">Mshirika</th>
                  <th className="py-2.5 px-3">Kiasi (TZS)</th>
                  <th className="py-2.5 px-3">Tarehe</th>
                  <th className="py-2.5 px-3">Njia ya Malipo</th>
                  <th className="py-2.5 px-3">Kumbukumbu / Ref</th>
                  <th className="py-2.5 px-3">Iliingizwa na</th>
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
                    <td className="py-3 px-3 font-semibold text-white">
                      {c.userName}
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
                    <td className="py-3 px-3 text-slate-400 capitalize">
                      {c.recordedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. EXPENSES TAB (CONFIDENTIAL TO ADMIN) */}
      {activeTab === 'expenses' && (
        <div className="glass-panel rounded-3xl p-5 border border-red-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
                  Eneo la Siri la Msimamizi Pekee
                </span>
              </div>
              <h3 className="text-base font-bold font-cinzel text-white mt-1">
                Matumizi ya Huduma (Ministry Expenses)
              </h3>
              <p className="text-xs text-slate-300">
                Taarifa hizi hazionekani kwa washirika wa kawaida. Zinasimamiwa na uongozi mkuu pekee.
              </p>
            </div>

            <button
              onClick={onOpenNewExpense}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Rekodi Matumizi Mapya</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-red-500/20 text-red-300 font-cinzel">
                  <th className="py-2.5 px-3">Kategoria</th>
                  <th className="py-2.5 px-3">Kiasi (TZS)</th>
                  <th className="py-2.5 px-3">Tarehe</th>
                  <th className="py-2.5 px-3">Maelezo ya Matumizi</th>
                  <th className="py-2.5 px-3">Risiti / Uthibitisho</th>
                  <th className="py-2.5 px-3">Muidhinishaji</th>
                  <th className="py-2.5 px-3">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30 text-red-200 font-bold text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-red-400 text-sm">
                      TZS {e.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {e.date}
                    </td>
                    <td className="py-3 px-3 text-slate-200 max-w-sm">
                      {e.description}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {e.supportingDetails || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {e.recordedBy}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 hover:text-white transition-all"
                        title="Futa rekodi hii ya matumizi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. REMINDERS & FOLLOW-UP TAB */}
      {activeTab === 'reminders' && (
        <div className="glass-panel rounded-3xl p-5 border border-amber-500/20 space-y-4">
          <div>
            <h3 className="text-base font-bold font-cinzel text-white">
              Ufuatiliaji wa Ahadi Zinazokaribia au Kupitiliza Ukomo ({urgentPledges.length})
            </h3>
            <p className="text-xs text-slate-400">
              Mfumo unakusaidia kumkumbusha mshirika kwa upendo kuhusu dhabihu aliyokusudia.
            </p>
          </div>

          <div className="space-y-3">
            {urgentPledges.map((p) => {
              const baki = Math.max(0, p.amount - p.fulfilledAmount);
              const isOverdue = p.dueDate < todayStr;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isOverdue ? 'bg-red-950/40 border-red-500/40' : 'bg-amber-950/40 border-amber-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {p.pledgeNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOverdue ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                        }`}
                      >
                        {isOverdue ? 'Imepitiliza Ukomo' : 'Inakaribia Ukomo'}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {p.userName} ({p.userPhone})
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 mt-1">
                      {p.purpose} • Tarehe ya Ukomo: <b className="text-amber-300">{p.dueDate}</b>
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Ahadi: TZS {p.amount.toLocaleString()} | Tayari: TZS {p.fulfilledAmount.toLocaleString()} |
                      Salio Lililobaki: <b className="text-amber-400">TZS {baki.toLocaleString()}</b>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setReminderPledgeId(p.id);
                      setCustomReminderMsg(
                        `Shalom Mshirika ${p.userName}, tunakukumbusha kwa upendo kuhusu ahadi ya dhabihu Na: ${p.pledgeNumber} ya TZS ${baki.toLocaleString()} kwa ajili ya "${p.purpose}". Ubarikiwe sana!`
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs shadow flex items-center gap-1.5 flex-shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Tuma Ujumbe wa Kikumbusho</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-3xl p-5 border border-amber-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-cinzel text-white">
                Kumbukumbu za Matukio (Audit / Activity Logs)
              </h3>
              <p className="text-xs text-slate-400">
                Orodha ya kila tendo lililofanyika katika mfumo kwa tarehe na saa halisi
              </p>
            </div>
            <button
              onClick={handleExportAdminExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pakua Kumbukumbu (Excel)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-300 font-cinzel">
                  <th className="py-2.5 px-3">Tarehe na Saa</th>
                  <th className="py-2.5 px-3">Mhusika</th>
                  <th className="py-2.5 px-3">Wadhifa</th>
                  <th className="py-2.5 px-3">Kitendo</th>
                  <th className="py-2.5 px-3">Maelezo ya Kina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('sw-TZ')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {l.actorName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.actorRole === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-purple-900/50 text-purple-200 border border-purple-500/20'
                        }`}
                      >
                        {l.actorRole === 'admin' ? 'Msimamizi' : 'Mshirika'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {l.action}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {l.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. NEWS & ONGOING PROJECTS MANAGEMENT TAB (ADMIN CONTROL) */}
      {activeTab === 'news' && (
        <AdminNewsManager
          news={newsList}
          token={token}
          onRefreshNews={fetchAdminData}
          onPreviewItem={(item) => {
            setSelectedNewsForModal(item);
            setIsNewsModalOpen(true);
          }}
        />
      )}

      {/* 9. TESTIMONIALS MANAGEMENT TAB (ADMIN CONTROL) */}
      {activeTab === 'testimonials' && (
        <AdminTestimonialManager
          testimonials={testimonialsList}
          token={token}
          onRefreshTestimonials={fetchAdminData}
        />
      )}

      {/* Reminder & Notification Sending Modal */}
      {(reminderPledgeId || reminderPartnerId) && (() => {
        const targetPledge = pledges.find((p) => p.id === reminderPledgeId);
        const targetPartner = partners.find((pt) => pt.id === (reminderPartnerId || targetPledge?.userId));
        const partnerPhone = targetPartner?.phone || targetPledge?.userPhone || '';
        const partnerEmail = targetPartner?.email || '';
        const partnerName = targetPartner?.fullName || targetPledge?.userName || 'Mshirika';
        const remainingAmount = targetPledge ? Math.max(0, targetPledge.amount - targetPledge.fulfilledAmount) : (targetPartner?.balance || 0);

        // Clean phone for WhatsApp and SMS
        const rawPhone = partnerPhone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        let cleanPhone = rawPhone;
        if (cleanPhone.startsWith('+')) {
          cleanPhone = cleanPhone.slice(1);
        } else if (cleanPhone.startsWith('0')) {
          cleanPhone = '255' + cleanPhone.slice(1);
        }

        const whatsappUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customReminderMsg)}`
          : '';
        const smsUrl = cleanPhone
          ? `sms:+${cleanPhone}?body=${encodeURIComponent(customReminderMsg)}`
          : '';
        const emailSubject = targetPledge?.pledgeNumber
          ? `Kikumbusho cha Ahadi ya Sadaka (${targetPledge.pledgeNumber}) - Jerusalem Ministry`
          : `Kikumbusho cha Ahadi ya Sadaka - Jerusalem Ministry`;
        const emailUrl = partnerEmail
          ? `mailto:${partnerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(customReminderMsg)}`
          : '';

        const handleCopyText = () => {
          navigator.clipboard.writeText(customReminderMsg);
          setCopiedMsg(true);
          setTimeout(() => setCopiedMsg(false), 2500);
        };

        const closeModal = () => {
          setReminderPledgeId(null);
          setReminderPartnerId(null);
          setCustomReminderMsg('');
          setSentNotificationInfo(null);
          setCopiedMsg(false);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-7 border border-amber-500/35 shadow-2xl my-6">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-lg"
              >
                ×
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-950 shadow-lg">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold font-cinzel text-white">
                    Tuma Kikumbusho cha Malipo ya Ahadi
                  </h4>
                  <p className="text-xs text-amber-200/80">
                    Ujumbe utatumwa kwenye akaunti ya mshirika papo hapo, na unayo njia ya kumtumia kwa WhatsApp, SMS, na Email.
                  </p>
                </div>
              </div>

              {/* Recipient Details Card */}
              <div className="p-4 rounded-2xl bg-[#120420] border border-amber-500/25 mb-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-slate-400">Mshirika Anayekumbushwa:</span>
                  <span className="font-bold text-white text-sm">{partnerName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Namba ya Simu: <strong className="text-white">{partnerPhone || 'Haijajazwa'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Email: <strong className="text-white truncate max-w-[140px]">{partnerEmail || 'Haijajazwa'}</strong></span>
                  </div>
                </div>

                {targetPledge && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Namba ya Ahadi:</span>
                      <span className="font-mono font-bold text-amber-300">{targetPledge.pledgeNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Salio Lililobaki:</span>
                      <span className="font-bold text-amber-400">TZS {remainingAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tarehe ya Ukomo:</span>
                      <span className="font-semibold text-slate-200">{targetPledge.dueDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Composer */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Yaliyomo Kwenye Ujumbe (Unaweza kuhariri au kuongeza maneno):
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
                  >
                    {copiedMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Imenakiliwa!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Nakili Ujumbe</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={customReminderMsg}
                  onChange={(e) => setCustomReminderMsg(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#120420] border border-amber-500/30 text-slate-100 text-xs focus:outline-none focus:border-amber-400 transition-all leading-relaxed"
                />
              </div>

              {/* Delivery Success Box if Already Dispatched */}
              {sentNotificationInfo && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Ujumbe Umehifadhiwa Kwenye Akaunti ya Mshirika Kikamilifu!</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                    Mshirika ataikuta taarifa hii mara tu atakapoingia kwenye mfumo wake (chini ya kichupo cha <strong>"Jumbe & Taarifa"</strong>).
                  </p>
                </div>
              )}

              {/* Multi-Channel Direct Delivery Options */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chagua Njia za Kutuma Ujumbe Huu:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: In-App Message */}
                  <button
                    type="button"
                    disabled={isSendingReminder}
                    onClick={() => handleSendReminder({ pledgeId: reminderPledgeId, userId: reminderPartnerId }, 'in_app')}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSendingReminder ? (
                      <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-black border-t-transparent" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{sentNotificationInfo ? 'Tuma Tena Kwenye Akaunti' : 'Tuma Kwenye Akaunti ya Mfumo'}</span>
                  </button>

                  {/* Option 2: WhatsApp by Phone Number */}
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Fungua WhatsApp ({partnerPhone})</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-3 rounded-xl bg-white/5 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed border border-white/5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp (Hana Namba)</span>
                    </button>
                  )}

                  {/* Option 3: Direct SMS by Phone Number */}
                  {smsUrl ? (
                    <a
                      href={smsUrl}
                      className="p-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Tuma SMS ya Kawaida ({partnerPhone})</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-3 rounded-xl bg-white/5 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed border border-white/5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>SMS (Hana Namba)</span>
                    </button>
                  )}

                  {/* Option 4: Direct Email */}
                  {emailUrl ? (
                    <a
                      href={emailUrl}
                      className="p-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Tuma Barua Pepe (Email)</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-3 rounded-xl bg-white/5 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed border border-white/5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email (Hana Anwani)</span>
                    </button>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all font-semibold"
                  >
                    Funga Dirisha
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. SUPABASE CLOUD DATABASE TAB */}
      {activeTab === 'supabase' && (
        <SupabaseManagementView
          token={token}
          onRefreshAllData={fetchAdminData}
        />
      )}

      {/* Reset System Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-red-500/40 shadow-2xl">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
            >
              ×
            </button>
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h3 className="text-xl font-bold font-cinzel text-white mb-2">
              Weka Upya Mfumo (System Reset)
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Hatua hii itafuta taarifa zote zilizopo za washirika, ahadi za dhabihu, risiti za michango, na rekodi za matumizi. Mfumo utakuwa mpya kabisa (<span className="text-amber-300 font-bold">Clean Slate</span>) tayari kwa washirika kujiandikisha na kuanza kuingiza data halisi.
            </p>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-amber-200/90 mb-5 space-y-1.5">
              <div className="font-bold text-amber-300">🛡️ Taarifa Salama:</div>
              <div>• Akaunti yako ya Msimamizi Mkuu itabaki salama bila kufutwa.</div>
              <div>• Tunapendekeza kupakua "Hifadhi Nakala (Backup)" kwanza kabla ya kuweka upya.</div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Ili kuthibitisha, andika neno <span className="text-red-400 font-mono font-bold">FUTA</span> hapa chini:
              </label>
              <input
                type="text"
                value={resetConfirmWord}
                onChange={(e) => setResetConfirmWord(e.target.value)}
                placeholder="Andika FUTA"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-red-500/40 text-white text-sm focus:outline-none focus:border-red-400 font-mono"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-all text-center"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={resetConfirmWord.trim().toUpperCase() !== 'FUTA' || loading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nathibitisha: Futa na Weka Upya Sasa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ministry News & Ongoing Projects Detail Modal */}
      <MinistryNewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        news={newsList}
        selectedItem={selectedNewsForModal}
        isAdmin={true}
        onNavigateToAdminNews={() => {
          setActiveTab('news');
        }}
      />
    </div>
  );
};
