import React, { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Music,
  Plus,
  Printer,
  Settings,
  X,
} from 'lucide-react';
import { exportToCSV } from '../services/dbService';
import { ChoirDatabase, FinancialTransaction } from '../types/choir';

interface FinanceStatementReportProps {
  db: ChoirDatabase;
  onOpenRecordModal?: (type: 'Income' | 'Expense') => void;
  onEditTransaction?: (tx: FinancialTransaction) => void;
}

interface StatementSettings {
  orgLine1: string;
  orgLine2: string;
  orgLine3: string;
  orgLine4: string;
  currency: string;
  departmentCode: string;
  accountNameLine1: string;
  accountNameLine2: string;
  accountNameLine3: string;
  accountNameLine4: string;
  statementRef: string;
  accountTypeBanner: string;
  openingBalance: number;
}

const DEFAULT_SETTINGS: StatementSettings = {
  orgLine1: 'DC ANGELS APAPA CHOIR MINISTRY',
  orgLine2: 'DOMINION CITY APAPA HEADQUARTERS,',
  orgLine3: 'APAPA, LAGOS',
  orgLine4: 'NIGERIA',
  currency: 'NIGERIAN NAIRA (NGN)',
  departmentCode: 'DCA-CHOIR-001',
  accountNameLine1: 'DC ANGELS APAPA — GENERAL ACCOUNT',
  accountNameLine2: 'CHOIR FINANCE & TREASURY DEPARTMENT',
  accountNameLine3: 'DOMINION CITY APAPA',
  accountNameLine4: 'Lagos',
  statementRef: 'DCA-GEN-001001',
  accountTypeBanner: 'DC ANGELS APAPA - GENERAL ACCOUNT STATEMENT',
  openingBalance: 0,
};

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatStatementDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
  const day = parts[2].padStart(2, '0');
  return `${day}-${SHORT_MONTHS[monthIdx]}-${year}`;
}

