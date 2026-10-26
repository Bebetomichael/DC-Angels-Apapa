import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Box,
  Edit3,
  HeartHandshake,
  Music,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { formatNaira } from '../services/dbService';
import { ChoirAsset, ChoirDatabase, SongItem, WelfareRequest } from '../types/choir';

// ============================================================================
// MUSIC LIBRARY VIEW
// ============================================================================

interface MusicLibraryViewProps {
  db: ChoirDatabase;
  onUpdateSongs: (songs: SongItem[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

const SONG_CATEGORIES: SongItem['category'][] = [
  'Praise',
  'Worship',
  'Hymn',
  'Classical / Anthem',
  'Afro-Gospel',
  'Special Chant',
];

export const MusicLibraryView: React.FC<MusicLibraryViewProps> = ({ db, onUpdateSongs }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongItem | null>(null);
  const [viewingSong, setViewingSong] = useState<SongItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SongItem | null>(null);

  const [form, setForm] = useState({
    title: '',
    composer: '',
    keySignature: 'F Major',
    tempo: '72 BPM',
    category: 'Worship' as SongItem['category'],
    vocalParts: ['Soprano', 'Alto', 'Tenor', 'Bass'],
    lyrics: '',
    solfaNotes: 'd : r : m : f | s : - : - : -',
    practiceUrl: '',
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.songs.filter((s) => {
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q) ||
        s.keySignature.toLowerCase().includes(q) ||
        s.lyrics.toLowerCase().includes(q);
      const matchCat = catFilter === 'All' || s.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [db.songs, search, catFilter]);

  const openAdd = () => {
    setEditingSong(null);
    setForm({
      title: '',
      composer: '',
      keySignature: 'G Major',
      tempo: '74 BPM',
      category: 'Worship',
      vocalParts: ['Soprano', 'Alto', 'Tenor', 'Bass'],
      lyrics: '',
      solfaNotes: 'd : r : m : f | s : l : s : m',
      practiceUrl: '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: SongItem) => {
    setEditingSong(s);
    setForm({
      title: s.title,
      composer: s.composer,
      keySignature: s.keySignature,
      tempo: s.tempo,
      category: s.category,
      vocalParts: s.vocalParts,
      lyrics: s.lyrics,
      solfaNotes: s.solfaNotes,
      practiceUrl: s.practiceUrl,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingSong) {
      const next = db.songs.map((s) => (s.id === editingSong.id ? { ...s, ...form } : s));
      await onUpdateSongs(next, form.title, 'Song Score Updated');
    } else {
      const created: SongItem = {
        id: `sng-${Date.now()}`,
        ...form,
        addedDate: new Date().toISOString().slice(0, 10),
      };
      await onUpdateSongs([created, ...db.songs], created.title, 'New Song Added to Repertoire');
    }
    setModalOpen(false);
  };

  const togglePart = (part: string) => {
    if (form.vocalParts.includes(part)) {
      setForm({ ...form, vocalParts: form.vocalParts.filter((p) => p !== part) });
    } else {
      setForm({ ...form, vocalParts: [...form.vocalParts, part] });
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Music Library</h1>
          <p className="text-[13px] text-slate-500">
            Manage choir repertoire, musical keys, tonic solfa notations, lyrics, and vocal parts ({db.songs.length} songs)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Add Song Score</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs by title, composer, key signature, or lyrics..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All Categories</option>
          {SONG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Song Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((song) => (
          <div
            key={song.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F0FE] text-[#8B5CF6] flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-900">{song.title}</h3>
                    <div className="text-xs text-slate-500">
                      {song.composer} · {song.category}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-semibold text-purple-800">
                  {song.keySignature} · {song.tempo}
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="text-[11px] font-mono text-purple-900 font-medium">
                  Solfa: {song.solfaNotes}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-line">{song.lyrics}</p>
              </div>

              <div className="mt-2.5 text-[11px] text-slate-500">
                Vocal Parts: {song.vocalParts.join(' · ')}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingSong(song)}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900"
              >
                Open Lyrics & Solfa Sheet
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(song)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(song)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Song Sheet Modal */}
      {viewingSong && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-purple-700">
                  {viewingSong.category} · {viewingSong.keySignature} · {viewingSong.tempo}
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">{viewingSong.title}</h3>
                <p className="text-xs text-slate-500">Composer / Arrangement: {viewingSong.composer}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSong(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 font-mono text-xs text-purple-950">
              <div className="text-[10px] uppercase tracking-wider text-purple-600 mb-1">Tonic Solfa Guide</div>
              {viewingSong.solfaNotes}
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
              {viewingSong.lyrics}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSong(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Close Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Song Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingSong ? 'Edit Song Score' : 'Add Song to Music Library'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Song Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Composer / Artist</label>
                  <input
                    type="text"
                    value={form.composer}
                    onChange={(e) => setForm({ ...form, composer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Key Signature</label>
                  <input
                    type="text"
                    value={form.keySignature}
                    onChange={(e) => setForm({ ...form, keySignature: e.target.value })}
                    placeholder="e.g. F Major / Bb Major"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as SongItem['category'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {SONG_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vocal Parts Involved</label>
                <div className="flex flex-wrap gap-2">
                  {['Soprano', 'Alto', 'Tenor', 'Bass'].map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => togglePart(part)}
                      className={`px-3 py-1.5 rounded-lg border font-medium ${
                        form.vocalParts.includes(part)
                          ? 'bg-purple-50 border-purple-600 text-purple-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tonic Solfa Notation</label>
                <input
                  type="text"
                  value={form.solfaNotes}
                  onChange={(e) => setForm({ ...form, solfaNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lyrics & Vocal Cues</label>
                <textarea
                  rows={4}
                  value={form.lyrics}
                  onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
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
                  Save Song
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Song Score?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{deleteTarget.title}</strong> from the Music Library?
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
                  const next = db.songs.filter((s) => s.id !== deleteTarget.id);
                  await onUpdateSongs(next, deleteTarget.title, 'Song Score Removed');
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
// WELFARE VIEW
// ============================================================================

interface WelfareViewProps {
  db: ChoirDatabase;
  onUpdateWelfare: (
    welfare: WelfareRequest[],
    activityTitle?: string,
    activitySub?: string
  ) => Promise<void>;
}

const WELFARE_TYPES: WelfareRequest['requestType'][] = [
  'Medical Support',
  'Bereavement',
  'Wedding / Celebration',
  'Child Dedication',
  'Emergency Aid',
  'Pastoral Visit',
];

export const WelfareView: React.FC<WelfareViewProps> = ({ db, onUpdateWelfare }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<WelfareRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WelfareRequest | null>(null);

  const [form, setForm] = useState({
    memberId: db.members[0]?.id || '',
    requestType: 'Wedding / Celebration' as WelfareRequest['requestType'],
    priority: 'Medium' as WelfareRequest['priority'],
    amountRequested: 50000,
    amountApproved: 50000,
    assignedOfficer: 'Ngozi Eze',
    dateSubmitted: new Date().toISOString().slice(0, 10),
    status: 'Pending' as WelfareRequest['status'],
    description: '',
    resolutionNotes: '',
  });

  const openAdd = () => {
    setEditingReq(null);
    setForm({
      memberId: db.members[0]?.id || '',
      requestType: 'Wedding / Celebration',
      priority: 'Medium',
      amountRequested: 50000,
      amountApproved: 0,
      assignedOfficer: 'Ngozi Eze',
      dateSubmitted: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      description: 'Choir welfare support and visitation request.',
      resolutionNotes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (w: WelfareRequest) => {
    setEditingReq(w);
    setForm({
      memberId: w.memberId,
      requestType: w.requestType,
      priority: w.priority,
      amountRequested: w.amountRequested,
      amountApproved: w.amountApproved,
      assignedOfficer: w.assignedOfficer,
      dateSubmitted: w.dateSubmitted,
      status: w.status,
      description: w.description,
      resolutionNotes: w.resolutionNotes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = db.members.find((m) => m.id === form.memberId);
    const memberName = member ? member.fullName : 'Chorister';

    if (editingReq) {
      const next = db.welfare.map((w) =>
        w.id === editingReq.id ? { ...w, ...form, memberName } : w
      );
      await onUpdateWelfare(next, `${memberName} (${form.requestType})`, `Welfare Status: ${form.status}`);
    } else {
      const created: WelfareRequest = {
        id: `wel-${Date.now()}`,
        ...form,
        memberName,
      };
      await onUpdateWelfare([created, ...db.welfare], memberName, `Welfare Request: ${form.requestType}`);
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Welfare</h1>
          <p className="text-[13px] text-slate-500">
            Manage member support requests, priorities, officer assignments, and resolution statuses ({db.welfare.length} requests)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Log Welfare Request</span>
        </button>
      </div>

      {db.welfare.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF2F3] text-[#F43F5E] flex items-center justify-center mx-auto">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900">No Active Welfare Requests</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Log a member welfare request (celebration, medical support, or pastoral visit) to track officer follow-up and disbursements.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[#26133D] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#EAB308]" />
            <span>Create Welfare Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.welfare.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-rose-600">
                      {req.requestType} · {req.priority} Priority
                    </span>
                    <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">{req.memberName}</h3>
                  </div>
                  <span className="text-xs font-semibold text-purple-800">{req.status}</span>
                </div>
                <p className="text-xs text-slate-600 mt-2.5">{req.description}</p>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div>
                    Requested: <strong className="font-mono">{formatNaira(req.amountRequested)}</strong> · Approved:{' '}
                    <strong className="font-mono text-emerald-700">{formatNaira(req.amountApproved)}</strong>
                  </div>
                  <div>
                    Assigned Officer: <strong>{req.assignedOfficer}</strong> · Date: {req.dateSubmitted}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    const nextStatus = req.status === 'Resolved' ? 'Pending' : 'Resolved';
                    const next = db.welfare.map((item) =>
                      item.id === req.id ? { ...item, status: nextStatus as WelfareRequest['status'] } : item
                    );
                    await onUpdateWelfare(next, req.memberName, `Welfare Request ${nextStatus}`);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  {req.status === 'Resolved' ? 'Reopen Request' : 'Mark Resolved'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(req)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(req)}
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
                {editingReq ? 'Update Welfare Request' : 'New Welfare Request'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Choir Member</label>
                  <select
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {db.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Request Type</label>
                  <select
                    value={form.requestType}
                    onChange={(e) =>
                      setForm({ ...form, requestType: e.target.value as WelfareRequest['requestType'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {WELFARE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as WelfareRequest['priority'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resolution Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as WelfareRequest['status'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Requested (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amountRequested}
                    onChange={(e) => setForm({ ...form, amountRequested: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Approved (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amountApproved}
                    onChange={(e) => setForm({ ...form, amountApproved: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Welfare Request?</h3>
            <p className="text-xs text-slate-600">
              Delete welfare request for <strong>{deleteTarget.memberName}</strong>?
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
                  const next = db.welfare.filter((w) => w.id !== deleteTarget.id);
                  await onUpdateWelfare(next, deleteTarget.memberName, 'Welfare Request Deleted');
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
// ASSETS VIEW
// ============================================================================

interface AssetsViewProps {
  db: ChoirDatabase;
  onUpdateAssets: (assets: ChoirAsset[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

const ASSET_CATEGORIES: ChoirAsset['category'][] = [
  'Sound Equipment',
  'Musical Instrument',
  'Robes & Uniforms',
  'Stage Gear',
  'Furniture & Stands',
];

export const AssetsView: React.FC<AssetsViewProps> = ({ db, onUpdateAssets }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ChoirAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChoirAsset | null>(null);

  const [form, setForm] = useState({
    name: '',
    assetCode: `DCA-AST-0${db.assets.length + 1}`,
    category: 'Sound Equipment' as ChoirAsset['category'],
    quantity: 1,
    condition: 'Excellent' as ChoirAsset['condition'],
    custodian: 'Stephen Ojo',
    location: 'Main Sanctuary Sound Booth',
    purchaseDate: new Date().toISOString().slice(0, 10),
    estimatedValue: 250000,
    notes: '',
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.assets.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        a.custodian.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [db.assets, search]);

  const totalAssetValue = useMemo(
    () => db.assets.reduce((s, a) => s + Number(a.estimatedValue || 0), 0),
    [db.assets]
  );

  const openAdd = () => {
    setEditingAsset(null);
    setForm({
      name: '',
      assetCode: `DCA-AST-0${db.assets.length + 1}`,
      category: 'Sound Equipment',
      quantity: 1,
      condition: 'Excellent',
      custodian: 'Stephen Ojo',
      location: 'Main Sanctuary Sound Booth',
      purchaseDate: new Date().toISOString().slice(0, 10),
      estimatedValue: 250000,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (a: ChoirAsset) => {
    setEditingAsset(a);
    setForm({
      name: a.name,
      assetCode: a.assetCode,
      category: a.category,
      quantity: a.quantity,
      condition: a.condition,
      custodian: a.custodian,
      location: a.location,
      purchaseDate: a.purchaseDate,
      estimatedValue: a.estimatedValue,
      notes: a.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingAsset) {
      const next = db.assets.map((a) => (a.id === editingAsset.id ? { ...a, ...form } : a));
      await onUpdateAssets(next, form.name, 'Choir Asset Updated');
    } else {
      const created: ChoirAsset = {
        id: `ast-${Date.now()}`,
        ...form,
      };
      await onUpdateAssets([created, ...db.assets], created.name, 'New Choir Asset Registered');
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Assets & Inventory</h1>
          <p className="text-[13px] text-slate-500">
            Track choir sound gear, musical instruments, robes, conditions, and custodians (Total Valuation:{' '}
            <strong className="font-mono text-slate-700">{formatNaira(totalAssetValue)}</strong>)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Register Asset</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets by name, code, custodian, or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Equipment / Asset</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Custodian & Location</th>
                <th className="py-3.5 px-4 text-right">Est. Value</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-600">{asset.assetCode}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{asset.name}</div>
                    <div className="text-[11px] text-slate-400">{asset.notes}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{asset.category}</td>
                  <td className="py-3 px-4 font-mono font-semibold tabular-nums">{asset.quantity}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        asset.condition === 'Excellent' || asset.condition === 'Good'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {asset.condition}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{asset.custodian}</div>
                    <div className="text-[11px] text-slate-500">{asset.location}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 tabular-nums">
                    {formatNaira(asset.estimatedValue)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(asset)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(asset)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingAsset ? 'Edit Choir Asset' : 'Register Choir Asset'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Code</label>
                  <input
                    type="text"
                    value={form.assetCode}
                    onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ChoirAsset['category'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) =>
                      setForm({ ...form, condition: e.target.value as ChoirAsset['condition'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custodian</label>
                  <input
                    type="text"
                    value={form.custodian}
                    onChange={(e) => setForm({ ...form, custodian: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Value (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.estimatedValue}
                    onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
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
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Asset Record?</h3>
            <p className="text-xs text-slate-600">
              Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.assetCode})?
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
                  const next = db.assets.filter((a) => a.id !== deleteTarget.id);
                  await onUpdateAssets(next, deleteTarget.name, 'Asset Removed');
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
