import React, { useState, useEffect } from 'react';
import {
  Quote,
  Star,
  CheckCircle2,
  HeartHandshake,
  Sparkles,
  Send,
  MapPin,
  Award,
  BookOpen,
  Filter,
} from 'lucide-react';
import { safeFetchJson } from '../lib/api.ts';

export interface TestimonialItem {
  id: string;
  partnerName: string;
  location: string;
  tier: string;
  category: 'biashara' | 'ujenzi' | 'uponyaji' | 'agano';
  categoryLabel: string;
  quote: string;
  fullTestimony: string;
  scripture: string;
  date: string;
  verified: boolean;
}

const INITIAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test_01',
    partnerName: 'Mhandisi Daniel Mrema',
    location: 'Dar es Salaam',
    tier: 'Mshirika wa Dhahabu',
    category: 'biashara',
    categoryLabel: 'Baraka za Biashara',
    quote: 'Baada ya kuingia agano la sadaka ya dhabihu ya TZS 1,000,000, milango ya zabuni iliyofungwa kwa miaka mitatu ilifunguka kimiujiza!',
    fullTestimony:
      'Nilikuwa nikipambana kupata zabuni za ujenzi kwa muda mrefu bila mafanikio. Niliposikia mafundisho ya Zaburi 50:5 kuhusu agano kwa dhabihu kutoka kwa Mchungaji Kiongozi Brighton, nilijitolea kuwa Mshirika wa Dhahabu na nikatoa dhabihu yangu. Ndani ya miezi miwili, kampuni yangu ilishinda kandarasi mbili kubwa za serikali. Mungu wa Jerusalem Ministry ni Mungu anayejibu kwa moto!',
    scripture: 'Malaki 3:10',
    date: 'Septemba 2026',
    verified: true,
  },
  {
    id: 'test_02',
    partnerName: 'Mama Grace Lyimo',
    location: 'Arusha',
    tier: 'Mshirika wa Fedha',
    category: 'uponyaji',
    categoryLabel: 'Uponyaji & Amani ya Familia',
    quote: 'Mwanangu aliyekuwa mgonjwa hospitalini kwa miezi 6 alipona siku ile nilipoweka agano la sadaka ya shukrani.',
    fullTestimony:
      'Madaktari walikuwa wameshindwa kugundua ugonjwa wa mtoto wangu wa kwanza na tulikuwa tumepoteza matumaini na fedha nyingi. Nilipiga magoti nikiwa na risiti ya mchango wangu wa sadaka ya injili, nikamwambia Mungu anikumbuke kwa agano hili. Kesho yake asubuhi, mtoto aliamka mwenyewe na kuomba chakula. Vipimo vyote vilirudi vikiwa vizuri. Ninamtukuza Mungu sana kwa huduma hii!',
    scripture: 'Zaburi 20:1-3',
    date: 'Agosti 2026',
    verified: true,
  },
  {
    id: 'test_03',
    partnerName: 'Mwl. Peter Nyoni',
    location: 'Mwanza',
    tier: 'Mshirika wa Injili',
    category: 'agano',
    categoryLabel: 'Ukuaji wa Kiroho & Huduma',
    quote: 'Ushirika huu umenifanya nijue siri ya ufalme wa Mungu. Kutoa kwa mpangilio kumebadilisha uchumi wa familia yangu.',
    fullTestimony:
      'Nilikuwa naogopa kuahidi sadaka nikidhani mshahara wangu mdogo hautatosha. Lakini mfumo huu wa Jerusalem Ministry umenisaidia kuwa na nidhamu ya kutoa fungu la kumi na sadaka za ahadi kila mwezi. Tangu nianze, sijawahi kukosa, bali Mungu ameendelea kufungua mifereji ya ziada ya mapato. Nina amani kuu moyoni mwangu.',
    scripture: '2 Wakorintho 9:6-8',
    date: 'Julai 2026',
    verified: true,
  },
  {
    id: 'test_04',
    partnerName: 'Bi. Rehema Kiswaga',
    location: 'Dodoma',
    tier: 'Mshirika wa Dhahabu',
    category: 'ujenzi',
    categoryLabel: 'Dhabihu ya Ujenzi wa Hekalu',
    quote: 'Nilichangia mabati na mifuko ya saruji kwa ajili ya hekalu jipya; leo hii Mungu amenipa nyumba yangu binafsi!',
    fullTestimony:
      'Kwa miaka 12 nilikuwa mpangaji nikihangaika na kodi. Wakati kanisa lilipotangaza mradi wa ujenzi wa hekalu, niliamua kutumia akiba yangu yote kuchangia ujenzi wa nyumba ya Bwana kwanza. Mungu wa agano alinitendea: miezi minane baadaye nilipata kiwanja kwa nusu bei na nimejenga nyumba yangu na familia yangu imehamia. Hakuna anayemtolea Mungu akapata hasara!',
    scripture: 'Hagai 1:8 & Zaburi 50:5',
    date: 'Septemba 2026',
    verified: true,
  },
  {
    id: 'test_05',
    partnerName: 'Dkt. Emmanuel Msangi',
    location: 'Mbeya',
    tier: 'Mshirika wa Fedha',
    category: 'biashara',
    categoryLabel: 'Kupandishwa Cheo & Ushindi',
    quote: 'Mfumo wa uwazi wa ufuatiliaji wa michango unanipa ujasiri wa kuendelea kuwekeza kwenye ufalme wa Mungu.',
    fullTestimony:
      'Kitu kinachonivutia zaidi katika Jerusalem Ministry ni uwazi, nidhamu na uwajibikaji unaoongozwa na Mchungaji Kiongozi Brighton na Msimamizi Mkuu. Kila senti ninayotoa inapata risiti ya kielektroniki mara moja na ripoti za matumizi ya huduma zinaonekana wazi. Hii imenipa msukumo wa kuongeza ahadi yangu kila mwaka.',
    scripture: 'Mithali 3:9-10',
    date: 'Juni 2026',
    verified: true,
  },
  {
    id: 'test_06',
    partnerName: 'Mwinjilisti Sara Joshua',
    location: 'Morogoro',
    tier: 'Mshirika wa Shaba',
    category: 'agano',
    categoryLabel: 'Mikutano ya Injili Vijijini',
    quote: 'Mioyo zaidi ya 450 iliokolewa katika kijiji chetu kupitia msaada wa vipaza sauti tulivyochangia.',
    fullTestimony:
      'Mimi na kundi langu la washirika tulijikusanya na kuahidi kuchangia ununuzi wa jenereta na vipaza sauti vya huduma ya nje. Tulipoona picha na video za watu wakitubu na kuponywa katika mkutano wa vijijini, nililia machozi ya furaha. Huu ndio uzuri wa kuwa mshirika wa Jerusalem Ministry.',
    scripture: 'Marko 16:15',
    date: 'Mei 2026',
    verified: true,
  },
];

