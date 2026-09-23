import React, { useState, useEffect } from 'react';
import { UserProfile, Pledge, Contribution, Expense, MinistryNewsItem, PublicMinistryStats } from './types.ts';
import { Header } from './components/Header.tsx';
import { LogoEmblem } from './components/LogoEmblem.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { PartnerDashboard } from './components/PartnerDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { NewPledgeModal } from './components/NewPledgeModal.tsx';
import { FulfillPledgeModal } from './components/FulfillPledgeModal.tsx';
import { NewExpenseModal } from './components/NewExpenseModal.tsx';
import { MinistryNewsTicker } from './components/MinistryNewsTicker.tsx';
import { MinistryNewsLandingSection } from './components/MinistryNewsLandingSection.tsx';
import { MinistryNewsModal } from './components/MinistryNewsModal.tsx';
import { TestimonialsSection } from './components/TestimonialsSection.tsx';
import { safeFetchJson } from './lib/api.ts';
import {
  Sparkles,
  BookOpen,
  HandCoins,
  ShieldCheck,
  Award,
  Users,
  ArrowRight,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  CalendarCheck,
  Smartphone,
  Layers,
  Wallet,
  Coins,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

import { supabase } from './lib/supabase.ts';

export default function App() {
  // Theme state ('dark' | 'light') - in-memory UI state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth state - initialized with stored session fallback
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('jmg_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem('jmg_session_token') || '';
    } catch {
      return '';
    }
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Real-time synchronization state
  const [isSynced, setIsSynced] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toISOString());

  // News state
  const [newsList, setNewsList] = useState<MinistryNewsItem[]>([]);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [selectedNewsForModal, setSelectedNewsForModal] = useState<MinistryNewsItem | null>(null);
  const [initialPledgePurpose, setInitialPledgePurpose] = useState<string>('');

  // Public Ministry Stats
  const [publicStats, setPublicStats] = useState<PublicMinistryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Modal triggers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin'>('login');

  const [newPledgeOpen, setNewPledgeOpen] = useState(false);
  const [fulfillPledgeOpen, setFulfillPledgeOpen] = useState(false);
  const [selectedPledgeToFulfill, setSelectedPledgeToFulfill] = useState<Pledge | null>(null);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);

  // Restore session on startup (from localStorage or Supabase session)
  useEffect(() => {
    const storedToken = localStorage.getItem('jmg_session_token');
    if (storedToken) {
      safeFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((result) => {
          if (result.ok && result.data?.user) {
            setUser(result.data.user);
            setToken(storedToken);
            try {
              localStorage.setItem('jmg_session_user', JSON.stringify(result.data.user));
            } catch (e) {
              // ignore
            }
          } else if (result.status === 401) {
            setUser(null);
            setToken('');
            localStorage.removeItem('jmg_session_user');
            localStorage.removeItem('jmg_session_token');
          }
        })
        .catch((err) => console.error('Error verifying stored session:', err))
        .finally(() => setIsInitializing(false));
      return;
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          setToken(session.access_token);
          safeFetchJson('/api/auth/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
            .then((result) => {
              if (result.ok && result.data?.user) {
                setUser(result.data.user);
                try {
                  localStorage.setItem('jmg_session_user', JSON.stringify(result.data.user));
                  localStorage.setItem('jmg_session_token', session.access_token);
                } catch (e) {
                  // ignore
                }
              }
            })
            .catch((err) => console.error('Error verifying Supabase session:', err))
            .finally(() => setIsInitializing(false));
        } else {
          setIsInitializing(false);
        }
      }).catch(() => {
        setIsInitializing(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          setToken(session.access_token);
        } else if (!storedToken) {
          setUser(null);
          setToken('');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsInitializing(false);
    }
  }, []);

  // SSE Real-time stream connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/sync/stream');

      eventSource.onopen = () => {
        setIsSynced(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'connected') {
            setLastSyncTime(new Date().toISOString());
          }
        } catch (err) {
          // ignore
        }
      };

      eventSource.onerror = () => {
        setIsSynced(false);
      };
    } catch (err) {
      setIsSynced(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Fetch Public News & Ministry Stats
  useEffect(() => {
    safeFetchJson('/api/news')
      .then((res) => {
        if (res.ok && res.data?.news && Array.isArray(res.data.news)) {
          setNewsList(res.data.news);
        }
      })
      .catch((err) => console.error('Error fetching public news:', err));

    setStatsLoading(true);
    safeFetchJson('/api/public/stats')
      .then((res) => {
        if (res.ok && res.data && typeof res.data.ministryNetBalance === 'number') {
          setPublicStats(res.data);
        }
      })
      .catch((err) => console.error('Error fetching public ministry stats:', err))
      .finally(() => setStatsLoading(false));
  }, [lastSyncTime]);

  const handleLoginSuccess = (newUser: UserProfile, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    try {
      localStorage.setItem('jmg_session_user', JSON.stringify(newUser));
      localStorage.setItem('jmg_session_token', newToken);
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
    if (initialPledgePurpose && newUser.role !== 'admin') {
      setTimeout(() => setNewPledgeOpen(true), 350);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    setUser(null);
    setToken('');
    try {
      localStorage.removeItem('jmg_session_user');
      localStorage.removeItem('jmg_session_token');
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register' | 'admin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenFulfill = (pledge: Pledge) => {
    setSelectedPledgeToFulfill(pledge);
    setFulfillPledgeOpen(true);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0117] text-amber-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <span className="font-cinzel text-sm tracking-wider">
            Inafungua Jerusalem Ministry...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 selection:bg-amber-500 selection:text-black ${
        theme === 'light'
          ? 'bg-[#fbf9f4] text-slate-800 light-theme'
          : 'bg-[#0d0117] text-slate-100'
      }`}
    >
      {/* Top Navigation */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        isSynced={isSynced}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {user ? (
          user.role === 'admin' ? (
            <AdminDashboard
              user={user}
              token={token}
              onOpenNewExpense={() => setNewExpenseOpen(true)}
              lastSyncTime={lastSyncTime}
            />
          ) : (
            <PartnerDashboard
              user={user}
              token={token}
              onOpenNewPledge={() => setNewPledgeOpen(true)}
              onOpenFulfillPledge={handleOpenFulfill}
              lastSyncTime={lastSyncTime}
            />
          )
        ) : (
          /* Landing Gateway for visitors / partners without session */
          <div className="space-y-10 py-2 animate-fadeIn">
            {/* Live Ministry News & Ongoing Projects Moving Ticker */}
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

            {/* Hero Card */}
            <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-amber-500/30 text-center flex flex-col items-center">
              {/* Soft glow background */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center max-w-3xl">
                <LogoEmblem size="xl" showText={false} />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mt-6 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-cinzel tracking-wider">
                    JERUSALEM MINISTRY OF GOSPEL
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold font-cinzel text-white leading-tight">
                  Mpango wa Ushirika & <span className="gold-gradient-text">Sadaka ya Injili</span>
                </h1>

                {/* Holy Scripture Feature */}
                <div className="my-6 p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 max-w-2xl text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold font-cinzel mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span>ZABURI 50:5</span>
                  </div>
                  <p className="text-sm sm:text-base text-amber-100 italic font-serif leading-relaxed">
                    "Nikusanyieni wacha Mungu wangu, waliofanya agano nami kwa dhabihu."
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed mb-8">
                  Karibu kwenye mfumo rasmi wa washirika wa injili wa Jerusalem Ministry. Weka ahadi zako za sadaka, fuatilia michango yako kwa uwazi, pokea vikumbusho vya wakati wa ukomo, na ushiriki katika kueneza injili ya Kristo kote duniani.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    id="btn-hero-register"
                    onClick={() => handleOpenAuth('register')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-sm shadow-xl shadow-amber-950/50 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Jisajili Kuwa Mshirika wa Injili</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>

                  <button
                    id="btn-hero-login"
                    onClick={() => handleOpenAuth('login')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1b0630] hover:bg-[#250a42] border border-amber-500/40 text-amber-200 font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
                  >
                    <span>Ingia kwenye Akaunti Yako</span>
                  </button>
                </div>

                {/* Total Ministry Amount Present (Live Supabase Balance Showcase) */}
                <div
                  id="ministry-public-balance-card"
                  className="mt-8 w-full max-w-2xl rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-amber-950/70 via-[#1d0735]/90 to-amber-950/60 border border-amber-500/50 shadow-2xl relative overflow-hidden text-left"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Wallet className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-cinzel">
                            Kiasi Kilichopo Kwenye Mfuko wa Huduma
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Moja kwa Moja
                          </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-white mt-0.5 tracking-tight flex items-baseline gap-1.5">
                          <span className="gold-gradient-text">
                            {statsLoading
                              ? 'Inapakia...'
                              : (publicStats?.ministryNetBalance ?? 0).toLocaleString('sw-TZ')}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-amber-400/80">TZS</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-500/20 text-xs">
                      <span className="text-slate-300 text-[11px] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Washirika {publicStats?.totalPartnersCount ?? 0}</span>
                      </span>
                      <span className="text-amber-200/90 text-[11px] font-medium mt-0.5">
                        Jumla Michango: {(publicStats?.totalFulfilledAmount ?? 0).toLocaleString('sw-TZ')} TZS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* News and Ongoing Ministry Projects Dashboard Showcase */}
            <MinistryNewsLandingSection
              news={newsList}
              onSelectNews={(item) => {
                setSelectedNewsForModal(item);
                setIsNewsModalOpen(true);
              }}
              onPledgeForProject={(projectName) => {
                setInitialPledgePurpose(projectName);
                handleOpenAuth('register');
              }}
            />

            {/* Hatua Rahisi za Kuanza Ushirika */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/25">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[11px] uppercase tracking-widest text-amber-400 font-bold font-cinzel block mb-1">
                  Mchakato Rahisi wa Ushirika
                </span>
                <h3 className="text-lg sm:text-2xl font-bold font-cinzel text-white">
                  Jinsi ya Kuanza Safari Yako ya Ushirika
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Kila muumini na mshirika anaweza kujisajili kwa urahisi, kuanza kuingiza ahadi zake, na kufuatilia utimilifu kwa uwazi:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                <div className="glass-card rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm mb-3">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-cinzel">
                      Jisajili kama Mshirika
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Jaza jina lako kamili, namba ya simu, mahali ulipo na uchague daraja lako la ushirika (Dhahabu, Fedha, Shaba au Gospel).
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAuth('register')}
                    className="mt-4 w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all text-center"
                  >
                    Jisajili Sasa →
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-cinzel">
                      Weka Ahadi Yako
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Weka sadaka yako ya ahadi ya dhabihu (mfano Ujenzi wa Hekalu, Mikutano ya Injili, Yatima) na tarehe ya mwisho ya utekelezaji.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="mt-4 w-full py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all text-center"
                  >
                    Ingia Kuweka Ahadi →
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm mb-3">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-cinzel">
                      Changia & Pata Risiti
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Lipa kupitia M-Pesa, Airtel Money, Tigo Pesa, Halopesa au benki, pata risiti halisi na pakua historia yako kamili kwenye Excel.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="mt-4 w-full py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all text-center"
                  >
                    Angalia Michango →
                  </button>
                </div>
              </div>
            </div>

            {/* Testimonials & Supernatural Impact Section */}
            <TestimonialsSection onJoinClick={() => handleOpenAuth('register')} />

            {/* 3 Core System Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-3xl p-6 border border-amber-500/20">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <HandCoins className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold font-cinzel text-white mb-2">
                  Usimamizi Salama wa Ahadi
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kila ahadi unayoweka inapewa Namba Maalum ya Ufuatiliaji (mfano: JMG-2026-0001) na mfumo unakukumbusha kwa wakati kabla ya tarehe ya mwisho kufika.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-amber-500/20">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold font-cinzel text-white mb-2">
                  Uthibitisho wa Malipo & Excel
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Toa mchango kupitia M-Pesa, Airtel Money, Tigo Pesa, Halopesa au benki, pata risiti rasmi ya kielektroniki, na pakua historia yako kamili kwenye Excel.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-amber-500/20">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-300 mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold font-cinzel text-white mb-2">
                  Data Iliyounganishwa Moja kwa Moja
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mfumo wa kisasa unaooanisha taarifa kwa wakati halisi (Realtime Sync) kati ya washirika na uongozi mkuu kwa ajili ya uwazi na utaratibu wa kiungu.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full glass-panel border-t border-amber-500/20 py-8 px-4 sm:px-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoEmblem size="sm" showText={false} />
            <div className="text-left">
              <span className="font-bold text-white font-cinzel block text-sm">
                Jerusalem Ministry of Gospel
              </span>
              <span className="text-[11px] text-amber-200/70">
                Mpango Rasmi wa Ushirika & Sadaka ya Injili
              </span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <span className="text-amber-300 italic block font-serif text-xs">
              "Nikusanyieni wacha Mungu wangu waliofanya agano nami kwa dhabihu" — Zaburi 50:5
            </span>
            <div className="py-1.5 px-4 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block shadow-sm">
              <span className="text-xs text-amber-200 font-semibold tracking-wide">
                Developed by CEO Junior Jackson Massawe and Mchungaji Mkuu Brighton Lameck Peter
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              © 2026 Jerusalem Ministry of Gospel. Haki Zote Zimehifadhiwa.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenAuth('admin')}
              className="text-amber-400/80 hover:text-amber-300 underline text-[11px] flex items-center gap-1.5 transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ufikiaji wa Msimamizi Mkuu</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        initialMode={authMode}
      />

      <NewPledgeModal
        isOpen={newPledgeOpen}
        onClose={() => {
          setNewPledgeOpen(false);
          setInitialPledgePurpose('');
        }}
        onPledgeCreated={() => {
          setLastSyncTime(new Date().toISOString());
        }}
        token={token}
        initialPurpose={initialPledgePurpose}
      />

      <MinistryNewsModal
        isOpen={isNewsModalOpen}
        onClose={() => {
          setIsNewsModalOpen(false);
          setSelectedNewsForModal(null);
        }}
        news={newsList}
        selectedItem={selectedNewsForModal}
        onSelectPledgeForProject={(projectName) => {
          setInitialPledgePurpose(projectName);
          setIsNewsModalOpen(false);
          if (user) {
            setNewPledgeOpen(true);
          } else {
            handleOpenAuth('register');
          }
        }}
        isAdmin={user?.role === 'admin'}
      />

      <FulfillPledgeModal
        isOpen={fulfillPledgeOpen}
        onClose={() => {
          setFulfillPledgeOpen(false);
          setSelectedPledgeToFulfill(null);
        }}
        pledge={selectedPledgeToFulfill}
        onContributionRecorded={() => {
          setLastSyncTime(new Date().toISOString());
        }}
        token={token}
      />

      <NewExpenseModal
        isOpen={newExpenseOpen}
        onClose={() => setNewExpenseOpen(false)}
        onExpenseCreated={() => {
          setLastSyncTime(new Date().toISOString());
        }}
        token={token}
      />
    </div>
  );
}
