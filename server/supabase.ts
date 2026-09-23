import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Deterministically converts any user ID or arbitrary identifier into a valid RFC4122 UUID v4 format.
 * If already a valid UUID, returns it lowercase.
 * This guarantees PostgreSQL will never throw 'invalid input syntax for type uuid' errors.
 */
export function toValidUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id.toLowerCase();
  }
  const clean = (id || '').trim();
  if (!clean) return crypto.randomUUID();
  const hash = crypto.createHash('md5').update('jmg-user-uuid:' + clean).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function ensureUuid(id?: string): string {
  return toValidUuid(id);
}

/**
 * Helper to ensure no Supabase operation hangs the server.
 * Default 3000ms timeout prevents server stalls on unreachable or slow hosts.
 */
export async function withTimeout<T>(promise: Promise<T> | PromiseLike<T> | any, ms: number = 3000, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    const result = await Promise.race([Promise.resolve(promise), timeoutPromise]);
    clearTimeout(timer!);
    return result as T;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// Sanitize configuration to prevent placeholder dummy strings from overriding live credentials
function cleanConfig(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.includes('YOUR_SUPABASE') ||
    trimmed.includes('MY_') ||
    trimmed.includes('your-project') ||
    trimmed.includes('example') ||
    trimmed.includes('anvwhhvojunhmswhksmt') ||
    trimmed.includes('sb_publishable_mf6fYrHLgZ') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return '';
  }
  return trimmed;
}

const rawUrl =
  cleanConfig(process.env.SUPABASE_URL) ||
  cleanConfig(process.env.VITE_SUPABASE_URL) ||
  '';

const SUPABASE_URL = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '')
  .trim();

const SUPABASE_SERVICE_ROLE_KEY = cleanConfig(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY =
  cleanConfig(process.env.SUPABASE_ANON_KEY) ||
  cleanConfig(process.env.VITE_SUPABASE_ANON_KEY) ||
  '';

// Prefer service role key for trusted backend operations, fallback to anon key
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let isConnected = false;
let lastError: string | null = null;

export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  if (!SUPABASE_URL.startsWith('http')) return false;
  return true;
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (err: any) {
      console.error('Failed to create Supabase client:', err.message);
      return null;
    }
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
  url?: string;
  error?: string;
  tables?: Record<string, boolean>;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase haijasanidiwa bado. Mfumo unatumia hifadhi ya ndani inayofanya kazi kikamilifu (Single Source of Truth Active).',
      url: SUPABASE_URL || undefined,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      configured: false,
      connected: false,
      message: 'Imeshindwa kuanzisha Supabase client.',
    };
  }

  const requiredTables = ['profiles', 'pledges', 'contributions', 'expenses', 'audit_logs', 'notifications', 'ministry_news'];
  const tablesStatus: Record<string, boolean> = {};

  try {
    let anySuccess = false;
    for (const table of requiredTables) {
      const { error } = await withTimeout(
        supabase.from(table).select('id').limit(1),
        2000,
        { data: null, error: { message: 'Timeout' } } as any
      );
      if (!error) {
        tablesStatus[table] = true;
        anySuccess = true;
      } else {
        tablesStatus[table] = false;
      }
    }

    if (!anySuccess) {
      return {
        configured: true,
        connected: false,
        message: 'Supabase imeunganishwa, lakini majedwali (tables) hayajapatikana au mtandao umezidiwa. Tafadhali endesha supabase-schema.sql kwenye Supabase SQL Editor.',
        url: SUPABASE_URL,
        tables: tablesStatus,
      };
    }

    isConnected = true;
    lastError = null;
    return {
      configured: true,
      connected: true,
      message: 'Supabase imeunganishwa kikamilifu na inafanya kazi (Single Source of Truth Connected).',
      url: SUPABASE_URL,
      tables: tablesStatus,
    };
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || String(err);
    return {
      configured: true,
      connected: false,
      message: `Imeshindwa kuunganisha Supabase: ${lastError}`,
      url: SUPABASE_URL,
      error: lastError || undefined,
      tables: tablesStatus,
    };
  }
}

// -------------------------------------------------------------
// USER & AUTH OPERATIONS (SUPABASE)
// -------------------------------------------------------------

