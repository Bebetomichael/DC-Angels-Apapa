import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Music,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  ChoirDatabase,
  ChoirMember,
  NavSection,
  PortalRole,
  RolePermissionConfig,
  VoicePart,
} from '../types/choir';

export const ROLE_PERMISSIONS_STORAGE_KEY = 'dc_angels_role_permissions_v1';

export const ALL_MODULE_LABELS: Array<{ id: NavSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'members', label: 'Choir Members' },
  { id: 'leaders', label: 'Leaders & Officers' },
  { id: 'rehearsals', label: 'Rehearsals' },
  { id: 'ministrations', label: 'Ministrations' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'finances', label: 'Finances' },
  { id: 'units', label: 'Choir Units' },
  { id: 'library', label: 'Music Library' },
  { id: 'welfare', label: 'Welfare' },
  { id: 'assets', label: 'Assets' },
  { id: 'organogram', label: 'Organogram' },
  { id: 'roster', label: 'Choir Roster' },
  { id: 'reports', label: 'Reports' },
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionConfig[] = [
  {
    role: 'Super Admin',
    label: 'Super Admin',
    description:
      'Sole right to manage Role-Based Settings, user role assignments, and full unrestricted access to all choir portal modules.',
    allowedSections: [
      'dashboard',
      'members',
      'leaders',
      'rehearsals',
      'ministrations',
      'attendance',
      'finances',
      'units',
      'library',
      'welfare',
      'assets',
      'organogram',
      'roster',
      'reports',
      'role-settings',
      'supabase-config',
    ],
    canCreateEdit: true,
    canDelete: true,
    canExportReports: true,
  },
  {
    role: 'MD',
    label: 'MD (Music Director)',
    description:
      'Directs rehearsals, ministrations, song leaders roster, music library, vocal parts, and leadership hierarchy.',
    allowedSections: [
      'dashboard',
      'members',
      'leaders',
      'rehearsals',
      'ministrations',
      'attendance',
      'units',
      'library',
      'organogram',
      'roster',
      'reports',
    ],
    canCreateEdit: true,
    canDelete: false,
    canExportReports: true,
  },
  {
    role: 'Admin',
    label: 'Admin',
    description:
      'Manages chorister directory, attendance records, rehearsals, ministrations, welfare requests, assets, and reports.',
    allowedSections: [
      'dashboard',
      'members',
      'leaders',
      'rehearsals',
      'ministrations',
      'attendance',
      'units',
      'welfare',
      'assets',
      'organogram',
      'roster',
      'reports',
      'supabase-config',
    ],
    canCreateEdit: true,
    canDelete: true,
    canExportReports: true,
  },
  {
    role: 'Treasurer',
    label: 'Treasurer',
    description:
      'Manages choir finances, general account statement, income/expense transactions, welfare disbursements, and financial reports.',
    allowedSections: ['dashboard', 'finances', 'welfare', 'assets', 'reports'],
    canCreateEdit: true,
    canDelete: false,
    canExportReports: true,
  },
  {
    role: 'Asst. Admin',
    label: 'Asst. Admin',
    description:
      'Assists with member registration, attendance marking, rehearsal schedules, and service roster coordination.',
    allowedSections: [
      'dashboard',
      'members',
      'rehearsals',
      'ministrations',
      'attendance',
      'units',
      'roster',
    ],
    canCreateEdit: true,
    canDelete: false,
    canExportReports: false,
  },
  {
    role: 'New Member',
    label: 'New Member',
    description:
      'Restricted onboarding access: New Member can ONLY fill and submit their own personal chorister registration details.',
    allowedSections: ['new-member-form'],
    canCreateEdit: false,
    canDelete: false,
    canExportReports: false,
    selfRegistrationOnly: true,
  },
];

