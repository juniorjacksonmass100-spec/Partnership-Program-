import crypto from 'crypto';

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash?: string;
  salt?: string;
  role: 'admin' | 'user';
  location?: string;
  partnershipTier?: string;
  createdAt: string;
}

export interface PledgeRecord {
  id: string;
  pledgeNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  currency: string;
  purpose: string;
  notes?: string;
  pledgeDate: string;
  dueDate: string;
  fulfilledAmount: number;
  status: 'pending' | 'partial' | 'fulfilled' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface ContributionRecord {
  id: string;
  receiptNumber: string;
  pledgeId: string;
  pledgeNumber: string;
  userId: string;
  userName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  recordedBy: 'mshirika' | 'admin';
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  supportingDetails: string;
  recordedBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'user';
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  pledgeId?: string;
  pledgeNumber?: string;
  title: string;
  message: string;
  channelUsed?: 'in_app' | 'whatsapp' | 'sms' | 'email' | 'all';
  senderName: string;
  amount?: number;
  remainingAmount?: number;
  dueDate?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MinistryNewsRecord {
  id: string;
  title: string;
  content: string;
  category: 'mradi' | 'injili' | 'matangazo' | 'huduma_jamii' | 'tangazo_muhimu';
  badge: string;
  progressPercent: number;
  targetAmount?: number;
  currentAmount?: number;
  location?: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  priority: 'high' | 'normal' | 'urgent';
  isActive: boolean;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonyRecord {
  id: string;
  partnerName: string;
  location: string;
  tier: string;
  category: 'biashara' | 'ujenzi' | 'uponyaji' | 'agano' | 'familia' | 'huduma';
  categoryLabel: string;
  quote: string;
  fullTestimony: string;
  scripture: string;
  date: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Password helper functions
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken(userId: string, role: 'admin' | 'user'): string {
  const payload = `${userId}:${role}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
  const hmac = crypto.createHmac('sha256', 'jerusalem_ministry_secret_2026');
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifyToken(token: string): { userId: string; role: 'admin' | 'user' } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 5) return null;
    const userId = parts[0];
    const role = parts[1] as 'admin' | 'user';
    const timestamp = parseInt(parts[2], 10);
    const random = parts[3];
    const providedSig = parts[4];

    // Check token age (7 days validity)
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) return null;

    const payload = `${userId}:${role}:${timestamp}:${random}`;
    const hmac = crypto.createHmac('sha256', 'jerusalem_ministry_secret_2026');
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) {
      return { userId, role };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Realtime listeners (Server-Sent Events clients)
type SseClient = { id: string; write: (data: string) => void };
const sseClients: SseClient[] = [];

export function addSseClient(id: string, write: (data: string) => void) {
  sseClients.push({ id, write });
}

export function removeSseClient(id: string) {
  const idx = sseClients.findIndex((c) => c.id === id);
  if (idx !== -1) sseClients.splice(idx, 1);
}

export function broadcastChange(type: string, data?: any) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client disconnected
    }
  }
}

export function getDefaultMinistryNews(): MinistryNewsRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'news_001',
      title: 'Ujenzi wa Hekalu Kuu la Ibada - Awamu ya 2 (Kuezeka Paa & Mifumo)',
      content: 'Kazi ya kusimamisha kuta kuu na nguzo za hekalu imekamilika kwa mafanikio makubwa (75%). Sasa tumeanza kazi ya kuezeka paa la kisasa na kufunga mifumo ya umeme na uingizaji hewa. Tunawashukuru washirika wote wanaoendelea kusimama nasi kwa sadaka za dhabihu.',
      category: 'mradi',
      badge: 'MRADI WA UJENZI',
      progressPercent: 75,
      targetAmount: 150000000,
      currentAmount: 112500000,
      location: 'Makao Makuu, Dar es Salaam',
      status: 'ongoing',
      priority: 'urgent',
      isActive: true,
      publishDate: '18 Sep 2026',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'news_002',
      title: 'Mkutano Mkubwa wa Injili na Uvunaji wa Roho - Morogoro & Dodoma 2026',
      content: 'Maandalizi ya hema kubwa la maombezi, ununuzi wa vyombo vipya vya muziki na vipaza sauti kwa ajili ya mkutano mkubwa wa uamsho yanaendelea kwa kasi. Wahudumu na wainjilisti zaidi ya 80 wanajiandaa kwa ajili ya kufikia maelfu ya roho.',
      category: 'injili',
      badge: 'INJILI YA MOJA KWA MOJA',
      progressPercent: 60,
      targetAmount: 45000000,
      currentAmount: 27000000,
      location: 'Morogoro & Dodoma',
      status: 'ongoing',
      priority: 'high',
      isActive: true,
      publishDate: '17 Sep 2026',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'news_003',
      title: 'Upanuzi wa Studio ya Kisasa ya Matangazo ya Runinga na Mitandao (Media Outreach)',
      content: 'Zoezi la kufunga kamera za kisasa za 4K, vifaa vya Live Streaming na studio ya kisasa ya kurekodi vipindi vya injili na nyimbo za sifa linaendelea ili injili iweze kufika kwenye televisheni na majukwaa yote ya kidijitali kote ulimwenguni.',
      category: 'matangazo',
      badge: 'HABARI & MATANGAZO',
      progressPercent: 40,
      targetAmount: 35000000,
      currentAmount: 14000000,
      location: 'Studio Kuu ya Jerusalem',
      status: 'ongoing',
      priority: 'normal',
      isActive: true,
      publishDate: '15 Sep 2026',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'news_004',
      title: 'Mfuko wa Upendo: Huduma ya Jamii & Kusaidia Yatima na Wajane',
      content: 'Zoezi la kugawa sare za shule, madaftari, vifaa vya afya na vyakula kwa watoto 250 yatima na wajane 80 linaendelea kwa uaminifu. Mungu awabariki sana washirika wote mnaotoa kwa moyo wa ukarimu na upendo wa Kristo.',
      category: 'huduma_jamii',
      badge: 'HUDUMA YA JAMII',
      progressPercent: 85,
      targetAmount: 20000000,
      currentAmount: 17000000,
      location: 'Vituo vya Malezi & Jamii',
      status: 'ongoing',
      priority: 'high',
      isActive: true,
      publishDate: '14 Sep 2026',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function getDefaultTestimonials(): TestimonyRecord[] {
  const now = new Date().toISOString();
  return [
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
    },
  ];
}