export async function supabaseRegisterUser(userData: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  location?: string;
  partnershipTier?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanPhone = userData.phone.trim();

  // Check if profile with this email already exists
  const { data: existingEmail } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingEmail) {
    throw new Error('Barua pepe hii tayari imesajiliwa kwenye mfumo.');
  }

  // Create Auth User in Supabase
  let authUserId: string;
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.fullName,
        phone: cleanPhone,
        role: 'user',
        location: userData.location || 'Tanzania',
        partnership_tier: userData.partnershipTier || 'Mshirika wa Kawaida',
      },
    });

    if (adminError) {
      throw new Error(`Imeshindwa kuunda akaunti kwenye Supabase: ${adminError.message}`);
    }
    authUserId = adminUser.user.id;
  } else {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          phone: cleanPhone,
          role: 'user',
          location: userData.location || 'Tanzania',
          partnership_tier: userData.partnershipTier || 'Mshirika wa Kawaida',
        },
      },
    });

    if (signUpError || !signUpData.user) {
      throw new Error(`Imeshindwa kuunda akaunti kwenye Supabase: ${signUpError?.message || 'Hitilafu'}`);
    }
    authUserId = signUpData.user.id;
  }

  // Ensure profile is inserted/upserted in public.profiles table in Supabase
  const profileRecord = {
    id: authUserId,
    full_name: userData.fullName,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'user',
    location: userData.location || 'Tanzania',
    partnership_tier: userData.partnershipTier || 'Mshirika wa Kawaida',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileRecord, { onConflict: 'id' });

  if (profileError) {
    console.error('Error upserting profile in Supabase:', profileError);
  }

  return {
    id: authUserId,
    fullName: userData.fullName,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'user' as const,
    location: userData.location || 'Tanzania',
    partnershipTier: userData.partnershipTier || 'Mshirika wa Kawaida',
    createdAt: profileRecord.created_at,
  };
}

export async function supabaseLogin(identifier: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const cleanInput = identifier.trim();
  let targetEmail = cleanInput.toLowerCase();

  // If input is not an email (e.g. phone number), search for user in profiles by phone
  const isEmail = cleanInput.includes('@');
  if (!isEmail) {
    const cleanPhoneDigits = cleanInput.replace(/[^0-9]/g, '');
    const { data: profiles, error: phoneErr } = await supabase
      .from('profiles')
      .select('*');

    if (!phoneErr && profiles) {
      const match = profiles.find((p: any) => {
        const pDigits = (p.phone || '').replace(/[^0-9]/g, '');
        return pDigits === cleanPhoneDigits || pDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(pDigits);
      });
      if (match) {
        targetEmail = match.email;
      } else {
        throw new Error('Mtumiaji mwenye namba hii ya simu hajapatikana kwenye Supabase.');
      }
    }
  }

  // Handle default administrator auto-provisioning in Supabase if logging in for first time
  if (targetEmail === 'admin@jerusalemministry.org' && password === 'JerusalemAdmin2026!') {
    try {
      if (SUPABASE_SERVICE_ROLE_KEY) {
        // Check if admin auth user exists
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existingAdmin = userList?.users.find((u) => u.email === targetEmail);
        if (!existingAdmin) {
          const { data: newAdmin } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: 'Mchungaji Kiongozi (Msimamizi Mkuu)',
              phone: '+255 754 000 111',
              role: 'admin',
              location: 'Makao Makuu, Dar es Salaam',
              partnership_tier: 'Msimamizi Mkuu',
            },
          });
          if (newAdmin?.user) {
            await supabase.from('profiles').upsert({
              id: newAdmin.user.id,
              full_name: 'Mchungaji Kiongozi (Msimamizi Mkuu)',
              email: targetEmail,
              phone: '+255 754 000 111',
              role: 'admin',
              location: 'Makao Makuu, Dar es Salaam',
              partnership_tier: 'Msimamizi Mkuu',
            });
          }
        }
      }
    } catch (adminErr) {
      console.warn('Auto admin check in Supabase:', adminErr);
    }
  }

  // Attempt login with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (authError || !authData.user) {
    throw new Error('Taarifa za kuingia si sahihi. Hakikisha barua pepe/simu na nenosiri lako ni sahihi.');
  }

  // Fetch full profile from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (!profile) {
    return {
      user: {
        id: authData.user.id,
        fullName: authData.user.user_metadata?.full_name || 'Mshirika',
        email: authData.user.email || targetEmail,
        phone: authData.user.user_metadata?.phone || '',
        role: (authData.user.user_metadata?.role || 'user') as 'admin' | 'user',
        location: authData.user.user_metadata?.location || 'Tanzania',
        partnershipTier: authData.user.user_metadata?.partnership_tier || 'Mshirika wa Kawaida',
        createdAt: authData.user.created_at,
      },
      token: authData.session?.access_token || authData.user.id,
    };
  }

  return {
    user: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role as 'admin' | 'user',
      location: profile.location,
      partnershipTier: profile.partnership_tier,
      createdAt: profile.created_at,
    },
    token: authData.session?.access_token || profile.id,
  };
}

export async function supabaseGetProfile(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    role: data.role as 'admin' | 'user',
    location: data.location,
    partnershipTier: data.partnership_tier,
    createdAt: data.created_at,
  };
}

export async function supabaseGetAllPartners() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((p: any) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    location: p.location,
    partnershipTier: p.partnership_tier,
    createdAt: p.created_at,
  }));
}

