import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { exportToCSV } from '../services/dbService';
import {
  ChoirDatabase,
  ChoirMember,
  LeaderOfficer,
  MemberStatus,
  VoicePart,
} from '../types/choir';

interface MembersViewProps {
  db: ChoirDatabase;
  onUpdateMembers: (members: ChoirMember[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

const VOICE_PARTS: VoicePart[] = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Instrumental'];
const MEMBER_STATUSES: MemberStatus[] = ['Active', 'Inactive', 'On Leave', 'Probation'];

function getMemberInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const MembersView: React.FC<MembersViewProps> = ({ db, onUpdateMembers }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ChoirMember | null>(null);
  const [viewingMember, setViewingMember] = useState<ChoirMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChoirMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    yearJoinedDepartment: new Date().getFullYear().toString(),
    firstName: '',
    lastName: '',
    gender: 'Female' as 'Male' | 'Female',
    phone: '',
    birthDate: '1998-05-15',
    email: '',
    address: 'Apapa, Lagos',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    genotype: 'AA',
    facebookHandle: '',
    instagramHandle: '',
    educationalLevel: '',
    computerLiteracyLevel: 'Intermediate',
    occupation: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    careCenterName: 'Apapa Central Care Center',
    satelliteChurchName: 'Dominion City Apapa (HQ)',
    beenToEncounter: 'Yes',
    attendedFoundationSchool: 'Yes',
    attendedDLI: 'No',
    sopAcknowledged: true,
    voicePart: 'Soprano' as VoicePart,
    unitId: db.units[0]?.id || 'unit-001',
    role: 'chorister',
    status: 'Active' as MemberStatus,
    joinedDate: new Date().toISOString().slice(0, 10),
    emergencyContact: '',
    notes: '',
  });

  const availableRoles = useMemo(() => {
    const set = new Set<string>(['chorister', 'unit head']);
    db.members.forEach((m) => {
      if (m.role) set.add(m.role.toLowerCase());
    });
    return Array.from(set);
  }, [db.members]);

  const filteredMembers = useMemo(() => {
    return db.members.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.membershipId.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === 'All' || m.role.toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus =
        statusFilter === 'All' || m.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [db.members, search, roleFilter, statusFilter]);

  const allFilteredSelected =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.includes(m.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredMembers.some((m) => m.id === id)));
    } else {
      const nextSet = new Set([...selectedIds, ...filteredMembers.map((m) => m.id)]);
      setSelectedIds(Array.from(nextSet));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openAddModal = () => {
    setEditingMember(null);
    setForm({
      yearJoinedDepartment: new Date().getFullYear().toString(),
      firstName: '',
      lastName: '',
      gender: 'Female',
      phone: '',
      birthDate: '',
      email: '',
      address: '',
      maritalStatus: 'Single',
      bloodGroup: 'O+',
      genotype: 'AA',
      facebookHandle: '',
      instagramHandle: '',
      educationalLevel: '',
      computerLiteracyLevel: 'Intermediate',
      occupation: '',
      nextOfKinName: '',
      nextOfKinPhone: '',
      careCenterName: 'Apapa Central Care Center',
      satelliteChurchName: 'Dominion City Apapa (HQ)',
      beenToEncounter: 'Yes',
      attendedFoundationSchool: 'Yes',
      attendedDLI: 'No',
      sopAcknowledged: false,
      voicePart: 'Soprano',
      unitId: db.units[0]?.id || 'unit-001',
      role: 'chorister',
      status: 'Active',
      joinedDate: new Date().toISOString().slice(0, 10),
      emergencyContact: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (m: ChoirMember) => {
    setEditingMember(m);
    const nameParts = m.fullName.trim().split(/\s+/);
    setForm({
      yearJoinedDepartment:
        m.yearJoinedDepartment ||
        (m.joinedDate ? m.joinedDate.slice(0, 4) : new Date().getFullYear().toString()),
      firstName: m.firstName || nameParts[0] || '',
      lastName: m.lastName || nameParts.slice(1).join(' ') || '',
      gender: m.gender || 'Female',
      phone: m.phone || '',
      birthDate: m.birthDate || '',
      email: m.email || '',
      address: m.address || '',
      maritalStatus: m.maritalStatus || 'Single',
      bloodGroup: m.bloodGroup || 'O+',
      genotype: m.genotype || 'AA',
      facebookHandle: m.facebookHandle || '',
      instagramHandle: m.instagramHandle || '',
      educationalLevel: m.educationalLevel || '',
      computerLiteracyLevel: m.computerLiteracyLevel || 'Intermediate',
      occupation: m.occupation || '',
      nextOfKinName: m.nextOfKinName || m.emergencyContact || '',
      nextOfKinPhone: m.nextOfKinPhone || '',
      careCenterName: m.careCenterName || 'Apapa Central Care Center',
      satelliteChurchName: m.satelliteChurchName || 'Dominion City Apapa (HQ)',
      beenToEncounter: m.beenToEncounter || 'Yes',
      attendedFoundationSchool: m.attendedFoundationSchool || 'Yes',
      attendedDLI: m.attendedDLI || 'No',
      sopAcknowledged: m.sopAcknowledged !== undefined ? m.sopAcknowledged : true,
      voicePart: m.voicePart,
      unitId: m.unitId,
      role: m.role,
      status: m.status,
      joinedDate: m.joinedDate,
      emergencyContact: m.emergencyContact,
      notes: m.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedFullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!combinedFullName || !form.sopAcknowledged) return;
    setSaving(true);
    const unitObj = db.units.find((u) => u.id === form.unitId);
    const unitName = unitObj ? unitObj.name : 'Praise & Worship Unit';

    const memberPayload = {
      ...form,
      fullName: combinedFullName,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      emergencyContact:
        form.nextOfKinName || form.nextOfKinPhone
          ? `${form.nextOfKinName.trim()} (${form.nextOfKinPhone.trim()})`
          : form.emergencyContact,
      joinedDate:
        form.joinedDate || `${form.yearJoinedDepartment || new Date().getFullYear()}-01-01`,
      unitName,
    };

    try {
      if (editingMember) {
        const updated = db.members.map((m) =>
          m.id === editingMember.id ? { ...m, ...memberPayload } : m
        );
        await onUpdateMembers(updated, combinedFullName, 'Chorister Profile Updated');
      } else {
        const nextNum = String(db.members.length + 1).padStart(3, '0');
        const newMember: ChoirMember = {
          id: `mem-${Date.now()}`,
          membershipId: `DCA-${nextNum}`,
          ...memberPayload,
        };
        await onUpdateMembers([newMember, ...db.members], newMember.fullName, 'New Chorister Joined');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const next = db.members.filter((m) => m.id !== deleteTarget.id);
    await onUpdateMembers(next, deleteTarget.fullName, 'Member Record Removed');
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const next = db.members.filter((m) => !selectedIds.includes(m.id));
    await onUpdateMembers(next, `${selectedIds.length} Choristers`, 'Bulk Member Records Removed');
    setSelectedIds([]);
  };

  const handleExportSelected = () => {
    const targetList =
      selectedIds.length > 0
        ? db.members.filter((m) => selectedIds.includes(m.id))
        : filteredMembers;
    exportToCSV(
      'dc_angels_apapa_members.csv',
      [
        'ID',
        'Year Joined Department',
        'First Name',
        'Last Name',
        'Gender',
        'Phone Number (WhatsApp)',
        'Date of Birth',
        'Email Address',
        'Home Address',
        'Marital Status',
        'Blood Group',
        'Genotype',
        'Facebook Handle',
        'Instagram Handle',
        'Educational Level',
        'Computer Literacy Level',
        'Occupation',
        'Next of Kin Name',
        'Next of Kin Phone',
        'Care Center Name',
        'Satellite Church Name',
        'Been to Encounter',
        'Attended Foundation School',
        'Attended DLI',
        'Role',
        'Status',
      ],
      targetList.map((m) => {
        const parts = m.fullName.trim().split(/\s+/);
        return [
          m.membershipId,
          m.yearJoinedDepartment || (m.joinedDate ? m.joinedDate.slice(0, 4) : ''),
          m.firstName || parts[0] || '',
          m.lastName || parts.slice(1).join(' ') || '',
          m.gender,
          m.phone,
          m.birthDate,
          m.email,
          m.address,
          m.maritalStatus || '',
          m.bloodGroup || '',
          m.genotype || '',
          m.facebookHandle || '',
          m.instagramHandle || '',
          m.educationalLevel || '',
          m.computerLiteracyLevel || '',
          m.occupation || '',
          m.nextOfKinName || m.emergencyContact || '',
          m.nextOfKinPhone || '',
          m.careCenterName || '',
          m.satelliteChurchName || '',
          m.beenToEncounter || '',
          m.attendedFoundationSchool || '',
          m.attendedDLI || '',
          m.role,
          m.status,
        ];
      })
    );
  };

  const handleImportCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return;

    const imported: ChoirMember[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const name = cols[1] || cols[0];
      if (!name) continue;
      const idx = db.members.length + imported.length + 1;
      imported.push({
        id: `mem-${Date.now()}-${i}`,
        membershipId: `DCA-${String(idx).padStart(3, '0')}`,
        fullName: name,
        role: (cols[2] || 'chorister').toLowerCase(),
        status: (cols[3]?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active') as MemberStatus,
        email: cols[4] || '',
        phone: cols[5] || '',
        gender: 'Female',
        voicePart: (cols[6] as VoicePart) || 'Soprano',
        unitId: db.units[0]?.id || 'unit-001',
        unitName: db.units[0]?.name || 'Praise & Worship Unit',
        birthDate: cols[8] || '1998-05-15',
        joinedDate: cols[9] || new Date().toISOString().slice(0, 10),
        address: 'Apapa, Lagos',
        emergencyContact: '',
        notes: 'Imported via CSV',
      });
    }

    if (imported.length > 0) {
      await onUpdateMembers(
        [...imported, ...db.members],
        `${imported.length} Choristers Imported`,
        'CSV Member Import Completed'
      );
      setImportFeedback(`Imported ${imported.length} chorister(s) from ${file.name}.`);
      setTimeout(() => setImportFeedback(''), 4000);
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-[1160px] mx-auto space-y-5">
      {/* Hidden File Input for Import CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportCSVFile}
        className="hidden"
      />

      {/* Top Header Row matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B] leading-tight">
            Choir Members
          </h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5 tabular-nums">
            {db.members.length} total choristers
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 text-[12px] font-medium flex items-center gap-2 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg bg-[#5A1E82] hover:bg-[#481669] text-white text-[12px] font-medium flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Chorister</span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
          {importFeedback}
        </div>
      )}

      {/* Search & Filter Row matching screenshot */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full bg-white pl-9 pr-4 py-2 rounded-lg border border-slate-200/90 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-200/90 text-[12.5px] text-slate-800 bg-white min-w-[122px] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
          >
            <option value="All">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-200/90 text-[12.5px] text-slate-800 bg-white min-w-[122px] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
          >
            <option value="All">All Status</option>
            <option value="Active">active</option>
            <option value="Inactive">inactive</option>
            <option value="On Leave">on leave</option>
            <option value="Probation">probation</option>
          </select>
        </div>
      </div>

      {/* Select All & Optional Bulk Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="inline-flex items-center gap-2 text-[11.5px] text-slate-500 hover:text-slate-800 select-none"
        >
          <span
            className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
              allFilteredSelected
                ? 'bg-[#5A1E82] border-[#5A1E82] text-white'
                : 'border-[#5A1E82] bg-transparent'
            }`}
          >
            {allFilteredSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </span>
          <span className="tabular-nums">Select all ({filteredMembers.length})</span>
        </button>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={handleExportSelected}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-slate-600 px-1.5"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Chorister Card Grid matching screenshot */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center text-xs text-slate-500">
          No choir members match your current search or filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5">
          {filteredMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            const initials = getMemberInitials(member.fullName);
            const isActive = member.status.toLowerCase() === 'active';
            const hasContact = Boolean(member.email || member.phone);

            return (
              <div key={member.id} className="flex items-start gap-2.5">
                {/* Left Circular Checkbox outside the card */}
                <button
                  type="button"
                  onClick={() => handleToggleOne(member.id)}
                  aria-label={`Select ${member.fullName}`}
                  className={`mt-2 w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-[#5A1E82] border-[#5A1E82] text-white'
                      : 'border-[#5A1E82] bg-transparent hover:bg-purple-50'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                {/* White Member Card */}
                <div
                  onClick={() => setViewingMember(member)}
                  className="flex-1 min-w-0 bg-white border border-slate-200/90 hover:border-purple-300/80 rounded-xl px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all cursor-pointer group relative"
                >
                  {/* Hover Quick Edit / Delete Actions */}
                  <div
                    className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity absolute top-3 right-3 flex items-center gap-1 bg-white/95 rounded-lg p-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      title="Edit Chorister"
                      className="p-1.5 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(member)}
                      title="Remove Chorister"
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-start gap-3.5">
                    {/* Pastel Purple Initials Circle */}
                    <div className="w-10 h-10 rounded-full bg-[#EFEAF6] text-[#4C2872] font-semibold text-[11.5px] flex items-center justify-center shrink-0 tracking-tight">
                      {initials}
                    </div>

                    {/* Member Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-900 truncate pr-12">
                        {member.fullName}
                      </div>

                      {/* Role & Status Pills */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="bg-[#F1EFF6] text-[#4A4458] text-[10px] font-medium px-2 py-0.5 rounded-full lowercase leading-tight">
                          {(member.role || 'chorister').toLowerCase()}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full lowercase leading-tight ${
                            isActive
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {member.status.toLowerCase()}
                        </span>
                      </div>

                      {/* Contact Info Line (shown when email or phone exists, matching screenshot) */}
                      {hasContact && (
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2 text-[11px] text-slate-500">
                          {member.email && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </span>
                          )}
                          {member.phone && (
                            <span className="inline-flex items-center gap-1 font-sans tabular-nums">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{member.phone}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Member Information Modal (24 Departmental Fields + SOP Checkbox) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1E142B]">
                  {editingMember ? 'Edit Member Information' : 'Member Information Form'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  DC Angels Apapa — Complete Departmental Registration Details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. What year did you join this Department */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    What year did you join this Department *
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2099"
                    required
                    value={form.yearJoinedDepartment}
                    onChange={(e) => setForm({ ...form, yearJoinedDepartment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="e.g. 2023"
                  />
                </div>

                {/* 2. First name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="e.g. Temple"
                  />
                </div>

                {/* 3. Last name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="e.g. Martins"
                  />
                </div>

                {/* 4. Gender */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                {/* 5. Phone number (WhatsApp preferably) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone number (WhatsApp preferably) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="08030000000"
                  />
                </div>

                {/* 6. Date birth */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date birth *</label>
                  <input
                    type="date"
                    required
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                {/* 7. Email address */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="chorister@gmail.com"
                  />
                </div>

                {/* 8. Home address */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Home address *</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="Residential address"
                  />
                </div>

                {/* 9. Marital status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marital status *</label>
                  <select
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Single">Single</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* 10. Blood group with rhesus factor (- or +) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Blood group with rhesus factor (- or +) *
                  </label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 11. Genotype */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Genotype *</label>
                  <select
                    value={form.genotype}
                    onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {['AA', 'AS', 'AC', 'SS', 'SC'].map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 12. Facebook handle */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Facebook handle</label>
                  <input
                    type="text"
                    value={form.facebookHandle}
                    onChange={(e) => setForm({ ...form, facebookHandle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. @username"
                  />
                </div>

                {/* 13. Instagram handle */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instagram handle</label>
                  <input
                    type="text"
                    value={form.instagramHandle}
                    onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. @username"
                  />
                </div>

                {/* 14. Educational level (Any other certification) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Educational level (Any other certification) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.educationalLevel}
                    onChange={(e) => setForm({ ...form, educationalLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. B.Sc, HND, SSCE, ICAN"
                  />
                </div>

                {/* 15. Computer literacy level */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Computer literacy level *
                  </label>
                  <select
                    value={form.computerLiteracyLevel}
                    onChange={(e) => setForm({ ...form, computerLiteracyLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Professional / Expert">Professional / Expert</option>
                  </select>
                </div>

                {/* 16. Occupation */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation *</label>
                  <input
                    type="text"
                    required
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. Banker, Student, Engineer"
                  />
                </div>

                {/* 17. Next of kin (First and Last name) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Next of kin (First and Last name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nextOfKinName}
                    onChange={(e) => setForm({ ...form, nextOfKinName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. Grace Obi"
                  />
                </div>

                {/* 18. Next of kin phone number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Next of kin phone number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.nextOfKinPhone}
                    onChange={(e) => setForm({ ...form, nextOfKinPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="08030000000"
                  />
                </div>

                {/* 19. Select your Care center name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select your Care center name *
                  </label>
                  <select
                    value={form.careCenterName}
                    onChange={(e) => setForm({ ...form, careCenterName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {[
                      'Apapa Central Care Center',
                      'Marine Beach Care Center',
                      'Ajegunle Care Center',
                      'Surulere Care Center',
                      'Festac / Mile 2 Care Center',
                      'Ojo / Okokomaiko Care Center',
                      'Badagry Expressway Care Center',
                      'Victoria Island / Lekki Care Center',
                      'Other Care Center',
                    ].map((cc) => (
                      <option key={cc} value={cc}>
                        {cc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 20. Select your satellite church name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select your satellite church name *
                  </label>
                  <select
                    value={form.satelliteChurchName}
                    onChange={(e) => setForm({ ...form, satelliteChurchName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {[
                      'Dominion City Apapa (HQ)',
                      'Dominion City Marine Beach',
                      'Dominion City Festac',
                      'Dominion City Surulere',
                      'Dominion City Mile 2',
                      'Dominion City Orile',
                      'Dominion City Ajegunle',
                      'Other Satellite Church',
                    ].map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 21. Have you been to Encounter? */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Have you been to Encounter? *
                  </label>
                  <select
                    value={form.beenToEncounter}
                    onChange={(e) => setForm({ ...form, beenToEncounter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* 22. Have you attended Foundation School? */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Have you attended Foundation School? *
                  </label>
                  <select
                    value={form.attendedFoundationSchool}
                    onChange={(e) => setForm({ ...form, attendedFoundationSchool: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>

                {/* 23. Have you attended DLI? */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Have you attended DLI? *
                  </label>
                  <select
                    value={form.attendedDLI}
                    onChange={(e) => setForm({ ...form, attendedDLI: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>

                {/* Additional Choir Admin Fields: Role, Voice Part, Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="chorister">chorister</option>
                    <option value="unit head">unit head</option>
                    <option value="MD">MD</option>
                    <option value="Admin">Admin</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Asst. Admin">Asst. Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voice Part</label>
                  <select
                    value={form.voicePart}
                    onChange={(e) => setForm({ ...form, voicePart: e.target.value as VoicePart })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {VOICE_PARTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {MEMBER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 24. Mandatory SOP Acknowledgement Checkbox */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={form.sopAcknowledged}
                    onChange={(e) => setForm({ ...form, sopAcknowledged: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-[#5A1E82] focus:ring-[#5A1E82]"
                  />
                  <span className="text-xs text-slate-800 leading-relaxed font-medium">
                    By clicking this button, I acknowledge that I have reviewed the Departmental Standard Operating Procedures (SOP) and agree to comply with all the procedures and any additional instructions issued by the departmental authority. *
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.sopAcknowledged}
                  className="px-5 py-2 rounded-xl bg-[#5A1E82] hover:bg-[#481669] disabled:opacity-50 text-white font-semibold"
                >
                  {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Chorister'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Member Profile Modal */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EFEAF6] text-[#4C2872] font-semibold text-sm flex items-center justify-center">
                  {getMemberInitials(viewingMember.fullName)}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {viewingMember.fullName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="bg-[#F1EFF6] text-[#4A4458] text-[10.5px] font-medium px-2 py-0.5 rounded-full lowercase">
                      {viewingMember.role}
                    </span>
                    <span
                      className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full lowercase ${
                        viewingMember.status === 'Active'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      {viewingMember.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <div className="text-slate-400">Member ID</div>
                <div className="font-mono font-medium text-slate-800 mt-0.5">
                  {viewingMember.membershipId}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Year Joined Dept</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.yearJoinedDepartment || viewingMember.joinedDate?.slice(0, 4) || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Gender</div>
                <div className="font-medium text-slate-800 mt-0.5">{viewingMember.gender}</div>
              </div>
              <div>
                <div className="text-slate-400">Phone (WhatsApp)</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.phone || 'Not provided'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Date of Birth</div>
                <div className="font-medium text-slate-800 mt-0.5">{viewingMember.birthDate || '—'}</div>
              </div>
              <div>
                <div className="text-slate-400">Email Address</div>
                <div className="font-medium text-slate-800 mt-0.5 truncate">
                  {viewingMember.email || 'Not provided'}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <div className="text-slate-400">Home Address</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.address || 'Not provided'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Marital Status</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.maritalStatus || 'Single'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Blood Group / Genotype</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.bloodGroup || 'O+'} / {viewingMember.genotype || 'AA'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Occupation</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.occupation || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Education / Cert.</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.educationalLevel || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Computer Literacy</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.computerLiteracyLevel || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Social Handles</div>
                <div className="font-medium text-slate-800 mt-0.5 truncate">
                  {[viewingMember.facebookHandle, viewingMember.instagramHandle]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Next of Kin</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.nextOfKinName || viewingMember.emergencyContact || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Next of Kin Phone</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.nextOfKinPhone || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Care Center</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.careCenterName || '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Satellite Church</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  {viewingMember.satelliteChurchName || 'Dominion City Apapa'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Encounter / FS / DLI</div>
                <div className="font-medium text-slate-800 mt-0.5">
                  Enc: {viewingMember.beenToEncounter || 'Yes'} · FS:{' '}
                  {viewingMember.attendedFoundationSchool || 'Yes'} · DLI:{' '}
                  {viewingMember.attendedDLI || 'No'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">SOP Acknowledged</div>
                <div className="font-medium text-emerald-700 mt-0.5">
                  {viewingMember.sopAcknowledged !== false ? 'Yes (Agreed)' : 'Pending'}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const m = viewingMember;
                  setViewingMember(null);
                  setDeleteTarget(m);
                }}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    openEditModal(m);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold hover:bg-purple-100"
                >
                  Edit Chorister
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Remove Chorister?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove <strong>{deleteTarget.fullName}</strong> from the choir database?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LEADERS & OFFICERS VIEW
// ============================================================================

interface LeadersViewProps {
  db: ChoirDatabase;
  onUpdateLeaders: (leaders: LeaderOfficer[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

export const LeadersView: React.FC<LeadersViewProps> = ({ db, onUpdateLeaders }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<LeaderOfficer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaderOfficer | null>(null);

  const [form, setForm] = useState({
    memberId: db.members[0]?.id || '',
    position: '',
    department: 'Executive Leadership',
    termStart: '2025-01-01',
    termEnd: '2026-12-31',
    responsibilities: '',
    status: 'Active' as 'Active' | 'Emeritus',
  });

  const filteredLeaders = useMemo(() => {
    const q = search.toLowerCase();
    return db.leaders.filter(
      (l) =>
        !q ||
        l.memberName.toLowerCase().includes(q) ||
        l.position.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q)
    );
  }, [db.leaders, search]);

  const openAdd = () => {
    setEditingLeader(null);
    setForm({
      memberId: db.members[0]?.id || '',
      position: '',
      department: 'Executive Leadership',
      termStart: '2025-01-01',
      termEnd: '2026-12-31',
      responsibilities: '',
      status: 'Active',
    });
    setModalOpen(true);
  };

  const openEdit = (l: LeaderOfficer) => {
    setEditingLeader(l);
    setForm({
      memberId: l.memberId,
      position: l.position,
      department: l.department,
      termStart: l.termStart,
      termEnd: l.termEnd,
      responsibilities: l.responsibilities,
      status: l.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = db.members.find((m) => m.id === form.memberId);
    const memberName = member ? member.fullName : 'Assigned Officer';
    const phone = member ? member.phone : '';
    const email = member ? member.email : '';

    if (editingLeader) {
      const updated = db.leaders.map((l) =>
        l.id === editingLeader.id ? { ...l, ...form, memberName, phone, email } : l
      );
      await onUpdateLeaders(updated, `${memberName} (${form.position})`, 'Officer Assignment Updated');
    } else {
      const newLeader: LeaderOfficer = {
        id: `ldr-${Date.now()}`,
        ...form,
        memberName,
        phone,
        email,
      };
      await onUpdateLeaders([newLeader, ...db.leaders], `${memberName} — ${form.position}`, 'New Officer Appointed');
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Leaders & Officers</h1>
          <p className="text-[13px] text-slate-500">
            Executive officers, vocal part leaders, and departmental heads linked to choir members
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 transition-colors self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Appoint Officer</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search officers by name, position, or department..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLeaders.map((leader) => (
          <div
            key={leader.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F0FE] text-[#8B5CF6] flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-900">{leader.memberName}</h3>
                    <div className="text-xs font-semibold text-purple-800">{leader.position}</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-700">{leader.status}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-3">
                {leader.department} · Term: {leader.termStart.slice(0, 4)}–{leader.termEnd.slice(0, 4)}
              </div>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{leader.responsibilities}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">{leader.phone}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(leader)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(leader)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingLeader ? 'Edit Officer Assignment' : 'Appoint Choir Officer'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Choir Member *</label>
                <select
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {db.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.voicePart})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Officer Position *</label>
                  <input
                    type="text"
                    required
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="e.g. Prayer Coordinator"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Term Start</label>
                  <input
                    type="date"
                    value={form.termStart}
                    onChange={(e) => setForm({ ...form, termStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Term End</label>
                  <input
                    type="date"
                    value={form.termEnd}
                    onChange={(e) => setForm({ ...form, termEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Core Responsibilities</label>
                <textarea
                  rows={3}
                  value={form.responsibilities}
                  onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
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
                  Save Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Remove Officer Position?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{deleteTarget.memberName}</strong> from the position of{' '}
              <strong>{deleteTarget.position}</strong>?
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
                  const next = db.leaders.filter((l) => l.id !== deleteTarget.id);
                  await onUpdateLeaders(next, deleteTarget.memberName, 'Officer Term Ended');
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
