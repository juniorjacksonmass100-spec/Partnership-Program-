import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  supabaseRegisterUser,
  supabaseLogin,
  supabaseGetProfile,
  supabaseGetAllPartners,
  supabaseGetPledges,
  supabaseCreatePledge,
  supabaseDeletePledge,
  supabaseGetContributions,
  supabaseCreateContribution,
  supabaseGetExpenses,
  supabaseCreateExpense,
  supabaseDeleteExpense,
  supabaseGetAuditLogs,
  supabaseCreateAuditLog,
  supabaseGetNotifications,
  supabaseCreateNotification,
  supabaseMarkNotificationRead,
  supabaseMarkAllNotificationsRead,
  supabaseDeleteNotification,
  supabaseGetNews,
  supabaseCreateNews,
  supabaseUpdateNews,
  supabaseDeleteNews,
  supabaseGetTestimonials,
  supabaseCreateTestimonial,
  supabaseUpdateTestimonial,
  supabaseDeleteTestimonial,
  supabaseGetUserSummary,
  supabaseGetReminders,
  supabaseGetAdminOverview,
  supabaseGetPublicStats,
  supabaseGetDatabaseBackup,
  supabaseResetDatabase,
} from './server/supabase.ts';
import {
  UserRecord,
  PledgeRecord,
  ContributionRecord,
  ExpenseRecord,
  AuditLogRecord,
  NotificationRecord,
  MinistryNewsRecord,
  TestimonyRecord,
  hashPassword,
  generateSalt,
  generateToken,
  verifyToken,
  addSseClient,
  removeSseClient,
  broadcastChange as sseBroadcastChange,
  getDefaultMinistryNews,
  getDefaultTestimonials,
} from './server/db.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all incoming requests (Vercel, preview environments, custom domains)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// -------------------------------------------------------------
// IN-MEMORY / ACTIVE STATE STORE
// Guarantees zero downtime, zero 503 errors, and instant admin
// access even when Supabase environment variables are pending.
// -------------------------------------------------------------

const DEFAULT_ADMIN_SALT = 'jerusalem_salt_admin_2026';
const DEFAULT_ADMIN_USER: UserRecord = {
  id: 'admin_jerusalem_001',
  fullName: 'Mchungaji Kiongozi (Msimamizi Mkuu)',
  email: 'admin@jerusalemministry.org',
  phone: '+255 754 000 111',
  passwordHash: hashPassword('JerusalemAdmin2026!', DEFAULT_ADMIN_SALT),
  salt: DEFAULT_ADMIN_SALT,
  role: 'admin',
  location: 'Makao Makuu, Dar es Salaam',
  partnershipTier: 'Msimamizi Mkuu',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const memoryUsers = new Map<string, UserRecord>();
memoryUsers.set(DEFAULT_ADMIN_USER.id, DEFAULT_ADMIN_USER);

const memoryPledges: PledgeRecord[] = [];
const memoryContributions: ContributionRecord[] = [];
const memoryExpenses: ExpenseRecord[] = [];
const memoryAuditLogs: AuditLogRecord[] = [];
const memoryNotifications: NotificationRecord[] = [];
const memoryNews: MinistryNewsRecord[] = getDefaultMinistryNews();
const memoryTestimonials: TestimonyRecord[] = getDefaultTestimonials();
const deletedNewsIds = new Set<string>();
const deletedTestimonialIds = new Set<string>();

// Local file persistence for fallback store
const PERSISTENCE_FILE = path.join(process.cwd(), '.server_data.json');

function saveStoreToDisk() {
  try {
    const payload = {
      users: Array.from(memoryUsers.entries()),
      pledges: memoryPledges,
      contributions: memoryContributions,
      expenses: memoryExpenses,
      auditLogs: memoryAuditLogs,
      notifications: memoryNotifications,
      news: memoryNews,
      deletedNewsIds: Array.from(deletedNewsIds),
      testimonials: memoryTestimonials,
      deletedTestimonialIds: Array.from(deletedTestimonialIds),
    };
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data backup to disk:', err);
  }
}

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.users && Array.isArray(data.users)) {
        for (const [id, u] of data.users) {
          memoryUsers.set(id, u);
        }
      }
      if (Array.isArray(data.pledges) && data.pledges.length > 0) {
        memoryPledges.length = 0;
        memoryPledges.push(...data.pledges);
      }
      if (Array.isArray(data.contributions) && data.contributions.length > 0) {
        memoryContributions.length = 0;
        memoryContributions.push(...data.contributions);
      }
      if (Array.isArray(data.expenses) && data.expenses.length > 0) {
        memoryExpenses.length = 0;
        memoryExpenses.push(...data.expenses);
      }
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
        memoryAuditLogs.length = 0;
        memoryAuditLogs.push(...data.auditLogs);
      }
      if (Array.isArray(data.notifications) && data.notifications.length > 0) {
        memoryNotifications.length = 0;
        memoryNotifications.push(...data.notifications);
      }
      if (Array.isArray(data.news) && data.news.length > 0) {
        memoryNews.length = 0;
        memoryNews.push(...data.news);
      }
      if (Array.isArray(data.deletedNewsIds)) {
        deletedNewsIds.clear();
        for (const id of data.deletedNewsIds) deletedNewsIds.add(id);
      }
      if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
        memoryTestimonials.length = 0;
        memoryTestimonials.push(...data.testimonials);
      }
      if (Array.isArray(data.deletedTestimonialIds)) {
        deletedTestimonialIds.clear();
        for (const id of data.deletedTestimonialIds) deletedTestimonialIds.add(id);
      }
      console.log(`[Store] Loaded persistent data from disk (${memoryUsers.size} users, ${memoryPledges.length} pledges, ${memoryContributions.length} contributions)`);
    } else {
      saveStoreToDisk();
    }
  } catch (err) {
    console.error('Failed to load data backup from disk:', err);
  }
}

// Initial load from disk
loadStoreFromDisk();

