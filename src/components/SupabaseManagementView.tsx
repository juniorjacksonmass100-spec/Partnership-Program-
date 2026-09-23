import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  Download,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  FileCode,
  Users,
  HandCoins,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { safeFetchJson } from '../lib/api.ts';

interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  url?: string;
  tables?: Record<string, boolean>;
}

interface SupabaseManagementViewProps {
  token: string;
  onRefreshAllData: () => void;
}

export const SupabaseManagementView: React.FC<SupabaseManagementViewProps> = ({
  token,
  onRefreshAllData,
}) => {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsChecking(true);
      const result = await safeFetchJson('/api/supabase/status');
      if (result.ok && result.data) {
        setStatus(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch Supabase status:', err);
    } finally {
      setIsChecking(false);
      setLoading(false);
    }
  };

  const fetchSchemaSql = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      if (res.ok) {
        const text = await res.text();
        setSchemaSql(text);
      }
    } catch (err) {
      console.error('Failed to fetch schema SQL:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSchemaSql();
  }, []);

  const handleCopySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDownloadSql = () => {
    if (!schemaSql) return;
    const element = document.createElement('a');
    const file = new Blob([schemaSql], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase-schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleMigrate = async () => {
    if (
      !window.confirm(
        'Je, una uhakika unataka kuhamisha data zote za washirika, ahadi, michango na matumizi kwenda kwenye hifadhidata ya Supabase Cloud?'
      )
    ) {
      return;
    }

    try {
      setIsMigrating(true);
      setMigrationResult(null);
      const result = await safeFetchJson('/api/admin/supabase/migrate-local-to-cloud', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.ok) {
        setMigrationResult(result.data?.results);
        await fetchStatus();
        onRefreshAllData();
      } else {
        alert(result.error || 'Uhamiaji umeshindikana');
      }
    } catch (err: any) {
      alert('Hitilafu ya uhamiaji: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Status Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>SUPABASE POSTGRESQL & AUTHENTICATION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
              Hifadhidata ya Kudumu ya <span className="text-emerald-400">Supabase Cloud</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Mfumo wa Jerusalem Ministry unaunganishwa na Supabase Cloud ili taarifa zote za washirika, ahadi, na michango zihifadhiwe kwenye wingu la kudumu kwa usalama wa hali ya juu na sera za Row Level Security (RLS).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={isChecking}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isChecking ? 'Inakagua...' : 'Kagua Muunganisho'}</span>
            </button>
            <button
              onClick={() => setShowSqlModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>Tazama SQL Schema</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Hali ya Muunganisho</span>
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              {status?.connected ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span>Imeunganishwa Kikamilifu</span>
                </div>
              ) : status?.configured ? (
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Funguo Zipo (Inasubiri Jedwali)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-300" />
                  <span>Inasubiri Funguo za Supabase</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {status?.message || 'Inapakia hali ya muunganisho...'}
            </p>
          </div>

          <div className="text-[11px] text-slate-400 pt-3 border-t border-white/10 flex items-center justify-between">
            <span>Seva ya Supabase:</span>
            <span className="font-mono text-amber-300 truncate max-w-[140px]">
              {status?.url ? status.url.replace('https://', '') : 'Haijawekwa bado'}
            </span>
          </div>
        </div>

        {/* RLS Security Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Ulinzi wa Data (RLS)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mt-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Row Level Security Inafanya Kazi</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Washirika wanaweza kuona na kurekodi ahadi na michango yao pekee. Msimamizi Mkuu pekee ndiye anayeweza kuona taarifa za washirika wote na matumizi ya huduma.
            </p>
          </div>

          <div className="text-[11px] text-emerald-300 pt-3 border-t border-white/10 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Hakuna mshirika anayeweza kusoma data za mwingine</span>
          </div>
        </div>

        {/* Multi-Device Realtime Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Usawazishaji wa Moja kwa Moja</span>
              <Cloud className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mt-3">
              <RefreshCw className="w-4 h-4" />
              <span>Realtime Multi-Device Sync</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Mshirika akiweka ahadi au kulipa mchango kutoka kwenye simu yake, mabadiliko yanaonekana papo hapo kwenye dashibodi ya Msimamizi bila kulazimika ku-refresh ukurasa.
            </p>
          </div>

          <div className="text-[11px] text-blue-300 pt-3 border-t border-white/10 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-blue-400" />
            <span>SSE & Supabase Realtime Channels</span>
          </div>
        </div>
      </div>

      {/* Cloud Migration & Local Data Sync Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>UHAMIAJI WA PAPO KWA PAPO (1-CLICK MIGRATION)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-cinzel text-white">
              Hamisha Data Zilizopo kwenda Supabase Cloud
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Ikiwa una data za awali kwenye mfumo (washirika, ahadi za dhabihu, michango na matumizi), unaweza kuzihamisha kwa kubofya kitufe kimoja tu bila kupoteza kumbukumbu yoyote.
            </p>
          </div>

          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Cloud className={`w-4 h-4 ${isMigrating ? 'animate-bounce' : ''}`} />
            <span>{isMigrating ? 'Inahamisha Data...' : 'Hamisha Data Sasa kwenda Supabase'}</span>
          </button>
        </div>

        {migrationResult && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 space-y-2">
            <div className="font-bold text-sm flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Matokeo ya Uhamiaji:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-slate-400 block">Washirika</span>
                <span className="text-base font-bold text-emerald-300">{migrationResult.usersMigrated}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-slate-400 block">Ahadi Zote</span>
                <span className="text-base font-bold text-emerald-300">{migrationResult.pledgesMigrated}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-slate-400 block">Michango</span>
                <span className="text-base font-bold text-emerald-300">{migrationResult.contributionsMigrated}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-slate-400 block">Matumizi</span>
                <span className="text-base font-bold text-emerald-300">{migrationResult.expensesMigrated}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Guide & Environment Variables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step-by-Step Instructions */}
        <div className="glass-panel rounded-3xl p-6 border border-amber-500/20 space-y-4">
          <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-amber-400" />
            Hatua 4 za Kuanzisha Supabase Bure (Dakika 2)
          </h3>

          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <span className="font-bold text-white block mb-0.5">Fungua Mradi Kwenye Supabase</span>
                <span>
                  Tembelea <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-bold">supabase.com</a>, bofya "New Project", kisha chagua eneo la karibu nawe.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <span className="font-bold text-white block mb-0.5">Tekeleza SQL Schema Script</span>
                <span>
                  Nenda kwenye <strong>SQL Editor</strong> ndani ya Supabase, nakili script ya SQL hapa chini na ubonyeze <strong>RUN</strong> ili kujenga majedwali na sheria zote za RLS.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <span className="font-bold text-white block mb-0.5">Nakili Funguo za API (API Keys)</span>
                <span>
                  Nenda kwenye <strong>Project Settings → API</strong> na unakili <strong>Project URL</strong>, <strong>anon key</strong>, na <strong>service_role secret key</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div>
                <span className="font-bold text-white block mb-0.5">Weka kwenye Mipangilio (Settings)</span>
                <span>
                  Weka funguo hizo kwenye mazingira ya mfumo (<code className="text-amber-300 font-mono">SUPABASE_URL</code>, <code className="text-amber-300 font-mono">SUPABASE_ANON_KEY</code>, na <code className="text-amber-300 font-mono">SUPABASE_SERVICE_ROLE_KEY</code>).
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Tables & Roles Structure */}
        <div className="glass-panel rounded-3xl p-6 border border-amber-500/20 space-y-4">
          <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Majedwali na Sera za Usalama (Database Tables & Roles)
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block font-mono">profiles</span>
                <span className="text-[11px] text-slate-400">Wasifu wa washirika & akaunti ya admin</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                RLS: Mshirika wasifu wake / Admin wote
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block font-mono">pledges</span>
                <span className="text-[11px] text-slate-400">Ahadi za dhabihu na tarehe za ukomo</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                RLS: Mtumiaji zake / Admin zote
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block font-mono">contributions</span>
                <span className="text-[11px] text-slate-400">Malipo halisi ya sadaka na risiti</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                RLS: Mtumiaji zake / Admin zote
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 bg-red-950/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block font-mono text-red-200">expenses</span>
                <span className="text-[11px] text-slate-400">Matumizi ya huduma (Siri ya Kanisa)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-bold">
                RLS: Msimamizi Mkuu Pekee (Siri)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block font-mono">ministry_news</span>
                <span className="text-[11px] text-slate-400">Miradi inayoendelea na habari</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                Public Read / Admin Write
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SQL Script Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold font-cinzel text-white">
                  Supabase Schema SQL Script (<code className="font-mono text-amber-300 text-sm">supabase-schema.sql</code>)
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white text-xl p-1"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nakili script hii na uibandike (paste) kwenye <strong>Supabase SQL Editor</strong> kisha bofya <strong>RUN</strong>. Script hii itajenga majedwali yote 6, viashiria (indexes), sera za RLS, na triggers za kisasisho cha ahadi moja kwa moja.
            </p>

            <div className="relative">
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Imenakiliwa!' : 'Nakili SQL'}</span>
                </button>
                <button
                  onClick={handleDownloadSql}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pakua .sql</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-black/80 border border-white/15 font-mono text-xs text-emerald-300 max-h-[420px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {schemaSql || '-- Inapakia SQL script...'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
