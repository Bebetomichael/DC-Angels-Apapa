export type NavSection =
  | 'dashboard'
  | 'members'
  | 'leaders'
  | 'rehearsals'
  | 'ministrations'
  | 'attendance'
  | 'finances'
  | 'units'
  | 'library'
  | 'welfare'
  | 'assets'
  | 'organogram'
  | 'roster'
  | 'reports'
  | 'role-settings'
  | 'supabase-config'
  | 'new-member-form';

export type PortalRole =
  | 'Super Admin'
  | 'MD'
  | 'Admin'
  | 'Treasurer'
  | 'Asst. Admin'
  | 'New Member';

export interface RolePermissionConfig {
  role: PortalRole;
  label: string;
  description: string;
  allowedSections: NavSection[];
  canCreateEdit: boolean;
  canDelete: boolean;
  canExportReports: boolean;
  selfRegistrationOnly?: boolean;
}

export type VoicePart = 'Soprano' | 'Alto' | 'Tenor' | 'Bass' | 'Instrumental';
export type MemberStatus = 'Active' | 'On Leave' | 'Probation' | 'Inactive';

export interface ChoirMember {
  id: string;
  membershipId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  yearJoinedDepartment?: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  voicePart: VoicePart;
  unitId: string;
  unitName: string;
  role: string;
  status: MemberStatus;
  birthDate: string; // YYYY-MM-DD
  joinedDate: string; // YYYY-MM-DD
  address: string;
  maritalStatus?: string;
  bloodGroup?: string;
  genotype?: string;
  facebookHandle?: string;
  instagramHandle?: string;
  educationalLevel?: string;
  computerLiteracyLevel?: string;
  occupation?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  careCenterName?: string;
  satelliteChurchName?: string;
  beenToEncounter?: string;
  attendedFoundationSchool?: string;
  attendedDLI?: string;
  sopAcknowledged?: boolean;
  emergencyContact: string;
  notes: string;
}

export interface LeaderOfficer {
  id: string;
  memberId: string;
  memberName: string;
  position: string;
  department: string;
  termStart: string;
  termEnd: string;
  responsibilities: string;
  phone: string;
  email: string;
  status: 'Active' | 'Emeritus';
}

export interface Rehearsal {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  venue: string;
  type: 'General Rehearsal' | 'Sectional' | 'Instrumental' | 'Special Ministration Prep' | 'Vigil Rehearsal';
  conductor: string;
  songIds: string[];
  notes: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface Ministration {
  id: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  ministryType:
    | 'Sunday First Service'
    | 'Sunday Second Service'
    | 'Midweek Communion'
    | 'Special Crusade'
    | 'Wedding / Guest'
    | 'Night of Worship';
  leadMinister: string;
  choirAssignment: string;
  songTitles: string;
  uniformCode: string;
  notes: string;
  status: 'Upcoming' | 'Completed';
}

export type AttendanceStatus = 'Present' | 'Late' | 'Excused' | 'Absent';

export interface AttendanceEntry {
  memberId: string;
  memberName: string;
  voicePart: VoicePart;
  status: AttendanceStatus;
  checkInTime: string;
  remark: string;
}

export interface AttendanceSession {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: 'Rehearsal' | 'Ministration';
  date: string; // YYYY-MM-DD
  entries: AttendanceEntry[];
}

export interface FinancialTransaction {
  id: string;
  title: string;
  type: 'Income' | 'Expense';
  category:
    | 'Monthly Dues'
    | 'Dues & Levies'
    | 'Special Seed / Donation'
    | 'Love Offering'
    | 'Uniform Levy'
    | 'Equipment Maintenance'
    | 'Welfare Support'
    | 'Refreshments'
    | 'Music Production'
    | 'Transport & Logistics';
  amount: number;
  date: string; // YYYY-MM-DD
  account: 'DC Angels Main UBA' | 'Welfare Purse' | 'Petty Cash' | 'Project Account';
  paymentMethod: 'Bank Transfer' | 'Cash' | 'POS' | 'Cheque';
  recordedBy: string;
  memberName?: string;
  reference: string;
  notes: string;
}

export interface ChoirUnit {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  leaderName: string;
  assistantName: string;
  meetingDay: string;
  description: string;
  memberIds: string[];
}

export interface SongItem {
  id: string;
  title: string;
  composer: string;
  keySignature: string;
  tempo: string;
  category: 'Praise' | 'Worship' | 'Hymn' | 'Classical / Anthem' | 'Afro-Gospel' | 'Special Chant';
  vocalParts: string[];
  lyrics: string;
  solfaNotes: string;
  practiceUrl: string;
  addedDate: string;
}

export interface WelfareRequest {
  id: string;
  memberId: string;
  memberName: string;
  requestType:
    | 'Medical Support'
    | 'Bereavement'
    | 'Wedding / Celebration'
    | 'Child Dedication'
    | 'Emergency Aid'
    | 'Pastoral Visit';
  priority: 'High' | 'Medium' | 'Low';
  amountRequested: number;
  amountApproved: number;
  assignedOfficer: string;
  dateSubmitted: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Resolved';
  description: string;
  resolutionNotes: string;
}

export interface ChoirAsset {
  id: string;
  name: string;
  assetCode: string;
  category: 'Sound Equipment' | 'Musical Instrument' | 'Robes & Uniforms' | 'Stage Gear' | 'Furniture & Stands';
  quantity: number;
  condition: 'Excellent' | 'Good' | 'Needs Repair' | 'Out of Service';
  custodian: string;
  location: string;
  purchaseDate: string;
  estimatedValue: number;
  notes: string;
}

export interface OrganogramNode {
  id: string;
  title: string;
  holderName: string;
  parentId: string | null;
  level: number;
  department: string;
  responsibilities: string;
}

export interface ChoirRoster {
  id: string;
  serviceDate: string;
  serviceTitle: string;
  theme: string;
  worshipLeader: string;
  praiseLeader: string;
  backupVocalists: string[];
  instrumentalists: string[];
  soundLead: string;
  uniformColors: string;
  callTime: string;
  setlist: string[];
  notes: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'member' | 'finance' | 'event' | 'welfare' | 'system';
  dateLabel: string;
  timestamp: string;
}

export interface ChoirDatabase {
  members: ChoirMember[];
  leaders: LeaderOfficer[];
  rehearsals: Rehearsal[];
  ministrations: Ministration[];
  attendance: AttendanceSession[];
  finances: FinancialTransaction[];
  units: ChoirUnit[];
  songs: SongItem[];
  welfare: WelfareRequest[];
  assets: ChoirAsset[];
  organogram: OrganogramNode[];
  rosters: ChoirRoster[];
  activities: ActivityEvent[];
}