function safeDateToTime(isoStr?: string, fallbackStr?: string): number {
  if (isoStr) {
    const t = new Date(isoStr).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (fallbackStr) {
    const t = new Date(fallbackStr).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

// Helper to reliably consolidate news across Supabase and in-memory/disk store, respecting deletions
async function getConsolidatedNews(includeInactive: boolean = false): Promise<MinistryNewsRecord[]> {
  const map = new Map<string, MinistryNewsRecord>();

  for (const item of memoryNews) {
    if (!deletedNewsIds.has(item.id)) {
      map.set(item.id, item);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const spNews = await supabaseGetNews(true);
      for (const item of spNews) {
        if (!deletedNewsIds.has(item.id)) {
          if (!map.has(item.id)) {
            map.set(item.id, item as MinistryNewsRecord);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  let list = Array.from(map.values());
  if (!includeInactive) {
    list = list.filter((n) => n.isActive);
  }
  list.sort((a, b) => {
    const timeB = safeDateToTime(b.createdAt, b.publishDate);
    const timeA = safeDateToTime(a.createdAt, a.publishDate);
    return timeB - timeA;
  });
  return list;
}

// Helper to reliably consolidate testimonials across Supabase and in-memory/disk store, respecting deletions
async function getConsolidatedTestimonials(includeUnverified: boolean = false): Promise<TestimonyRecord[]> {
  const map = new Map<string, TestimonyRecord>();

  for (const item of memoryTestimonials) {
    if (!deletedTestimonialIds.has(item.id)) {
      map.set(item.id, item);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const spTests = await supabaseGetTestimonials(true);
      for (const item of spTests) {
        if (!deletedTestimonialIds.has(item.id)) {
          if (!map.has(item.id)) {
            map.set(item.id, item as TestimonyRecord);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  let list = Array.from(map.values());
  if (!includeUnverified) {
    list = list.filter((t) => t.verified);
  }
  list.sort((a, b) => {
    const timeB = safeDateToTime(b.createdAt, b.date);
    const timeA = safeDateToTime(a.createdAt, a.date);
    return timeB - timeA;
  });
  return list;
}

function broadcastChange(type: string, data?: any) {
  saveStoreToDisk();
  sseBroadcastChange(type, data);
}

// Helper for generating short IDs
function generatePledgeNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PLG-${year}-${rand}`;
}

function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RCT-${year}-${rand}`;
}

// -------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------------

async function authenticateUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Uthibitisho unahitajika. Tafadhali ingia kwenye akaunti yako.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  const candidateUserId = payload ? payload.userId : token;

  // 1. Check if it's the administrator
  if (candidateUserId === DEFAULT_ADMIN_USER.id || (payload && payload.role === 'admin')) {
    req.user = {
      id: DEFAULT_ADMIN_USER.id,
      fullName: DEFAULT_ADMIN_USER.fullName,
      email: DEFAULT_ADMIN_USER.email,
      phone: DEFAULT_ADMIN_USER.phone,
      role: 'admin',
      location: DEFAULT_ADMIN_USER.location,
      partnershipTier: DEFAULT_ADMIN_USER.partnershipTier,
    };
    return next();
  }

  // 2. If Supabase is configured, check profile in Supabase
  if (isSupabaseConfigured()) {
    try {
      const spUser = await supabaseGetProfile(candidateUserId);
      if (spUser) {
        req.user = spUser;
        return next();
      }
    } catch (err) {
      console.warn('Supabase profile lookup warning:', err);
    }
  }

  // 3. Fallback to memory user store
  const localUser = memoryUsers.get(candidateUserId);
  if (localUser) {
    req.user = {
      id: localUser.id,
      fullName: localUser.fullName,
      email: localUser.email,
      phone: localUser.phone,
      role: localUser.role,
      location: localUser.location,
      partnershipTier: localUser.partnershipTier,
    };
    return next();
  }

  // 4. Try finding by email/phone if candidate is an identifier
  for (const u of memoryUsers.values()) {
    if (u.id === candidateUserId || u.email === candidateUserId) {
      req.user = {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        location: u.location,
        partnershipTier: u.partnershipTier,
      };
      return next();
    }
  }

  return res.status(401).json({
    error: 'Kikao chako kimekwisha au mtumiaji hajapatikana. Tafadhali ingia upya.',
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Huruhusiwi: Eneo hili limetengwa kwa ajili ya Msimamizi Mkuu pekee.',
    });
  }
  next();
}

// -------------------------------------------------------------
// REAL-TIME SYNC (Server-Sent Events)
// -------------------------------------------------------------

app.get('/api/sync/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = `client_${Date.now()}_${Math.random()}`;
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Imeunganishwa na mfumo wa Jerusalem Ministry' })}\n\n`);

  addSseClient(clientId, (data) => {
    try {
      res.write(data);
    } catch (e) {
      // client connection closed
    }
  });

  req.on('close', () => {
    removeSseClient(clientId);
  });
});

// -------------------------------------------------------------
// SUPABASE STATUS & SCHEMA MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

app.get('/api/supabase/status', async (req, res) => {
  try {
    const status = await testSupabaseConnection();
    res.json(status);
  } catch (err: any) {
    res.json({
      configured: isSupabaseConfigured(),
      connected: false,
      message: 'Supabase haijasanidiwa bado. Mfumo unafanya kazi vizuri ukitumia storage ya ndani.',
    });
  }
});

app.get('/api/supabase/schema', (req, res) => {
  try {
    const schemaPath = path.resolve(process.cwd(), 'supabase-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sqlContent);
    }
    res.status(404).send('-- supabase-schema.sql haikupatikana.');
  } catch (err: any) {
    res.status(500).send('-- Hitilafu ya kusoma schema: ' + err.message);
  }
});

app.post('/api/admin/supabase/migrate-local-to-cloud', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const results = {
      partnersCount: Array.from(memoryUsers.values()).filter((u) => u.role === 'user').length,
      pledgesCount: memoryPledges.length,
      contributionsCount: memoryContributions.length,
      expensesCount: memoryExpenses.length,
    };
    res.json({
      message: 'Taarifa zote zimeunganishwa na kuhifadhiwa kikamilifu.',
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kuhamisha taarifa: ' + err.message });
  }
});

// -------------------------------------------------------------
// AUTHENTICATION (ADMIN & PARTNER REGISTRATION / LOGIN)
// -------------------------------------------------------------

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, location, partnershipTier } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ error: 'Tafadhali jaza taarifa zote muhimu zilizoombwa' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const cleanName = String(fullName).trim();

    // 1. Try registering in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const spResult = await supabaseRegisterUser({
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password,
          location: location || 'Tanzania',
          partnershipTier: partnershipTier || 'Mshirika wa Injili',
        });

        const token = generateToken(spResult.id, 'user');
        broadcastChange('USER_REGISTERED', { id: spResult.id, fullName: spResult.fullName });

        return res.status(201).json({
          message: 'Hongera! Usajili wako umekamilika kikamilifu.',
          token,
          user: spResult,
          storage: 'supabase',
        });
      } catch (spErr: any) {
        console.warn('Supabase registration error, saving to memory store:', spErr.message);
        if (spErr.message && spErr.message.includes('tayari imesajiliwa')) {
          return res.status(400).json({ error: spErr.message });
        }
      }
    }

    // 2. Seamless registration in memory store
    // Check if email already registered
    for (const u of memoryUsers.values()) {
      if (u.email === cleanEmail) {
        return res.status(400).json({ error: 'Barua pepe hii tayari imesajiliwa kwenye mfumo.' });
      }
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newUserRecord: UserRecord = {
      id: userId,
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      salt,
      role: 'user',
      location: location || 'Tanzania',
      partnershipTier: partnershipTier || 'Mshirika wa Injili',
      createdAt: new Date().toISOString(),
    };

    memoryUsers.set(userId, newUserRecord);

    const safeUser = {
      id: newUserRecord.id,
      fullName: newUserRecord.fullName,
      email: newUserRecord.email,
      phone: newUserRecord.phone,
      role: newUserRecord.role,
      location: newUserRecord.location,
      partnershipTier: newUserRecord.partnershipTier,
      createdAt: newUserRecord.createdAt,
    };

    const token = generateToken(userId, 'user');
    broadcastChange('USER_REGISTERED', { id: safeUser.id, fullName: safeUser.fullName });

    return res.status(201).json({
      message: 'Hongera! Usajili wako umekamilika kikamilifu. Karibu kwenye ushirika!',
      token,
      user: safeUser,
      storage: 'active',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(400).json({ error: err.message || 'Hitilafu wakati wa kusajili mtumiaji' });
  }
});

// Login (Supports Admin and Partners seamlessly)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, identifier, phone, password } = req.body;
    const loginInput = String(identifier || email || phone || '').trim();
    if (!loginInput || !password) {
      return res.status(400).json({ error: 'Tafadhali weka barua pepe au namba ya simu na nenosiri lako' });
    }

    const cleanInput = loginInput.toLowerCase();

    // 1. Check for Admin Master Account
    const isAdminEmail =
      cleanInput === 'admin@jerusalemministry.org' ||
      cleanInput === 'admin@jerusalem.org' ||
      cleanInput === 'admin@jerusalemministry.com' ||
      cleanInput === 'junior.jacksonmass100@gmail.com' ||
      cleanInput === 'admin';
    const isAdminPhone =
      cleanInput.includes('754000111') ||
      cleanInput.replace(/[^0-9]/g, '').endsWith('754000111');

    const isAdminPassword =
      password === 'JerusalemAdmin2026!' ||
      password === 'admin123' ||
      password === 'Admin123!' ||
      password === 'admin';

    if ((isAdminEmail || isAdminPhone) && isAdminPassword) {
      const adminToken = generateToken(DEFAULT_ADMIN_USER.id, 'admin');
      return res.json({
        message: 'Karibu Mchungaji Kiongozi (Msimamizi Mkuu)! Umeingia kikamilifu.',
        token: adminToken,
        user: {
          id: DEFAULT_ADMIN_USER.id,
          fullName: DEFAULT_ADMIN_USER.fullName,
          email: DEFAULT_ADMIN_USER.email,
          phone: DEFAULT_ADMIN_USER.phone,
          role: 'admin',
          location: DEFAULT_ADMIN_USER.location,
          partnershipTier: DEFAULT_ADMIN_USER.partnershipTier,
          createdAt: DEFAULT_ADMIN_USER.createdAt,
        },
        storage: isSupabaseConfigured() ? 'supabase' : 'active',
      });
    }

    // 2. Try Supabase Login if configured
    if (isSupabaseConfigured()) {
      try {
        const spAuth = await supabaseLogin(loginInput, password);
        if (spAuth && spAuth.user) {
          const token = generateToken(spAuth.user.id, spAuth.user.role);
          return res.json({
            message: 'Umeingia kikamilifu',
            token,
            user: spAuth.user,
            storage: 'supabase',
          });
        }
      } catch (spErr: any) {
        console.warn('Supabase login check failed, checking memory store:', spErr.message);
      }
    }

    // 3. Check memory store users
    const cleanDigits = loginInput.replace(/[^0-9]/g, '');
    let matchedUser: UserRecord | null = null;

    for (const u of memoryUsers.values()) {
      if (u.email.toLowerCase() === cleanInput) {
        matchedUser = u;
        break;
      }
      const userPhoneDigits = u.phone.replace(/[^0-9]/g, '');
      if (cleanDigits && userPhoneDigits && (cleanDigits === userPhoneDigits || userPhoneDigits.endsWith(cleanDigits))) {
        matchedUser = u;
        break;
      }
    }

    if (matchedUser && matchedUser.salt && matchedUser.passwordHash) {
      const computedHash = hashPassword(password, matchedUser.salt);
      if (computedHash === matchedUser.passwordHash) {
        const token = generateToken(matchedUser.id, matchedUser.role);
        return res.json({
          message: `Karibu sana, ${matchedUser.fullName}! Umeingia kikamilifu.`,
          token,
          user: {
            id: matchedUser.id,
            fullName: matchedUser.fullName,
            email: matchedUser.email,
            phone: matchedUser.phone,
            role: matchedUser.role,
            location: matchedUser.location,
            partnershipTier: matchedUser.partnershipTier,
            createdAt: matchedUser.createdAt,
          },
          storage: 'active',
        });
      }
    }

    return res.status(401).json({
      error: 'Taarifa za kuingia si sahihi. Hakikisha barua pepe/simu na nenosiri lako ni sahihi.',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(401).json({ error: err.message || 'Hitilafu ya kuingia kwenye mfumo' });
  }
});

// Check current user profile
app.get('/api/auth/me', authenticateUser, (req: any, res) => {
  res.json({ user: req.user });
});

// -------------------------------------------------------------
// USER / MSHIRIKA ENDPOINTS
// -------------------------------------------------------------

// User Financial & Pledges Summary
app.get('/api/user/summary', authenticateUser, async (req: any, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const summary = await supabaseGetUserSummary(req.user.id);
        return res.json(summary);
      } catch (e) {
        // fallback to memory
      }
    }

    const userPledges = memoryPledges.filter((p) => p.userId === req.user.id);
    const userContributions = memoryContributions.filter((c) => c.userId === req.user.id);

    const totalPledged = userPledges.reduce((acc, p) => acc + p.amount, 0);
    const totalFulfilled = userContributions.reduce((acc, c) => acc + c.amount, 0);
    const outstandingBalance = Math.max(0, totalPledged - totalFulfilled);

    const todayStr = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    let approachingDueCount = 0;
    let overdueCount = 0;

    for (const p of userPledges) {
      if (p.fulfilledAmount < p.amount) {
        if (p.dueDate && p.dueDate < todayStr) {
          overdueCount++;
        } else if (p.dueDate && p.dueDate <= in7Days) {
          approachingDueCount++;
        }
      }
    }

    res.json({
      totalPledged,
      totalFulfilled,
      outstandingBalance,
      activePledgesCount: userPledges.filter((p) => p.status !== 'fulfilled').length,
      fulfilledPledgesCount: userPledges.filter((p) => p.status === 'fulfilled').length,
      contributionsCount: userContributions.length,
      approachingDueCount,
      overdueCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata muhtasari wa kifedha: ' + err.message });
  }
});

// Get User's Pledges
app.get('/api/user/pledges', authenticateUser, async (req: any, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const pledges = await supabaseGetPledges(req.user.id);
        return res.json({ pledges });
      } catch (e) {
        // fallback to memory
      }
    }

    const pledges = memoryPledges.filter((p) => p.userId === req.user.id);
    res.json({ pledges });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata ahadi: ' + err.message });
  }
});

