import React, { useState } from 'react';
import { Expense } from '../types.ts';
import { safeFetchJson } from '../lib/api.ts';
import { Receipt, Calendar, FolderTree, AlertCircle, ShieldAlert, Check } from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: (expense: Expense) => void;
  token: string;
}

const EXPENSE_CATEGORIES = [
  'Injili & Mikutano ya Nje (Crusades)',
  'Misaada & Ustawi wa Jamii (Yatima/Wajane)',
  'Vyombo vya Muziki & Teknolojia ya Matangazo',
  'Uendeshaji wa Ofisi & Huduma za Umeme/Maji/Internet',
  'Usafiri, Mafuta & Malazi ya Wahudumu',
  'Uchapishaji wa Vipeperushi & Vitabu vya Injili',
  'Matengenezo ya Majengo & Miundombinu',
  'Gharama Nyinginezo za Huduma',
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
  token,
}) => {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [supportingDetails, setSupportingDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Tafadhali weka kiasi halali cha matumizi');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Tafadhali andika maelezo ya kina ya matumizi haya');
      return;
    }

    setLoading(true);
    try {
      const result = await safeFetchJson('/api/admin/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          amount: numAmount,
          date,
          description,
          supportingDetails,
        }),
      });

      if (!result.ok) {
        throw new Error(result.error || 'Hitilafu wakati wa kurekodi matumizi');
      }

      const data = result.data;
      onExpenseCreated(data.expense);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu ya mfumo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-red-500/30 shadow-2xl my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-lg"
        >
          ×
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
                Siri ya Msimamizi Pekee
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-cinzel text-white mt-1">
              Rekodi Matumizi ya Huduma
            </h3>
            <p className="text-xs text-slate-300">
              Taarifa hizi za matumizi zinaonekana tu kwa akaunti ya Msimamizi Mkuu
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
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <FolderTree className="w-3.5 h-3.5 text-amber-400" />
              Kategoria ya Matumizi
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#120420] border border-red-500/25 text-slate-100 text-sm focus:outline-none focus:border-red-400 transition-all"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Kiasi Kilichotumika (TZS)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">
                TZS
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="250,000"
                className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-[#120420] border border-red-500/25 text-slate-100 font-bold text-base placeholder-slate-500 focus:outline-none focus:border-red-400 transition-all"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Tarehe ya Matumizi
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-red-500/25 text-slate-100 text-sm focus:outline-none focus:border-red-400 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Maelezo ya Matumizi (Description)
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="mf. Ununuzi wa mafuta ya jenereta na usafiri wa timu ya sifa kwenye mkutano wa Morogoro"
              className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-red-500/25 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-red-400 transition-all"
            />
          </div>

          {/* Supporting Details / Receipts */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Maelezo ya Kina ya Uthibitisho / Namba ya Risiti / Mnufaika
            </label>
            <input
              type="text"
              value={supportingDetails}
              onChange={(e) => setSupportingDetails(e.target.value)}
              placeholder="mf. Risiti ya Puma Energy #PE-8842 / Mkataba wa Ukumbi"
              className="w-full px-3 py-2 rounded-xl bg-[#120420] border border-red-500/25 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-red-400 transition-all"
            />
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200/90 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              Kitendo hiki kitarekodiwa kwenye Kumbukumbu za Matukio (Audit Log) ya mfumo.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Hifadhi Matumizi ya Huduma</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
