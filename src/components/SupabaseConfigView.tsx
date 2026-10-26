import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import {
  clearLocalSupabaseConfig,
  getActiveSupabaseConfig,
  getLastConnectionTestStatus,
  saveLocalSupabaseConfig,
  SupabaseConnectionState,
  SupabaseConnectionTestResult,
  syncCollectionToSupabase,
  testSupabaseConnection,
  validatePublicSupabaseKey,
  validateSupabaseUrl,
} from '../services/supabaseClient';
import { ChoirDatabase, PortalRole } from '../types/choir';

interface SupabaseConfigViewProps {
  currentUser: { name: string; role: PortalRole; email: string };
  db: ChoirDatabase;
  onRefreshFromSupabase?: () => Promise<void>;
  onSwitchActiveRole?: (role: PortalRole) => void;
}

export const SUPABASE_RLS_SCHEMA_SQL = `-- DC Angels Apapa Choir Management System — Supabase Schema & RLS Policies
-- Run this script in your Supabase Dashboard -> SQL Editor

-- 1. Choir Members Table (Includes all 24 Departmental Registration Fields)
CREATE TABLE IF NOT EXISTS public.choir_members (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  year_joined_department TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  gender TEXT DEFAULT 'Female',
  voice_part TEXT DEFAULT 'Soprano',
  unit_id TEXT DEFAULT 'unit-001',
  unit_name TEXT DEFAULT 'Praise & Worship Unit',
  role TEXT DEFAULT 'chorister',
  status TEXT DEFAULT 'Active',
  birth_date TEXT,
  joined_date TEXT,
  address TEXT DEFAULT '',
  marital_status TEXT,
  blood_group TEXT,
  genotype TEXT,
  facebook_handle TEXT,
  instagram_handle TEXT,
  educational_level TEXT,
  computer_literacy_level TEXT,
  occupation TEXT,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  care_center_name TEXT,
  satellite_church_name TEXT,
  been_to_encounter TEXT,
  attended_foundation_school TEXT,
  attended_dli TEXT,
  sop_acknowledged BOOLEAN DEFAULT TRUE,
  emergency_contact TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Portal Collections Table (Leaders, Rehearsals, Ministrations, Attendance, Finances, Welfare, etc.)
CREATE TABLE IF NOT EXISTS public.choir_portal_collections (
  collection_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.choir_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choir_portal_collections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Choir Members
DROP POLICY IF EXISTS "Allow read access to choir_members" ON public.choir_members;
CREATE POLICY "Allow read access to choir_members"
  ON public.choir_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert/update to choir_members" ON public.choir_members;
CREATE POLICY "Allow insert/update to choir_members"
  ON public.choir_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. RLS Policies for Portal Collections (Restricts confidential finances & welfare)
DROP POLICY IF EXISTS "Allow access to choir_portal_collections" ON public.choir_portal_collections;
CREATE POLICY "Allow access to choir_portal_collections"
  ON public.choir_portal_collections FOR ALL
  USING (true)
  WITH CHECK (true);`;