export function formatStatementAmount(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const FinanceStatementReport: React.FC<FinanceStatementReportProps> = ({
  db,
  onOpenRecordModal,
  onEditTransaction,
}) => {
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<StatementSettings>(() => {
    try {
      const saved = localStorage.getItem('dc_angels_statement_settings_v2');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('dc_angels_statement_settings_v2', JSON.stringify(settings));
    setSettingsOpen(false);
  };

  // Compute prior transactions before startDate to add to user-configured openingBalance
  const computedOpeningBalance = useMemo(() => {
    const priorTxs = db.finances.filter((tx) => {
      const matchAccount = accountFilter === 'All' || tx.account === accountFilter;
      return matchAccount && tx.date < startDate;
    });
    const priorDelta = priorTxs.reduce((sum, tx) => {
      const amt = Number(tx.amount || 0);
      return tx.type === 'Income' ? sum + amt : sum - amt;
    }, 0);
    return Number(settings.openingBalance || 0) + priorDelta;
  }, [db.finances, accountFilter, startDate, settings.openingBalance]);

  // Filter and sort transactions chronologically (ascending) for accurate running balance
  const statementRows = useMemo(() => {
    const filtered = db.finances
      .filter((tx) => {
        const matchAccount = accountFilter === 'All' || tx.account === accountFilter;
        const matchDate = tx.date >= startDate && tx.date <= endDate;
        return matchAccount && matchDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    let running = computedOpeningBalance;
    return filtered.map((tx) => {
      const amt = Number(tx.amount || 0);
      const withdrawal = tx.type === 'Expense' ? amt : 0;
      const lodgement = tx.type === 'Income' ? amt : 0;
      running = running + lodgement - withdrawal;

      const memberPart = tx.memberName ? ` - ${tx.memberName.toUpperCase()}` : '';
      const narration = `${tx.title.toUpperCase()}${memberPart} \\ ${tx.category.toUpperCase()} (${tx.paymentMethod.toUpperCase()})`;
      const voucherNo =
        tx.paymentMethod === 'Cheque' || tx.type === 'Expense'
          ? tx.reference
          : '';

      return {
        tx,
        dateFormatted: formatStatementDate(tx.date),
        narration,
        reference: tx.reference,
        valueDateFormatted: formatStatementDate(tx.date),
        voucherNo,
        withdrawal,
        lodgement,
        runningBalance: running,
      };
    });
  }, [db.finances, accountFilter, startDate, endDate, computedOpeningBalance]);

  const totalWithdrawals = useMemo(
    () => statementRows.reduce((sum, r) => sum + r.withdrawal, 0),
    [statementRows]
  );

  const totalLodgements = useMemo(
    () => statementRows.reduce((sum, r) => sum + r.lodgement, 0),
    [statementRows]
  );

  const closingBalance =
    computedOpeningBalance + totalLodgements - totalWithdrawals;

  const footerStamp = useMemo(() => {
    const parts = endDate.split('-');
    if (parts.length === 3) {
      const mIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
      return `${settings.statementRef}-${SHORT_MONTHS[mIdx]}${parts[2]}`;
    }
    return `${settings.statementRef}-Oct26`;
  }, [endDate, settings.statementRef]);

  const handleExportCSV = () => {
    exportToCSV(
      `dc_angels_apapa_general_account_statement_${startDate}_to_${endDate}.csv`,
      [
        'Date',
        'Transaction Details',
        'Reference',
        'Value Date',
        'Voucher No',
        'Withdrawals',
        'Lodgements',
        'Balance',
      ],
      [
        [
          '',
          'Opening Balance...',
          '',
          '',
          '',
          '',
          '',
          formatStatementAmount(computedOpeningBalance),
        ],
        ...statementRows.map((r) => [
          r.dateFormatted,
          r.narration,
          r.reference,
          r.valueDateFormatted,
          r.voucherNo,
          r.withdrawal > 0 ? formatStatementAmount(r.withdrawal) : '',
          r.lodgement > 0 ? formatStatementAmount(r.lodgement) : '',
          formatStatementAmount(r.runningBalance),
        ]),
        [
          '',
          'Closing Balance...',
          '',
          '',
          '',
          '',
          formatStatementAmount(closingBalance),
          formatStatementAmount(closingBalance),
        ],
      ]
    );
  };

  return (
    <div className="space-y-5">
      {/* Interactive Action & Filter Bar (hidden when printing) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 shadow-2xs no-print">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Statement Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
            />
          </div>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
          >
            <option value="All">General Account (All Funds)</option>
            <option value="DC Angels Main UBA">DC Angels Main UBA</option>
            <option value="Welfare Purse">Welfare Purse</option>
            <option value="Petty Cash">Petty Cash</option>
            <option value="Project Account">Project Account</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Statement Info</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-lg bg-[#26133D] hover:bg-[#361C57] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#E5B323]" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DC ANGELS APAPA — GENERAL ACCOUNT STATEMENT SHEET                      */}
      {/* ===================================================================== */}
      <div className="bg-white text-black border border-neutral-300 shadow-xs max-w-[940px] mx-auto px-6 py-8 sm:px-10 sm:py-10 font-sans">
        {/* Top Choir Headquarters Address & DC Angels Apapa Branding Row */}
        <div className="flex items-start justify-between gap-4 pb-6">
          <div className="text-[11px] font-extrabold uppercase leading-[1.18] tracking-tight text-black">
            <div>{settings.orgLine1}</div>
            <div>{settings.orgLine2}</div>
            <div>{settings.orgLine3}</div>
            <div>{settings.orgLine4}</div>
          </div>

          {/* DC Angels Apapa Choir Portal Emblem */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-11 h-11 rounded-xl bg-[#E5B323] text-[#26133D] flex items-center justify-center shadow-2xs shrink-0">
              <Music className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div className="text-right">
              <div className="font-serif text-[22px] font-bold leading-none text-[#26133D]">
                DC Angels Apapa
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C5B00] mt-1">
                GENERAL ACCOUNT STATEMENT
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Summary Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2.5">
          {/* Left Column: Account Statement */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-[#CCCCCC] px-2 py-1.5 text-white font-bold text-[14px] leading-tight">
                Account Statement
              </div>

              <div className="py-3 px-2 space-y-1.5 text-[12px] text-black">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">Summary Statement for</span>
                  <span className="tabular-nums">
                    {formatStatementDate(startDate)} To {formatStatementDate(endDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">Currency</span>
                  <span className="uppercase">{settings.currency}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">Department ID</span>
                  <span className="tabular-nums">{settings.departmentCode}</span>
                </div>

                <div className="pt-0.5">
                  <div className="font-bold">Account Name</div>
                  <div className="mt-1.5 uppercase leading-[1.3] text-[11.5px] font-medium text-black">
                    <div>{settings.accountNameLine1}</div>
                    <div>{settings.accountNameLine2}</div>
                    <div>{settings.accountNameLine3}</div>
                    <div className="capitalize">{settings.accountNameLine4}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#CCCCCC] px-2 py-1.5 text-white font-bold text-[13px] uppercase tracking-tight leading-tight">
              OFFICIAL CHOIR TREASURY RECORD
            </div>
          </div>

          {/* Right Column: Summary Details */}
          <div className="flex flex-col justify-between mt-4 md:mt-0">
            <div>
              <div className="bg-[#CCCCCC] px-2 py-1.5 text-white font-bold text-[14px] leading-tight">
                Summary Details
              </div>

              <div className="py-3 px-2 space-y-1.5 text-[12px] text-black">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase">STATEMENT REF</span>
                  <span className="tabular-nums">{settings.statementRef}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase">OPENING BALANCE</span>
                  <span className="tabular-nums">
                    {formatStatementAmount(computedOpeningBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase">TOTAL WITHDRAWALS</span>
                  <span className="tabular-nums">
                    {formatStatementAmount(totalWithdrawals)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase">CLOSING BALANCE</span>
                  <span className="tabular-nums">
                    {formatStatementAmount(closingBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#CCCCCC] px-2 py-1.5 text-white font-bold text-[13px] uppercase tracking-tight leading-tight">
              {settings.accountTypeBanner}
            </div>
          </div>
        </div>

        {/* Full Statement Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse border border-neutral-400 text-[11px] leading-[1.25] text-black">
            <thead>
              <tr className="border-b border-neutral-400 bg-white font-bold">
                <th className="border-r border-neutral-300 py-2 px-1.5 text-left w-[78px]">
                  Date
                </th>
                <th className="border-r border-neutral-300 py-2 px-2 text-left">
                  Transaction Details
                </th>
                <th className="border-r border-neutral-300 py-2 px-1.5 text-left w-[124px]">
                  Reference
                </th>
                <th className="border-r border-neutral-300 py-2 px-1.5 text-left w-[78px]">
                  Value Date
                </th>
                <th className="border-r border-neutral-300 py-2 px-1.5 text-left w-[92px]">
                  Voucher No
                </th>
                <th className="border-r border-neutral-300 py-2 px-1.5 text-right w-[86px]">
                  Withdrawals
                </th>
                <th className="border-r border-neutral-300 py-2 px-1.5 text-right w-[86px]">
                  Lodgements
                </th>
                <th className="py-2 px-1.5 text-right w-[90px]">Balance</th>
              </tr>
            </thead>

            <tbody>
              {/* First Row: Opening Balance... */}
              <tr className="border-b border-neutral-200">
                <td className="border-r border-neutral-300 py-1 px-1.5" />
                <td className="border-r border-neutral-300 py-1 px-2 font-bold">
                  Opening Balance...
                </td>
                <td className="border-r border-neutral-300 py-1 px-1.5" />
                <td className="border-r border-neutral-300 py-1 px-1.5" />
                <td className="border-r border-neutral-300 py-1 px-1.5" />
                <td className="border-r border-neutral-300 py-1 px-1.5 text-right" />
                <td className="border-r border-neutral-300 py-1 px-1.5 text-right" />
                <td className="py-1 px-1.5 text-right tabular-nums">
                  {formatStatementAmount(computedOpeningBalance)}
                </td>
              </tr>

              {/* Chronological Transactions */}
              {statementRows.length === 0 ? (
                <tr className="border-b border-neutral-200">
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="border-r border-neutral-300 py-6 px-2 text-neutral-500 italic">
                    No transactions recorded within {formatStatementDate(startDate)} to{' '}
                    {formatStatementDate(endDate)}. Use &ldquo;Add Transaction&rdquo; above to
                    record choir transactions.
                  </td>
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="border-r border-neutral-300 py-6 px-1.5" />
                  <td className="py-6 px-1.5" />
                </tr>
              ) : (
                statementRows.map((row) => (
                  <tr
                    key={row.tx.id}
                    onClick={() => onEditTransaction && onEditTransaction(row.tx)}
                    title={onEditTransaction ? 'Click to edit transaction' : undefined}
                    className={`border-b border-neutral-200 align-middle ${
                      onEditTransaction ? 'hover:bg-neutral-50 cursor-pointer' : ''
                    }`}
                  >
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 whitespace-nowrap tabular-nums">
                      {row.dateFormatted}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-2 uppercase">
                      {row.narration}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 uppercase break-all">
                      {row.reference}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 whitespace-nowrap tabular-nums">
                      {row.valueDateFormatted}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 uppercase break-all">
                      {row.voucherNo}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 text-right tabular-nums">
                      {row.withdrawal > 0
                        ? formatStatementAmount(row.withdrawal)
                        : ''}
                    </td>
                    <td className="border-r border-neutral-300 py-1.5 px-1.5 text-right tabular-nums">
                      {row.lodgement > 0
                        ? formatStatementAmount(row.lodgement)
                        : ''}
                    </td>
                    <td className="py-1.5 px-1.5 text-right tabular-nums">
                      {formatStatementAmount(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}

              {/* Last Row: Closing Balance... */}
              <tr>
                <td className="border-r border-neutral-300 py-1.5 px-1.5" />
                <td className="border-r border-neutral-300 py-1.5 px-2 font-bold">
                  Closing Balance...
                </td>
                <td className="border-r border-neutral-300 py-1.5 px-1.5" />
                <td className="border-r border-neutral-300 py-1.5 px-1.5" />
                <td className="border-r border-neutral-300 py-1.5 px-1.5" />
                <td className="border-r border-neutral-300 py-1.5 px-1.5 text-right" />
                <td className="border-r border-neutral-300 py-1.5 px-1.5 text-right tabular-nums">
                  {formatStatementAmount(closingBalance)}
                </td>
                <td className="py-1.5 px-1.5 text-right" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Statement Footer */}
        <div className="flex items-center justify-between text-[10.5px] text-black pt-3 mt-1">
          <div>{footerStamp}</div>
          <div>PAGE 1</div>
        </div>
      </div>

      {/* Modal: Customize Statement Header & Opening Balance */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#5A1E82]" />
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  DC Angels Apapa Statement Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Statement Reference
                  </label>
                  <input
                    type="text"
                    value={settings.statementRef}
                    onChange={(e) =>
                      setSettings({ ...settings, statementRef: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.openingBalance}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        openingBalance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Currency Label
                  </label>
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) =>
                      setSettings({ ...settings, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department ID
                  </label>
                  <input
                    type="text"
                    value={settings.departmentCode}
                    onChange={(e) =>
                      setSettings({ ...settings, departmentCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Name &amp; Department Details
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.accountNameLine1}
                    onChange={(e) =>
                      setSettings({ ...settings, accountNameLine1: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={settings.accountNameLine2}
                    onChange={(e) =>
                      setSettings({ ...settings, accountNameLine2: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={settings.accountNameLine3}
                    onChange={(e) =>
                      setSettings({ ...settings, accountNameLine3: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#26133D] text-white font-semibold"
                >
                  Save Statement Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