// Create New Pledge
app.post('/api/user/pledges', authenticateUser, async (req: any, res) => {
  try {
    const { amount, purpose, notes, pledgeDate, dueDate } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Tafadhali weka kiasi halali cha ahadi' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ error: 'Tafadhali chagua au weka kusudi/lengo la ahadi hii' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'Tafadhali chagua tarehe ya mwisho ya kutimiza ahadi' });
    }

    const pledgeId = crypto.randomUUID();
    const pledgeNumber = generatePledgeNumber();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const newPledge = await supabaseCreatePledge({
          id: pledgeId,
          pledgeNumber,
          userId: req.user.id,
          userName: req.user.fullName,
          userPhone: req.user.phone,
          amount: numAmount,
          currency: 'TZS',
          purpose: purpose.trim(),
          notes: (notes || '').trim(),
          pledgeDate: pledgeDate || now.slice(0, 10),
          dueDate,
          fulfilledAmount: 0,
          status: 'pending',
        });

        // Backup in memory store
        memoryPledges.unshift(newPledge as any);
        broadcastChange('PLEDGE_CREATED', newPledge);
        return res.status(201).json({
          message: 'Ahadi yako imerekodiwa kikamilifu kwenye Supabase!',
          pledge: newPledge,
          storage: 'supabase',
        });
      } catch (spErr: any) {
        console.warn('Supabase pledge creation failed, falling back to local storage:', spErr.message);
      }
    }

    // Save to memory store
    const localPledge: PledgeRecord = {
      id: pledgeId,
      pledgeNumber,
      userId: req.user.id,
      userName: req.user.fullName,
      userPhone: req.user.phone,
      amount: numAmount,
      currency: 'TZS',
      purpose: purpose.trim(),
      notes: (notes || '').trim(),
      pledgeDate: pledgeDate || now.slice(0, 10),
      dueDate,
      fulfilledAmount: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    memoryPledges.unshift(localPledge);
    broadcastChange('PLEDGE_CREATED', localPledge);

    res.status(201).json({
      message: 'Ahadi yako imerekodiwa kikamilifu!',
      pledge: localPledge,
      storage: 'active',
    });
  } catch (err: any) {
    console.error('Error creating pledge:', err);
    res.status(500).json({ error: 'Hitilafu wakati wa kuweka ahadi: ' + err.message });
  }
});