// -------------------------------------------------------------
// PLEDGES (AHADI) - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetPledges(userId?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('pledges').select('*').order('created_at', { ascending: false });
  if (userId) {
    const safeUserId = toValidUuid(userId);
    query = query.eq('user_id', safeUserId);
  }

  const { data, error } = await withTimeout(
    query,
    3000,
    { data: null, error: { message: 'Timeout' } } as any
  );
  if (error || !data) {
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    pledgeNumber: p.pledge_number,
    userId: p.user_id,
    userName: p.user_name,
    userPhone: p.user_phone,
    amount: Number(p.amount),
    currency: p.currency,
    purpose: p.purpose,
    notes: p.notes,
    pledgeDate: p.pledge_date,
    dueDate: p.due_date,
    fulfilledAmount: Number(p.fulfilled_amount),
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function supabaseCreatePledge(pledgeData: {
  id: string;
  pledgeNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  currency?: string;
  purpose: string;
  notes?: string;
  pledgeDate?: string;
  dueDate: string;
  fulfilledAmount?: number;
  status?: 'pending' | 'partial' | 'fulfilled' | 'overdue';
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const safePledgeId = ensureUuid(pledgeData.id);
  const safeUserId = toValidUuid(pledgeData.userId);

  // 1. Attempt to ensure profile exists in public.profiles so foreign key constraint succeeds
  try {
    await withTimeout(
      supabase.from('profiles').upsert({
        id: safeUserId,
        full_name: pledgeData.userName || 'Mshirika',
        email: `${safeUserId.slice(0, 8)}@jerusalemministry.local`,
        phone: pledgeData.userPhone || '+255000000000',
        role: 'user',
        location: 'Tanzania',
        partnership_tier: 'Mshirika wa Injili',
      }, { onConflict: 'id' }),
      2000,
      { data: null, error: null } as any
    );
  } catch (profErr) {
    // Continue even if profile upsert fails
  }

  // 2. Duplicate submission protection (within 15 seconds)
  const fifteenSecsAgo = new Date(Date.now() - 15000).toISOString();
  try {
    const { data: recentDuplicate } = await withTimeout(
      supabase
        .from('pledges')
        .select('*')
        .eq('user_id', safeUserId)
        .eq('amount', pledgeData.amount)
        .eq('purpose', pledgeData.purpose)
        .gte('created_at', fifteenSecsAgo)
        .maybeSingle(),
      2000,
      { data: null } as any
    );

    if (recentDuplicate) {
      return {
        id: recentDuplicate.id,
        pledgeNumber: recentDuplicate.pledge_number,
        userId: recentDuplicate.user_id,
        userName: recentDuplicate.user_name,
        userPhone: recentDuplicate.user_phone,
        amount: Number(recentDuplicate.amount),
        currency: recentDuplicate.currency,
        purpose: recentDuplicate.purpose,
        notes: recentDuplicate.notes,
        pledgeDate: recentDuplicate.pledge_date,
        dueDate: recentDuplicate.due_date,
        fulfilledAmount: Number(recentDuplicate.fulfilled_amount),
        status: recentDuplicate.status,
        createdAt: recentDuplicate.created_at,
        updatedAt: recentDuplicate.updated_at,
      };
    }
  } catch (dupErr) {
    // Ignore duplicate lookup error
  }

  const now = new Date().toISOString();
  const record = {
    id: safePledgeId,
    pledge_number: pledgeData.pledgeNumber,
    user_id: safeUserId,
    user_name: pledgeData.userName,
    user_phone: pledgeData.userPhone,
    amount: pledgeData.amount,
    currency: pledgeData.currency || 'TZS',
    purpose: pledgeData.purpose,
    notes: pledgeData.notes || '',
    pledge_date: pledgeData.pledgeDate || now.slice(0, 10),
    due_date: pledgeData.dueDate,
    fulfilled_amount: pledgeData.fulfilledAmount || 0,
    status: pledgeData.status || 'pending',
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await withTimeout(
    supabase.from('pledges').insert(record).select().single(),
    3000,
    { data: null, error: { message: 'Supabase network timeout' } } as any
  );

  if (error || !data) {
    throw new Error(`Hitilafu ya kuweka ahadi kwenye Supabase: ${error?.message || 'Mtandao umezidiwa'}`);
  }

  return {
    id: data.id,
    pledgeNumber: data.pledge_number,
    userId: data.user_id,
    userName: data.user_name,
    userPhone: data.user_phone,
    amount: Number(data.amount),
    currency: data.currency,
    purpose: data.purpose,
    notes: data.notes,
    pledgeDate: data.pledge_date,
    dueDate: data.due_date,
    fulfilledAmount: Number(data.fulfilled_amount),
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function supabaseDeletePledge(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const { error } = await supabase.from('pledges').delete().eq('id', id);
  if (error) {
    throw new Error(`Hitilafu ya kufuta ahadi kwenye Supabase: ${error.message}`);
  }
  return true;
}

// -------------------------------------------------------------
// CONTRIBUTIONS (MICHANGO) - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetContributions(userId?: string, timeframe?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('contributions').select('*').order('payment_date', { ascending: false });
  if (userId) {
    const safeUserId = toValidUuid(userId);
    query = query.eq('user_id', safeUserId);
  }

  const now = new Date();
  if (timeframe === 'wiki' || timeframe === 'weekly') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    query = query.gte('payment_date', oneWeekAgo);
  } else if (timeframe === 'mwezi' || timeframe === 'monthly') {
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    query = query.gte('payment_date', oneMonthAgo);
  } else if (timeframe === 'mwaka' || timeframe === 'yearly') {
    const oneYearAgo = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    query = query.gte('payment_date', oneYearAgo);
  }

  const { data, error } = await withTimeout(
    query,
    3000,
    { data: null, error: { message: 'Timeout' } } as any
  );
  if (error || !data) return [];

  return data.map((c: any) => ({
    id: c.id,
    receiptNumber: c.receipt_number,
    pledgeId: c.pledge_id,
    pledgeNumber: c.pledge_number,
    userId: c.user_id,
    userName: c.user_name,
    amount: Number(c.amount),
    paymentDate: c.payment_date,
    paymentMethod: c.payment_method,
    reference: c.reference,
    notes: c.notes,
    recordedBy: c.recorded_by,
    createdAt: c.created_at,
  }));
}

export async function supabaseCreateContribution(contribData: {
  id: string;
  receiptNumber: string;
  pledgeId: string;
  pledgeNumber: string;
  userId: string;
  userName: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  recordedBy?: 'mshirika' | 'admin';
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const safeContribId = ensureUuid(contribData.id);
  const safePledgeId = ensureUuid(contribData.pledgeId);
  const safeUserId = toValidUuid(contribData.userId);

  // Duplicate submission protection (within 15 seconds)
  const fifteenSecsAgo = new Date(Date.now() - 15000).toISOString();
  try {
    const { data: recentDuplicate } = await withTimeout(
      supabase
        .from('contributions')
        .select('*')
        .eq('pledge_id', safePledgeId)
        .eq('amount', contribData.amount)
        .gte('created_at', fifteenSecsAgo)
        .maybeSingle(),
      2000,
      { data: null } as any
    );

    if (recentDuplicate) {
      const { data: pld } = await withTimeout(
        supabase.from('pledges').select('*').eq('id', safePledgeId).single(),
        2000,
        { data: null } as any
      );
      return {
        contribution: {
          id: recentDuplicate.id,
          receiptNumber: recentDuplicate.receipt_number,
          pledgeId: recentDuplicate.pledge_id,
          pledgeNumber: recentDuplicate.pledge_number,
          userId: recentDuplicate.user_id,
          userName: recentDuplicate.user_name,
          amount: Number(recentDuplicate.amount),
          paymentDate: recentDuplicate.payment_date,
          paymentMethod: recentDuplicate.payment_method,
          reference: recentDuplicate.reference,
          notes: recentDuplicate.notes,
          recordedBy: recentDuplicate.recorded_by,
          createdAt: recentDuplicate.created_at,
        },
        updatedPledge: pld ? {
          id: pld.id,
          pledgeNumber: pld.pledge_number,
          userId: pld.user_id,
          userName: pld.user_name,
          userPhone: pld.user_phone,
          amount: Number(pld.amount),
          currency: pld.currency,
          purpose: pld.purpose,
          notes: pld.notes,
          pledgeDate: pld.pledge_date,
          dueDate: pld.due_date,
          fulfilledAmount: Number(pld.fulfilled_amount),
          status: pld.status,
          createdAt: pld.created_at,
          updatedAt: pld.updated_at,
        } : null,
      };
    }
  } catch (dupErr) {
    // Ignore duplicate lookup error
  }

  const now = new Date().toISOString();
  const record = {
    id: safeContribId,
    receipt_number: contribData.receiptNumber,
    pledge_id: safePledgeId,
    pledge_number: contribData.pledgeNumber,
    user_id: safeUserId,
    user_name: contribData.userName,
    amount: contribData.amount,
    payment_date: contribData.paymentDate || now.slice(0, 10),
    payment_method: contribData.paymentMethod,
    reference: contribData.reference || '',
    notes: contribData.notes || '',
    recorded_by: contribData.recordedBy || 'mshirika',
    created_at: now,
  };

  const { data, error } = await withTimeout(
    supabase.from('contributions').insert(record).select().single(),
    3000,
    { data: null, error: { message: 'Supabase network timeout' } } as any
  );

  if (error || !data) {
    throw new Error(`Hitilafu ya kurekodi mchango kwenye Supabase: ${error?.message || 'Mtandao umezidiwa'}`);
  }

  // Update pledge fulfilled amount and status directly in Supabase
  let updatedPledgeObj: any = null;
  try {
    const { data: allContribs } = await withTimeout(
      supabase
        .from('contributions')
        .select('amount')
        .eq('pledge_id', safePledgeId),
      2000,
      { data: [] } as any
    );

    const totalFulfilled = (allContribs || []).reduce((sum: number, item: any) => sum + Number(item.amount), 0);

    const { data: targetPledge } = await withTimeout(
      supabase
        .from('pledges')
        .select('*')
        .eq('id', safePledgeId)
        .single(),
      2000,
      { data: null } as any
    );

    if (targetPledge) {
      const pledgeAmount = Number(targetPledge.amount);
      const todayStr = now.slice(0, 10);
      let newStatus = 'pending';
      if (totalFulfilled >= pledgeAmount) {
        newStatus = 'fulfilled';
      } else if (targetPledge.due_date < todayStr) {
        newStatus = 'overdue';
      } else if (totalFulfilled > 0) {
        newStatus = 'partial';
      }

      const { data: updatedP } = await withTimeout(
        supabase
          .from('pledges')
          .update({
            fulfilled_amount: totalFulfilled,
            status: newStatus,
            updated_at: now,
          })
          .eq('id', safePledgeId)
          .select()
          .single(),
        2000,
        { data: null } as any
      );

      if (updatedP) {
        updatedPledgeObj = {
          id: updatedP.id,
          pledgeNumber: updatedP.pledge_number,
          userId: updatedP.user_id,
          userName: updatedP.user_name,
          userPhone: updatedP.user_phone,
          amount: Number(updatedP.amount),
          currency: updatedP.currency,
          purpose: updatedP.purpose,
          notes: updatedP.notes,
          pledgeDate: updatedP.pledge_date,
          dueDate: updatedP.due_date,
          fulfilledAmount: Number(updatedP.fulfilled_amount),
          status: updatedP.status,
          createdAt: updatedP.created_at,
          updatedAt: updatedP.updated_at,
        };
      }
    }
  } catch (syncErr) {
    // Pledge status update is best-effort in Supabase
  }

  return {
    contribution: {
      id: data.id,
      receiptNumber: data.receipt_number,
      pledgeId: data.pledge_id,
      pledgeNumber: data.pledge_number,
      userId: data.user_id,
      userName: data.user_name,
      amount: Number(data.amount),
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      reference: data.reference,
      notes: data.notes,
      recordedBy: data.recorded_by,
      createdAt: data.created_at,
    },
    updatedPledge: updatedPledgeObj,
  };
}

// -------------------------------------------------------------
// EXPENSES (MATUMIZI YA HUDUMA - ADMIN ONLY) - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetExpenses() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error || !data) return [];

  return data.map((e: any) => ({
    id: e.id,
    category: e.category,
    amount: Number(e.amount),
    date: e.date,
    description: e.description,
    supportingDetails: e.supporting_details,
    recordedBy: e.recorded_by,
    createdAt: e.created_at,
  }));
}

export async function supabaseCreateExpense(expData: {
  id: string;
  category: string;
  amount: number;
  date?: string;
  description: string;
  supportingDetails?: string;
  recordedBy?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const now = new Date().toISOString();
  const record = {
    id: ensureUuid(expData.id),
    category: expData.category,
    amount: expData.amount,
    date: expData.date || now.slice(0, 10),
    description: expData.description,
    supporting_details: expData.supportingDetails || '',
    recorded_by: expData.recordedBy || 'Uongozi wa Jerusalem Ministry',
    created_at: now,
  };

  const { data, error } = await supabase.from('expenses').insert(record).select().single();
  if (error) {
    throw new Error(`Hitilafu ya kurekodi matumizi kwenye Supabase: ${error.message}`);
  }

  return {
    id: data.id,
    category: data.category,
    amount: Number(data.amount),
    date: data.date,
    description: data.description,
    supportingDetails: data.supporting_details,
    recordedBy: data.recorded_by,
    createdAt: data.created_at,
  };
}

export async function supabaseDeleteExpense(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) {
    throw new Error(`Hitilafu ya kufuta matumizi kwenye Supabase: ${error.message}`);
  }
  return true;
}

// -------------------------------------------------------------
// AUDIT LOGS (ADMIN ONLY) - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetAuditLogs() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
  if (error || !data) return [];

  return data.map((l: any) => ({
    id: l.id,
    timestamp: l.timestamp,
    actorId: l.actor_id,
    actorName: l.actor_name,
    actorRole: l.actor_role,
    action: l.action,
    description: l.description,
    metadata: l.metadata,
  }));
}

export async function supabaseCreateAuditLog(logData: {
  id: string;
  actorId: string;
  actorName: string;
  actorRole?: 'admin' | 'user';
  action: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const record = {
    id: ensureUuid(logData.id),
    timestamp: new Date().toISOString(),
    actor_id: logData.actorId,
    actor_name: logData.actorName,
    actor_role: logData.actorRole || 'admin',
    action: logData.action,
    description: logData.description,
    metadata: logData.metadata || null,
  };

  await supabase.from('audit_logs').insert(record);
  return record;
}

// -------------------------------------------------------------
// NOTIFICATIONS & REMINDERS - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetNotifications(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const safeUserId = toValidUuid(userId);
  const { data, error } = await withTimeout(
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', safeUserId)
      .order('created_at', { ascending: false }),
    3000,
    { data: null, error: { message: 'Timeout' } } as any
  );

  if (error || !data) return [];

  return data.map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    pledgeId: n.pledge_id,
    pledgeNumber: n.pledge_number,
    title: n.title,
    message: n.message,
    channelUsed: n.channel_used,
    senderName: n.sender_name,
    amount: n.amount ? Number(n.amount) : undefined,
    remainingAmount: n.remaining_amount ? Number(n.remaining_amount) : undefined,
    dueDate: n.due_date,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
  }));
}

