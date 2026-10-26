/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import {
  AttendanceView,
  MinistrationsView,
  RehearsalsView,
} from './components/EventsAndAttendanceView';
import { ChoirUnitsView, FinancesView } from './components/FinancesAndUnitsView';
import {
  AssetsView,
  MusicLibraryView,
  WelfareView,
} from './components/LibraryWelfareAssetsView';
import { LeadersView, MembersView } from './components/MembersAndLeadersView';
import {
  ChoirRosterView,
  OrganogramView,
  ReportsView,
} from './components/OrganogramRosterReportsView';
import {
  DEFAULT_ROLE_PERMISSIONS,
  loadRolePermissions,
  NewMemberSelfRegistrationView,
  ROLE_PERMISSIONS_STORAGE_KEY,
  RoleBasedSettingsView,
} from './components/RoleSettingsAndNewMemberView';
import { Sidebar } from './components/Sidebar';
import { SupabaseConfigView } from './components/SupabaseConfigView';
import { INITIAL_CHOIR_DATABASE } from './data/initialDatabase';
import { createActivityEvent, fetchDatabase, saveCollection } from './services/dbService';
import {
  ChoirDatabase,
  NavSection,
  PortalRole,
  RolePermissionConfig,
} from './types/choir';

const AUTH_STORAGE_KEY = 'dc_angels_apapa_auth_user_v2';

const ROLE_DEFAULT_NAMES: Record<PortalRole, { name: string; email: string }> = {
  'Super Admin': {
    name: 'DCApapa Administration',
    email: 'superadmin@dcangelsapapa.org',
  },
  MD: {
    name: 'Emmanuel Adeyemi (MD)',
    email: 'md@dcangelsapapa.org',
  },
  Admin: {
    name: 'Precious Nwafor (Admin)',
    email: 'admin@dcangelsapapa.org',
  },
  Treasurer: {
    name: 'Naomi Echefu (Treasurer)',
    email: 'treasurer@dcangelsapapa.org',
  },
  'Asst. Admin': {
    name: 'Oluchukwu Obi (Asst. Admin)',
    email: 'asst.admin@dcangelsapapa.org',
  },
  'New Member': {
    name: 'New Choir Member',
    email: 'newmember@dcangelsapapa.org',
  },
};