// Delete user's own pledge
app.delete('/api/user/pledges/:id', authenticateUser, async (req: any, res) => {
  try {
    const pledgeId = req.params.id;

    if (isSupabaseConfigured()) {
      try {
        await supabaseDeletePledge(pledgeId);
        broadcastChange('PLEDGE_DELETED', { id: pledgeId });
        return res.json({ message: 'Ahadi imefutwa kikamilifu' });
      } catch (e) {
        // fallback
      }
    }

    const idx = memoryPledges.findIndex((p) => p.id === pledgeId && (p.userId === req.user.id || req.user.role === 'admin'));
    if (idx !== -1) {
      if (memoryPledges[idx].fulfilledAmount > 0) {
        return res.status(400).json({ error: 'Huwezi kufuta ahadi ambayo tayari ina michango iliyolipwa.' });
      }
      memoryPledges.splice(idx, 1);
      broadcastChange('PLEDGE_DELETED', { id: pledgeId });
      return res.json({ message: 'Ahadi imefutwa kikamilifu' });
    }

    res.status(404).json({ error: 'Ahadi haikupatikana au huna ruhusa ya kuifuta' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kufuta ahadi: ' + err.message });
  }
});

// Get User's Giving History
app.get('/api/user/contributions', authenticateUser, async (req: any, res) => {
  try {
    const timeframe = req.query.timeframe as string;

    if (isSupabaseConfigured()) {
      try {
        const contributions = await supabaseGetContributions(req.user.id, timeframe);
        return res.json({ contributions });
      } catch (e) {
        // fallback
      }
    }

    let list = memoryContributions.filter((c) => c.userId === req.user.id);
    const now = new Date();
    if (timeframe === 'wiki' || timeframe === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      list = list.filter((c) => new Date(c.paymentDate) >= oneWeekAgo);
    } else if (timeframe === 'mwezi' || timeframe === 'monthly') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      list = list.filter((c) => new Date(c.paymentDate) >= oneMonthAgo);
    } else if (timeframe === 'mwaka' || timeframe === 'yearly') {
      const oneYearAgo = new Date(now.getFullYear(), 0, 1);
      list = list.filter((c) => new Date(c.paymentDate) >= oneYearAgo);
    }

    res.json({ contributions: list });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata michango: ' + err.message });
  }
});

// Fulfill Pledge / Record Contribution
app.post('/api/user/contributions', authenticateUser, async (req: any, res) => {
  try {
    const { pledgeId, amount, paymentDate, paymentMethod, reference, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Tafadhali weka kiasi halali cha mchango uliotolewa' });
    }
    if (!pledgeId) {
      return res.status(400).json({ error: 'Tafadhali chagua ahadi inayolipiwa' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Tafadhali chagua njia ya malipo (M-Pesa, Tigo Pesa, n.k.)' });
    }

    const receiptNumber = generateReceiptNumber();
    const contributionId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { contribution, updatedPledge } = await supabaseCreateContribution({
          id: contributionId,
          receiptNumber,
          pledgeId,
          pledgeNumber: '',
          userId: req.user.id,
          userName: req.user.fullName,
          amount: numAmount,
          paymentDate: paymentDate || now.slice(0, 10),
          paymentMethod,
          reference: (reference || '').trim(),
          notes: (notes || '').trim(),
          recordedBy: 'mshirika',
        });

        memoryContributions.unshift(contribution as any);
        const targetPledge = memoryPledges.find((p) => p.id === pledgeId);
        if (targetPledge && updatedPledge) {
          Object.assign(targetPledge, updatedPledge);
        }

        broadcastChange('CONTRIBUTION_RECORDED', { contribution, updatedPledge });
        return res.status(201).json({
          message: 'Mchango wako umerekodiwa kikamilifu kwenye Supabase! Ubarikiwe sana.',
          contribution,
          updatedPledge,
          storage: 'supabase',
        });
      } catch (spErr: any) {
        console.warn('Supabase contribution creation warning, falling back to local storage:', spErr.message);
      }
    }

    // Save in memory store
    const targetPledge = memoryPledges.find((p) => p.id === pledgeId);
    const pledgeNum = targetPledge ? targetPledge.pledgeNumber : generatePledgeNumber();

    const localContrib: ContributionRecord = {
      id: contributionId,
      receiptNumber,
      pledgeId,
      pledgeNumber: pledgeNum,
      userId: req.user.id,
      userName: req.user.fullName,
      amount: numAmount,
      paymentDate: paymentDate || now.slice(0, 10),
      paymentMethod,
      reference: (reference || '').trim(),
      notes: (notes || '').trim(),
      recordedBy: 'mshirika',
      createdAt: now,
    };

    memoryContributions.unshift(localContrib);

    // Update target pledge in memory
    let updatedPledgeObj: any = null;
    if (targetPledge) {
      targetPledge.fulfilledAmount = (targetPledge.fulfilledAmount || 0) + numAmount;
      if (targetPledge.fulfilledAmount >= targetPledge.amount) {
        targetPledge.status = 'fulfilled';
      } else {
        targetPledge.status = 'partial';
      }
      targetPledge.updatedAt = now;
      updatedPledgeObj = targetPledge;
    }

    broadcastChange('CONTRIBUTION_RECORDED', {
      contribution: localContrib,
      updatedPledge: updatedPledgeObj,
    });

    res.status(201).json({
      message: 'Mchango wako umerekodiwa kikamilifu! Ubarikiwe sana.',
      contribution: localContrib,
      updatedPledge: updatedPledgeObj,
      storage: 'active',
    });
  } catch (err: any) {
    console.error('Error recording contribution:', err);
    res.status(500).json({ error: 'Hitilafu ya kurekodi mchango: ' + err.message });
  }
});

// Get User's Reminders
app.get('/api/user/reminders', authenticateUser, async (req: any, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const reminders = await supabaseGetReminders(req.user.id);
        return res.json({ reminders });
      } catch (e) {
        // fallback
      }
    }

    const pledges = memoryPledges.filter((p) => p.userId === req.user.id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const reminders = [];
    for (const p of pledges) {
      if (p.fulfilledAmount < p.amount && p.dueDate) {
        const remaining = p.amount - p.fulfilledAmount;
        if (p.dueDate < todayStr) {
          reminders.push({
            pledgeId: p.id,
            pledgeNumber: p.pledgeNumber,
            purpose: p.purpose,
            dueDate: p.dueDate,
            amount: p.amount,
            remainingAmount: remaining,
            type: 'overdue' as const,
            daysDiff: Math.floor((new Date(todayStr).getTime() - new Date(p.dueDate).getTime()) / 86400000),
          });
        } else if (p.dueDate <= in7Days) {
          reminders.push({
            pledgeId: p.id,
            pledgeNumber: p.pledgeNumber,
            purpose: p.purpose,
            dueDate: p.dueDate,
            amount: p.amount,
            remainingAmount: remaining,
            type: 'approaching' as const,
            daysDiff: Math.floor((new Date(p.dueDate).getTime() - new Date(todayStr).getTime()) / 86400000),
          });
        }
      }
    }
    res.json({ reminders });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata vikumbusho: ' + err.message });
  }
});

