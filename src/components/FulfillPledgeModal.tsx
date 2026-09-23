import React, { useState } from 'react';
import { Pledge, Contribution } from '../types.ts';
import { safeFetchJson } from '../lib/api.ts';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Hash, FileCheck } from 'lucide-react';

interface FulfillPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pledge: Pledge | null;
  onContributionRecorded: (contribution: Contribution, updatedPledge: Pledge) => void;
  token: string;
}

const PAYMENT_METHODS = [
  'M-Pesa (Vodacom)',
  'Airtel Money',
  'Tigo Pesa',
  'Halopesa',
  'Benki ya CRDB',
  'Benki ya NMB',
  'Pesa Taslimu (Cash)',
  'Njia Nyingine ya Kielektroniki',
];

export const FulfillPledgeModal: React.FC<FulfillPledgeModalProps> = ({
  isOpen,
  onClose,
  pledge,
  onContributionRecorded,
  token,
}) => {
  if (!isOpen || !pledge) return null;

  const remaining = Math.max(0, pledge.amount - pledge.fulfilledAmount);
  const [amount, setAmount] = useState<number | ''>(remaining > 0 ? remaining : pledge.amount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (pledge && isOpen) {
      const rem = Math.max(0, pledge.amount - pledge.fulfilledAmount);
      setAmount(rem > 0 ? rem : pledge.amount);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(PAYMENT_METHODS[0]);
      setReference('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [pledge?.id, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Tafadhali weka kiasi halali cha mchango uliotolewa');
      return;
    }

    setLoading(true);
    try {
      const result = await safeFetchJson('/api/user/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pledgeId: pledge.id,
          amount: numAmount,
          paymentDate,
          paymentMethod,
          reference,
          notes,
        }),
      });

      if (!result.ok) {
        throw new Error(result.error || 'Hitilafu ya kurekodi mchango');
      }

      const data = result.data;
      onContributionRecorded(data.contribution, data.updatedPledge);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu ya mfumo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-lg"
        >
          ×
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-emerald-950 shadow-lg shadow-emerald-950/50">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-cinzel text-white">
              Rekodi Mchango Uliotolewa
            </h3>
            <p className="text-xs text-amber-200/80">
              Uthibitisho wa kutoa sehemu au yote ya ahadi yako ya sadaka
            </p>
          </div>
        </div>

        {/* Selected Pledge details pill */}
        <div className="p-4 rounded-2xl bg-[#140526] border border-amber-500/25 mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              {pledge.pledgeNumber}
            </span>
            <span className="text-xs text-slate-300">
              Tarehe ya Ukomo: <b className="text-white">{pledge.dueDate}</b>
            </span>
          </div>

          <div className="text-xs text-slate-200 font-semibold">{pledge.purpose}</div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block">Kiasi Kilichoahidiwa</span>
              <span className="text-xs font-bold text-slate-200">
                TZS {pledge.amount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Tayari Kimetolewa</span>
              <span className="text-xs font-bold text-emerald-400">
                TZS {pledge.fulfilledAmount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-300/80 block">Salio Lililobaki</span>
              <span className="text-xs font-bold text-amber-400">
                TZS {remaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount to contribute */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Kiasi Unachotoa Sasa (TZS)
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
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 font-bold text-base focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>
            {remaining > 0 && (
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAmount(remaining)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline"
                >
                  Lipa salio lote (TZS {remaining.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(Math.round(remaining / 2))}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                >
                  Lipa nusu (TZS {Math.round(remaining / 2).toLocaleString()})
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              Njia ya Malipo Uliyotumia
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Tarehe ya Malipo
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                Namba ya Muamala / Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="mf. MP884920 au CRDB991"
                className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Maelezo ya Ziada (Hiari)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="mf. Sadaka ya awamu ya kwanza kupitia namba ya ofisi"
              className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-amber-500/25 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all placeholder-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kamilisha na Toa Risiti ya Mchango</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
