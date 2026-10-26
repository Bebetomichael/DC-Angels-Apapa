import React from 'react';
import {
  BookOpen,
  Box,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  DollarSign,
  FileBarChart,
  GitFork,
  HeartHandshake,
  LayoutGrid,
  LogOut,
  Menu,
  Mic,
  Music,
  Music2,
  Settings,
  Shield,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { NavSection, PortalRole } from '../types/choir';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onSetMobileOpen: (open: boolean) => void;
  currentUser: { name: string; role: PortalRole; email: string };
  allowedSections: NavSection[];
  onSwitchRole: (role: PortalRole) => void;
  onLogout: () => void;
}

export const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'members', label: 'Choir Members', icon: Users },
  { id: 'leaders', label: 'Leaders & Officers', icon: Shield },
  { id: 'rehearsals', label: 'Rehearsals', icon: Mic },
  { id: 'ministrations', label: 'Ministrations', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'finances', label: 'Finances', icon: DollarSign },
  { id: 'units', label: 'Choir Units', icon: UsersRound },
  { id: 'library', label: 'Music Library', icon: BookOpen },
  { id: 'welfare', label: 'Welfare', icon: HeartHandshake },
  { id: 'assets', label: 'Assets', icon: Box },
  { id: 'organogram', label: 'Organogram', icon: GitFork },
  { id: 'roster', label: 'Choir Roster', icon: Music2 },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'role-settings', label: 'Role Settings', icon: Settings },
  { id: 'supabase-config', label: 'Supabase Configuration', icon: Database },
  { id: 'new-member-form', label: 'Fill My Details', icon: UserPlus },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onSetMobileOpen,
  currentUser,
  allowedSections,
  onSwitchRole,
  onLogout,
}) => {
  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    onSetMobileOpen(false);
  };

  // Filter navigation items by role permissions
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (currentUser.role === 'New Member') {
      return item.id === 'new-member-form';
    }
    if (item.id === 'new-member-form') {
      return false;
    }
    if (item.id === 'role-settings') {
      // Only Super Admin has the sole right to Role Settings
      return currentUser.role === 'Super Admin';
    }
    if (item.id === 'supabase-config') {
      // Only authorised administrators (Super Admin & Admin) can access Supabase Configuration
      return currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
    }
    return allowedSections.includes(item.id);
  });

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#26133D] text-white px-4 py-3 border-b border-white/10 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EAB308] flex items-center justify-center text-[#26133D] shrink-0">
            <Music className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="font-serif font-bold text-sm leading-tight text-white">
              DC Angels Apapa
            </div>
            <div className="text-[9px] tracking-[0.18em] text-purple-200/70 uppercase">
              CHOIR PORTAL
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSetMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-purple-100 hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden no-print"
          onClick={() => onSetMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#26133D] text-white flex flex-col justify-between transition-all duration-200 select-none no-print shrink-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-[235px]'
        } ${mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Branding */}
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className={`flex items-center gap-3 px-4 py-4 border-b border-white/10 ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#EAB308] flex items-center justify-center text-[#26133D] shrink-0 shadow-xs">
              <Music className="w-5 h-5 stroke-[2.2]" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <div className="font-serif font-bold text-[15px] leading-tight text-white truncate">
                  DC Angels Apapa
                </div>
                <div className="text-[9.5px] tracking-[0.18em] text-purple-200/65 uppercase mt-0.5 font-medium">
                  CHOIR PORTAL
                </div>
              </div>
            )}
            {mobileOpen && (
              <button
                type="button"
                onClick={() => onSetMobileOpen(false)}
                className="lg:hidden p-1.5 text-purple-200/70 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-colors ${
                    collapsed && !mobileOpen ? 'lg:justify-center lg:px-2' : ''
                  } ${
                    isActive
                      ? 'bg-[#E5B323] text-[#1F0F33] font-semibold shadow-xs'
                      : 'text-purple-100/80 hover:text-white hover:bg-white/8 font-normal'
                  }`}
                >
                  <Icon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      isActive
                        ? 'text-[#1F0F33] stroke-[2.2]'
                        : 'text-purple-200/75 stroke-[1.75]'
                    }`}
                  />
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile, Role Switcher, Logout & Collapse */}
        <div className="border-t border-white/10 px-4 py-3.5 space-y-2.5 bg-[#221037]">
          {(!collapsed || mobileOpen) && (
            <div className="pb-2 border-b border-white/10 space-y-1.5">
              <div className="text-[12px] font-medium text-white truncate">
                {currentUser.name}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-[#E5B323] font-semibold truncate">
                  {currentUser.role}
                </span>
                <select
                  aria-label="Switch Role"
                  value={currentUser.role}
                  onChange={(e) => onSwitchRole(e.target.value as PortalRole)}
                  className="bg-white/10 text-purple-100 text-[10px] rounded-md px-1.5 py-0.5 border border-white/15 focus:outline-none"
                >
                  <option value="Super Admin" className="text-slate-900">
                    Super Admin
                  </option>
                  <option value="MD" className="text-slate-900">
                    MD
                  </option>
                  <option value="Admin" className="text-slate-900">
                    Admin
                  </option>
                  <option value="Treasurer" className="text-slate-900">
                    Treasurer
                  </option>
                  <option value="Asst. Admin" className="text-slate-900">
                    Asst. Admin
                  </option>
                  <option value="New Member" className="text-slate-900">
                    New Member
                  </option>
                </select>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            title="Logout"
            className={`w-full flex items-center gap-2.5 py-1.5 text-[12.5px] text-purple-200/75 hover:text-white transition-colors ${
              collapsed && !mobileOpen ? 'lg:justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex w-full items-center gap-2.5 py-1 text-[12px] text-purple-200/60 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
