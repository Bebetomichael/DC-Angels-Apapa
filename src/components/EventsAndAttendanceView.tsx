import React, { useMemo, useState } from 'react';
import {
  BarChart2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  MapPin,
  Mic,
  Plus,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { exportToCSV } from '../services/dbService';
import {
  AttendanceEntry,
  AttendanceSession,
  AttendanceStatus,
  ChoirDatabase,
  Ministration,
  Rehearsal,
} from '../types/choir';

// ============================================================================
// REHEARSALS VIEW
// ============================================================================

interface RehearsalsViewProps {
  db: ChoirDatabase;
  onUpdateRehearsals: (rehearsals: Rehearsal[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

const REHEARSAL_TYPES: Rehearsal['type'][] = [
  'General Rehearsal',
  'Sectional',
  'Instrumental',
  'Special Ministration Prep',
  'Vigil Rehearsal',
];

export const RehearsalsView: React.FC<RehearsalsViewProps> = ({ db, onUpdateRehearsals }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Rehearsal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rehearsal | null>(null);

  const [form, setForm] = useState({
    title: 'Thursday Sanctuary General Rehearsal',
    date: new Date().toISOString().slice(0, 10),
    startTime: '17:30',
    endTime: '20:00',
    venue: 'DC Apapa Main Auditorium',
    type: 'General Rehearsal' as Rehearsal['type'],
    conductor: 'Emmanuel Adeyemi',
    notes: 'Full vocal and band harmony run-through for Sunday ministration.',
    status: 'Scheduled' as Rehearsal['status'],
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.rehearsals.filter((r) => {
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.venue.toLowerCase().includes(q) ||
        r.conductor.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [db.rehearsals, search, statusFilter]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      title: 'Thursday Sanctuary General Rehearsal',
      date: new Date().toISOString().slice(0, 10),
      startTime: '17:30',
      endTime: '20:00',
      venue: 'DC Apapa Main Auditorium',
      type: 'General Rehearsal',
      conductor: 'Emmanuel Adeyemi',
      notes: 'Vocal warmups, harmony drills, and Sunday setlist rehearsal.',
      status: 'Scheduled',
    });
    setModalOpen(true);
  };

  const openEdit = (r: Rehearsal) => {
    setEditingItem(r);
    setForm({
      title: r.title,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      venue: r.venue,
      type: r.type,
      conductor: r.conductor,
      notes: r.notes,
      status: r.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingItem) {
      const next = db.rehearsals.map((r) => (r.id === editingItem.id ? { ...r, ...form } : r));
      await onUpdateRehearsals(next, form.title, 'Rehearsal Schedule Updated');
    } else {
      const created: Rehearsal = {
        id: `reh-${Date.now()}`,
        ...form,
        songIds: [],
      };
      await onUpdateRehearsals([created, ...db.rehearsals], created.title, 'New Rehearsal Scheduled');
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Rehearsals</h1>
          <p className="text-[13px] text-slate-500">
            Schedule general, sectional, and instrumental rehearsals ({db.rehearsals.filter((r) => r.status === 'Scheduled').length} upcoming)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 transition-colors self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Schedule Rehearsal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rehearsals by title, venue, or conductor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mx-auto">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900">No Rehearsals Scheduled Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Schedule an upcoming rehearsal to populate your choir calendar and update the dashboard counter.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[#26133D] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#EAB308]" />
            <span>Schedule First Rehearsal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((reh) => (
            <div
              key={reh.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-700">{reh.type}</span>
                    <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">{reh.title}</h3>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      reh.status === 'Scheduled'
                        ? 'text-blue-700'
                        : reh.status === 'Completed'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {reh.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{reh.date}</span>
                    <span>·</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">
                      {reh.startTime} – {reh.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{reh.venue}</span>
                    <span>·</span>
                    <span>Conductor: {reh.conductor}</span>
                  </div>
                </div>
                {reh.notes && <p className="text-xs text-slate-500 mt-3">{reh.notes}</p>}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    const nextStatus = reh.status === 'Scheduled' ? 'Completed' : 'Scheduled';
                    const next = db.rehearsals.map((item) =>
                      item.id === reh.id ? { ...item, status: nextStatus as Rehearsal['status'] } : item
                    );
                    await onUpdateRehearsals(next, reh.title, `Rehearsal Marked ${nextStatus}`);
                  }}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                >
                  {reh.status === 'Scheduled' ? 'Mark Completed' : 'Reopen as Scheduled'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(reh)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(reh)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingItem ? 'Edit Rehearsal' : 'Schedule Rehearsal'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rehearsal Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rehearsal Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Rehearsal['type'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {REHEARSAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Rehearsal['status'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conductor / Director</label>
                  <input
                    type="text"
                    value={form.conductor}
                    onChange={(e) => setForm({ ...form, conductor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes & Focus Songs</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#26133D] text-white font-semibold"
                >
                  Save Rehearsal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Rehearsal?</h3>
            <p className="text-xs text-slate-600">
              Delete <strong>{deleteTarget.title}</strong> ({deleteTarget.date})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = db.rehearsals.filter((r) => r.id !== deleteTarget.id);
                  await onUpdateRehearsals(next, deleteTarget.title, 'Rehearsal Removed');
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MINISTRATIONS VIEW
// ============================================================================

interface MinistrationsViewProps {
  db: ChoirDatabase;
  onUpdateMinistrations: (
    ministrations: Ministration[],
    activityTitle?: string,
    activitySub?: string
  ) => Promise<void>;
}

const MINISTRY_TYPES: Ministration['ministryType'][] = [
  'Sunday First Service',
  'Sunday Second Service',
  'Midweek Communion',
  'Special Crusade',
  'Wedding / Guest',
  'Night of Worship',
];

export const MinistrationsView: React.FC<MinistrationsViewProps> = ({ db, onUpdateMinistrations }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ministration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ministration | null>(null);

  const [form, setForm] = useState({
    serviceName: 'Sunday Supernatural Encounter Service',
    date: new Date().toISOString().slice(0, 10),
    time: '08:00',
    venue: 'DC Angels Apapa Main Sanctuary',
    ministryType: 'Sunday First Service' as Ministration['ministryType'],
    leadMinister: 'Chidinma Okafor',
    choirAssignment: 'Praise & Worship Unit (Full Choir)',
    songTitles: 'Fragrance to Fire, Kosi Oba Biire Medley',
    uniformCode: 'Royal Purple & Gold Touch',
    notes: 'Call time for sound check is 7:00 AM prompt.',
    status: 'Upcoming' as Ministration['status'],
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.ministrations.filter(
      (m) =>
        !q ||
        m.serviceName.toLowerCase().includes(q) ||
        m.leadMinister.toLowerCase().includes(q) ||
        m.ministryType.toLowerCase().includes(q) ||
        m.venue.toLowerCase().includes(q)
    );
  }, [db.ministrations, search]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      serviceName: 'Sunday Supernatural Encounter Service',
      date: new Date().toISOString().slice(0, 10),
      time: '08:00',
      venue: 'DC Angels Apapa Main Sanctuary',
      ministryType: 'Sunday First Service',
      leadMinister: 'Chidinma Okafor',
      choirAssignment: 'Praise & Worship Unit (Full Choir)',
      songTitles: 'Fragrance to Fire, Onise Iyanu',
      uniformCode: 'Royal Purple & Gold Touch',
      notes: 'Call time for sound check is 7:00 AM prompt.',
      status: 'Upcoming',
    });
    setModalOpen(true);
  };

  const openEdit = (m: Ministration) => {
    setEditingItem(m);
    setForm({
      serviceName: m.serviceName,
      date: m.date,
      time: m.time,
      venue: m.venue,
      ministryType: m.ministryType,
      leadMinister: m.leadMinister,
      choirAssignment: m.choirAssignment,
      songTitles: m.songTitles,
      uniformCode: m.uniformCode,
      notes: m.notes,
      status: m.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceName.trim()) return;
    if (editingItem) {
      const next = db.ministrations.map((m) => (m.id === editingItem.id ? { ...m, ...form } : m));
      await onUpdateMinistrations(next, form.serviceName, 'Ministration Updated');
    } else {
      const created: Ministration = {
        id: `min-${Date.now()}`,
        ...form,
      };
      await onUpdateMinistrations([created, ...db.ministrations], created.serviceName, 'New Ministration Scheduled');
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Ministrations</h1>
          <p className="text-[13px] text-slate-500">
            Manage service schedules, choir assignments, venues, and ministry types ({db.ministrations.length} total)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 transition-colors self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Add Ministration</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ministrations by service name, lead minister, or venue..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900">No Ministrations Logged Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create a service ministration schedule to assign lead vocalists, choir units, and uniform dress codes.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[#26133D] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#EAB308]" />
            <span>Schedule First Ministration</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700">{item.ministryType}</span>
                    <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">{item.serviceName}</h3>
                  </div>
                  <span className="text-xs font-semibold text-purple-800">{item.status}</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div>
                    <strong>Date & Time:</strong> {item.date} at {item.time} · <strong>Venue:</strong> {item.venue}
                  </div>
                  <div>
                    <strong>Lead Minister:</strong> {item.leadMinister} · <strong>Unit:</strong> {item.choirAssignment}
                  </div>
                  <div>
                    <strong>Repertoire:</strong> {item.songTitles}
                  </div>
                  <div>
                    <strong>Uniform:</strong> {item.uniformCode}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{item.notes}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingItem ? 'Edit Ministration' : 'Schedule Ministration'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Ministration['status'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ministry Type</label>
                  <select
                    value={form.ministryType}
                    onChange={(e) =>
                      setForm({ ...form, ministryType: e.target.value as Ministration['ministryType'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {MINISTRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Minister</label>
                  <input
                    type="text"
                    value={form.leadMinister}
                    onChange={(e) => setForm({ ...form, leadMinister: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Choir Assignment</label>
                  <input
                    type="text"
                    value={form.choirAssignment}
                    onChange={(e) => setForm({ ...form, choirAssignment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Song Titles</label>
                  <input
                    type="text"
                    value={form.songTitles}
                    onChange={(e) => setForm({ ...form, songTitles: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Uniform Dress Code</label>
                  <input
                    type="text"
                    value={form.uniformCode}
                    onChange={(e) => setForm({ ...form, uniformCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#26133D] text-white font-semibold"
                >
                  Save Ministration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Ministration?</h3>
            <p className="text-xs text-slate-600">
              Delete <strong>{deleteTarget.serviceName}</strong> ({deleteTarget.date})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = db.ministrations.filter((m) => m.id !== deleteTarget.id);
                  await onUpdateMinistrations(next, deleteTarget.serviceName, 'Ministration Removed');
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ATTENDANCE VIEW (Exact Replication of Uploaded Screenshot + Full Functionality)
// ============================================================================

interface AttendanceViewProps {
  db: ChoirDatabase;
  onUpdateAttendance: (
    attendance: AttendanceSession[],
    activityTitle?: string,
    activitySub?: string
  ) => Promise<void>;
}

const ATTENDANCE_TYPES = [
  'Sunday First Service Ministration',
  'Sunday Second Service Ministration',
  'Midweek Communion Service',
  'Thursday General Rehearsal',
  'Saturday Sanctuary Rehearsal',
  'Vocal Sectional Rehearsal',
  'Vigil / Night of Worship',
  'Choir General Meeting',
];

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ db, onUpdateAttendance }) => {
  const [mainTab, setMainTab] = useState<'mark' | 'records' | 'reports'>('mark');
  const [markMode, setMarkMode] = useState<'individual' | 'bulk'>('individual');

  // Step 1 & Step 2 fields matching screenshot
  const [attendanceType, setAttendanceType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-26');
  const [selectedTime, setSelectedTime] = useState<string>('19:52');

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [draftEntries, setDraftEntries] = useState<Record<string, AttendanceEntry>>({});
  const [feedback, setFeedback] = useState('');

  // Check if an attendance session already exists for this date + attendanceType
  const activeSession = useMemo(() => {
    if (!attendanceType) return undefined;
    return db.attendance.find(
      (s) => s.date === selectedDate && s.eventTitle.toLowerCase() === attendanceType.toLowerCase()
    );
  }, [db.attendance, selectedDate, attendanceType]);

  const currentEntries: AttendanceEntry[] = useMemo(() => {
    return db.members.map((m) => {
      if (draftEntries[m.id]) return draftEntries[m.id];
      const existing = activeSession?.entries.find((e) => e.memberId === m.id);
      if (existing) return existing;
      return {
        memberId: m.id,
        memberName: m.fullName,
        voicePart: m.voicePart,
        status: 'Present',
        checkInTime: selectedTime || '19:52',
        remark: '',
      };
    });
  }, [db.members, activeSession, draftEntries, selectedTime]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return db.members.filter(
      (m) =>
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.voicePart.toLowerCase().includes(q)
    );
  }, [db.members, memberSearch]);

  const handleMarkSingle = (memberId: string, status: AttendanceStatus) => {
    const base = currentEntries.find((e) => e.memberId === memberId);
    if (!base) return;
    setDraftEntries((prev) => ({
      ...prev,
      [memberId]: {
        ...base,
        status,
        checkInTime: status === 'Absent' ? '—' : selectedTime || '19:52',
      },
    }));
  };

  const handleBulkApplyStatus = (status: AttendanceStatus) => {
    const targetIds =
      selectedMemberIds.length > 0 ? selectedMemberIds : filteredMembers.map((m) => m.id);
    const nextDraft = { ...draftEntries };
    for (const id of targetIds) {
      const base = currentEntries.find((e) => e.memberId === id);
      if (base) {
        nextDraft[id] = {
          ...base,
          status,
          checkInTime: status === 'Absent' ? '—' : selectedTime || '19:52',
        };
      }
    }
    setDraftEntries(nextDraft);
  };

  const handleSaveSession = async () => {
    if (!attendanceType) return;
    const isRehearsal = attendanceType.toLowerCase().includes('rehearsal');
    const sessionObj: AttendanceSession = {
      id: activeSession?.id || `att-${Date.now()}`,
      eventId: `${attendanceType.toLowerCase().replace(/\s+/g, '-')}-${selectedDate}`,
      eventTitle: attendanceType,
      eventType: isRehearsal ? 'Rehearsal' : 'Ministration',
      date: selectedDate,
      entries: currentEntries,
    };

    const nextList = activeSession
      ? db.attendance.map((s) => (s.id === activeSession.id ? sessionObj : s))
      : [sessionObj, ...db.attendance];

    const presentCount = currentEntries.filter(
      (e) => e.status === 'Present' || e.status === 'Late'
    ).length;

    await onUpdateAttendance(
      nextList,
      `${attendanceType} (${selectedDate})`,
      `Attendance Saved: ${presentCount}/${currentEntries.length} Present`
    );
    setDraftEntries({});
    setFeedback(
      `Attendance saved for "${attendanceType}" on ${selectedDate} (${presentCount} of ${currentEntries.length} present).`
    );
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleExportSessionCSV = (session: AttendanceSession) => {
    exportToCSV(
      `dc_angels_attendance_${session.date}.csv`,
      ['Date', 'Attendance Type', 'Member Name', 'Voice Part', 'Status', 'Check-in Time'],
      session.entries.map((e) => [
        session.date,
        session.eventTitle,
        e.memberName,
        e.voicePart,
        e.status,
        e.checkInTime,
      ])
    );
  };

  return (
    <div className="max-w-[1160px] mx-auto space-y-5">
      {/* Top Heading matching screenshot */}
      <div>
        <h1 className="font-serif text-[26px] font-bold text-[#1E142B] leading-tight">
          Attendance
        </h1>
        <p className="text-[12.5px] text-slate-500 mt-0.5">
          Track member attendance for each service and meeting
        </p>
      </div>

      {/* Primary Segmented Control: Mark Attendance | Records | Reports & Summary */}
      <div>
        <div className="inline-flex items-center bg-[#EFEFF3] p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMainTab('mark')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 transition-all ${
              mainTab === 'mark'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Mark Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('records')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 transition-all ${
              mainTab === 'records'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Records</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('reports')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 transition-all ${
              mainTab === 'reports'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Reports & Summary</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          {feedback}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: MARK ATTENDANCE                                              */}
      {/* =================================================================== */}
      {mainTab === 'mark' && (
        <div className="space-y-4">
          {/* Secondary Segmented Control: Individual Attendance | Bulk Attendance */}
          <div>
            <div className="inline-flex items-center bg-[#EFEFF3] p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setMarkMode('individual')}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] transition-all ${
                  markMode === 'individual'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Individual Attendance
              </button>
              <button
                type="button"
                onClick={() => setMarkMode('bulk')}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] transition-all ${
                  markMode === 'bulk'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Bulk Attendance
              </button>
            </div>
          </div>

          {/* Step 1 & Step 2 Configuration Card matching screenshot */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                STEP 1 — ATTENDANCE TYPE
              </label>
              <select
                value={attendanceType}
                onChange={(e) => {
                  setAttendanceType(e.target.value);
                  setDraftEntries({});
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              >
                <option value="">Select attendance type...</option>
                {ATTENDANCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                STEP 2 — DATE & TIME
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDraftEntries({});
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 bg-[#F9FAFB] text-[12.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                />
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 bg-[#F9FAFB] text-[12.5px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                />
              </div>
            </div>
          </div>

          {/* Empty State when no attendance type is selected (Exact match to screenshot) */}
          {!attendanceType ? (
            <div className="py-16 flex flex-col items-center justify-center text-center select-none">
              <CalendarCheck className="w-9 h-9 text-slate-300 stroke-[1.75] mb-3" />
              <p className="text-[13px] text-slate-500">
                Select an attendance type and date to begin
              </p>
            </div>
          ) : (
            /* Active Attendance Marking Workspace once type & date are chosen */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-serif text-base font-bold text-slate-900">
                    {attendanceType}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Date: <span className="font-mono">{selectedDate}</span> · Time:{' '}
                    <span className="font-mono">{selectedTime}</span> ·{' '}
                    {activeSession ? 'Updating existing record' : 'New attendance session'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {markMode === 'bulk' && (
                    <div className="flex items-center gap-1.5 mr-2">
                      {(
                        [
                          { label: 'Mark Present', status: 'Present' },
                          { label: 'Mark Late', status: 'Late' },
                          { label: 'Mark Excused', status: 'Excused' },
                          { label: 'Mark Absent', status: 'Absent' },
                        ] as const
                      ).map((btn) => (
                        <button
                          key={btn.status}
                          type="button"
                          onClick={() => handleBulkApplyStatus(btn.status)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveSession}
                    className="px-4 py-2 rounded-xl bg-[#5A1E82] hover:bg-[#481669] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Attendance</span>
                  </button>
                </div>
              </div>

              {/* Search & Bulk Select Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search chorister to mark attendance..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                  />
                </div>

                {markMode === 'bulk' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMemberIds.length === filteredMembers.length) {
                        setSelectedMemberIds([]);
                      } else {
                        setSelectedMemberIds(filteredMembers.map((m) => m.id));
                      }
                    }}
                    className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${
                        selectedMemberIds.length === filteredMembers.length &&
                        filteredMembers.length > 0
                          ? 'bg-[#5A1E82] border-[#5A1E82] text-white'
                          : 'border-[#5A1E82]'
                      }`}
                    >
                      {selectedMemberIds.length === filteredMembers.length &&
                        filteredMembers.length > 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>
                      Select all ({selectedMemberIds.length}/{filteredMembers.length})
                    </span>
                  </button>
                )}
              </div>

              {/* Chorister Attendance List */}
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {filteredMembers.map((member) => {
                  const entry = currentEntries.find((e) => e.memberId === member.id);
                  const currentStatus = entry?.status || 'Present';
                  const isBulkSelected = selectedMemberIds.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {markMode === 'bulk' && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMemberIds((prev) =>
                                prev.includes(member.id)
                                  ? prev.filter((id) => id !== member.id)
                                  : [...prev, member.id]
                              )
                            }
                            className={`w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${
                              isBulkSelected
                                ? 'bg-[#5A1E82] border-[#5A1E82] text-white'
                                : 'border-[#5A1E82]'
                            }`}
                          >
                            {isBulkSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                        )}
                        <div className="w-9 h-9 rounded-full bg-[#EFEAF6] text-[#4C2872] font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {getInitials(member.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate">
                            {member.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {member.role} · {member.voicePart}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                        {(['Present', 'Late', 'Excused', 'Absent'] as AttendanceStatus[]).map(
                          (st) => {
                            const active = currentStatus === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleMarkSingle(member.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                  active
                                    ? st === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : st === 'Late'
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : st === 'Excused'
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: RECORDS                                                      */}
      {/* =================================================================== */}
      {mainTab === 'records' && (
        <div className="space-y-4">
          {db.attendance.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-14 text-center space-y-3">
              <ClipboardList className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-[13px] text-slate-500">No attendance records saved yet</p>
              <button
                type="button"
                onClick={() => setMainTab('mark')}
                className="px-4 py-2 rounded-xl bg-[#5A1E82] text-white text-xs font-semibold"
              >
                Mark First Attendance
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {db.attendance.map((session) => {
                const present = session.entries.filter((e) => e.status === 'Present').length;
                const late = session.entries.filter((e) => e.status === 'Late').length;
                const excused = session.entries.filter((e) => e.status === 'Excused').length;
                const absent = session.entries.filter((e) => e.status === 'Absent').length;

                return (
                  <div
                    key={session.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-mono text-purple-700 font-semibold">
                        {session.date}
                      </div>
                      <h3 className="font-serif text-base font-bold text-slate-900 mt-0.5">
                        {session.eventTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium">
                        <span className="text-emerald-700">Present: {present}</span>
                        <span className="text-amber-700">Late: {late}</span>
                        <span className="text-blue-700">Excused: {excused}</span>
                        <span className="text-rose-700">Absent: {absent}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceType(session.eventTitle);
                          setSelectedDate(session.date);
                          setMainTab('mark');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit Roll Call
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportSessionCSV(session)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = db.attendance.filter((s) => s.id !== session.id);
                          await onUpdateAttendance(
                            next,
                            session.eventTitle,
                            'Attendance Session Deleted'
                          );
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: REPORTS & SUMMARY                                            */}
      {/* =================================================================== */}
      {mainTab === 'reports' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Attendance Summary & Member Commitment
              </h2>
              <p className="text-xs text-slate-500">
                Calculated across {db.attendance.length} saved service and rehearsal session(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                exportToCSV(
                  'dc_angels_attendance_summary.csv',
                  ['Chorister', 'Role', 'Voice Part', 'Sessions Present', 'Total Sessions'],
                  db.members.map((m) => {
                    const presentCount = db.attendance.filter((s) =>
                      s.entries.some(
                        (e) =>
                          e.memberId === m.id &&
                          (e.status === 'Present' || e.status === 'Late')
                      )
                    ).length;
                    return [
                      m.fullName,
                      m.role,
                      m.voicePart,
                      presentCount,
                      db.attendance.length,
                    ];
                  })
                );
              }}
              className="px-3.5 py-2 rounded-xl bg-[#5A1E82] text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Summary CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F0FE] border border-[#E7DEFC]">
              <div className="text-[11px] font-medium uppercase text-slate-500">
                Total Sessions Recorded
              </div>
              <div className="font-serif text-2xl font-bold text-[#3B1D70] mt-1 tabular-nums">
                {db.attendance.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#EAFAF3] border border-[#D1F4E4]">
              <div className="text-[11px] font-medium uppercase text-slate-500">
                Active Choristers
              </div>
              <div className="font-serif text-2xl font-bold text-[#064E3B] mt-1 tabular-nums">
                {db.members.filter((m) => m.status === 'Active').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#DCEBFE]">
              <div className="text-[11px] font-medium uppercase text-slate-500">
                Total Choristers
              </div>
              <div className="font-serif text-2xl font-bold text-[#1E3A5F] mt-1 tabular-nums">
                {db.members.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