export function loadRolePermissions(): RolePermissionConfig[] {
  try {
    const saved = localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as RolePermissionConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

// ============================================================================
// 1. ROLE-BASED SETTINGS VIEW (Sole Right of Super Admin)
// ============================================================================

interface RoleBasedSettingsViewProps {
  currentUser: { name: string; role: PortalRole; email: string };
  rolePermissions: RolePermissionConfig[];
  onSaveRolePermissions: (next: RolePermissionConfig[]) => void;
  onSwitchActiveRole: (role: PortalRole) => void;
  db: ChoirDatabase;
  onUpdateMembers: (
    members: ChoirMember[],
    actTitle?: string,
    actSub?: string
  ) => Promise<void>;
}

export const RoleBasedSettingsView: React.FC<RoleBasedSettingsViewProps> = ({
  currentUser,
  rolePermissions,
  onSaveRolePermissions,
  onSwitchActiveRole,
  db,
  onUpdateMembers,
}) => {
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const [selectedRoleTab, setSelectedRoleTab] = useState<PortalRole>('MD');
  const [savedBanner, setSavedBanner] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const configurableRoles: PortalRole[] = [
    'MD',
    'Admin',
    'Treasurer',
    'Asst. Admin',
    'New Member',
  ];

  const activeRoleConfig =
    rolePermissions.find((r) => r.role === selectedRoleTab) ||
    DEFAULT_ROLE_PERMISSIONS[1];

  const handleToggleSection = (role: PortalRole, sectionId: NavSection) => {
    if (!isSuperAdmin || role === 'Super Admin' || role === 'New Member') return;
    const next = rolePermissions.map((cfg) => {
      if (cfg.role !== role) return cfg;
      const exists = cfg.allowedSections.includes(sectionId);
      const updatedSections = exists
        ? cfg.allowedSections.filter((s) => s !== sectionId)
        : [...cfg.allowedSections, sectionId];
      return { ...cfg, allowedSections: updatedSections };
    });
    onSaveRolePermissions(next);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleToggleCapability = (
    role: PortalRole,
    key: 'canCreateEdit' | 'canDelete' | 'canExportReports'
  ) => {
    if (!isSuperAdmin || role === 'Super Admin' || role === 'New Member') return;
    const next = rolePermissions.map((cfg) =>
      cfg.role === role ? { ...cfg, [key]: !cfg[key] } : cfg
    );
    onSaveRolePermissions(next);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleResetDefaults = () => {
    if (!isSuperAdmin) return;
    onSaveRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleAssignMemberRole = async (memberId: string, newRole: string) => {
    if (!isSuperAdmin) return;
    const target = db.members.find((m) => m.id === memberId);
    if (!target) return;
    const nextMembers = db.members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );
    await onUpdateMembers(
      nextMembers,
      target.fullName,
      `Role assigned to ${newRole} by Super Admin`
    );
  };

  const filteredMembers = db.members.filter(
    (m) =>
      !memberSearch.trim() ||
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="max-w-[1180px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-[#5A1E82] text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sole Right of Super Admin</span>
          </div>
          <h1 className="font-serif text-[28px] font-bold text-[#1E142B] leading-tight">
            Role-Based Access &amp; Permissions
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Configure portal access rights for MD, Admin, Treasurer, Asst. Admin, and New Member
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedBanner && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Permissions Saved</span>
            </span>
          )}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Default Roles</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Role Switcher / Simulator Bar */}
      <div className="bg-[#26133D] text-white rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#E5B323]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#E5B323]">
              Active Session Role: {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-purple-200/80">
            Only <strong>Super Admin</strong> has the sole right to modify role configurations. Switch roles below to preview how the portal restricts access for each role.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'Super Admin',
              'MD',
              'Admin',
              'Treasurer',
              'Asst. Admin',
              'New Member',
            ] as PortalRole[]
          ).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onSwitchActiveRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUser.role === role
                  ? 'bg-[#E5B323] text-[#1E142B] shadow-xs'
                  : 'bg-white/10 text-purple-100 hover:bg-white/20'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Non-Super Admin Lock Notice */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              Restricted — Sole Right of Super Admin
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              You are currently viewing the portal as <strong>{currentUser.role}</strong>. Only the{' '}
              <strong>Super Admin</strong> has the sole right to alter role permissions or assign administrative roles. Click{' '}
              <button
                type="button"
                onClick={() => onSwitchActiveRole('Super Admin')}
                className="underline font-bold text-[#5A1E82]"
              >
                Switch to Super Admin
              </button>{' '}
              above to unlock editing.
            </p>
          </div>
        </div>
      )}

      {/* Role Configuration Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Role Cards */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Portal Roles
          </h2>

          {/* Super Admin Master Badge */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#26133D]">
                Super Admin
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#26133D] text-[#E5B323]">
                Sole Right
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Full supreme authority over all 14 modules, role settings, and member permissions.
            </p>
          </div>

          {configurableRoles.map((roleName) => {
            const cfg = rolePermissions.find((r) => r.role === roleName);
            const isSelected = selectedRoleTab === roleName;
            return (
              <button
                key={roleName}
                type="button"
                onClick={() => setSelectedRoleTab(roleName)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#5A1E82] text-white border-[#5A1E82] shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{cfg?.label || roleName}</span>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {roleName === 'New Member'
                      ? 'Form Only'
                      : `${cfg?.allowedSections.length || 0} pages`}
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-1 line-clamp-2 ${
                    isSelected ? 'text-purple-100/90' : 'text-slate-500'
                  }`}
                >
                  {cfg?.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Selected Role Permission Editor */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-slate-900">
                  {activeRoleConfig.label}
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5A1E82]">
                  {activeRoleConfig.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeRoleConfig.description}
              </p>
            </div>
          </div>

          {selectedRoleTab === 'New Member' ? (
            <div className="p-6 rounded-2xl bg-[#F8F7FC] border border-purple-100 space-y-3">
              <div className="flex items-center gap-2.5 text-[#5A1E82]">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-sm font-bold">
                  Strict Policy: New Member Can Only Fill Their Details
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a user signs in or accesses the portal with the <strong>New Member</strong> role, all administrative modules, financial statements, attendance registers, and member directories are completely hidden. They are presented exclusively with the <strong>Chorister Self-Registration Form</strong> to fill in and submit their personal details.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onSwitchActiveRole('New Member')}
                  className="px-4 py-2 rounded-xl bg-[#5A1E82] hover:bg-[#481669] text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Preview New Member Form View</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Action Capabilities */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  CRUD &amp; Export Capabilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: 'canCreateEdit',
                        title: 'Create & Edit Records',
                        desc: 'Can add or update records in allowed modules',
                      },
                      {
                        key: 'canDelete',
                        title: 'Delete Records',
                        desc: 'Can permanently remove items in allowed modules',
                      },
                      {
                        key: 'canExportReports',
                        title: 'Export PDF & CSV',
                        desc: 'Can download and print official choir statements',
                      },
                    ] as const
                  ).map((cap) => {
                    const enabled = activeRoleConfig[cap.key];
                    return (
                      <label
                        key={cap.key}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                          isSuperAdmin ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'
                        } ${
                          enabled
                            ? 'bg-purple-50/50 border-purple-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isSuperAdmin}
                          checked={enabled}
                          onChange={() =>
                            handleToggleCapability(selectedRoleTab, cap.key)
                          }
                          className="mt-0.5 rounded text-[#5A1E82] focus:ring-[#5A1E82]"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {cap.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cap.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Allowed Sidebar Navigation Modules */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Allowed Portal Modules for {activeRoleConfig.role}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ALL_MODULE_LABELS.map((mod) => {
                    const checked = activeRoleConfig.allowedSections.includes(
                      mod.id
                    );
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                          isSuperAdmin
                            ? 'cursor-pointer'
                            : 'opacity-70 cursor-not-allowed'
                        } ${
                          checked
                            ? 'bg-[#F5F0FF] border-[#5A1E82]/40 text-[#26133D] font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isSuperAdmin}
                          checked={checked}
                          onChange={() =>
                            handleToggleSection(selectedRoleTab, mod.id)
                          }
                          className="rounded text-[#5A1E82] focus:ring-[#5A1E82]"
                        />
                        <span>{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Super Admin Member Role Assignment Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Assign Portal Roles to Choir Members (Super Admin Sole Right)
            </h2>
            <p className="text-xs text-slate-500">
              Designate which members hold MD, Admin, Treasurer, Asst. Admin, Chorister, or New Member roles
            </p>
          </div>
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search member by name or role..."
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
          />
        </div>

        <div className="max-h-[340px] overflow-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#F7F6F9] text-[11px] font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">Chorister Name</th>
                <th className="py-2.5 px-3.5">Email / Phone</th>
                <th className="py-2.5 px-3.5">Current Role</th>
                <th className="py-2.5 px-3.5 text-right">Assign Role (Super Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                    {m.fullName}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-500">
                    {m.email || m.phone || '—'}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5A1E82] font-semibold text-[11px]">
                      {m.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <select
                      disabled={!isSuperAdmin}
                      value={m.role}
                      onChange={(e) =>
                        handleAssignMemberRole(m.id, e.target.value)
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 disabled:opacity-50"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="MD">MD</option>
                      <option value="Admin">Admin</option>
                      <option value="Treasurer">Treasurer</option>
                      <option value="Asst. Admin">Asst. Admin</option>
                      <option value="unit head">unit head</option>
                      <option value="chorister">chorister</option>
                      <option value="New Member">New Member</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. NEW MEMBER SELF-REGISTRATION VIEW ("New Member can only fill their details")
// ============================================================================

interface NewMemberSelfRegistrationViewProps {
  db: ChoirDatabase;
  currentUser: { name: string; role: PortalRole; email: string };
  onUpdateMembers: (
    members: ChoirMember[],
    actTitle?: string,
    actSub?: string
  ) => Promise<void>;
  onSwitchActiveRole?: (role: PortalRole) => void;
}

const CARE_CENTER_OPTIONS = [
  'Apapa Central Care Center',
  'Marine Beach Care Center',
  'Ajegunle Care Center',
  'Surulere Care Center',
  'Festac / Mile 2 Care Center',
  'Ojo / Okokomaiko Care Center',
  'Badagry Expressway Care Center',
  'Victoria Island / Lekki Care Center',
  'Other Care Center',
];

const SATELLITE_CHURCH_OPTIONS = [
  'Dominion City Apapa (HQ)',
  'Dominion City Marine Beach',
  'Dominion City Festac',
  'Dominion City Surulere',
  'Dominion City Mile 2',
  'Dominion City Orile',
  'Dominion City Ajegunle',
  'Other Satellite Church',
];

const BLOOD_GROUP_OPTIONS = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
];

const GENOTYPE_OPTIONS = ['AA', 'AS', 'AC', 'SS', 'SC'];

export const NewMemberSelfRegistrationView: React.FC<
  NewMemberSelfRegistrationViewProps
> = ({ db, currentUser, onUpdateMembers, onSwitchActiveRole }) => {
  const [submittedMember, setSubmittedMember] = useState<ChoirMember | null>(
    null
  );
  const initialNameParts =
    currentUser.name && currentUser.name !== 'New Choir Member'
      ? currentUser.name.trim().split(/\s+/)
      : [];

  const [form, setForm] = useState({
    yearJoinedDepartment: new Date().getFullYear().toString(),
    firstName: initialNameParts[0] || '',
    lastName: initialNameParts.slice(1).join(' ') || '',
    gender: 'Female' as 'Male' | 'Female',
    phone: '',
    birthDate: '',
    email: currentUser.email || '',
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
    careCenterName: CARE_CENTER_OPTIONS[0],
    satelliteChurchName: SATELLITE_CHURCH_OPTIONS[0],
    beenToEncounter: 'Yes',
    attendedFoundationSchool: 'Yes',
    attendedDLI: 'No',
    sopAcknowledged: false,
    voicePart: 'Soprano' as VoicePart,
    unitName: db.units[0]?.name || 'Vocal & Harmony Unit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedFullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!combinedFullName || !form.sopAcknowledged) return;

    const unitObj =
      db.units.find((u) => u.name === form.unitName) || db.units[0];

    const memberPayload = {
      fullName: combinedFullName,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      yearJoinedDepartment: form.yearJoinedDepartment.trim(),
      gender: form.gender,
      phone: form.phone.trim(),
      birthDate: form.birthDate,
      email: form.email.trim(),
      address: form.address.trim(),
      maritalStatus: form.maritalStatus,
      bloodGroup: form.bloodGroup,
      genotype: form.genotype,
      facebookHandle: form.facebookHandle.trim(),
      instagramHandle: form.instagramHandle.trim(),
      educationalLevel: form.educationalLevel.trim(),
      computerLiteracyLevel: form.computerLiteracyLevel,
      occupation: form.occupation.trim(),
      nextOfKinName: form.nextOfKinName.trim(),
      nextOfKinPhone: form.nextOfKinPhone.trim(),
      careCenterName: form.careCenterName,
      satelliteChurchName: form.satelliteChurchName,
      beenToEncounter: form.beenToEncounter,
      attendedFoundationSchool: form.attendedFoundationSchool,
      attendedDLI: form.attendedDLI,
      sopAcknowledged: form.sopAcknowledged,
      voicePart: form.voicePart,
      unitId: unitObj?.id || 'unit-1',
      unitName: form.unitName,
      emergencyContact: `${form.nextOfKinName.trim()} (${form.nextOfKinPhone.trim()})`,
      notes: `Joined Dept: ${form.yearJoinedDepartment} | Care Center: ${form.careCenterName} | Satellite: ${form.satelliteChurchName}`,
    };

    if (submittedMember) {
      const updated: ChoirMember = {
        ...submittedMember,
        ...memberPayload,
      };
      const next = db.members.map((m) =>
        m.id === submittedMember.id ? updated : m
      );
      await onUpdateMembers(
        next,
        updated.fullName,
        'New Member Updated Personal Details'
      );
      setSubmittedMember(updated);
      return;
    }

    const created: ChoirMember = {
      id: `mem-${Date.now()}`,
      membershipId: `DCA-${String(db.members.length + 1).padStart(3, '0')}`,
      role: 'chorister',
      status: 'Active',
      joinedDate: `${form.yearJoinedDepartment || new Date().getFullYear()}-01-01`,
      ...memberPayload,
    };

    await onUpdateMembers(
      [created, ...db.members],
      created.fullName,
      'New Chorister Joined (Self-Registration)'
    );
    setSubmittedMember(created);
  };

  return (
    <div className="max-w-[880px] mx-auto space-y-6">
      {/* Top Role Notice Banner */}
      <div className="bg-[#26133D] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E5B323] text-[#26133D] flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#E5B323]">
              NEW MEMBER PORTAL — SELF REGISTRATION ONLY
            </div>
            <h1 className="font-serif text-xl font-bold text-white mt-0.5">
              DC Angels Apapa — Member Information Form
            </h1>
            <p className="text-xs text-purple-200/80 mt-0.5">
              As a New Member, your access is restricted exclusively to filling and submitting your personal choir information.
            </p>
          </div>
        </div>

        {onSwitchActiveRole && (
          <button
            type="button"
            onClick={() => onSwitchActiveRole('Super Admin')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 text-xs font-semibold shrink-0"
          >
            Switch Role (Demo)
          </button>
        )}
      </div>

      {submittedMember && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-emerald-950 text-sm">
              Your Member Information Has Been Submitted!
            </h3>
            <p className="text-emerald-800">
              Welcome to DC Angels Apapa, <strong>{submittedMember.fullName}</strong> (Membership ID:{' '}
              <span className="font-mono font-bold">{submittedMember.membershipId}</span>). You can still review or update your information below if needed.
            </p>
          </div>
        </div>
      )}

      {/* Personal Details Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
          <UserCheck className="w-5 h-5 text-[#5A1E82]" />
          <h2 className="font-serif text-lg font-bold text-slate-900">
            Departmental Member Information Form
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. What year did you join this Department */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                What year did you join this Department *
              </label>
              <input
                type="number"
                min="1990"
                max="2099"
                required
                value={form.yearJoinedDepartment}
                onChange={(e) =>
                  setForm({ ...form, yearJoinedDepartment: e.target.value })
                }
                placeholder="e.g. 2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 2. First name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                First name *
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Enter your first name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 3. Last name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Last name *
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Enter your surname / last name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 4. Gender */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Gender *
              </label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value as 'Male' | 'Female',
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            {/* 5. Phone number (WhatsApp preferably) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Phone number (WhatsApp preferably) *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 08031234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 6. Date birth */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Date birth *
              </label>
              <input
                type="date"
                required
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 7. Email address */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Email address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 8. Home address */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Home address *
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter full residential street address, area, city"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
              />
            </div>

            {/* 9. Marital status */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Marital status *
              </label>
              <select
                value={form.maritalStatus}
                onChange={(e) =>
                  setForm({ ...form, maritalStatus: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Single">Single</option>
                <option value="Engaged">Engaged</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            {/* 10. Blood group with rhesus factor (- or +) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Blood group with rhesus factor (- or +) *
              </label>
              <select
                value={form.bloodGroup}
                onChange={(e) =>
                  setForm({ ...form, bloodGroup: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                {BLOOD_GROUP_OPTIONS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* 11. Genotype */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Genotype *
              </label>
              <select
                value={form.genotype}
                onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                {GENOTYPE_OPTIONS.map((gt) => (
                  <option key={gt} value={gt}>
                    {gt}
                  </option>
                ))}
              </select>
            </div>

            {/* 12. Facebook handle */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Facebook handle
              </label>
              <input
                type="text"
                value={form.facebookHandle}
                onChange={(e) =>
                  setForm({ ...form, facebookHandle: e.target.value })
                }
                placeholder="e.g. facebook.com/username or @username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 13. Instagram handle */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Instagram handle
              </label>
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) =>
                  setForm({ ...form, instagramHandle: e.target.value })
                }
                placeholder="e.g. @username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 14. Educational level (Any other certification) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Educational level (Any other certification) *
              </label>
              <input
                type="text"
                required
                value={form.educationalLevel}
                onChange={(e) =>
                  setForm({ ...form, educationalLevel: e.target.value })
                }
                placeholder="e.g. B.Sc, HND, OND, SSCE, ICAN, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 15. Computer literacy level */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Computer literacy level *
              </label>
              <select
                value={form.computerLiteracyLevel}
                onChange={(e) =>
                  setForm({ ...form, computerLiteracyLevel: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional / Expert">
                  Professional / Expert
                </option>
              </select>
            </div>

            {/* 16. Occupation */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Occupation *
              </label>
              <input
                type="text"
                required
                value={form.occupation}
                onChange={(e) =>
                  setForm({ ...form, occupation: e.target.value })
                }
                placeholder="e.g. Accountant, Student, Entrepreneur"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 17. Next of kin (First and Last name) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Next of kin (First and Last name) *
              </label>
              <input
                type="text"
                required
                value={form.nextOfKinName}
                onChange={(e) =>
                  setForm({ ...form, nextOfKinName: e.target.value })
                }
                placeholder="e.g. Grace Obi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 18. Next of kin phone number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Next of kin phone number *
              </label>
              <input
                type="tel"
                required
                value={form.nextOfKinPhone}
                onChange={(e) =>
                  setForm({ ...form, nextOfKinPhone: e.target.value })
                }
                placeholder="e.g. 08030000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              />
            </div>

            {/* 19. Select your Care center name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Select your Care center name *
              </label>
              <select
                value={form.careCenterName}
                onChange={(e) =>
                  setForm({ ...form, careCenterName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                {CARE_CENTER_OPTIONS.map((cc) => (
                  <option key={cc} value={cc}>
                    {cc}
                  </option>
                ))}
              </select>
            </div>

            {/* 20. Select your satellite church name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Select your satellite church name *
              </label>
              <select
                value={form.satelliteChurchName}
                onChange={(e) =>
                  setForm({ ...form, satelliteChurchName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                {SATELLITE_CHURCH_OPTIONS.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            {/* 21. Have you been to Encounter? */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Have you been to Encounter? *
              </label>
              <select
                value={form.beenToEncounter}
                onChange={(e) =>
                  setForm({ ...form, beenToEncounter: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* 22. Have you attended Foundation School? */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Have you attended Foundation School? *
              </label>
              <select
                value={form.attendedFoundationSchool}
                onChange={(e) =>
                  setForm({ ...form, attendedFoundationSchool: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {/* 23. Have you attended DLI? */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Have you attended DLI? *
              </label>
              <select
                value={form.attendedDLI}
                onChange={(e) =>
                  setForm({ ...form, attendedDLI: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {/* Voice Part & Unit */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Vocal Part / Section
              </label>
              <select
                value={form.voicePart}
                onChange={(e) =>
                  setForm({ ...form, voicePart: e.target.value as VoicePart })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8F8FA] text-sm text-slate-900"
              >
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
                <option value="Instrumental">Instrumental</option>
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
                onChange={(e) =>
                  setForm({ ...form, sopAcknowledged: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 rounded text-[#5A1E82] focus:ring-[#5A1E82]"
              />
              <span className="text-xs text-slate-800 leading-relaxed font-medium">
                By clicking this button, I acknowledge that I have reviewed the Departmental Standard Operating Procedures (SOP) and agree to comply with all the procedures and any additional instructions issued by the departmental authority. *
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!form.sopAcknowledged}
              className="px-6 py-3 rounded-xl bg-[#5A1E82] hover:bg-[#481669] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>
                {submittedMember ? 'Update My Details' : 'Submit My Details'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

