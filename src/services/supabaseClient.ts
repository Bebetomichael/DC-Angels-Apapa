import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChoirDatabase, ChoirMember } from '../types/choir';

export const SUPABASE_CONFIG_STORAGE_KEY = 'dc_angels_supabase_config_v1';
export const SUPABASE_STATUS_STORAGE_KEY = 'dc_angels_supabase_status_v1';

export type SupabaseConnectionState = 'connected' | 'not_connected' | 'failed';

export interface StoredSupabaseConfig {
  url: string;
  anonKey: string;
  updatedAt: string;
  source: 'env' | 'local';
}

export interface SupabaseConnectionTestResult {
  status: SupabaseConnectionState;
  message: string;
  details?: string;
  testedAt: string;
  latencyMs?: number;
  rowCount?: number | null;
  tableStatus?: 'ok' | 'missing_table' | 'rls_restricted' | 'error';
}

// Singleton client cache to avoid creating multiple SupabaseClient instances
let cachedClient: SupabaseClient | null = null;
let cachedFingerprint = '';

/**
 * Sanitizes error messages so sensitive keys, tokens, or authorization headers
 * are never echoed in the UI or console.
 */
export function sanitizeSupabaseError(rawMessage: string, anonKey?: string): string {
  if (!rawMessage) return 'Unknown connection error occurred.';
  let cleaned = rawMessage;
  if (anonKey && anonKey.trim().length > 8) {
    cleaned = cleaned.split(anonKey.trim()).join('[REDACTED_KEY]');
  }
  cleaned = cleaned.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]');
  cleaned = cleaned.replace(/sb_secret_[a-zA-Z0-9_-]+/g, '[REDACTED_SECRET]');
  cleaned = cleaned.replace(/sb_publishable_[a-zA-Z0-9_-]+/g, '[PUBLISHABLE_KEY]');
  return cleaned;
}

/**
 * Inspects a supplied key to ensure the user never enters a service_role or secret key
 * in the browser.
 */
export function validatePublicSupabaseKey(key: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Supabase Anon / Publishable Key is required.' };
  }

  // Block modern Supabase secret keys
  if (trimmed.startsWith('sb_secret_') || trimmed.toLowerCase().includes('service_role')) {
    return {
      valid: false,
      reason:
        'Security Rejection: Secret or service_role keys must NEVER be used in the browser. Please provide only your public anon or sb_publishable_ key.',
    };
  }

  // If the key is a JWT (starts with eyJ), inspect the payload role claim
  if (trimmed.startsWith('eyJ')) {
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        reason: 'The supplied JWT key is malformed (expected 3 dot-separated segments).',
      };
    }
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as { role?: string };
      if (payload.role === 'service_role' || payload.role === 'supabase_admin') {
        return {
          valid: false,
          reason:
            'Security Rejection: This JWT has the "service_role" claim, which bypasses Row Level Security. Use only the "anon" public key.',
        };
      }
    } catch {
      return {
        valid: false,
        reason: 'Unable to decode the JWT payload in the supplied Supabase key.',
      };
    }
  } else if (!trimmed.startsWith('sb_publishable_') && trimmed.length < 20) {
    return {
      valid: false,
      reason:
        'Invalid key format. Expected a Supabase public anon JWT (eyJ...) or publishable key (sb_publishable_...).',
    };
  }

  return { valid: true };
}

/**
 * Validates the Supabase Project URL format.
 */
export function validateSupabaseUrl(url: string): {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
} {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return { valid: false, reason: 'Supabase Project URL is required.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return {
        valid: false,
        reason: 'Supabase Project URL must use HTTPS (e.g. https://your-project.supabase.co).',
      };
    }
    return { valid: true, normalizedUrl: parsed.origin };
  } catch {
    return {
      valid: false,
      reason: 'Invalid URL format. Please enter a valid URL such as https://your-project.supabase.co.',
    };
  }
}

/**
 * Reads environment variables first (for production), then falls back to localStorage (for dev testing).
 */
export function getActiveSupabaseConfig(): StoredSupabaseConfig | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (
    envUrl &&
    envKey &&
    envUrl !== 'https://your-project.supabase.co' &&
    envKey !== 'your-public-anon-or-publishable-key'
  ) {
    const urlCheck = validateSupabaseUrl(envUrl);
    const keyCheck = validatePublicSupabaseKey(envKey);
    if (urlCheck.valid && keyCheck.valid && urlCheck.normalizedUrl) {
      return {
        url: urlCheck.normalizedUrl,
        anonKey: envKey,
        updatedAt: 'Production Environment',
        source: 'env',
      };
    }
  }

  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSupabaseConfig;
    if (!parsed.url || !parsed.anonKey) return null;
    const urlCheck = validateSupabaseUrl(parsed.url);
    const keyCheck = validatePublicSupabaseKey(parsed.anonKey);
    if (!urlCheck.valid || !keyCheck.valid) return null;
    return {
      ...parsed,
      url: urlCheck.normalizedUrl || parsed.url,
      source: 'local',
    };
  } catch {
    return null;
  }
}

