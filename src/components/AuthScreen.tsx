import React, { useState } from 'react';
import { Lock, Mail, Music, ShieldCheck } from 'lucide-react';
import { PortalRole } from '../types/choir';

interface AuthScreenProps {
  onLogin: (user: { name: string; role: PortalRole; email: string }) => void;
}

const PORTAL_ROLES: Array<{
  role: PortalRole;
  defaultName: string;
  defaultEmail: string;
  badgeNote: string;
}> = [
  {
    role: 'Super Admin',
    defaultName: 'DCApapa Administration',
    defaultEmail: 'superadmin@dcangelsapapa.org',
    badgeNote: 'Sole right over all settings & modules',
  },
  {
    role: 'MD',
    defaultName: 'Emmanuel Adeyemi (MD)',
    defaultEmail: 'md@dcangelsapapa.org',
    badgeNote: 'Music Director access',
  },
  {
    role: 'Admin',
    defaultName: 'Precious Nwafor (Admin)',
    defaultEmail: 'admin@dcangelsapapa.org',
    badgeNote: 'Choir administration access',
  },
  {
    role: 'Treasurer',
    defaultName: 'Naomi Echefu (Treasurer)',
    defaultEmail: 'treasurer@dcangelsapapa.org',
    badgeNote: 'Finances & statements access',
  },
  {
    role: 'Asst. Admin',
    defaultName: 'Oluchukwu Obi (Asst. Admin)',
    defaultEmail: 'asst.admin@dcangelsapapa.org',
    badgeNote: 'Attendance & roster support',
  },
  {
    role: 'New Member',
    defaultName: 'New Choir Member',
    defaultEmail: 'newmember@dcangelsapapa.org',
    badgeNote: 'Can only fill personal details',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<PortalRole>('Super Admin');
  const [email, setEmail] = useState('superadmin@dcangelsapapa.org');
  const [password, setPassword] = useState('••••••••••••');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your portal email and password.');
      return;
    }
    const found =
      PORTAL_ROLES.find((r) => r.role === selectedRole) || PORTAL_ROLES[0];
    onLogin({
      name: found.defaultName,
      role: selectedRole,
      email: email.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[#1E0F32] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
        <div className="bg-[#26133D] px-8 py-7 text-center border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-[#EAB308] text-[#26133D] flex items-center justify-center mx-auto mb-3 shadow-md">
            <Music className="w-6 h-6 stroke-[2.3]" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">
            DC Angels Apapa
          </h1>
          <p className="text-[11px] tracking-[0.2em] text-purple-200/75 uppercase mt-1 font-medium">
            CHOIR MANAGEMENT PORTAL
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Portal Role
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PORTAL_ROLES.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(item.role);
                    setEmail(item.defaultEmail);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedRole === item.role
                      ? 'bg-purple-50 border-[#5A1E82] text-[#26133D] shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold">{item.role}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {item.badgeNote}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="superadmin@dcangelsapapa.org"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#26133D] hover:bg-[#331A52] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-[#EAB308]" />
            <span>
              {selectedRole === 'New Member'
                ? 'Continue to Fill Member Details'
                : `Sign In as ${selectedRole}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