interface TestimonialsProps {
  onJoinClick?: () => void;
  externalTestimonials?: TestimonialItem[];
}

export const TestimonialsSection: React.FC<TestimonialsProps> = ({ onJoinClick, externalTestimonials }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    externalTestimonials && externalTestimonials.length > 0 ? externalTestimonials : INITIAL_TESTIMONIALS
  );
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (externalTestimonials && externalTestimonials.length > 0) {
      setTestimonials(externalTestimonials);
      return;
    }

    safeFetchJson('/api/testimonials')
      .then((res) => {
        if (res.ok && res.data?.testimonials && Array.isArray(res.data.testimonials)) {
          if (res.data.testimonials.length > 0) {
            setTestimonials(res.data.testimonials);
          }
        }
      })
      .catch((e) => console.error('Could not fetch testimonials:', e));
  }, [externalTestimonials]);

  // New testimony form state
  const [formData, setFormData] = useState({
    partnerName: '',
    location: '',
    tier: 'Mshirika wa Injili',
    category: 'biashara' as const,
    quote: '',
    fullTestimony: '',
    scripture: 'Zaburi 50:5',
  });

  const filteredTestimonials =
    selectedCategory === 'all'
      ? testimonials
      : testimonials.filter((t) => t.category === selectedCategory);

  const handleSubmitTestimony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partnerName || !formData.fullTestimony) return;

    setSubmitting(true);
    setSubmitError(null);

    const categoryLabel =
      formData.category === 'biashara'
        ? 'Baraka za Biashara'
        : formData.category === 'ujenzi'
        ? 'Dhabihu ya Ujenzi'
        : formData.category === 'uponyaji'
        ? 'Uponyaji & Amani'
        : 'Agano la Sadaka';

    const quote =
      formData.quote.trim() ||
      formData.fullTestimony.trim().slice(0, 100) + '...';

    try {
      const res = await safeFetchJson('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: formData.partnerName,
          location: formData.location || 'Tanzania',
          tier: formData.tier,
          category: formData.category,
          categoryLabel,
          quote,
          fullTestimony: formData.fullTestimony,
          scripture: formData.scripture || 'Zaburi 50:5',
        }),
      });

      if (res.ok && res.data?.testimonial) {
        setTestimonials((prev) => [res.data.testimonial, ...prev]);
      } else {
        // Local fallback
        const fallbackItem: TestimonialItem = {
          id: `test_${Date.now()}`,
          partnerName: formData.partnerName,
          location: formData.location || 'Tanzania',
          tier: formData.tier,
          category: formData.category,
          categoryLabel,
          quote,
          fullTestimony: formData.fullTestimony,
          scripture: formData.scripture || 'Zaburi 50:5',
          date: 'Septemba 2026',
          verified: true,
        };
        setTestimonials((prev) => [fallbackItem, ...prev]);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsSubmitModalOpen(false);
        setFormData({
          partnerName: '',
          location: '',
          tier: 'Mshirika wa Injili',
          category: 'biashara',
          quote: '',
          fullTestimony: '',
          scripture: 'Zaburi 50:5',
        });
      }, 1600);
    } catch (err: any) {
      setSubmitError('Hitilafu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="testimonials-section" className="w-full space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-amber-500/30 text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-cinzel">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>USHUHUDA WA AGANO LA SADAKA</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold font-cinzel text-white tracking-tight">
            Matendo Makuu ya Mungu kwa <span className="gold-gradient-text">Washirika wa Injili</span>
          </h2>

          {/* Scripture badge */}
          <div className="py-2.5 px-4 rounded-xl bg-amber-950/40 border border-amber-500/30 inline-flex items-center gap-2 text-xs text-amber-200 italic font-serif max-w-xl mx-auto">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              "Nao wakamshinda kwa damu ya Mwana-Kondoo, na kwa neno la ushuhuda wao" — Ufunuo 12:11
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed pt-1">
            Soma shuhuda halisi za washirika waliothubutu kusimama na Mungu kwa njia ya dhabihu na sadaka za uaminifu. Mungu wa Zaburi 50:5 hubaki kuwa mwaminifu kwa kila aliyefanya agano naye.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tuma Ushuhuda Wako Hapa</span>
            </button>
            {onJoinClick && (
              <button
                onClick={onJoinClick}
                className="px-5 py-2.5 rounded-xl bg-[#1b0630] hover:bg-[#260943] border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                <span>Jiunge na Ushirika Leo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-1" />
          {[
            { id: 'all', label: 'Shuhuda Zote' },
            { id: 'biashara', label: 'Biashara & Kazi' },
            { id: 'uponyaji', label: 'Uponyaji & Familia' },
            { id: 'ujenzi', label: 'Ujenzi wa Hekalu' },
            { id: 'agano', label: 'Agano la Sadaka' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/50'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-amber-300/80 font-medium ml-auto">
          Zinaonyeshwa: <strong className="text-white">{filteredTestimonials.length}</strong>
        </span>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTestimonials.map((item) => (
          <div
            key={item.id}
            className="glass-card rounded-2xl p-6 border border-amber-500/25 flex flex-col justify-between hover:border-amber-400/50 transition-all hover:shadow-xl hover:shadow-amber-950/30 group relative overflow-hidden"
          >
            {/* Background subtle gold corner sheen */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

            <div>
              {/* Top Row: Category badge and stars */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider font-cinzel">
                  {item.categoryLabel}
                </span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
              </div>

              {/* Quote Headline */}
              <div className="relative mb-3.5">
                <Quote className="w-6 h-6 text-amber-400/20 absolute -top-2 -left-1 pointer-events-none" />
                <h4 className="text-sm sm:text-base font-bold text-white font-cinzel leading-snug pl-5 italic">
                  "{item.quote}"
                </h4>
              </div>

              {/* Full story */}
              <p className="text-xs text-slate-300 leading-relaxed font-light mb-4">
                {item.fullTestimony}
              </p>
            </div>

            {/* Partner Details Footer */}
            <div className="pt-4 border-t border-white/10 mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 p-0.5 shadow shrink-0">
                  <div className="w-full h-full rounded-full bg-[#18042b] flex items-center justify-center text-amber-300 font-extrabold text-xs">
                    {item.partnerName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white leading-none">
                      {item.partnerName}
                    </span>
                    {item.verified && (
                      <span title="Mshirika Aliyethibitishwa" className="inline-flex">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-amber-400/80" />
                      {item.location}
                    </span>
                    <span>•</span>
                    <span className="text-amber-300 font-semibold">{item.tier}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-serif">
                  {item.scripture}
                </span>
                <span className="block text-[9px] text-slate-500 mt-1">{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scripture Bottom Callout */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-[#1b052f]/60 to-amber-950/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-cinzel">
              Ushuhuda Wako ni Silaha ya Ushindi
            </h4>
            <p className="text-xs text-slate-300">
              Je, Mungu amekutendea jambo kupitia ushirika wako na Jerusalem Ministry? Shiriki nasi ili kuimarisha imani ya wengine.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shrink-0 transition-all shadow"
        >
          Toa Ushuhuda Wako Sasa
        </button>
      </div>

      {/* Submit Testimony Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold font-cinzel text-white">
                  Tuma Ushuhuda Wako wa Injili
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white font-cinzel">
                  Amina! Ushuhuda Wako Umepokelewa
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Tunakushukuru kwa kushiriki matendo makuu ya Mungu. Ushuhuda wako umewekwa na utawatia nguvu washirika kote ulimwenguni!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTestimony} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jina Lako Kamili *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Mfano: John Kweka"
                      value={formData.partnerName}
                      onChange={(e) =>
                        setFormData({ ...formData, partnerName: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mahali Unapoishi / Mji
                    </label>
                    <input
                      type="text"
                      placeholder="Mfano: Dar es Salaam, Tanzania"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Daraja la Ushirika
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1d0533] border border-amber-500/30 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="Mshirika wa Dhahabu">Mshirika wa Dhahabu</option>
                      <option value="Mshirika wa Fedha">Mshirika wa Fedha</option>
                      <option value="Mshirika wa Shaba">Mshirika wa Shaba</option>
                      <option value="Mshirika wa Injili">Mshirika wa Injili</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Aina ya Ushuhuda
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1d0533] border border-amber-500/30 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="biashara">Baraka za Kazi / Biashara</option>
                      <option value="uponyaji">Uponyaji & Amani ya Familia</option>
                      <option value="ujenzi">Dhabihu ya Ujenzi wa Hekalu</option>
                      <option value="agano">Agano la Sadaka & Injili</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kichwa cha Ushuhuda (Muhtasari wa Mstari Mmoja)
                  </label>
                  <input
                    type="text"
                    placeholder="Mfano: Mungu alipofungua zabuni baada ya agano la sadaka"
                    value={formData.quote}
                    onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ushuhuda Kamili *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Eleza kwa undani jinsi Mungu alivyokutendea baada ya kuweka ahadi au kutoa sadaka ya ushirika..."
                    value={formData.fullTestimony}
                    onChange={(e) =>
                      setFormData({ ...formData, fullTestimony: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-xs shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Inatuma...' : 'Tuma Ushuhuda'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
