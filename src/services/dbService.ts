import { INITIAL_CHOIR_DATABASE } from '../data/initialDatabase';
import { ActivityEvent, ChoirDatabase } from '../types/choir';
import {
  fetchFromSupabaseIfConnected,
  syncCollectionToSupabase,
} from './supabaseClient';

const LOCAL_STORAGE_KEY = 'dc_angels_apapa_choir_db_v2';

export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return 'Today';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatNaira(amount: number): string {
  if (!amount || amount === 0) return '₦0';
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function createActivityEvent(
  title: string,
  subtitle: string,
  category: ActivityEvent['category'] = 'system',
  customDateStr?: string
): ActivityEvent {
  const now = new Date();
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    subtitle,
    category,
    dateLabel: customDateStr ? formatShortDate(customDateStr) : formatShortDate(now.toISOString()),
    timestamp: now.toISOString(),
  };
}

export async function fetchDatabase(): Promise<ChoirDatabase> {
  let baseDb: ChoirDatabase = INITIAL_CHOIR_DATABASE;
  try {
    const response = await fetch('/api/db');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    baseDb = (await response.json()) as ChoirDatabase;
  } catch {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        baseDb = JSON.parse(cached) as ChoirDatabase;
      } catch {
        baseDb = INITIAL_CHOIR_DATABASE;
      }
    }
  }

  // If a verified Supabase connection is active, merge remote Supabase data
  const supabaseDb = await fetchFromSupabaseIfConnected(baseDb);
  const resolvedDb = supabaseDb || baseDb;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resolvedDb));
  return resolvedDb;
}

export async function saveCollection<K extends keyof ChoirDatabase>(
  currentDb: ChoirDatabase,
  collection: K,
  items: ChoirDatabase[K],
  activity?: ActivityEvent
): Promise<ChoirDatabase> {
  const updatedLocal: ChoirDatabase = {
    ...currentDb,
    [collection]: items,
    activities: activity ? [activity, ...currentDb.activities].slice(0, 50) : currentDb.activities,
  };

  // Sync to Supabase in parallel if connected
  await syncCollectionToSupabase(collection, items);
  if (activity) {
    await syncCollectionToSupabase('activities', updatedLocal.activities);
  }

  try {
    const response = await fetch(`/api/db/${String(collection)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, activity }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.db) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.db));
        return data.db as ChoirDatabase;
      }
    }
  } catch {
    // Offline fallback persists in localStorage
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
  return updatedLocal;
}

export async function saveFullDatabase(nextDb: ChoirDatabase): Promise<ChoirDatabase> {
  try {
    const response = await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextDb),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.db) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.db));
        return data.db as ChoirDatabase;
      }
    }
  } catch {
    // Offline fallback
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDb));
  return nextDb;
}

export function exportToCSV(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