/**
 * Saves validated Supabase credentials to localStorage for development testing.
 * Never claims the database is connected merely by saving.
 */
export function saveLocalSupabaseConfig(url: string, anonKey: string): {
  ok: boolean;
  config?: StoredSupabaseConfig;
  error?: string;
} {
  const urlValidation = validateSupabaseUrl(url);
  if (!urlValidation.valid || !urlValidation.normalizedUrl) {
    return { ok: false, error: urlValidation.reason };
  }

  const keyValidation = validatePublicSupabaseKey(anonKey);
  if (!keyValidation.valid) {
    return { ok: false, error: keyValidation.reason };
  }

  const config: StoredSupabaseConfig = {
    url: urlValidation.normalizedUrl,
    anonKey: anonKey.trim(),
    updatedAt: new Date().toISOString(),
    source: 'local',
  };

  localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Re-initialize the singleton client with the validated credentials
  getOrInitSupabaseClient(config.url, config.anonKey);
  return { ok: true, config };
}

/**
 * Clears local Supabase configuration and resets the cached client.
 */
export function clearLocalSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
  localStorage.removeItem(SUPABASE_STATUS_STORAGE_KEY);
  cachedClient = null;
  cachedFingerprint = '';
}

/**
 * Returns a singleton SupabaseClient instance for the supplied or active credentials.
 * Avoids creating duplicate clients or breaking existing auth sessions.
 */
export function getOrInitSupabaseClient(customUrl?: string, customAnonKey?: string): SupabaseClient | null {
  let targetUrl = customUrl?.trim();
  let targetKey = customAnonKey?.trim();

  if (!targetUrl || !targetKey) {
    const active = getActiveSupabaseConfig();
    if (!active) return null;
    targetUrl = active.url;
    targetKey = active.anonKey;
  }

  const urlCheck = validateSupabaseUrl(targetUrl);
  const keyCheck = validatePublicSupabaseKey(targetKey);
  if (!urlCheck.valid || !keyCheck.valid || !urlCheck.normalizedUrl) {
    return null;
  }

  const normalizedUrl = urlCheck.normalizedUrl;
  const fingerprint = `${normalizedUrl}::${targetKey.slice(0, 16)}::${targetKey.slice(-8)}`;

  if (cachedClient && cachedFingerprint === fingerprint) {
    return cachedClient;
  }

  cachedClient = createClient(normalizedUrl, targetKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'dc-angels-apapa-supabase-auth',
    },
  });
  cachedFingerprint = fingerprint;
  return cachedClient;
}