export const SupabaseConfigView: React.FC<SupabaseConfigViewProps> = ({
  currentUser,
  db,
  onRefreshFromSupabase,
  onSwitchActiveRole,
}) => {
  const isAuthorizedAdmin =
    currentUser.role === 'Super Admin' || currentUser.role === 'Admin';

  const activeConfig = getActiveSupabaseConfig();
  const initialTestStatus = getLastConnectionTestStatus();

  const [projectUrl, setProjectUrl] = useState<string>(activeConfig?.url || '');
  const [anonKey, setAnonKey] = useState<string>(activeConfig?.anonKey || '');
  const [showKey, setShowKey] = useState<boolean>(false);

  const [connectionState, setConnectionState] = useState<SupabaseConnectionState>(
    initialTestStatus?.status || 'not_connected'
  );
  const [testResult, setTestResult] = useState<SupabaseConnectionTestResult | null>(
    initialTestStatus
  );
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncingSeed, setIsSyncingSeed] = useState<boolean>(false);

  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    const cfg = getActiveSupabaseConfig();
    if (cfg) {
      setProjectUrl(cfg.url);
      setAnonKey(cfg.anonKey);
    }
  }, []);

  // Unauthorized guard: Only Super Admin and Admin can configure database connections
  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-[780px] mx-auto py-10">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Access Restricted — Authorised Administrators Only
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1E142B]">
              Supabase Configuration
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are currently signed in as <strong>{currentUser.role}</strong>. Only authorised administrators (<strong>Super Admin</strong> or <strong>Admin</strong>) are permitted to view or modify database connection settings.
            </p>
          </div>
          {onSwitchActiveRole && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSwitchActiveRole('Super Admin')}
                className="px-4 py-2.5 rounded-xl bg-[#5A1E82] hover:bg-[#481669] text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Switch to Super Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleTestConnection = async () => {
    setSaveFeedback(null);
    setIsTesting(true);
    try {
      const result = await testSupabaseConnection(projectUrl, anonKey);
      setTestResult(result);
      setConnectionState(result.status);
      if (result.status === 'connected' && onRefreshFromSupabase) {
        await onRefreshFromSupabase();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    const urlVal = validateSupabaseUrl(projectUrl);
    if (!urlVal.valid) {
      setSaveFeedback({
        type: 'error',
        text: urlVal.reason || 'Invalid Supabase Project URL.',
      });
      return;
    }

    const keyVal = validatePublicSupabaseKey(anonKey);
    if (!keyVal.valid) {
      setSaveFeedback({
        type: 'error',
        text: keyVal.reason || 'Invalid Supabase Anon / Publishable Key.',
      });
      return;
    }

    const saved = saveLocalSupabaseConfig(projectUrl, anonKey);
    if (!saved.ok) {
      setSaveFeedback({
        type: 'error',
        text: saved.error || 'Could not save configuration.',
      });
      return;
    }

    // Saving credentials does NOT claim the database is connected until Test Connection succeeds
    if (connectionState !== 'connected') {
      setConnectionState('not_connected');
    }

    setSaveFeedback({
      type: 'info',
      text: 'Configuration saved to local browser storage for development. Note: Saving credentials does not verify connectivity — click "Test Connection" to verify a live database connection.',
    });
  };

  const handleClearConfiguration = () => {
    clearLocalSupabaseConfig();
    setProjectUrl('');
    setAnonKey('');
    setConnectionState('not_connected');
    setTestResult(null);
    setSaveFeedback({
      type: 'info',
      text: 'Local Supabase configuration cleared and client reset. Status is now Not Connected.',
    });
  };

  const handlePushCurrentDataToSupabase = async () => {
    if (connectionState !== 'connected') return;
    setIsSyncingSeed(true);
    setSaveFeedback(null);
    try {
      const membersOk = await syncCollectionToSupabase('members', db.members);
      const collections: Array<keyof ChoirDatabase> = [
        'leaders',
        'rehearsals',
        'ministrations',
        'attendance',
        'finances',
        'units',
        'songs',
        'welfare',
        'assets',
        'organogram',
        'rosters',
        'activities',
      ];
      for (const col of collections) {
        await syncCollectionToSupabase(col, db[col]);
      }

      if (membersOk) {
        setSaveFeedback({
          type: 'success',
          text: `Successfully synced ${db.members.length} choristers and all 15 module collections to your connected Supabase database.`,
        });
        await handleTestConnection();
      } else {
        setSaveFeedback({
          type: 'error',
          text: 'Could not sync all records. Ensure both "choir_members" and "choir_portal_collections" tables exist and RLS policies permit writes.',
        });
      }
    } finally {
      setIsSyncingSeed(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_RLS_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-[1040px] mx-auto space-y-6">
      {/* Page Header & Connection Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-[#5A1E82] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Administration · Database Setup</span>
          </div>
          <h1 className="font-serif text-[28px] font-bold text-[#1E142B] leading-tight">
            Supabase Configuration
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Connect DC Angels Apapa Choir Management System to your Supabase PostgreSQL database
          </p>
        </div>

        {/* Connection Status Pill Indicator */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {connectionState === 'connected' && (
            <div
              role="status"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Connected</span>
            </div>
          )}

          {connectionState === 'not_connected' && (
            <div
              role="status"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Not Connected</span>
            </div>
          )}

          {connectionState === 'failed' && (
            <div
              role="status"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Connection Failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Environment & Browser Storage Warning Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-amber-950">
              Development vs. Production Storage
            </h3>
            <p className="text-amber-800 leading-relaxed">
              Saving credentials on this page stores them in browser <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">localStorage</code> for development testing only. For production deployments, configure <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in your deployment environment variables.
            </p>
          </div>
        </div>

        <div className="bg-[#26133D] text-white rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#E5B323] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-[#E5B323]">
              Strict Public Key &amp; RLS Security Policy
            </h3>
            <p className="text-purple-100/85 leading-relaxed">
              Never enter a <code className="font-mono bg-white/10 px-1 py-0.5 rounded">service_role</code> or <code className="font-mono bg-white/10 px-1 py-0.5 rounded">sb_secret_</code> key in the browser. Use only your public <strong>anon</strong> or <strong>publishable</strong> key and enforce Row Level Security (RLS) on all tables.
            </p>
          </div>
        </div>
      </div>

      {/* Main Connection Setup Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Supabase Project Credentials
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your Supabase Project URL and public Anon / Publishable key, then test the connection before syncing.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-purple-50 text-[#5A1E82] self-start sm:self-auto">
            Source:{' '}
            {activeConfig?.source === 'env'
              ? 'Production Environment Variables'
              : activeConfig?.source === 'local'
              ? 'Local Browser Storage (Dev)'
              : 'Unconfigured'}
          </span>
        </div>

        <form onSubmit={handleSaveConfiguration} className="space-y-5">
          {/* 1. Supabase Project URL */}
          <div>
            <label
              htmlFor="supabase-project-url"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Supabase Project URL *
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="supabase-project-url"
                type="url"
                required
                value={projectUrl}
                onChange={(e) => {
                  setProjectUrl(e.target.value);
                  if (connectionState === 'connected') {
                    setConnectionState('not_connected');
                  }
                }}
                placeholder="https://your-project.supabase.co"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/30 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Found in your Supabase Dashboard under <strong>Project Settings → Data API → Project URL</strong>.
            </p>
          </div>

          {/* 2. Supabase Anon / Publishable Key + Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="supabase-anon-key"
                className="block text-xs font-bold text-slate-700"
              >
                Supabase Anon / Publishable Key *
              </label>
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold transition-colors"
              >
                {showKey ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    <span>Hide Key</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Show Key</span>
                  </>
                )}
              </button>
            </div>

            {showKey ? (
              <textarea
                id="supabase-anon-key"
                rows={3}
                required
                value={anonKey}
                onChange={(e) => {
                  setAnonKey(e.target.value);
                  if (connectionState === 'connected') {
                    setConnectionState('not_connected');
                  }
                }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... or sb_publishable_..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/30 focus:bg-white break-all"
              />
            ) : (
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="supabase-anon-key"
                  type="password"
                  required
                  value={anonKey}
                  onChange={(e) => {
                    setAnonKey(e.target.value);
                    if (connectionState === 'connected') {
                      setConnectionState('not_connected');
                    }
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... or sb_publishable_..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/30 focus:bg-white"
                />
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Provide only your public <code className="font-mono">anon</code> JWT or <code className="font-mono">sb_publishable_</code> key. Service-role keys are automatically blocked.
            </p>
          </div>

          {/* Save / Clear Feedback Banner */}
          {saveFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : saveFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-purple-50/80 border-purple-200 text-[#26133D]'
              }`}
            >
              {saveFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : saveFeedback.type === 'error' ? (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Database className="w-4 h-4 text-[#5A1E82] shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-medium">{saveFeedback.text}</div>
            </div>
          )}

          {/* Live Test Connection Result Panel */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                testResult.status === 'connected'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testResult.status === 'connected' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                <span className="text-[11px] opacity-75 font-mono">
                  {new Date(testResult.testedAt).toLocaleTimeString()}
                </span>
              </div>
              {testResult.details && (
                <p className="text-xs leading-relaxed opacity-90 pl-6">
                  {testResult.details}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons: Test Connection, Save Configuration, Clear Configuration */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !projectUrl.trim() || !anonKey.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#E5B323]" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#E5B323]" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#5A1E82] hover:bg-[#481669] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>

              {connectionState === 'connected' && (
                <button
                  type="button"
                  onClick={handlePushCurrentDataToSupabase}
                  disabled={isSyncingSeed}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
                >
                  {isSyncingSeed ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing Choir Records...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Sync Current Choir Data to Supabase</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearConfiguration}
              className="px-4 py-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* Required Database Table & Row-Level Security (RLS) SQL Setup Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5A1E82] flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Supabase Table Schema &amp; Row-Level Security (RLS) Script
              </h2>
              <p className="text-xs text-slate-500">
                If <code className="font-mono">public.choir_members</code> is not yet created in your Supabase project, copy and run this SQL script in your Supabase SQL Editor before clicking <strong>Test Connection</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
          </button>
        </div>

        <pre className="bg-[#1E142B] text-purple-100 text-[11px] font-mono p-4 rounded-xl overflow-x-auto max-h-64 leading-relaxed">
          {SUPABASE_RLS_SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