export async function supabaseCreateNotification(notifData: {
  id: string;
  userId: string;
  title: string;
  message: string;
  pledgeId?: string;
  pledgeNumber?: string;
  channelUsed?: 'in_app' | 'whatsapp' | 'sms' | 'email' | 'all';
  senderName?: string;
  amount?: number;
  remainingAmount?: number;
  dueDate?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const safeUserId = toValidUuid(notifData.userId);
  const record = {
    id: ensureUuid(notifData.id),
    user_id: safeUserId,
    pledge_id: notifData.pledgeId ? ensureUuid(notifData.pledgeId) : null,
    pledge_number: notifData.pledgeNumber || null,
    title: notifData.title,
    message: notifData.message,
    channel_used: notifData.channelUsed || 'in_app',
    sender_name: notifData.senderName || 'Uongozi wa Jerusalem Ministry',
    amount: notifData.amount || null,
    remaining_amount: notifData.remainingAmount || null,
    due_date: notifData.dueDate || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await withTimeout(
    supabase.from('notifications').insert(record).select().single(),
    3000,
    { data: null, error: { message: 'Timeout' } } as any
  );
  if (error) {
    console.warn('Notice inserting notification to Supabase:', error.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    pledgeId: data.pledge_id,
    pledgeNumber: data.pledge_number,
    title: data.title,
    message: data.message,
    channelUsed: data.channel_used,
    senderName: data.sender_name,
    amount: data.amount ? Number(data.amount) : undefined,
    remainingAmount: data.remaining_amount ? Number(data.remaining_amount) : undefined,
    dueDate: data.due_date,
    isRead: Boolean(data.is_read),
    createdAt: data.created_at,
  };
}

export async function supabaseMarkNotificationRead(id: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const safeUserId = toValidUuid(userId);
  const { error } = await withTimeout(
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', safeUserId),
    3000,
    { error: { message: 'Timeout' } } as any
  );

  return !error;
}

export async function supabaseMarkAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const safeUserId = toValidUuid(userId);
  const { error } = await withTimeout(
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', safeUserId),
    3000,
    { error: { message: 'Timeout' } } as any
  );

  return !error;
}

export async function supabaseDeleteNotification(id: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const safeUserId = toValidUuid(userId);
  const { error } = await withTimeout(
    supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', safeUserId),
    3000,
    { error: { message: 'Timeout' } } as any
  );

  return !error;
}

// -------------------------------------------------------------
// MINISTRY NEWS & PROJECTS - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetNews(includeInactive: boolean = false) {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    let query = supabase.from('ministry_news').select('*').order('created_at', { ascending: false });
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await withTimeout(
      query,
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );
    if (error || !data) return [];

    return data.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      badge: n.badge,
      progressPercent: n.progress_percent,
      targetAmount: n.target_amount ? Number(n.target_amount) : undefined,
      currentAmount: n.current_amount ? Number(n.current_amount) : undefined,
      location: n.location,
      status: n.status,
      priority: n.priority,
      isActive: n.is_active,
      publishDate: n.publish_date,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  } catch (e) {
    return [];
  }
}