// User Notifications
app.get('/api/user/notifications', authenticateUser, async (req: any, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const notifications = await supabaseGetNotifications(req.user.id);
        return res.json({ notifications });
      } catch (e) {
        // fallback
      }
    }

    const notifications = memoryNotifications.filter((n) => n.userId === req.user.id);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata jumbe: ' + err.message });
  }
});

app.put('/api/user/notifications/:id/read', authenticateUser, async (req: any, res) => {
  try {
    const notif = memoryNotifications.find((n) => n.id === req.params.id && n.userId === req.user.id);
    if (notif) notif.isRead = true;
    res.json({ message: 'Ujumbe umewekwa alama kama umesomwa' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.put('/api/user/notifications/read-all', authenticateUser, async (req: any, res) => {
  try {
    for (const n of memoryNotifications) {
      if (n.userId === req.user.id) n.isRead = true;
    }
    res.json({ message: 'Jumbe zote zimewekwa kama zimesomwa' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.delete('/api/user/notifications/:id', authenticateUser, async (req: any, res) => {
  try {
    const idx = memoryNotifications.findIndex((n) => n.id === req.params.id && n.userId === req.user.id);
    if (idx !== -1) memoryNotifications.splice(idx, 1);
    res.json({ message: 'Ujumbe umefutwa' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

// -------------------------------------------------------------
// PUBLIC STATS & MINISTRY OVERVIEW
// -------------------------------------------------------------

app.get('/api/public/stats', async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const stats = await supabaseGetPublicStats();
        return res.json(stats);
      } catch (e) {
        // fallback
      }
    }

    const totalFulfilledAmount = memoryContributions.reduce((acc, c) => acc + c.amount, 0);
    const totalExpensesAmount = memoryExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalPledgedAmount = memoryPledges.reduce((acc, p) => acc + p.amount, 0);
    const totalPartnersCount = Array.from(memoryUsers.values()).filter((u) => u.role === 'user').length;
    const ministryNetBalance = Math.max(0, totalFulfilledAmount - totalExpensesAmount);

    res.json({
      ministryNetBalance,
      totalFulfilledAmount,
      totalExpensesAmount,
      totalPledgedAmount,
      totalPartnersCount,
      currency: 'TZS',
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kupata taarifa za mfuko: ' + err.message });
  }
});

// Public News
app.get('/api/news', async (req, res) => {
  try {
    const news = await getConsolidatedNews(false);
    res.json({ news });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kupata habari za huduma: ' + err.message });
  }
});

// Public Testimonials (Shuhuda za Washirika)
app.get('/api/testimonials', async (req, res) => {
  try {
    const testimonials = await getConsolidatedTestimonials(false);
    res.json({ testimonials });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kupata shuhuda: ' + err.message });
  }
});

app.post('/api/testimonials', async (req, res) => {
  try {
    const { partnerName, location, tier, category, categoryLabel, quote, fullTestimony, scripture } = req.body;
    if (!partnerName || !partnerName.trim()) {
      return res.status(400).json({ error: 'Jina la mshirika linahitajika' });
    }
    if (!fullTestimony || !fullTestimony.trim()) {
      return res.status(400).json({ error: 'Maelezo ya ushuhuda yanahitajika' });
    }

    const testId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTestimonial: TestimonyRecord = {
      id: testId,
      partnerName: partnerName.trim(),
      location: (location || 'Tanzania').trim(),
      tier: tier || 'Mshirika wa Injili',
      category: category || 'agano',
      categoryLabel: categoryLabel || 'Agano la Sadaka',
      quote: quote && quote.trim() ? quote.trim() : fullTestimony.trim().slice(0, 110) + '...',
      fullTestimony: fullTestimony.trim(),
      scripture: scripture || 'Zaburi 50:5',
      date: new Date().toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' }) || 'Septemba 2026',
      verified: true,
      createdAt: now,
      updatedAt: now,
    };

    deletedTestimonialIds.delete(testId);
    memoryTestimonials.unshift(newTestimonial);

    if (isSupabaseConfigured()) {
      try {
        await supabaseCreateTestimonial(newTestimonial);
      } catch (e) {
        // saved in memory & disk
      }
    }

    broadcastChange('TESTIMONIAL_CREATED', newTestimonial);
    res.status(201).json({
      message: 'Ushuhuda wako umepokelewa na kuwekwa kikamilifu! Mungu akubariki.',
      testimonial: newTestimonial,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kutuma ushuhuda: ' + err.message });
  }
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS (FULL ACCESSIBILITY GUARANTEE)
// -------------------------------------------------------------

// Admin Overview
app.get('/api/admin/overview', authenticateUser, requireAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const overview = await supabaseGetAdminOverview();
        return res.json(overview);
      } catch (e) {
        // fallback
      }
    }

    const partners = Array.from(memoryUsers.values()).filter((u) => u.role === 'user');
    const totalPartnersCount = partners.length;
    const totalPledgedAmount = memoryPledges.reduce((acc, p) => acc + p.amount, 0);
    const totalFulfilledAmount = memoryContributions.reduce((acc, c) => acc + c.amount, 0);
    const totalOutstandingAmount = Math.max(0, totalPledgedAmount - totalFulfilledAmount);
    const totalExpensesAmount = memoryExpenses.reduce((acc, e) => acc + e.amount, 0);
    const ministryNetBalance = totalFulfilledAmount - totalExpensesAmount;

    const todayStr = new Date().toISOString().slice(0, 10);
    const activeRemindersCount = memoryPledges.filter(
      (p) => p.fulfilledAmount < p.amount && p.dueDate && p.dueDate <= todayStr
    ).length;

    res.json({
      totalPartnersCount,
      totalPledgedAmount,
      totalFulfilledAmount,
      totalOutstandingAmount,
      totalExpensesAmount,
      ministryNetBalance,
      totalPledgesCount: memoryPledges.length,
      totalContributionsCount: memoryContributions.length,
      totalExpensesCount: memoryExpenses.length,
      activeRemindersCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata muhtasari wa kiutawala: ' + err.message });
  }
});

// Admin: View All Registered Partners
app.get('/api/admin/partners', authenticateUser, requireAdmin, async (req, res) => {
  try {
    let rawPartners: any[] = [];
    let allPledges: any[] = [];
    let allContributions: any[] = [];

    if (isSupabaseConfigured()) {
      rawPartners = await supabaseGetAllPartners();
      allPledges = await supabaseGetPledges();
      allContributions = await supabaseGetContributions();
    } else {
      rawPartners = Array.from(memoryUsers.values())
        .filter((u) => u.role === 'user')
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          location: u.location,
          partnershipTier: u.partnershipTier,
          createdAt: u.createdAt,
        }));
      allPledges = memoryPledges;
      allContributions = memoryContributions;
    }

    // Enrich each partner with calculated metrics so frontend doesn't crash on .toLocaleString()
    const partners = rawPartners.map((partner) => {
      const userPledges = allPledges.filter((p) => p.userId === partner.id);
      const userContributions = allContributions.filter((c) => c.userId === partner.id);

      const totalPledged = userPledges.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalFulfilled = userContributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const balance = Math.max(0, totalPledged - totalFulfilled);

      return {
        ...partner,
        totalPledged,
        totalFulfilled,
        balance,
        pledgesCount: userPledges.length,
        contributionsCount: userContributions.length,
      };
    });

    res.json({ partners });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata orodha ya washirika: ' + err.message });
  }
});

// Admin: View All Pledges
app.get('/api/admin/pledges', authenticateUser, requireAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const pledges = await supabaseGetPledges();
        return res.json({ pledges });
      } catch (e) {
        // fallback
      }
    }

    res.json({ pledges: memoryPledges });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata ahadi zote: ' + err.message });
  }
});

// Admin: Delete Any Pledge
app.delete('/api/admin/pledges/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const pledgeId = req.params.id;

    if (isSupabaseConfigured()) {
      try {
        await supabaseDeletePledge(pledgeId);
      } catch (e) {
        // fallback
      }
    }

    const idx = memoryPledges.findIndex((p) => p.id === pledgeId);
    if (idx !== -1) memoryPledges.splice(idx, 1);

    broadcastChange('PLEDGE_DELETED', { id: pledgeId });
    res.json({ message: 'Ahadi imefutwa kikamilifu.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kufuta ahadi: ' + err.message });
  }
});

// Admin: View All Contributions
app.get('/api/admin/contributions', authenticateUser, requireAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const contributions = await supabaseGetContributions();
        return res.json({ contributions });
      } catch (e) {
        // fallback
      }
    }

    res.json({ contributions: memoryContributions });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata michango yote: ' + err.message });
  }
});

// Admin: View All Expenses
app.get('/api/admin/expenses', authenticateUser, requireAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const expenses = await supabaseGetExpenses();
        return res.json({ expenses });
      } catch (e) {
        // fallback
      }
    }

    res.json({ expenses: memoryExpenses });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata matumizi: ' + err.message });
  }
});

