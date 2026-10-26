import React, { useMemo, useState } from 'react';
import { Calendar, DollarSign, HeartHandshake, Mic, Users } from 'lucide-react';
import { formatNaira, formatShortDate } from '../services/dbService';
import { ChoirDatabase, NavSection } from '../types/choir';

interface DashboardViewProps {
  db: ChoirDatabase;
  onNavigate: (section: NavSection) => void;
}

const CHART_MONTHS = [
  { key: '05', label: 'May' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Aug' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ db, onNavigate }) => {
  const [birthdayFilter, setBirthdayFilter] = useState<'week' | 'month'>('week');

  // 1. Live summary card calculations from actual database records
  const activeMembersCount = useMemo(
    () => db.members.filter((m) => m.status === 'Active').length,
    [db.members]
  );

  const totalMembersCount = db.members.length;

  const upcomingRehearsalsCount = useMemo(
    () => db.rehearsals.filter((r) => r.status === 'Scheduled').length,
    [db.rehearsals]
  );

  const ministrationsCount = db.ministrations.length;

  const welfareRequestsCount = db.welfare.length;

  const totalIncome = useMemo(
    () =>
      db.finances
        .filter((f) => f.type === 'Income')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [db.finances]
  );

  const choirUnitsCount = db.units.length;

  // Current date awareness for birthday calculations
  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1; // 1..12

  const birthdaysThisMonthList = useMemo(() => {
    return db.members.filter((m) => {
      if (!m.birthDate) return false;
      const parts = m.birthDate.split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[1], 10) === currentMonth;
    });
  }, [db.members, currentMonth]);

  const birthdaysThisWeekList = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return db.members.filter((m) => {
      if (!m.birthDate) return false;
      const parts = m.birthDate.split('-');
      if (parts.length < 3) return false;
      const bMonth = parseInt(parts[1], 10) - 1;
      const bDay = parseInt(parts[2], 10);
      let nextBday = new Date(today.getFullYear(), bMonth, bDay);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, bMonth, bDay);
      }
      const diffDays = Math.round((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [db.members, now]);

  const displayedBirthdays = birthdayFilter === 'week' ? birthdaysThisWeekList : birthdaysThisMonthList;

  // Upcoming events combining scheduled rehearsals and upcoming ministrations
  const upcomingEvents = useMemo(() => {
    const rehEvents = db.rehearsals
      .filter((r) => r.status === 'Scheduled')
      .map((r) => ({
        id: r.id,
        title: r.title,
        date: r.date,
        time: r.startTime,
        venue: r.venue,
        badge: 'Rehearsal',
        section: 'rehearsals' as NavSection,
      }));
    const minEvents = db.ministrations
      .filter((m) => m.status === 'Upcoming')
      .map((m) => ({
        id: m.id,
        title: m.serviceName,
        date: m.date,
        time: m.time,
        venue: m.venue,
        badge: 'Ministration',
        section: 'ministrations' as NavSection,
      }));
    return [...rehEvents, ...minEvents].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [db.rehearsals, db.ministrations]);

  // Monthly Financial Chart Data (May - Oct)
  const monthlySeries = useMemo(() => {
    return CHART_MONTHS.map((m) => {
      let income = 0;
      let expense = 0;
      for (const tx of db.finances) {
        if (!tx.date) continue;
        const monthPart = tx.date.split('-')[1];
        if (monthPart === m.key) {
          if (tx.type === 'Income') income += Number(tx.amount || 0);
          else expense += Number(tx.amount || 0);
        }
      }
      return { label: m.label, income, expense };
    });
  }, [db.finances]);

  const maxChartVal = useMemo(() => {
    const rawMax = Math.max(...monthlySeries.map((s) => Math.max(s.income, s.expense)), 0);
    return rawMax === 0 ? 4 : Math.ceil(rawMax / 4) * 4;
  }, [monthlySeries]);

  const yTicks = [0, 1, 2, 3, 4].map((step) => (maxChartVal / 4) * step);

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-serif text-[26px] font-bold text-[#1E142B] leading-tight">
          DC Angels Apapa
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Choir Management Dashboard</p>
      </div>

      {/* 8 Summary Cards (2 rows of 4 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Choir Members (Purple) */}
        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-[#F4F0FE] hover:bg-[#EFE9FD] border border-[#E7DEFC] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              CHOIR MEMBERS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#3B1D70] mt-2 leading-none tabular-nums">
              {activeMembersCount}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 mt-3">↑ 8% this month</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 2. Upcoming Rehearsals (Blue) */}
        <button
          type="button"
          onClick={() => onNavigate('rehearsals')}
          className="text-left bg-[#EFF6FF] hover:bg-[#E6F0FE] border border-[#DCEBFE] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              UPCOMING REHEARSALS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#1E3A5F] mt-2 leading-none tabular-nums">
              {upcomingRehearsalsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 3. Ministrations (Green) */}
        <button
          type="button"
          onClick={() => onNavigate('ministrations')}
          className="text-left bg-[#EAFAF3] hover:bg-[#E1F7EE] border border-[#D1F4E4] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              MINISTRATIONS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#064E3B] mt-2 leading-none tabular-nums">
              {ministrationsCount}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 mt-3">↑ 12% this month</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 4. Welfare Requests (Pink) */}
        <button
          type="button"
          onClick={() => onNavigate('welfare')}
          className="text-left bg-[#FDF2F3] hover:bg-[#FCE9EB] border border-[#FADCE0] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              WELFARE REQUESTS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#68182A] mt-2 leading-none tabular-nums">
              {welfareRequestsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F43F5E] text-white flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 5. Income (Green) */}
        <button
          type="button"
          onClick={() => onNavigate('finances')}
          className="text-left bg-[#EAFAF3] hover:bg-[#E1F7EE] border border-[#D1F4E4] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              INCOME
            </div>
            <div className="font-serif text-[28px] font-bold text-[#064E3B] mt-2 leading-none tabular-nums">
              {formatNaira(totalIncome)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 stroke-[2]" />
          </div>
        </button>

        {/* 6. Choir Units (Pink) */}
        <button
          type="button"
          onClick={() => onNavigate('units')}
          className="text-left bg-[#FDF2F3] hover:bg-[#FCE9EB] border border-[#FADCE0] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              CHOIR UNITS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#68182A] mt-2 leading-none tabular-nums">
              {choirUnitsCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F43F5E] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 7. Birthdays This Month (Purple) */}
        <button
          type="button"
          onClick={() => {
            setBirthdayFilter('month');
          }}
          className="text-left bg-[#F4F0FE] hover:bg-[#EFE9FD] border border-[#E7DEFC] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              BIRTHDAYS THIS MONTH
            </div>
            <div className="font-serif text-[28px] font-bold text-[#3B1D70] mt-2 leading-none tabular-nums">
              {birthdaysThisMonthList.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>

        {/* 8. Total Members (Blue) */}
        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-[#EFF6FF] hover:bg-[#E6F0FE] border border-[#DCEBFE] rounded-2xl p-5 flex items-start justify-between transition-colors shadow-2xs"
        >
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              TOTAL MEMBERS
            </div>
            <div className="font-serif text-[28px] font-bold text-[#1E3A5F] mt-2 leading-none tabular-nums">
              {totalMembersCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
        </button>
      </div>

      {/* Middle Row: Financial Overview (2 cols) + Upcoming Events & Upcoming Birthdays (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Financial Overview Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
          <h2 className="font-serif text-[16px] font-bold text-[#1E142B] mb-4">
            Financial Overview
          </h2>

          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 640 240" className="w-full h-[230px] select-none">
              {/* Horizontal dashed grid lines + Y-axis labels */}
              {[0, 1, 2, 3, 4].map((idx) => {
                const y = 195 - idx * 42;
                const val = yTicks[idx];
                const label = val <= 4 ? String(val) : `₦${Math.round(val / 1000)}k`;
                return (
                  <g key={idx}>
                    <line
                      x1={48}
                      y1={y}
                      x2={615}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={idx === 0 ? undefined : '3 3'}
                      strokeWidth={1}
                    />
                    {/* Small Y-axis tick */}
                    <line x1={43} y1={y} x2={48} y2={y} stroke="#64748B" strokeWidth={1} />
                    <text
                      x={40}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px] font-sans tabular-nums"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Left Y-axis solid line */}
              <line x1={48} y1={27} x2={48} y2={195} stroke="#64748B" strokeWidth={1} />
              {/* Bottom X-axis solid line */}
              <line x1={48} y1={195} x2={615} y2={195} stroke="#64748B" strokeWidth={1} />

              {/* Vertical grid lines, X-axis labels & data bars */}
              {monthlySeries.map((item, idx) => {
                const x = 98 + idx * 94;
                const incHeight = maxChartVal > 0 ? (item.income / maxChartVal) * 168 : 0;
                const expHeight = maxChartVal > 0 ? (item.expense / maxChartVal) * 168 : 0;

                return (
                  <g key={item.label}>
                    <line
                      x1={x}
                      y1={27}
                      x2={x}
                      y2={195}
                      stroke="#F1F5F9"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <line x1={x} y1={195} x2={x} y2={200} stroke="#64748B" strokeWidth={1} />
                    <text
                      x={x}
                      y={214}
                      textAnchor="middle"
                      className="fill-slate-600 text-[11px] font-sans"
                    >
                      {item.label}
                    </text>

                    {/* Income Bar */}
                    {incHeight > 0 && (
                      <rect
                        x={x - 16}
                        y={195 - incHeight}
                        width={14}
                        height={incHeight}
                        rx={3}
                        fill="#1E2D5E"
                      >
                        <title>{`${item.label} Income: ${formatNaira(item.income)}`}</title>
                      </rect>
                    )}

                    {/* Expense Bar */}
                    {expHeight > 0 && (
                      <rect
                        x={x + 2}
                        y={195 - expHeight}
                        width={14}
                        height={expHeight}
                        rx={3}
                        fill="#BE3460"
                      >
                        <title>{`${item.label} Expenses: ${formatNaira(item.expense)}`}</title>
                      </rect>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 mt-2 text-[12px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E2D5E] inline-block" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BE3460] inline-block" />
              <span>Expenses</span>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Events & Upcoming Birthdays */}
        <div className="space-y-6">
          {/* Upcoming Events Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
            <h2 className="font-serif text-[16px] font-bold text-[#1E142B] mb-4">
              Upcoming Events
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-[13px] text-slate-500 text-center py-6">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onNavigate(ev.section)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{ev.title}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {ev.badge} · {ev.venue} · {ev.time}
                      </div>
                    </div>
                    <div className="text-xs font-mono font-medium text-purple-700 shrink-0">
                      {formatShortDate(ev.date)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Birthdays Card */}
          <div className="bg-[#FDF6F6] border border-[#F8E5E7] rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base" role="img" aria-label="Birthday cake">
                🎂
              </span>
              <h2 className="font-serif text-[15px] font-bold text-[#1E142B]">
                Upcoming Birthdays
              </h2>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBirthdayFilter('week')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  birthdayFilter === 'week'
                    ? 'bg-[#F59E0B] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setBirthdayFilter('month')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  birthdayFilter === 'month'
                    ? 'bg-[#F59E0B] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                This Month
              </button>
            </div>

            {displayedBirthdays.length === 0 ? (
              <p className="text-[12.5px] text-slate-500 text-center py-4">
                {birthdayFilter === 'week'
                  ? 'No birthdays in the next 7 days 🎂'
                  : 'No birthdays this month 🎂'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {displayedBirthdays.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">{member.voicePart}</div>
                    </div>
                    <div className="text-xs font-medium text-amber-700 shrink-0">
                      {formatShortDate(member.birthDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity (2 cols wide matching Financial Overview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
          <h2 className="font-serif text-[16px] font-bold text-[#1E142B] mb-5">Recent Activity</h2>

          {db.activities.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No recent system activity</p>
          ) : (
            <div className="space-y-5">
              {db.activities.slice(0, 8).map((act) => (
                <div key={act.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-slate-900 truncate">
                        {act.title}
                      </div>
                      <div className="text-[12px] text-slate-500 truncate">{act.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-[11.5px] text-slate-400 shrink-0 tabular-nums">
                    {act.dateLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