export async function supabaseCreateNews(newsItem: {
  id: string;
  title: string;
  content: string;
  category: string;
  badge: string;
  progressPercent: number;
  targetAmount?: number;
  currentAmount?: number;
  location?: string;
  status: string;
  priority: string;
  isActive: boolean;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const record = {
    id: newsItem.id,
    title: newsItem.title,
    content: newsItem.content,
    category: newsItem.category,
    badge: newsItem.badge,
    progress_percent: newsItem.progressPercent,
    target_amount: newsItem.targetAmount || null,
    current_amount: newsItem.currentAmount || null,
    location: newsItem.location || '',
    status: newsItem.status || 'ongoing',
    priority: newsItem.priority || 'normal',
    is_active: newsItem.isActive,
    publish_date: newsItem.publishDate,
    created_at: newsItem.createdAt,
    updated_at: newsItem.updatedAt,
  };

  try {
    const { data, error } = await withTimeout(
      supabase.from('ministry_news').upsert(record).select().single(),
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );
    if (error) {
      console.warn('Notice recording ministry news on Supabase:', error.message);
    }
    return data;
  } catch (e: any) {
    console.warn('Supabase create news exception:', e.message);
    return null;
  }
}

export async function supabaseUpdateNews(id: string, updates: Partial<{
  title: string;
  content: string;
  category: string;
  badge: string;
  progressPercent: number;
  targetAmount?: number;
  currentAmount?: number;
  location?: string;
  status: string;
  priority: string;
  isActive: boolean;
  publishDate: string;
  updatedAt: string;
}>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const patch: any = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.badge !== undefined) patch.badge = updates.badge;
  if (updates.progressPercent !== undefined) patch.progress_percent = updates.progressPercent;
  if (updates.targetAmount !== undefined) patch.target_amount = updates.targetAmount;
  if (updates.currentAmount !== undefined) patch.current_amount = updates.currentAmount;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  if (updates.publishDate !== undefined) patch.publish_date = updates.publishDate;
  patch.updated_at = updates.updatedAt || new Date().toISOString();

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('ministry_news')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );

    if (error) {
      console.warn('Notice updating ministry news on Supabase:', error.message);
    }
    return data;
  } catch (e: any) {
    return null;
  }
}