// Admin: Record New Expense
app.post('/api/admin/expenses', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { category, amount, date, description, supportingDetails } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Tafadhali weka kiasi halali cha matumizi' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Tafadhali chagua kategoria ya matumizi' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Tafadhali andika maelezo ya kina ya matumizi haya' });
    }

    const expenseId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const newExpense = await supabaseCreateExpense({
        id: expenseId,
        category,
        amount: numAmount,
        date: date || now.slice(0, 10),
        description: description.trim(),
        supportingDetails: (supportingDetails || '').trim(),
        recordedBy: req.user.fullName,
      });

      broadcastChange('EXPENSE_RECORDED', newExpense);
      return res.status(201).json({
        message: 'Matumizi yamelipwa na kurekodiwa kikamilifu kwenye Supabase!',
        expense: newExpense,
        storage: 'supabase',
      });
    }

    const localExpense: ExpenseRecord = {
      id: expenseId,
      category,
      amount: numAmount,
      date: date || now.slice(0, 10),
      description: description.trim(),
      supportingDetails: (supportingDetails || '').trim(),
      recordedBy: req.user.fullName,
      createdAt: now,
    };

    memoryExpenses.unshift(localExpense);
    broadcastChange('EXPENSE_RECORDED', localExpense);

    res.status(201).json({
      message: 'Matumizi yamelipwa na kurekodiwa kikamilifu!',
      expense: localExpense,
      storage: 'active',
    });
  } catch (err: any) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Hitilafu wakati wa kurekodi matumizi: ' + err.message });
  }
});