export default function App() {
  const [db, setDb] = useState<ChoirDatabase>(INITIAL_CHOIR_DATABASE);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(
    () => loadRolePermissions()
  );

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: PortalRole;
    email: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      name: 'DCApapa Administration',
      role: 'Super Admin',
      email: 'superadmin@dcangelsapapa.org',
    };
  });

  useEffect(() => {
    let mounted = true;
    fetchDatabase()
      .then((loadedDb) => {
        if (mounted) {
          setDb(loadedDb);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentRoleConfig = useMemo(() => {
    if (!currentUser) return DEFAULT_ROLE_PERMISSIONS[0];
    return (
      rolePermissions.find((r) => r.role === currentUser.role) ||
      DEFAULT_ROLE_PERMISSIONS[0]
    );
  }, [currentUser, rolePermissions]);

  const handleSaveRolePermissions = (next: RolePermissionConfig[]) => {
    setRolePermissions(next);
    localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(next));
  };

  const handleLogin = (user: { name: string; role: PortalRole; email: string }) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (user.role === 'New Member') {
      setActiveSection('new-member-form');
    } else {
      const cfg =
        rolePermissions.find((r) => r.role === user.role) ||
        DEFAULT_ROLE_PERMISSIONS[0];
      setActiveSection(cfg.allowedSections[0] || 'dashboard');
    }
  };

  const handleSwitchRole = (role: PortalRole) => {
    const profile = ROLE_DEFAULT_NAMES[role] || ROLE_DEFAULT_NAMES['Super Admin'];
    const nextUser = {
      name: profile.name,
      role,
      email: profile.email,
    };
    setCurrentUser(nextUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));

    if (role === 'New Member') {
      setActiveSection('new-member-form');
      return;
    }

    const cfg =
      rolePermissions.find((r) => r.role === role) || DEFAULT_ROLE_PERMISSIONS[0];
    if (
      activeSection === 'new-member-form' ||
      (activeSection === 'role-settings' && role !== 'Super Admin') ||
      (activeSection === 'supabase-config' &&
        role !== 'Super Admin' &&
        role !== 'Admin') ||
      (role !== 'Super Admin' &&
        activeSection !== 'supabase-config' &&
        !cfg.allowedSections.includes(activeSection))
    ) {
      setActiveSection(cfg.allowedSections[0] || 'dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const updateMembersHandler = async (
    members: ChoirDatabase['members'],
    actTitle?: string,
    actSub?: string
  ) => {
    const act = actTitle
      ? createActivityEvent(actTitle, actSub || 'Member Updated', 'member')
      : undefined;
    const next = await saveCollection(db, 'members', members, act);
    setDb(next);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar
        activeSection={
          currentUser.role === 'New Member' ? 'new-member-form' : activeSection
        }
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onSetMobileOpen={setMobileMenuOpen}
        currentUser={currentUser}
        allowedSections={currentRoleConfig.allowedSections}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
        {loading ? (
          <div className="max-w-[1280px] mx-auto space-y-6 animate-pulse">
            <div className="h-8 w-56 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : currentUser.role === 'New Member' ||
          activeSection === 'new-member-form' ? (
          /* New Member can ONLY fill their details */
          <NewMemberSelfRegistrationView
            db={db}
            currentUser={currentUser}
            onUpdateMembers={updateMembersHandler}
            onSwitchActiveRole={handleSwitchRole}
          />
        ) : (
          <>
            {activeSection === 'role-settings' && (
              <RoleBasedSettingsView
                currentUser={currentUser}
                rolePermissions={rolePermissions}
                onSaveRolePermissions={handleSaveRolePermissions}
                onSwitchActiveRole={handleSwitchRole}
                db={db}
                onUpdateMembers={updateMembersHandler}
              />
            )}

            {activeSection === 'supabase-config' && (
              <SupabaseConfigView
                currentUser={currentUser}
                db={db}
                onRefreshFromSupabase={async () => {
                  const refreshed = await fetchDatabase();
                  setDb(refreshed);
                }}
                onSwitchActiveRole={handleSwitchRole}
              />
            )}

            {activeSection === 'dashboard' && (
              <DashboardView db={db} onNavigate={setActiveSection} />
            )}

            {activeSection === 'members' && (
              <MembersView db={db} onUpdateMembers={updateMembersHandler} />
            )}

            {activeSection === 'leaders' && (
              <LeadersView
                db={db}
                onUpdateLeaders={async (leaders, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Officer Updated', 'member')
                    : undefined;
                  const next = await saveCollection(db, 'leaders', leaders, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'rehearsals' && (
              <RehearsalsView
                db={db}
                onUpdateRehearsals={async (rehearsals, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Rehearsal Updated', 'event')
                    : undefined;
                  const next = await saveCollection(db, 'rehearsals', rehearsals, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'ministrations' && (
              <MinistrationsView
                db={db}
                onUpdateMinistrations={async (ministrations, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Ministration Updated', 'event')
                    : undefined;
                  const next = await saveCollection(db, 'ministrations', ministrations, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'attendance' && (
              <AttendanceView
                db={db}
                onUpdateAttendance={async (attendance, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Attendance Recorded', 'event')
                    : undefined;
                  const next = await saveCollection(db, 'attendance', attendance, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'finances' && (
              <FinancesView
                db={db}
                onUpdateFinances={async (finances, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Financial Entry Saved', 'finance')
                    : undefined;
                  const next = await saveCollection(db, 'finances', finances, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'units' && (
              <ChoirUnitsView
                db={db}
                onUpdateUnits={async (units, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Choir Unit Updated', 'system')
                    : undefined;
                  const next = await saveCollection(db, 'units', units, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'library' && (
              <MusicLibraryView
                db={db}
                onUpdateSongs={async (songs, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Music Library Updated', 'system')
                    : undefined;
                  const next = await saveCollection(db, 'songs', songs, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'welfare' && (
              <WelfareView
                db={db}
                onUpdateWelfare={async (welfare, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Welfare Request Updated', 'welfare')
                    : undefined;
                  const next = await saveCollection(db, 'welfare', welfare, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'assets' && (
              <AssetsView
                db={db}
                onUpdateAssets={async (assets, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Choir Asset Updated', 'system')
                    : undefined;
                  const next = await saveCollection(db, 'assets', assets, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'organogram' && (
              <OrganogramView
                db={db}
                onUpdateOrganogram={async (organogram, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Organogram Updated', 'system')
                    : undefined;
                  const next = await saveCollection(db, 'organogram', organogram, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'roster' && (
              <ChoirRosterView
                db={db}
                onUpdateRosters={async (rosters, actTitle, actSub) => {
                  const act = actTitle
                    ? createActivityEvent(actTitle, actSub || 'Service Roster Updated', 'event')
                    : undefined;
                  const next = await saveCollection(db, 'rosters', rosters, act);
                  setDb(next);
                }}
              />
            )}

            {activeSection === 'reports' && <ReportsView db={db} />}
          </>
        )}
      </main>
    </div>
  );
}
