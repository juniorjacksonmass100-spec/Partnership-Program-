import React, { useState, useRef } from 'react';
import { Pledge } from '../types.ts';
import { safeFetchJson } from '../lib/api.ts';
import { HandCoins, Calendar, Target, FileText, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface NewPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPledgeCreated: (pledge: Pledge) => void;
  token: string;
  initialPurpose?: string;
}

const COMMON_PURPOSES = [
  'Ujenzi wa Hekalu Kuu la Ibada & Kituo cha Injili',
  'Mkutano Mkubwa wa Injili Mikoani (Crusades)',
  'Kusaidia Yatima, Wajane na Wenye Uhitaji',
  'Vyombo vya Muziki & Vipeperushi vya Injili',
  'Matangazo ya Injili (TV, Radio & Mitandao)',
  'Mfuko wa Uinjilisti & Mafunzo ya Wahudumu',
  'Sadaka ya Shukrani & Dhabihu Maalum',
];

export const NewPledgeModal: React.FC<NewPledgeModalProps> = ({
  isOpen,
  onClose,
  onPledgeCreated,
  token,
  initialPurpose,
}) => {
  const [amount, setAmount] = useState<number | ''>(500000);
  const [purpose, setPurpose] = useState(COMMON_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [pledgeDate, setPledgeDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Default due date: 30 days from now
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdPledge, setCreatedPledge] = useState<Pledge | null>(null);
  const isSubmittingRef = useRef(false);

  // Sync initial purpose if specified (e.g. from news ticker or project showcase)
  React.useEffect(() => {
    if (initialPurpose && isOpen) {
      if (COMMON_PURPOSES.includes(initialPurpose)) {
        setPurpose(initialPurpose);
        setCustomPurpose('');
      } else {
        setPurpose('Nyingineyo (Andika Lengo Lako)');
        setCustomPurpose(initialPurpose);
      }
    }
  }, [initialPurpose, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setAmount(500000);
    setPurpose(COMMON_PURPOSES[0]);
    setCustomPurpose('');
    setPledgeDate(new Date().toISOString().slice(0, 10));
    setDueDate(defaultDue);
    setNotes('');
    setErrorMsg(null);
    setCreatedPledge(null);
    isSubmittingRef.current = false;
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Tafadhali weka kiasi halali cha ahadi ya sadaka');
      return;
    }

    const finalPurpose = purpose === 'Nyingineyo (Andika Lengo Lako)' ? customPurpose : purpose;
    if (!finalPurpose || !finalPurpose.trim()) {
      setErrorMsg('Tafadhali taja kusudi/lengo la ahadi yako');
      return;
    }

    if (!dueDate) {
      setErrorMsg('Tafadhali chagua tarehe ya mwisho ya ahadi (Due Date)');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const result = await safeFetchJson('/api/user/pledges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          purpose: finalPurpose,
          notes,
          pledgeDate,
          dueDate,
        }),
      });

      if (!result.ok) {
        throw new Error(result.error || 'Hitilafu ya kuweka ahadi');
      }

      const data = result.data;
      setCreatedPledge(data.pledge);
      onPledgeCreated(data.pledge);
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu ya mfumo');
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl my-6">
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-lg"
        >
          ×
        </button>

        {createdPledge ? (
          /* Confirmation and Celebration Screen */
          <div className="py-4 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>IMEHIFADHIWA KWENYE MFUMO</span>
              </div>
              <h3 className="text-2xl font-bold font-cinzel text-white">
                Ahadi Yako Imerekodiwa Kikamilifu!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
                Bwana akubariki sana kwa nia yako ya kuitunza injili ya Kristo kupitia Jerusalem Ministry.
              </p>
            </div>

            {/* Pledge Receipt Summary Box */}
            <div className="p-5 rounded-2xl bg-[#120420] border border-amber-500/30 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs text-slate-400">Namba Rasmi ya Ahadi:</span>
                <span className="font-mono font-extrabold text-amber-400 text-sm tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {createdPledge.pledgeNumber}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs text-slate-400">Kiasi cha Ahadi:</span>
                <span className="font-bold text-white text-base">
                  TZS {createdPledge.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs text-slate-400">Kusudi / Lengo:</span>
                <span className="text-xs font-medium text-amber-200 text-right max-w-[240px]">
                  {createdPledge.purpose}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Tarehe ya Ukomo:</span>
                <span className="text-xs font-semibold text-slate-200">
                  {createdPledge.dueDate}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 text-center">
              <span>
                Unaweza kutumia namba hii <strong>({createdPledge.pledgeNumber})</strong> wakati wowote unapotuma sadaka yako kwa njia ya benki au mitandao ya simu ili kuipata risiti yako papo hapo.
              </span>
            </div>

            <button
              onClick={handleModalClose}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Sawa, Endelea Kwenye Dashibodi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Main Pledge Entry Form */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-950 shadow-lg shadow-amber-950/50">
                <HandCoins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-cinzel text-white">
                  Weka Ahadi ya Sadaka / Mchango
                </h3>
                <p className="text-xs text-amber-200/80">
                  Mfumo utakupa Namba Maalum ya Ahadi (Pledge Number) kwa ajili ya kufuatilia
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Kiasi Unachoahidi (TZS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    TZS
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    disabled={loading}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="500,000"
                    className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 font-bold text-base placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[100000, 300000, 500000, 1000000, 2000000, 5000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={loading}
                      onClick={() => setAmount(preset)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all disabled:opacity-50"
                    >
                      TZS {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Lengo / Kusudi la Ahadi
                </label>
                <select
                  value={purpose}
                  disabled={loading}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all disabled:opacity-60"
                >
                  {COMMON_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Nyingineyo (Andika Lengo Lako)">Nyingineyo (Andika Lengo Lako)</option>
                </select>
              </div>

              {purpose === 'Nyingineyo (Andika Lengo Lako)' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Taja Lengo Lako Mahususi
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="mf. Ununuzi wa jenereta la injili"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all disabled:opacity-60"
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Tarehe ya Kuweka Ahadi
                  </label>
                  <input
                    type="date"
                    required
                    disabled={loading}
                    value={pledgeDate}
                    onChange={(e) => setPledgeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Tarehe ya Ukomo (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    disabled={loading}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-400/40 text-amber-100 text-sm focus:outline-none focus:border-amber-400 transition-all shadow-inner disabled:opacity-60"
                  />
                  <span className="text-[10px] text-amber-200/60 block mt-0.5">
                    Utapokea vikumbusho siku 7 kabla na siku ya ukomo
                  </span>
                </div>
              </div>

              {/* Notes / Prayer Request */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Maelezo ya Ziada au Ombi la Maombi (Hiari)
                </label>
                <textarea
                  rows={2}
                  disabled={loading}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="mf. Dhabihu ya shukrani kwa uponyaji wa familia / Ombi la kibali cha biashara"
                  className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all disabled:opacity-60"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  "Kila mtu na atoe kama alivyokusudia moyoni mwake, si kwa huzuni, wala si kwa lazima; maana Mungu humpenda yeye atoaye kwa moyo wa ukunjufu." - 2 Kor 9:7
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                    <span>Inasajili Ahadi Yako...</span>
                  </>
                ) : (
                  'Thibitisha na Weka Ahadi ya Sadaka'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