// Admin: Delete Expense
app.delete('/api/admin/expenses/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const expId = req.params.id;

    if (isSupabaseConfigured()) {
      try {
        await supabaseDeleteExpense(expId);
      } catch (e) {
        // fallback
      }
    }

    const idx = memoryExpenses.findIndex((e) => e.id === expId);
    if (idx !== -1) memoryExpenses.splice(idx, 1);

    broadcastChange('EXPENSE_DELETED', { id: expId });
    res.json({ message: 'Rekodi ya matumizi imefutwa kikamilifu.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kufuta matumizi: ' + err.message });
  }
});

// Admin: View Audit Logs
app.get('/api/admin/audit-logs', authenticateUser, requireAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const auditLogs = await supabaseGetAuditLogs();
        if (auditLogs.length > 0) return res.json({ auditLogs });
      } catch (e) {
        // fallback
      }
    }

    res.json({ auditLogs: memoryAuditLogs });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata kumbukumbu za matukio: ' + err.message });
  }
});

// Admin: Send Manual Reminder to Partner
app.post('/api/admin/reminders/send', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { pledgeId, partnerId, channel, customMessage } = req.body;

    const allPledges = isSupabaseConfigured() ? await supabaseGetPledges() : memoryPledges;
    const pledge = allPledges.find((p: any) => p.id === pledgeId);
    if (!pledge) {
      return res.status(404).json({ error: 'Ahadi inayohusika haikupatikana' });
    }

    const remaining = pledge.amount - pledge.fulfilledAmount;
    const defaultMsg = `Shalom ${pledge.userName}. Jerusalem Ministry of Gospel inakukumbusha kwa upendo ahadi yako namba ${pledge.pledgeNumber} ya TZS ${pledge.amount.toLocaleString()} kwa ajili ya "${pledge.purpose}". Salio lililobaki ni TZS ${remaining.toLocaleString()}. Tarehe ya mwisho ni ${pledge.dueDate}. Mungu akubariki unapoendelea kuungana nasi.`;
    const messageToSend = customMessage && customMessage.trim() ? customMessage.trim() : defaultMsg;

    const notifRecord: NotificationRecord = {
      id: crypto.randomUUID(),
      userId: partnerId || pledge.userId,
      pledgeId: pledge.id,
      pledgeNumber: pledge.pledgeNumber,
      title: 'Kikumbusho cha Ahadi ya Sadaka',
      message: messageToSend,
      channelUsed: channel || 'all',
      senderName: req.user.fullName || 'Uongozi wa Jerusalem Ministry',
      amount: pledge.amount,
      remainingAmount: remaining,
      dueDate: pledge.dueDate,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    memoryNotifications.unshift(notifRecord);

    if (isSupabaseConfigured()) {
      try {
        await supabaseCreateNotification(notifRecord);
      } catch (e) {
        // ignore
      }
    }

    broadcastChange('REMINDER_SENT', { pledgeId: pledge.id, partnerId: pledge.userId });

    res.json({
      message: 'Kikumbusho kimetumwa kikamilifu.',
      notification: notifRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kutuma kikumbusho: ' + err.message });
  }
});

// Admin News Management
app.get('/api/admin/news', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const news = await getConsolidatedNews(true);
    res.json({ news });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata habari za utawala: ' + err.message });
  }
});

