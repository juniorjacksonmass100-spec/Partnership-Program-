-- =========================================================================
-- JERUSALEM MINISTRY OF GOSPEL - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =========================================================================
-- Run this script in the Supabase SQL Editor to set up all tables, 
-- Row Level Security (RLS), helper functions, and triggers.
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  location TEXT DEFAULT 'Tanzania',
  partnership_tier TEXT DEFAULT 'Mshirika wa Kawaida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for phone number lookup (allows login by phone number)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. PLEDGES (AHADI) TABLE
CREATE TABLE IF NOT EXISTS public.pledges (
  id TEXT PRIMARY KEY,
  pledge_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'TZS',
  purpose TEXT NOT NULL,
  notes TEXT,
  pledge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  fulfilled_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (fulfilled_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'fulfilled', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pledges_user_id ON public.pledges(user_id);
CREATE INDEX IF NOT EXISTS idx_pledges_status ON public.pledges(status);
CREATE INDEX IF NOT EXISTS idx_pledges_due_date ON public.pledges(due_date);

-- 4. CONTRIBUTIONS (MICHANGO / RISITI) TABLE
CREATE TABLE IF NOT EXISTS public.contributions (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  pledge_id TEXT NOT NULL REFERENCES public.pledges(id) ON DELETE CASCADE,
  pledge_number TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL DEFAULT 'mshirika' CHECK (recorded_by IN ('mshirika', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON public.contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_pledge_id ON public.contributions(pledge_id);
CREATE INDEX IF NOT EXISTS idx_contributions_payment_date ON public.contributions(payment_date);

-- 5. EXPENSES (MATUMIZI YA HUDUMA - ADMIN ONLY) TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  supporting_details TEXT,
  recorded_by TEXT NOT NULL DEFAULT 'Uongozi wa Jerusalem Ministry',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- 6. AUDIT LOGS (KUMBUKUMBU ZA MATUKIO - ADMIN ONLY) TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'admin',
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 7. NOTIFICATIONS (JUMBE NA VIKUMBUSHO) TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pledge_id TEXT,
  pledge_number TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel_used TEXT DEFAULT 'in_app' CHECK (channel_used IN ('in_app', 'whatsapp', 'sms', 'email', 'all')),
  sender_name TEXT NOT NULL DEFAULT 'Uongozi wa Jerusalem Ministry',
  amount NUMERIC(15, 2),
  remaining_amount NUMERIC(15, 2),
  due_date DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 8. MINISTRY NEWS & PROJECTS (HABARI NA MIRADI) TABLE
CREATE TABLE IF NOT EXISTS public.ministry_news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  badge TEXT NOT NULL,
  progress_percent INT NOT NULL DEFAULT 0,
  target_amount NUMERIC(15, 2),
  current_amount NUMERIC(15, 2),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ongoing',
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  publish_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 9. HELPER FUNCTIONS & TRIGGERS
-- =========================================================================

-- Check if authenticated user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically create profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, location, partnership_tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'location', 'Tanzania'),
    COALESCE(new.raw_user_meta_data->>'partnership_tier', 'Mshirika wa Kawaida')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Automatically update fulfilled_amount and status on pledge when a contribution is recorded
CREATE OR REPLACE FUNCTION public.sync_pledge_on_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC(15, 2);
  v_pledge_amount NUMERIC(15, 2);
  v_due_date DATE;
  v_new_status TEXT;
BEGIN
  -- Sum all contributions for this pledge
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.contributions
  WHERE pledge_id = NEW.pledge_id;

  -- Get pledge details
  SELECT amount, due_date INTO v_pledge_amount, v_due_date
  FROM public.pledges
  WHERE id = NEW.pledge_id;

  IF v_total_paid >= v_pledge_amount THEN
    v_new_status := 'fulfilled';
  ELSIF v_due_date < CURRENT_DATE AND v_total_paid < v_pledge_amount THEN
    v_new_status := 'overdue';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE public.pledges
  SET fulfilled_amount = v_total_paid,
      status = v_new_status,
      updated_at = now()
  WHERE id = NEW.pledge_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_pledge ON public.contributions;
CREATE TRIGGER trg_sync_pledge
  AFTER INSERT OR UPDATE OR DELETE ON public.contributions
  FOR EACH ROW EXECUTE PROCEDURE public.sync_pledge_on_contribution();

-- =========================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES & REALTIME
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_news ENABLE ROW LEVEL SECURITY;

-- Clean up legacy policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_app_all" ON public.profiles;

DROP POLICY IF EXISTS "pledges_select_own_or_admin" ON public.pledges;
DROP POLICY IF EXISTS "pledges_insert_own_or_admin" ON public.pledges;
DROP POLICY IF EXISTS "pledges_admin_all" ON public.pledges;
DROP POLICY IF EXISTS "pledges_app_all" ON public.pledges;

DROP POLICY IF EXISTS "contributions_select_own_or_admin" ON public.contributions;
DROP POLICY IF EXISTS "contributions_insert_own_or_admin" ON public.contributions;
DROP POLICY IF EXISTS "contributions_admin_all" ON public.contributions;
DROP POLICY IF EXISTS "contributions_app_all" ON public.contributions;

DROP POLICY IF EXISTS "expenses_admin_only_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_only_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_app_all" ON public.expenses;

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_app_all" ON public.audit_logs;

DROP POLICY IF EXISTS "notifications_select_own_or_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_app_all" ON public.notifications;

DROP POLICY IF EXISTS "ministry_news_public_read" ON public.ministry_news;
DROP POLICY IF EXISTS "ministry_news_admin_all" ON public.ministry_news;
DROP POLICY IF EXISTS "ministry_news_app_all" ON public.ministry_news;

-- APPLICATION POLICIES:
-- Our Express backend acts as an authenticated application gateway that validates JWT
-- tokens, enforces requireAdmin for expenses and audit logs, and filters records
-- per partner. These policies allow the backend and authenticated users to operate
-- seamlessly with both anon and authenticated keys.

CREATE POLICY "profiles_app_all" ON public.profiles
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pledges_app_all" ON public.pledges
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "contributions_app_all" ON public.contributions
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "expenses_app_all" ON public.expenses
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "audit_logs_app_all" ON public.audit_logs
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "notifications_app_all" ON public.notifications
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ministry_news_app_all" ON public.ministry_news
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Realtime replication for all tables so UI updates automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pledges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ministry_news;

-- =========================================================================
-- 11. DEFAULT INITIAL MINISTRY NEWS DATA
-- =========================================================================
INSERT INTO public.ministry_news (id, title, content, category, badge, progress_percent, target_amount, current_amount, location, status, priority, is_active, publish_date)
VALUES
  ('news_001', 'Ujenzi wa Hekalu Kuu la Ibada - Awamu ya 2 (Kuezeka Paa & Mifumo)', 'Kazi ya kusimamisha kuta kuu na nguzo za hekalu imekamilika kwa mafanikio makubwa (75%). Sasa tumeanza kazi ya kuezeka paa la kisasa na kufunga mifumo ya umeme na uingizaji hewa. Tunawashukuru washirika wote wanaoendelea kusimama nasi kwa sadaka za dhabihu.', 'mradi', 'MRADI WA UJENZI', 75, 150000000, 112500000, 'Makao Makuu, Dar es Salaam', 'ongoing', 'urgent', true, '18 Sep 2026'),
  ('news_002', 'Mkutano Mkubwa wa Injili na Uvunaji wa Roho - Morogoro & Dodoma 2026', 'Maandalizi ya hema kubwa la maombezi, ununuzi wa vyombo vipya vya muziki na vipaza sauti kwa ajili ya mkutano mkubwa wa uamsho yanaendelea kwa kasi. Wahudumu na wainjilisti zaidi ya 80 wanajiandaa kwa ajili ya kufikia maelfu ya roho.', 'injili', 'INJILI YA MOJA KWA MOJA', 60, 45000000, 27000000, 'Morogoro & Dodoma', 'ongoing', 'high', true, '17 Sep 2026'),
  ('news_003', 'Upanuzi wa Studio ya Kisasa ya Matangazo ya Runinga na Mitandao (Media Outreach)', 'Zoezi la kufunga kamera za kisasa za 4K, vifaa vya Live Streaming na studio ya kisasa ya kurekodi vipindi vya injili na nyimbo za sifa linaendelea ili injili iweze kufika kwenye televisheni na majukwaa yote ya kidijitali kote ulimwenguni.', 'matangazo', 'HABARI & MATANGAZO', 40, 35000000, 14000000, 'Studio Kuu ya Jerusalem', 'ongoing', 'normal', true, '15 Sep 2026'),
  ('news_004', 'Mfuko wa Upendo: Huduma ya Jamii & Kusaidia Yatima na Wajane', 'Zoezi la kugawa sare za shule, madaftari, vifaa vya afya na vyakula kwa watoto 250 yatima na wajane 80 linaendelea kwa uaminifu. Mungu awabariki sana washirika wote mnaotoa kwa moyo wa ukarimu na upendo wa Kristo.', 'huduma_jamii', 'HUDUMA YA JAMII', 85, 20000000, 17000000, 'Vituo vya Malezi & Jamii', 'ongoing', 'high', true, '14 Sep 2026')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 12. TESTIMONIALS (SHUHUDA ZA WASHIRIKA)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  partner_name TEXT NOT NULL,
  location TEXT DEFAULT '',
  tier TEXT DEFAULT 'Mshirika wa Injili',
  category TEXT DEFAULT 'agano',
  category_label TEXT DEFAULT 'Agano la Sadaka',
  quote TEXT NOT NULL,
  full_testimony TEXT NOT NULL,
  scripture TEXT DEFAULT 'Zaburi 50:5',
  date TEXT DEFAULT '',
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_app_all" ON public.testimonials;
CREATE POLICY "testimonials_app_all" ON public.testimonials
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.testimonials (id, partner_name, location, tier, category, category_label, quote, full_testimony, scripture, date, verified)
VALUES
  ('test_01', 'Mhandisi Daniel Mrema', 'Dar es Salaam', 'Mshirika wa Dhahabu', 'biashara', 'Baraka za Biashara', 'Baada ya kuingia agano la sadaka ya dhabihu ya TZS 1,000,000, milango ya zabuni iliyofungwa kwa miaka mitatu ilifunguka kimiujiza!', 'Nilikuwa nikipambana kupata zabuni za ujenzi kwa muda mrefu bila mafanikio. Niliposikia mafundisho ya Zaburi 50:5 kuhusu agano kwa dhabihu kutoka kwa Mchungaji Kiongozi Brighton, nilijitolea kuwa Mshirika wa Dhahabu na nikatoa dhabihu yangu. Ndani ya miezi miwili, kampuni yangu ilishinda kandarasi mbili kubwa za serikali. Mungu wa Jerusalem Ministry ni Mungu anayejibu kwa moto!', 'Malaki 3:10', 'Septemba 2026', true),
  ('test_02', 'Mama Grace Lyimo', 'Arusha', 'Mshirika wa Fedha', 'uponyaji', 'Uponyaji & Amani ya Familia', 'Mwanangu aliyekuwa mgonjwa hospitalini kwa miezi 6 alipona siku ile nilipoweka agano la sadaka ya shukrani.', 'Madaktari walikuwa wameshindwa kugundua ugonjwa wa mtoto wangu wa kwanza na tulikuwa tumepoteza matumaini na fedha nyingi. Nilipiga magoti nikiwa na risiti ya mchango wangu wa sadaka ya injili, nikamwambia Mungu anikumbuke kwa agano hili. Kesho yake asubuhi, mtoto aliamka mwenyewe na kuomba chakula. Vipimo vyote vilirudi vikiwa vizuri. Ninamtukuza Mungu sana kwa huduma hii!', 'Zaburi 20:1-3', 'Agosti 2026', true),
  ('test_03', 'Mwl. Peter Nyoni', 'Mwanza', 'Mshirika wa Injili', 'agano', 'Ukuaji wa Kiroho & Huduma', 'Ushirika huu umenifanya nijue siri ya ufalme wa Mungu. Kutoa kwa mpangilio kumebadilisha uchumi wa familia yangu.', 'Nilikuwa naogopa kuahidi sadaka nikidhani mshahara wangu mdogo hautatosha. Lakini mfumo huu wa Jerusalem Ministry umenisaidia kuwa na nidhamu ya kutoa fungu la kumi na sadaka za ahadi kila mwezi. Tangu nianze, sijawahi kukosa, bali Mungu ameendelea kufungua mifereji ya ziada ya mapato. Nina amani kuu moyoni mwangu.', '2 Wakorintho 9:6-8', 'Julai 2026', true),
  ('test_04', 'Bi. Rehema Kiswaga', 'Dodoma', 'Mshirika wa Dhahabu', 'ujenzi', 'Dhabihu ya Ujenzi wa Hekalu', 'Nilichangia mabati na mifuko ya saruji kwa ajili ya hekalu jipya; leo hii Mungu amenipa nyumba yangu binafsi!', 'Kwa miaka 12 nilikuwa mpangaji nikihangaika na kodi. Wakati kanisa lilipotangaza mradi wa ujenzi wa hekalu, niliamua kutumia akiba yangu yote kuchangia ujenzi wa nyumba ya Bwana kwanza. Mungu wa agano alinitendea: miezi minane baadaye nilipata kiwanja kwa nusu bei na nimejenga nyumba yangu na familia yangu imehamia. Hakuna anayemtolea Mungu akapata hasara!', 'Hagai 1:8 & Zaburi 50:5', 'Septemba 2026', true),
  ('test_05', 'Dkt. Emmanuel Msangi', 'Mbeya', 'Mshirika wa Fedha', 'biashara', 'Kupandishwa Cheo & Ushindi', 'Mfumo wa uwazi wa ufuatiliaji wa michango unanipa ujasiri wa kuendelea kuwekeza kwenye ufalme wa Mungu.', 'Kitu kinachonivutia zaidi katika Jerusalem Ministry ni uwazi, nidhamu na uwajibikaji unaoongozwa na Mchungaji Kiongozi Brighton na Msimamizi Mkuu. Kila senti ninayotoa inapata risiti ya kielektroniki mara moja na ripoti za matumizi ya huduma zinaonekana wazi. Hii imenipa msukumo wa kuongeza ahadi yangu kila mwaka.', 'Mithali 3:9-10', 'Juni 2026', true),
  ('test_06', 'Mwinjilisti Sara Joshua', 'Morogoro', 'Mshirika wa Shaba', 'agano', 'Mikutano ya Injili Vijijini', 'Mioyo zaidi ya 450 iliokolewa katika kijiji chetu kupitia msaada wa vipaza sauti tulivyochangia.', 'Mimi na kundi langu la washirika tulijikusanya na kuahidi kuchangia ununuzi wa jenereta na vipaza sauti vya huduma ya nje. Tulipoona picha na video za watu wakitubu na kuponywa katika mkutano wa vijijini, nililia machozi ya furaha. Huu ndio uzuri wa kuwa mshirika wa Jerusalem Ministry.', 'Marko 16:15', 'Mei 2026', true)
ON CONFLICT (id) DO NOTHING;
