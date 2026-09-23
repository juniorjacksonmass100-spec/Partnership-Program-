# Jerusalem Ministry of Gospel — Partnership & Giving Portal

Mfumo rasmi na wa kisasa wa kusimamia ahadi (pledges), michango (contributions), matumizi (expenses), habari za huduma (ministry projects), na shuhuda za washirika (testimonials) kwa ajili ya Jerusalem Ministry of Gospel.

---

## Mwongozo wa Kuunganisha (Git, Supabase & Vercel)

Mfumo huu umesanidiwa (configured) kufanya kazi bila hitilafu yoyote unapoupeleka kwenye **Git (GitHub)**, **Supabase Database**, na **Vercel Hosting**.

---

### Hatua ya 1: Kuweka kwenye Git / GitHub

1. Fungua terminal kwenye folda ya mradi (baada ya kufungua ZIP):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Jerusalem Ministry Portal"
   ```

2. Unda repository mpya kwenye [GitHub](https://github.com/new).

3. Unganisha na kusukuma (push) msimbo wako:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<jina-lako>/<jina-la-repo>.git
   git push -u origin main
   ```

> **Kumbuka:** Faili ya `.gitignore` tayari imesanidiwa kuzuia `node_modules`, `dist`, na siri za `.env` zisipakiwe mtandaoni.

---

### Hatua ya 2: Kuunganisha na Supabase (Cloud Database)

1. Ingia kwenye akaunti yako ya [Supabase](https://supabase.com) na uunde mradi mpya (New Project).
2. Kwenye menu ya kushoto ya Supabase, bofya **SQL Editor** -> **New Query**.
3. Fungua faili ya `supabase-schema.sql` iliyo kwenye folda ya mradi, nakili maudhui yote (Copy All) kisha yabandike kwenye SQL Editor na ubofye **Run**.
   - Hii itaunda majedwali yote 8 (`profiles`, `pledges`, `contributions`, `expenses`, `audit_logs`, `notifications`, `ministry_news`, `testimonials`), sheria za usalama (RLS), na akaunti ya msingi ya Admin.
4. Nenda kwenye **Project Settings** -> **API** na unakili:
   - **Project URL**
   - **anon public key**
   - **service_role secret key**

---

### Hatua ya 3: Kuweka kwenye Vercel (Hosting)

Mradi huu tayari unajumuisha `vercel.json` na `api/index.ts` inayowezesha mfumo wa Express na Vite SPA kufanya kazi pamoja kama Serverless Functions bila kupata 404 au masuala ya njia za API.

1. Ingia kwenye [Vercel](https://vercel.com) na uchague **Add New...** -> **Project**.
2. Chagua repository yako ya GitHub uliyoitengeneza katika Hatua ya 1.
3. Kwenye ukurasa wa **Configure Project**:
   - **Framework Preset**: Vite (hutambuliwa kiotomatiki).
   - **Root Directory**: `./` (chaguo-msingi).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Chini ya sehemu ya **Environment Variables**, weka vigezo vifuatavyo:

| Jina la Variable | Thamani (Value) |
|---|---|
| `SUPABASE_URL` | *Project URL kutoka Supabase* |
| `VITE_SUPABASE_URL` | *Project URL kutoka Supabase* |
| `SUPABASE_ANON_KEY` | *anon public key kutoka Supabase* |
| `VITE_SUPABASE_ANON_KEY` | *anon public key kutoka Supabase* |
| `SUPABASE_SERVICE_ROLE_KEY` | *service_role secret key kutoka Supabase* |

5. Bofya **Deploy**. Vercel itajenga mradi na kukupa anwani ya tovuti ya moja kwa moja (live URL)!

---

## Taarifa za Kuingia Kama Msimamizi (Default Admin Credentials)

- **Simu / Kitambulisho:** `+255 754 000 111` au `admin@jerusalemministry.org`
- **Nenosiri:** `JerusalemAdmin2026!`
- **Jukumu:** Mchungaji Kiongozi (Msimamizi Mkuu)
