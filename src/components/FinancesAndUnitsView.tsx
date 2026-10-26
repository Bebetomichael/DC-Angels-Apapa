import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  DollarSign,
  Download,
  Edit3,
  FileText,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { exportToCSV, formatNaira } from '../services/dbService';
import { ChoirDatabase, ChoirUnit, FinancialTransaction } from '../types/choir';
import { FinanceStatementReport } from './FinanceStatementReport';

// ============================================================================
// FINANCES VIEW
// ============================================================================

interface FinancesViewProps {
  db: ChoirDatabase;
  onUpdateFinances: (
    finances: FinancialTransaction[],
    activityTitle?: string,
    activitySub?: string
  ) => Promise<void>;
}

const TX_CATEGORIES: FinancialTransaction['category'][] = [
  'Monthly Dues',
  'Dues & Levies',
  'Special Seed / Donation',
  'Love Offering',
  'Uniform Levy',
  'Equipment Maintenance',
  'Welfare Support',
  'Refreshments',
  'Music Production',
  'Transport & Logistics',
];

const PAYMENT_METHODS: FinancialTransaction['paymentMethod'][] = [
  'Cash',
  'Bank Transfer',
  'POS',
  'Cheque',
];

export const FinancesView: React.FC<FinancesViewProps> = ({ db, onUpdateFinances }) => {
  const [viewMode, setViewMode] = useState<'statement' | 'ledger'>('statement');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialTransaction | null>(null);

  const [form, setForm] = useState({
    type: 'Income' as 'Income' | 'Expense',
    amount: '' as string | number,
    date: '',
    category: 'Monthly Dues' as FinancialTransaction['category'],
    memberName: '',
    paymentMethod: 'Cash' as FinancialTransaction['paymentMethod'],
    description: '',
    account: 'DC Angels Main UBA' as FinancialTransaction['account'],
    recordedBy: 'DCApapa Administration',
    reference: `001AC${Math.floor(10000000000 + Math.random() * 89999999999)}`,
  });

  const totals = useMemo(() => {
    const income = db.finances
      .filter((t) => t.type === 'Income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = db.finances
      .filter((t) => t.type === 'Expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [db.finances]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.finances.filter((t) => {
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.memberName || '').toLowerCase().includes(q) ||
        t.account.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q);
      const matchType = typeFilter === 'All' || t.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [db.finances, search, typeFilter]);

  const openAdd = (initialType: 'Income' | 'Expense' = 'Income') => {
    setEditingTx(null);
    setForm({
      type: initialType,
      amount: '',
      date: '',
      category: 'Monthly Dues',
      memberName: '',
      paymentMethod: 'Cash',
      description: '',
      account: 'DC Angels Main UBA',
      recordedBy: 'DCApapa Administration',
      reference: `001AC${Math.floor(10000000000 + Math.random() * 89999999999)}`,
    });
    setModalOpen(true);
  };

  const openEdit = (tx: FinancialTransaction) => {
    setEditingTx(tx);
    setForm({
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      category: tx.category,
      memberName: tx.memberName || '',
      paymentMethod: tx.paymentMethod,
      description: tx.notes || tx.title,
      account: tx.account,
      recordedBy: tx.recordedBy,
      reference: tx.reference,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.max(0, Number(form.amount) || 0);
    if (numericAmount <= 0) return;

    const effectiveDate = form.date || new Date().toISOString().slice(0, 10);
    const computedTitle =
      form.description.trim() ||
      (form.memberName
        ? `${form.category} — ${form.memberName}`
        : form.category);

    if (editingTx) {
      const next = db.finances.map((t) =>
        t.id === editingTx.id
          ? {
              ...t,
              title: computedTitle,
              type: form.type,
              category: form.category,
              amount: numericAmount,
              date: effectiveDate,
              account: form.account,
              paymentMethod: form.paymentMethod,
              memberName: form.memberName || undefined,
              recordedBy: form.memberName || form.recordedBy,
              reference: form.reference,
              notes: form.description.trim(),
            }
          : t
      );
      await onUpdateFinances(
        next,
        computedTitle,
        `${form.type} Updated (${formatNaira(numericAmount)})`
      );
    } else {
      const created: FinancialTransaction = {
        id: `fin-${Date.now()}`,
        title: computedTitle,
        type: form.type,
        category: form.category,
        amount: numericAmount,
        date: effectiveDate,
        account: form.account,
        paymentMethod: form.paymentMethod,
        memberName: form.memberName || undefined,
        recordedBy: form.memberName || form.recordedBy,
        reference: form.reference,
        notes: form.description.trim(),
      };
      await onUpdateFinances(
        [created, ...db.finances],
        created.title,
        `New ${created.type}: ${formatNaira(numericAmount)}`
      );
    }
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      'dc_angels_apapa_finances.csv',
      ['Reference', 'Date', 'Description', 'Type', 'Category', 'Member', 'Amount (NGN)', 'Payment Method'],
      filtered.map((t) => [
        t.reference,
        t.date,
        t.title,
        t.type,
        t.category,
        t.memberName || t.recordedBy,
        t.amount,
        t.paymentMethod,
      ])
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Finances &amp; Account Statement</h1>
          <p className="text-[13px] text-slate-500">
            DC Angels Apapa general account statement, choir income, withdrawals, and real-time treasury balances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="inline-flex items-center bg-[#EBEAEF] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('statement')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-all ${
                viewMode === 'statement'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#5A1E82]" />
              <span>Finance Report</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-all ${
                viewMode === 'ledger'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-[#5A1E82]" />
              <span>Transactions &amp; Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openAdd('Income')}
            className="px-4 py-2 rounded-xl bg-[#5A1E82] hover:bg-[#481669] text-white text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {viewMode === 'statement' ? (
        <FinanceStatementReport
          db={db}
          onOpenRecordModal={openAdd}
          onEditTransaction={openEdit}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#EAFAF3] border border-[#D1F4E4] rounded-2xl p-5 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  TOTAL INCOME
                </div>
                <div className="font-serif text-[28px] font-bold text-[#064E3B] mt-2 leading-none tabular-nums">
                  {formatNaira(totals.income)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FDF2F3] border border-[#FADCE0] rounded-2xl p-5 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  TOTAL EXPENSES
                </div>
                <div className="font-serif text-[28px] font-bold text-[#68182A] mt-2 leading-none tabular-nums">
                  {formatNaira(totals.expense)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F43F5E] text-white flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#F4F0FE] border border-[#E7DEFC] rounded-2xl p-5 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  NET TREASURY BALANCE
                </div>
                <div className="font-serif text-[28px] font-bold text-[#3B1D70] mt-2 leading-none tabular-nums">
                  {formatNaira(totals.balance)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions by description, member, category, or reference..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              {(['All', 'Income', 'Expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    typeFilter === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger</span>
            </button>
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            {filtered.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900">No Financial Transactions Recorded</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Record an income or expense entry to calculate real-time balances and update the Dashboard Financial Overview chart.
                </p>
                <button
                  type="button"
                  onClick={() => openAdd('Income')}
                  className="px-4 py-2 rounded-xl bg-[#5A1E82] text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Transaction</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Member &amp; Method</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">{tx.date}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{tx.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {tx.reference}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{tx.category}</td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800">{tx.memberName || 'General Account'}</div>
                          <div className="text-[11px] text-slate-500">{tx.paymentMethod}</div>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                            tx.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'Income' ? '+' : '-'}
                          {formatNaira(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(tx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(tx)}
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
            )}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* ADD TRANSACTION MODAL — Exact Replication of image_6879b7f0.png       */}
      {/* ===================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-[#F8F8FA] rounded-2xl max-w-[520px] w-full p-7 shadow-2xl border border-slate-200/90 relative">
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Heading */}
            <h2 className="font-serif text-[22px] font-bold text-[#181326] mb-6 leading-tight">
              {editingTx ? 'Edit Transaction' : 'Add Transaction'}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Row 1: Type * & Amount (₦) * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                    Type *
                  </label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as 'Income' | 'Expense',
                        })
                      }
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                    >
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                    Amount (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                  />
                </div>
              </div>

              {/* Row 2: Date * & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                  />
                </div>

                <div>
                  <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as FinancialTransaction['category'],
                        })
                      }
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                    >
                      {TX_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: Member */}
              <div>
                <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                  Member
                </label>
                <div className="relative">
                  <select
                    value={form.memberName}
                    onChange={(e) =>
                      setForm({ ...form, memberName: e.target.value })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                  >
                    <option value="">— Select Member —</option>
                    {db.members.map((m) => (
                      <option key={m.id} value={m.fullName}>
                        {m.fullName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 4: Payment Method */}
              <div>
                <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentMethod: e.target.value as FinancialTransaction['paymentMethod'],
                      })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 5: Description */}
              <div>
                <label className="block text-[13.5px] font-medium text-[#181326] mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#F3F2F7] text-[14px] text-[#181326] resize-y focus:outline-none focus:ring-2 focus:ring-[#5A1E82]/25"
                />
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200/90 bg-[#F3F2F7] hover:bg-slate-200/60 text-[#181326] text-[14px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#5A1E82] hover:bg-[#49176B] text-white text-[14px] font-semibold transition-colors shadow-xs"
                >
                  {editingTx ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Transaction?</h3>
            <p className="text-xs text-slate-600">
              Delete <strong>{deleteTarget.title}</strong> ({formatNaira(deleteTarget.amount)})?
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
                  const next = db.finances.filter((t) => t.id !== deleteTarget.id);
                  await onUpdateFinances(next, deleteTarget.title, 'Transaction Removed');
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
// CHOIR UNITS VIEW
// ============================================================================

interface ChoirUnitsViewProps {
  db: ChoirDatabase;
  onUpdateUnits: (units: ChoirUnit[], activityTitle?: string, activitySub?: string) => Promise<void>;
}

export const ChoirUnitsView: React.FC<ChoirUnitsViewProps> = ({ db, onUpdateUnits }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ChoirUnit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChoirUnit | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    leaderId: db.members[0]?.id || '',
    assistantName: '',
    meetingDay: 'Saturdays 4:00 PM',
    description: '',
  });

  const openAdd = () => {
    setEditingUnit(null);
    setForm({
      name: '',
      code: `UNIT-0${db.units.length + 1}`,
      leaderId: db.members[0]?.id || '',
      assistantName: 'Samuel Chukwu',
      meetingDay: 'Saturdays 4:00 PM',
      description: '',
    });
    setModalOpen(true);
  };

  const openEdit = (u: ChoirUnit) => {
    setEditingUnit(u);
    setForm({
      name: u.name,
      code: u.code,
      leaderId: u.leaderId,
      assistantName: u.assistantName,
      meetingDay: u.meetingDay,
      description: u.description,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const leader = db.members.find((m) => m.id === form.leaderId);
    const leaderName = leader ? leader.fullName : 'Unit Leader';

    if (editingUnit) {
      const next = db.units.map((u) =>
        u.id === editingUnit.id ? { ...u, ...form, leaderName } : u
      );
      await onUpdateUnits(next, form.name, 'Choir Unit Updated');
    } else {
      const created: ChoirUnit = {
        id: `unit-${Date.now()}`,
        ...form,
        leaderName,
        memberIds: [],
      };
      await onUpdateUnits([created, ...db.units], created.name, 'New Choir Unit Created');
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-[#1E142B]">Choir Units</h1>
          <p className="text-[13px] text-slate-500">
            Manage operational sub-units, unit leaders, rehearsal schedules, and member assignments ({db.units.length} active)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#26133D] hover:bg-[#351B54] text-white text-xs font-semibold flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          <span>Create Choir Unit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {db.units.map((unit) => {
          const memberCount = db.members.filter(
            (m) => m.unitId === unit.id || m.unitName === unit.name
          ).length;
          return (
            <div
              key={unit.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#FDF2F3] text-[#F43F5E] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-rose-600">{unit.code}</span>
                      <h3 className="font-serif text-lg font-bold text-slate-900">{unit.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-xl font-bold text-slate-900 tabular-nums">
                      {memberCount}
                    </div>
                    <div className="text-[11px] text-slate-500">Members</div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{unit.description}</p>

                <div className="grid grid-cols-2 gap-3 mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400">Unit Leader</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{unit.leaderName}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Assistant Leader</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{unit.assistantName}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400">Schedule</div>
                    <div className="font-medium text-slate-700 mt-0.5">{unit.meetingDay}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(unit)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(unit)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                {editingUnit ? 'Edit Choir Unit' : 'Create Choir Unit'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Unit Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Voices of Zion Unit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Leader</label>
                  <select
                    value={form.leaderId}
                    onChange={(e) => setForm({ ...form, leaderId: e.target.value })}
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
                  <label className="block font-semibold text-slate-700 mb-1">Assistant Leader</label>
                  <input
                    type="text"
                    value={form.assistantName}
                    onChange={(e) => setForm({ ...form, assistantName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Schedule</label>
                <input
                  type="text"
                  value={form.meetingDay}
                  onChange={(e) => setForm({ ...form, meetingDay: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
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
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Delete Choir Unit?</h3>
            <p className="text-xs text-slate-600">
              Delete <strong>{deleteTarget.name}</strong>?
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
                  const next = db.units.filter((u) => u.id !== deleteTarget.id);
                  await onUpdateUnits(next, deleteTarget.name, 'Choir Unit Removed');
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