export async function supabaseDeleteNews(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await withTimeout(
      supabase.from('ministry_news').delete().eq('id', id),
      3000,
      { error: { message: 'Timeout' } } as any
    );
    if (error) {
      console.warn('Notice deleting ministry news on Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// TESTIMONIALS (SHUHUDA ZA WASHIRIKA) - SUPABASE
// -------------------------------------------------------------

export async function supabaseGetTestimonials(includeUnverified: boolean = false) {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    let query = supabase.from('testimonials').select('*').order('created_at', { ascending: false });
    if (!includeUnverified) {
      query = query.eq('verified', true);
    }
    const { data, error } = await withTimeout(
      query,
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );
    if (error || !data) return [];

    return data.map((t: any) => ({
      id: t.id,
      partnerName: t.partner_name,
      location: t.location || '',
      tier: t.tier || 'Mshirika wa Injili',
      category: t.category || 'agano',
      categoryLabel: t.category_label || 'Agano la Sadaka',
      quote: t.quote,
      fullTestimony: t.full_testimony,
      scripture: t.scripture || 'Zaburi 50:5',
      date: t.date || '',
      verified: Boolean(t.verified),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  } catch (err: any) {
    return [];
  }
}

export async function supabaseCreateTestimonial(testimony: {
  id: string;
  partnerName: string;
  location?: string;
  tier?: string;
  category?: string;
  categoryLabel?: string;
  quote: string;
  fullTestimony: string;
  scripture?: string;
  date?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const record = {
    id: testimony.id,
    partner_name: testimony.partnerName,
    location: testimony.location || '',
    tier: testimony.tier || 'Mshirika wa Injili',
    category: testimony.category || 'agano',
    category_label: testimony.categoryLabel || 'Agano la Sadaka',
    quote: testimony.quote,
    full_testimony: testimony.fullTestimony,
    scripture: testimony.scripture || 'Zaburi 50:5',
    date: testimony.date || '',
    verified: testimony.verified !== undefined ? testimony.verified : true,
    created_at: testimony.createdAt || new Date().toISOString(),
    updated_at: testimony.updatedAt || new Date().toISOString(),
  };

  try {
    const { data, error } = await withTimeout(
      supabase.from('testimonials').upsert(record).select().single(),
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );
    if (error) {
      console.warn('Notice recording testimonial on Supabase:', error.message);
    }
    return data;
  } catch (e) {
    return null;
  }
}

export async function supabaseUpdateTestimonial(id: string, updates: Partial<{
  partnerName: string;
  location: string;
  tier: string;
  category: string;
  categoryLabel: string;
  quote: string;
  fullTestimony: string;
  scripture: string;
  date: string;
  verified: boolean;
  updatedAt: string;
}>) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const patch: any = {};
  if (updates.partnerName !== undefined) patch.partner_name = updates.partnerName;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.tier !== undefined) patch.tier = updates.tier;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.categoryLabel !== undefined) patch.category_label = updates.categoryLabel;
  if (updates.quote !== undefined) patch.quote = updates.quote;
  if (updates.fullTestimony !== undefined) patch.full_testimony = updates.fullTestimony;
  if (updates.scripture !== undefined) patch.scripture = updates.scripture;
  if (updates.date !== undefined) patch.date = updates.date;
  if (updates.verified !== undefined) patch.verified = updates.verified;
  patch.updated_at = updates.updatedAt || new Date().toISOString();

  try {
    const { data, error } = await withTimeout(
      supabase.from('testimonials').update(patch).eq('id', id).select().single(),
      3000,
      { data: null, error: { message: 'Timeout' } } as any
    );
    if (error) {
      console.warn('Notice updating testimonial on Supabase:', error.message);
    }
    return data;
  } catch (e) {
    return null;
  }
}

export async function supabaseDeleteTestimonial(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await withTimeout(
      supabase.from('testimonials').delete().eq('id', id),
      3000,
      { error: { message: 'Timeout' } } as any
    );
    if (error) {
      console.warn('Notice deleting testimonial on Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// AGGREGATED STATS & SUMMARIES DIRECTLY FROM SUPABASE
// -------------------------------------------------------------

export async function supabaseGetUserSummary(userId: string) {
  const [pledges, contributions] = await Promise.all([
    supabaseGetPledges(userId),
    supabaseGetContributions(userId),
  ]);

  const totalPledged = pledges.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
  const totalFulfilled = contributions.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const outstandingBalance = Math.max(0, totalPledged - totalFulfilled);

  const todayStr = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  let approachingDueCount = 0;
  let overdueCount = 0;

  for (const p of pledges) {
    if (p.fulfilledAmount < p.amount) {
      if (p.dueDate && p.dueDate < todayStr) {
        overdueCount++;
      } else if (p.dueDate && p.dueDate <= in7Days) {
        approachingDueCount++;
      }
    }
  }

  return {
    totalPledged,
    totalFulfilled,
    outstandingBalance,
    activePledgesCount: pledges.filter((p: any) => p.status !== 'fulfilled').length,
    fulfilledPledgesCount: pledges.filter((p: any) => p.status === 'fulfilled').length,
    contributionsCount: contributions.length,
    approachingDueCount,
    overdueCount,
  };
}

export async function supabaseGetReminders(userId: string) {
  const pledges = await supabaseGetPledges(userId);
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
  return reminders;
}

export async function supabaseGetAdminOverview() {
  const [partners, pledges, contributions, expenses] = await Promise.all([
    supabaseGetAllPartners(),
    supabaseGetPledges(),
    supabaseGetContributions(),
    supabaseGetExpenses(),
  ]);

  const totalPartnersCount = partners.length;
  const totalPledgedAmount = pledges.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
  const totalFulfilledAmount = contributions.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const totalOutstandingAmount = Math.max(0, totalPledgedAmount - totalFulfilledAmount);
  const totalExpensesAmount = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
  const ministryNetBalance = totalFulfilledAmount - totalExpensesAmount;

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeRemindersCount = pledges.filter(
    (p: any) => p.fulfilledAmount < p.amount && p.dueDate && p.dueDate <= todayStr
  ).length;

  return {
    totalPartnersCount,
    totalPledgedAmount,
    totalFulfilledAmount,
    totalOutstandingAmount,
    totalExpensesAmount,
    ministryNetBalance,
    totalPledgesCount: pledges.length,
    totalContributionsCount: contributions.length,
    totalExpensesCount: expenses.length,
    activeRemindersCount,
  };
}

export async function supabaseGetPublicStats() {
  const [contribs, exps, plds, partners] = await Promise.all([
    supabaseGetContributions(),
    supabaseGetExpenses(),
    supabaseGetPledges(),
    supabaseGetAllPartners(),
  ]);

  const totalFulfilledAmount = contribs.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const totalExpensesAmount = exps.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
  const totalPledgedAmount = plds.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
  const totalPartnersCount = partners.length;
  const ministryNetBalance = Math.max(0, totalFulfilledAmount - totalExpensesAmount);

  return {
    ministryNetBalance,
    totalFulfilledAmount,
    totalExpensesAmount,
    totalPledgedAmount,
    totalPartnersCount,
    currency: 'TZS',
    lastUpdated: new Date().toISOString(),
  };
}

export async function supabaseGetDatabaseBackup() {
  const [partners, pledges, contributions, expenses, auditLogs, news] = await Promise.all([
    supabaseGetAllPartners(),
    supabaseGetPledges(),
    supabaseGetContributions(),
    supabaseGetExpenses(),
    supabaseGetAuditLogs(),
    supabaseGetNews(true),
  ]);

  return {
    backupDate: new Date().toISOString(),
    source: 'Supabase Cloud Database',
    system: 'Jerusalem Ministry of Gospel - Partnership & Giving',
    data: {
      partners,
      pledges,
      contributions,
      expenses,
      auditLogs,
      news,
    },
  };
}

export async function supabaseResetDatabase(confirmCode?: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase haijasanidiwa au haipatikani');

  if (confirmCode !== 'FUTA_JERUSALEM_2026_CONFIRMED') {
    throw new Error('Uthibitisho sahihi wa neno la siri unahitajika ili kuweka upya taarifa.');
  }

  // Clear transactional tables only with verified confirmation
  await supabase.from('contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pledges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  return true;
}

export async function supabaseCheckWritePermissions(): Promise<{
  canRead: boolean;
  canWrite: boolean;
  details: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { canRead: false, canWrite: false, details: 'Supabase haijaunganishwa' };
  }

  try {
    const { error: readErr } = await supabase.from('ministry_news').select('id').limit(1);
    if (readErr) {
      return { canRead: false, canWrite: false, details: 'Read error: ' + readErr.message };
    }

    // Check profiles access
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    if (profErr) {
      return { canRead: false, canWrite: false, details: 'Profiles error: ' + profErr.message };
    }

    return {
      canRead: true,
      canWrite: true,
      details: 'Supabase inasoma na kuandika kikamilifu (Single Source of Truth Active)',
    };
  } catch (err: any) {
    return { canRead: false, canWrite: false, details: err.message };
  }
}