export function getLastConnectionTestStatus(): SupabaseConnectionTestResult | null {
  try {
    const raw = localStorage.getItem(SUPABASE_STATUS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SupabaseConnectionTestResult;
  } catch {
    return null;
  }
}

export function saveConnectionTestStatus(result: SupabaseConnectionTestResult): void {
  try {
    localStorage.setItem(SUPABASE_STATUS_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // ignore storage errors
  }
}

/**
 * Tests the connection to Supabase using the supplied Project URL and Public Anon/Publishable Key.
 * Makes a real query to `choir_members` (select id count/head) and only reports 'connected'
 * if the query against the Supabase project genuinely succeeds.
 */
export async function testSupabaseConnection(
  rawUrl: string,
  rawAnonKey: string
): Promise<SupabaseConnectionTestResult> {
  const testedAt = new Date().toISOString();

  const urlCheck = validateSupabaseUrl(rawUrl);
  if (!urlCheck.valid || !urlCheck.normalizedUrl) {
    const failedResult: SupabaseConnectionTestResult = {
      status: 'failed',
      message: 'Connection Failed: Invalid Project URL',
      details: urlCheck.reason,
      testedAt,
      tableStatus: 'error',
    };
    saveConnectionTestStatus(failedResult);
    return failedResult;
  }

  const keyCheck = validatePublicSupabaseKey(rawAnonKey);
  if (!keyCheck.valid) {
    const failedResult: SupabaseConnectionTestResult = {
      status: 'failed',
      message: 'Connection Failed: Invalid Public Key',
      details: keyCheck.reason,
      testedAt,
      tableStatus: 'error',
    };
    saveConnectionTestStatus(failedResult);
    return failedResult;
  }

  const client = getOrInitSupabaseClient(urlCheck.normalizedUrl, rawAnonKey.trim());
  if (!client) {
    const failedResult: SupabaseConnectionTestResult = {
      status: 'failed',
      message: 'Connection Failed: Could not initialize Supabase client',
      testedAt,
      tableStatus: 'error',
    };
    saveConnectionTestStatus(failedResult);
    return failedResult;
  }

  const startTime = performance.now();
  try {
    // Perform a real, harmless query to the `choir_members` table
    const { count, error, status, statusText } = await client
      .from('choir_members')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!error) {
      const successResult: SupabaseConnectionTestResult = {
        status: 'connected',
        message: 'Connected to Supabase successfully.',
        details: `Verified live query against "public.choir_members" (HTTP ${status || 200}, ${latencyMs} ms, ${count ?? 0} member record(s) visible under current RLS policy).`,
        testedAt,
        latencyMs,
        rowCount: count ?? 0,
        tableStatus: 'ok',
      };
      saveConnectionTestStatus(successResult);
      return successResult;
    }

    const sanitizedMsg = sanitizeSupabaseError(error.message || statusText || 'Query error', rawAnonKey);
    const errCode = error.code || '';

    // Check if the Supabase API is reachable and authenticated, but `choir_members` table hasn't been created yet
    const isMissingTable =
      errCode === '42P01' ||
      errCode === 'PGRST205' ||
      sanitizedMsg.toLowerCase().includes('does not exist') ||
      sanitizedMsg.toLowerCase().includes('could not find the table');

    if (isMissingTable) {
      const missingTableResult: SupabaseConnectionTestResult = {
        status: 'failed',
        message: 'Connection Failed: Table "choir_members" was not found in your Supabase project.',
        details: `Your Supabase Project URL and Anon Key reached the server (${latencyMs} ms), but the table "public.choir_members" does not exist yet (Code: ${errCode || 'PGRST205'}). Run the SQL Schema & RLS script below in your Supabase SQL Editor, then click "Test Connection" again.`,
        testedAt,
        latencyMs,
        tableStatus: 'missing_table',
      };
      saveConnectionTestStatus(missingTableResult);
      return missingTableResult;
    }

    // Check for 401 / 403 Invalid API key or JWT signature mismatch
    if (status === 401 || status === 403 || sanitizedMsg.toLowerCase().includes('invalid api key') || sanitizedMsg.toLowerCase().includes('jwt')) {
      const authFailResult: SupabaseConnectionTestResult = {
        status: 'failed',
        message: 'Connection Failed: Authentication rejected by Supabase (HTTP ' + (status || 401) + ').',
        details: `Supabase rejected the supplied Anon / Publishable Key or RLS policy denied access: ${sanitizedMsg}`,
        testedAt,
        latencyMs,
        tableStatus: status === 403 ? 'rls_restricted' : 'error',
      };
      saveConnectionTestStatus(authFailResult);
      return authFailResult;
    }

    const genericFail: SupabaseConnectionTestResult = {
      status: 'failed',
      message: `Connection Failed: Supabase returned an error (${errCode || status || 'Error'})`,
      details: sanitizedMsg,
      testedAt,
      latencyMs,
      tableStatus: 'error',
    };
    saveConnectionTestStatus(genericFail);
    return genericFail;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const rawErr = err instanceof Error ? err.message : String(err);
    const sanitized = sanitizeSupabaseError(rawErr, rawAnonKey);

    const networkFail: SupabaseConnectionTestResult = {
      status: 'failed',
      message: 'Connection Failed: Could not reach Supabase Project URL.',
      details: `Network or CORS error after ${latencyMs} ms: ${sanitized}. Verify that "${urlCheck.normalizedUrl}" is an active Supabase project URL.`,
      testedAt,
      latencyMs,
      tableStatus: 'error',
    };
    saveConnectionTestStatus(networkFail);
    return networkFail;
  }
}

// ============================================================================
// MAPPERS & DATABASE SYNC FOR CHOIR_MEMBERS AND PORTAL MODULES
// ============================================================================

function mapMemberToRow(m: ChoirMember) {
  return {
    id: m.id,
    membership_id: m.membershipId,
    full_name: m.fullName,
    first_name: m.firstName || null,
    last_name: m.lastName || null,
    year_joined_department: m.yearJoinedDepartment || null,
    email: m.email || '',
    phone: m.phone || '',
    gender: m.gender || 'Female',
    voice_part: m.voicePart || 'Soprano',
    unit_id: m.unitId || 'unit-001',
    unit_name: m.unitName || 'Praise & Worship Unit',
    role: m.role || 'chorister',
    status: m.status || 'Active',
    birth_date: m.birthDate || null,
    joined_date: m.joinedDate || null,
    address: m.address || '',
    marital_status: m.maritalStatus || null,
    blood_group: m.bloodGroup || null,
    genotype: m.genotype || null,
    facebook_handle: m.facebookHandle || null,
    instagram_handle: m.instagramHandle || null,
    educational_level: m.educationalLevel || null,
    computer_literacy_level: m.computerLiteracyLevel || null,
    occupation: m.occupation || null,
    next_of_kin_name: m.nextOfKinName || null,
    next_of_kin_phone: m.nextOfKinPhone || null,
    care_center_name: m.careCenterName || null,
    satellite_church_name: m.satelliteChurchName || null,
    been_to_encounter: m.beenToEncounter || null,
    attended_foundation_school: m.attendedFoundationSchool || null,
    attended_dli: m.attendedDLI || null,
    sop_acknowledged: m.sopAcknowledged ?? true,
    emergency_contact: m.emergencyContact || '',
    notes: m.notes || '',
  };
}

function mapRowToMember(row: Record<string, any>): ChoirMember {
  return {
    id: String(row.id),
    membershipId: String(row.membership_id || 'DCA-001'),
    fullName: String(row.full_name || ''),
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    yearJoinedDepartment: row.year_joined_department ?? undefined,
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    gender: row.gender === 'Male' ? 'Male' : 'Female',
    voicePart: row.voice_part || 'Soprano',
    unitId: String(row.unit_id || 'unit-001'),
    unitName: String(row.unit_name || 'Praise & Worship Unit'),
    role: String(row.role || 'chorister'),
    status: row.status || 'Active',
    birthDate: String(row.birth_date || ''),
    joinedDate: String(row.joined_date || ''),
    address: String(row.address || ''),
    maritalStatus: row.marital_status ?? undefined,
    bloodGroup: row.blood_group ?? undefined,
    genotype: row.genotype ?? undefined,
    facebookHandle: row.facebook_handle ?? undefined,
    instagramHandle: row.instagram_handle ?? undefined,
    educationalLevel: row.educational_level ?? undefined,
    computerLiteracyLevel: row.computer_literacy_level ?? undefined,
    occupation: row.occupation ?? undefined,
    nextOfKinName: row.next_of_kin_name ?? undefined,
    nextOfKinPhone: row.next_of_kin_phone ?? undefined,
    careCenterName: row.care_center_name ?? undefined,
    satelliteChurchName: row.satellite_church_name ?? undefined,
    beenToEncounter: row.been_to_encounter ?? undefined,
    attendedFoundationSchool: row.attended_foundation_school ?? undefined,
    attendedDLI: row.attended_dli ?? undefined,
    sopAcknowledged: Boolean(row.sop_acknowledged ?? true),
    emergencyContact: String(row.emergency_contact || ''),
    notes: String(row.notes || ''),
  };
}

/**
 * Fetches choir data from Supabase when a verified connection is active.
 */
export async function fetchFromSupabaseIfConnected(
  fallbackDb: ChoirDatabase
): Promise<ChoirDatabase | null> {
  const status = getLastConnectionTestStatus();
  if (status?.status !== 'connected') return null;

  const client = getOrInitSupabaseClient();
  if (!client) return null;

  try {
    const nextDb: ChoirDatabase = { ...fallbackDb };

    const { data: memberRows, error: memberErr } = await client
      .from('choir_members')
      .select('*')
      .order('full_name', { ascending: true });

    if (!memberErr && Array.isArray(memberRows) && memberRows.length > 0) {
      nextDb.members = memberRows.map(mapRowToMember);
    }

    const { data: collectionRows, error: colErr } = await client
      .from('choir_portal_collections')
      .select('collection_key, payload');

    if (!colErr && Array.isArray(collectionRows)) {
      for (const row of collectionRows) {
        const key = row.collection_key as keyof ChoirDatabase;
        if (key && key !== 'members' && Array.isArray(row.payload)) {
          (nextDb[key] as unknown) = row.payload;
        }
      }
    }

    return nextDb;
  } catch {
    return null;
  }
}

/**
 * Persists a modified collection to Supabase when connected.
 */
export async function syncCollectionToSupabase<K extends keyof ChoirDatabase>(
  collection: K,
  items: ChoirDatabase[K]
): Promise<boolean> {
  const status = getLastConnectionTestStatus();
  if (status?.status !== 'connected') return false;

  const client = getOrInitSupabaseClient();
  if (!client) return false;

  try {
    if (collection === 'members') {
      const members = items as ChoirMember[];
      const rows = members.map(mapMemberToRow);
      const { error } = await client
        .from('choir_members')
        .upsert(rows, { onConflict: 'id' });
      return !error;
    } else {
      const { error } = await client
        .from('choir_portal_collections')
        .upsert(
          {
            collection_key: String(collection),
            payload: items,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'collection_key' }
        );
      return !error;
    }
  } catch {
    return false;
  }
}
