import React, { useState } from 'react';
import { LogoEmblem } from './LogoEmblem.tsx';
import { UserProfile } from '../types.ts';
import { safeFetchJson } from '../lib/api.ts';
import {
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Award,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, token: string) => void;
  initialMode?: 'login' | 'register' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Dar es Salaam');
  const [partnershipTier, setPartnershipTier] = useState('Mshirika wa Dhahabu');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await safeFetchJson('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            phone,
            password,
            location,
            partnershipTier,
          }),
        });

        if (!result.ok) {
          throw new Error(result.error || 'Hitilafu wakati wa kusajili');
        }

        const data = result.data;
        setSuccessMsg('Hongera! Usajili umekamilika. Unakaribishwa kwenye ushirika!');
        setTimeout(() => {
          onSuccess(data.user, data.token);
          onClose();
        }, 1200);
      } else {
        // Login for either user or admin (supports Email OR Phone Number)
        const result = await safeFetchJson('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email, email, password }),
        });

        if (!result.ok) {
          throw new Error(result.error || 'Hitilafu ya kuingia kwenye mfumo');
        }

        const data = result.data;
        if (mode === 'admin' && data.user.role !== 'admin') {
          throw new Error('Akaunti hii si ya Msimamizi Mkuu. Tafadhali tumia tab ya Washirika.');
        }

        setSuccessMsg(`Karibu sana, ${data.user.fullName}!`);
        setTimeout(() => {
          onSuccess(data.user, data.token);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu isiyotarajiwa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-lg transition-all"
        >
          ×
        </button>

        {/* Brand Center */}
        <div className="flex flex-col items-center text-center mb-6">
          <LogoEmblem size="lg" showText={false} />
          <h2 className="text-xl font-bold font-cinzel text-white mt-3 gold-gradient-text">
            Jerusalem Ministry of Gospel
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-sm">
            Mfumo wa Usimamizi wa Ahadi, Michango & Ushirika wa Injili (Partnership Program)
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#150424] p-1.5 rounded-2xl border border-amber-500/20 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setEmail('');
              setPassword('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Ingia (Washirika)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              setEmail('');
              setPassword('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Jisajili Mpya
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setErrorMsg(null);
              setEmail('');
              setPassword('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              mode === 'admin'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold shadow-md'
                : 'text-amber-300/80 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Msimamizi
          </button>
        </div>

        {/* Notice for Admin mode */}
        {mode === 'admin' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">
                Ufikiaji Salama wa Msimamizi Mkuu
              </span>
              Eneo hili limetengwa maalum kwa ajili ya Msimamizi Mkuu pekee. Weka barua pepe na nenosiri lako la usimamizi ili kuingia kwenye jopo kuu la uongozi.
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Jina Kamili la Mshirika
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="mf. Baraka Emmanuel Mushi"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Namba ya Simu (Mawasiliano & Malipo)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="mf. +255 713 000 111"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Mkoa / Mahali
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="mf. Dar es Salaam"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Daraja la Ushirika
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                    <select
                      value={partnershipTier}
                      onChange={(e) => setPartnershipTier(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-all"
                    >
                      <option value="Mshirika wa Dhahabu">Mshirika wa Dhahabu</option>
                      <option value="Mshirika wa Fedha">Mshirika wa Fedha</option>
                      <option value="Mshirika wa Shaba">Mshirika wa Shaba</option>
                      <option value="Mshirika wa Gospel">Mshirika wa Gospel</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {mode === 'register' ? 'Barua Pepe (Email)' : 'Barua Pepe au Namba ya Simu'}
            </label>
            <div className="relative">
              {mode === 'register' ? (
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
              ) : (
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
              )}
              <input
                type={mode === 'register' ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'register' ? 'mf. jina@mfano.com' : 'mf. 0787440393 au barua pepe'}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Nenosiri (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Weka nenosiri salama"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#120420] border border-amber-500/20 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
            ) : (
              <>
                <span>
                  {mode === 'register'
                    ? 'Kamilisha Usajili wa Ushirika'
                    : mode === 'admin'
                    ? 'Ingia kama Msimamizi Mkuu'
                    : 'Ingia kwenye Akaunti Yangu'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