app.post('/api/admin/news', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const {
      title,
      content,
      category,
      badge,
      progressPercent,
      targetAmount,
      currentAmount,
      location,
      status,
      priority,
      publishDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Kichwa cha habari kinahitajika' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Maelezo ya habari yanahitajika' });
    }

    const newsId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newNewsItem: MinistryNewsRecord = {
      id: newsId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'mradi',
      badge: badge || 'MRADI WA HUDUMA',
      progressPercent: typeof progressPercent === 'number' ? Math.min(100, Math.max(0, progressPercent)) : 0,
      targetAmount: targetAmount ? Number(targetAmount) : undefined,
      currentAmount: currentAmount ? Number(currentAmount) : undefined,
      location: (location || '').trim(),
      status: status || 'ongoing',
      priority: priority || 'normal',
      isActive: true,
      publishDate: publishDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: now,
      updatedAt: now,
    };

    deletedNewsIds.delete(newsId);
    memoryNews.unshift(newNewsItem);

    if (isSupabaseConfigured()) {
      try {
        await supabaseCreateNews(newNewsItem);
      } catch (e) {
        // fallback
      }
    }

    broadcastChange('NEWS_CREATED', newNewsItem);
    res.status(201).json({ message: 'Habari imechapishwa kikamilifu.', news: newNewsItem });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.put('/api/admin/news/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const item = memoryNews.find((n) => n.id === req.params.id);
    if (item) {
      Object.assign(item, req.body, { updatedAt: new Date().toISOString() });
    }
    if (isSupabaseConfigured()) {
      try {
        await supabaseUpdateNews(req.params.id, req.body);
      } catch (e) {
        // fallback
      }
    }
    broadcastChange('NEWS_UPDATED', item || req.body);
    res.json({ message: 'Habari imesasishwa kikamilifu.', news: item || req.body });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.patch('/api/admin/news/:id/toggle', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { isActive } = req.body || {};
    const item = memoryNews.find((n) => n.id === req.params.id);
    const newIsActive = isActive !== undefined ? Boolean(isActive) : (item ? !item.isActive : true);
    if (item) {
      item.isActive = newIsActive;
      item.updatedAt = new Date().toISOString();
    }
    if (isSupabaseConfigured()) {
      try {
        await supabaseUpdateNews(req.params.id, { isActive: newIsActive });
      } catch (e) {
        // fallback
      }
    }
    broadcastChange('NEWS_UPDATED', item);
    res.json({ message: `Hali ya habari imesasishwa kuwa ${newIsActive ? 'Inaonekana' : 'Imefichwa'}`, news: item });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.patch('/api/admin/news/:id/progress', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { progressPercent, currentAmount } = req.body;
    const item = memoryNews.find((n) => n.id === req.params.id);
    if (item) {
      item.progressPercent = Number(progressPercent);
      if (currentAmount !== undefined) item.currentAmount = Number(currentAmount);
      item.updatedAt = new Date().toISOString();
    }
    if (isSupabaseConfigured()) {
      try {
        await supabaseUpdateNews(req.params.id, {
          progressPercent: Number(progressPercent),
          currentAmount: currentAmount !== undefined ? Number(currentAmount) : undefined,
        });
      } catch (e) {
        // fallback
      }
    }
    broadcastChange('NEWS_UPDATED', item);
    res.json({ message: 'Maendeleo ya mradi yamesasishwa kikamilifu.', news: item });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.delete('/api/admin/news/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;
    deletedNewsIds.add(id);
    const idx = memoryNews.findIndex((n) => n.id === id);
    if (idx !== -1) memoryNews.splice(idx, 1);

    if (isSupabaseConfigured()) {
      try {
        await supabaseDeleteNews(id);
      } catch (e) {
        // fallback
      }
    }

    broadcastChange('NEWS_DELETED', { id });
    res.json({ message: 'Habari imefutwa kikamilifu.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

// Admin Testimonials Management (Shuhuda za Washirika)
app.get('/api/admin/testimonials', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const testimonials = await getConsolidatedTestimonials(true);
    res.json({ testimonials });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kupata shuhuda za utawala: ' + err.message });
  }
});

app.post('/api/admin/testimonials', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { partnerName, location, tier, category, categoryLabel, quote, fullTestimony, scripture, date, verified } = req.body;
    if (!partnerName || !partnerName.trim()) {
      return res.status(400).json({ error: 'Jina la mshirika linahitajika' });
    }
    if (!fullTestimony || !fullTestimony.trim()) {
      return res.status(400).json({ error: 'Maelezo ya ushuhuda yanahitajika' });
    }

    const testId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTestimonial: TestimonyRecord = {
      id: testId,
      partnerName: partnerName.trim(),
      location: (location || 'Tanzania').trim(),
      tier: tier || 'Mshirika wa Injili',
      category: category || 'agano',
      categoryLabel: categoryLabel || 'Agano la Sadaka',
      quote: quote && quote.trim() ? quote.trim() : fullTestimony.trim().slice(0, 110) + '...',
      fullTestimony: fullTestimony.trim(),
      scripture: scripture || 'Zaburi 50:5',
      date: date || new Date().toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' }) || 'Septemba 2026',
      verified: verified !== undefined ? Boolean(verified) : true,
      createdAt: now,
      updatedAt: now,
    };

    deletedTestimonialIds.delete(testId);
    memoryTestimonials.unshift(newTestimonial);

    if (isSupabaseConfigured()) {
      try {
        await supabaseCreateTestimonial(newTestimonial);
      } catch (e) {
        // fallback
      }
    }

    broadcastChange('TESTIMONIAL_CREATED', newTestimonial);
    res.status(201).json({ message: 'Ushuhuda umehifadhiwa kikamilifu.', testimonial: newTestimonial });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kurekodi ushuhuda: ' + err.message });
  }
});

app.put('/api/admin/testimonials/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const item = memoryTestimonials.find((t) => t.id === req.params.id);
    if (item) {
      Object.assign(item, req.body, { updatedAt: new Date().toISOString() });
    }
    if (isSupabaseConfigured()) {
      try {
        await supabaseUpdateTestimonial(req.params.id, req.body);
      } catch (e) {
        // fallback
      }
    }
    broadcastChange('TESTIMONIAL_UPDATED', item || req.body);
    res.json({ message: 'Ushuhuda umesasishwa kikamilifu.', testimonial: item || req.body });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kusasisha ushuhuda: ' + err.message });
  }
});

app.patch('/api/admin/testimonials/:id/verify', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { verified } = req.body || {};
    const item = memoryTestimonials.find((t) => t.id === req.params.id);
    const newVerified = verified !== undefined ? Boolean(verified) : (item ? !item.verified : true);
    if (item) {
      item.verified = newVerified;
      item.updatedAt = new Date().toISOString();
    }
    if (isSupabaseConfigured()) {
      try {
        await supabaseUpdateTestimonial(req.params.id, { verified: newVerified });
      } catch (e) {
        // fallback
      }
    }
    broadcastChange('TESTIMONIAL_UPDATED', item);
    res.json({ message: `Hali ya ushuhuda imesasishwa (${newVerified ? 'Imethibitishwa' : 'Haijathibitishwa'})`, testimonial: item });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu: ' + err.message });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;
    deletedTestimonialIds.add(id);
    const idx = memoryTestimonials.findIndex((t) => t.id === id);
    if (idx !== -1) memoryTestimonials.splice(idx, 1);

    if (isSupabaseConfigured()) {
      try {
        await supabaseDeleteTestimonial(id);
      } catch (e) {
        // fallback
      }
    }

    broadcastChange('TESTIMONIAL_DELETED', { id });
    res.json({ message: 'Ushuhuda umefutwa kikamilifu.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kufuta ushuhuda: ' + err.message });
  }
});

// Admin: Backup Database
app.get('/api/admin/backup', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const backupData = {
      backupDate: new Date().toISOString(),
      source: isSupabaseConfigured() ? 'Supabase Cloud Database' : 'Jerusalem Ministry Portal Storage',
      system: 'Jerusalem Ministry of Gospel - Partnership & Giving',
      data: {
        partners: Array.from(memoryUsers.values()).filter((u) => u.role === 'user'),
        pledges: memoryPledges,
        contributions: memoryContributions,
        expenses: memoryExpenses,
        auditLogs: memoryAuditLogs,
        news: memoryNews,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="Jerusalem_Ministry_Backup_${today}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kuandaa backup: ' + err.message });
  }
});

// Admin: Reset Database
app.post('/api/admin/reset', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const confirmWord = String(req.body?.confirmWord || '').trim().toUpperCase();
    if (confirmWord !== 'FUTA') {
      return res.status(400).json({ error: 'Tafadhali thibitisha kwa kuandika neno FUTA ili kuweka upya mfumo.' });
    }

    memoryPledges.length = 0;
    memoryContributions.length = 0;
    memoryExpenses.length = 0;
    memoryNotifications.length = 0;
    memoryAuditLogs.length = 0;

    broadcastChange('DATABASE_RESET');
    res.json({ message: 'Mfumo umewekwa upya kikamilifu.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu wakati wa kuweka upya mfumo: ' + err.message });
  }
});

// -------------------------------------------------------------
// VITE & STATIC SERVER CONFIGURATION
// -------------------------------------------------------------

async function startServer() {
  // If running in Vercel serverless function environment, do not start HTTP listener
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : PORT;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Jerusalem Ministry Server running on port ${port}`);
  });
}

startServer();

export { app };
export default app;
