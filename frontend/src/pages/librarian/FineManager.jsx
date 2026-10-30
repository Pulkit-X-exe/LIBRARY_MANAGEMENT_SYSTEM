import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import MetricCard from '../../components/MetricCard';
import { Receipt, CheckCircle, ShieldAlert, CreditCard } from 'lucide-react';

export default function FineManager() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalPending: 0, totalPaid: 0, totalWaived: 0 });

  // Waiver Modal
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [waiveLoading, setWaiveLoading] = useState(false);

  // Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');

  const fetchFines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fines');
      if (res.data.success) {
        setFines(res.data.fines);
        const p = res.data.fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0);
        const col = res.data.fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
        const w = res.data.fines.filter(f => f.status === 'waived').reduce((s, f) => s + f.amount, 0);
        setSummary({ totalPending: p, totalPaid: col, totalWaived: w });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const handleWaiveSubmit = async (e) => {
    e.preventDefault();
    if (!waiverReason.trim()) return;
    setWaiveLoading(true);
    try {
      const res = await api.post(`/fines/${selectedFine.id}/waive`, {
        reason: waiverReason
      });
      if (res.data.success) {
        setWaiveModalOpen(false);
        setWaiverReason('');
        fetchFines();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to waive fine.');
    } finally {
      setWaiveLoading(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/fines/${selectedFine.id}/pay`, {
        payment_method: payMethod
      });
      if (res.data.success) {
        setPayModalOpen(false);
        fetchFines();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment recording failed.');
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (r) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#F-{r.id}</span>
    },
    {
      header: 'Patron',
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.user?.name}</p>
          <p className="text-[11px] text-slate-400 capitalize">{r.user?.role} ({r.user?.email})</p>
        </div>
      )
    },
    {
      header: 'Book / Reference',
      render: (r) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {r.issue?.book?.title || 'Circulation Loan'}
        </span>
      )
    },
    {
      header: 'Fine Type',
      render: (r) => <span className="capitalize text-slate-600 dark:text-slate-300">{r.fine_type.replace('_', ' ')}</span>
    },
    {
      header: 'Amount',
      render: (r) => <span className="font-black text-slate-900 dark:text-white text-sm">₹{r.amount}</span>
    },
    {
      header: 'Status',
      render: (r) => <Badge status={r.status} text={r.status} size="xs" />
    },
    {
      header: 'Actions',
      render: (r) => (
        r.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedFine(r);
                setPayModalOpen(true);
              }}
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Collect
            </button>
            <button
              onClick={() => {
                setSelectedFine(r);
                setWaiveModalOpen(true);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Waive
            </button>
          </div>
        ) : r.status === 'waived' ? (
          <span className="text-[11px] italic text-slate-400" title={r.waiver_reason}>
            Waived: {r.waiver_reason?.slice(0, 20)}...
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-600">
            Paid
          </span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Fines & Administrative Fee Waivers
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track outstanding late charges, record circulation counter cash collections, and log audited waivers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Outstanding Fines"
          value={`₹${summary.totalPending}`}
          subtitle="Pending patron payment"
          icon={Receipt}
          color="amber"
        />
        <MetricCard
          title="Total Collected"
          value={`₹${summary.totalPaid}`}
          subtitle="Collected through counter/online"
          icon={CheckCircle}
          color="emerald"
        />
        <MetricCard
          title="Total Waived"
          value={`₹${summary.totalWaived}`}
          subtitle="Approved administrative waivers"
          icon={ShieldAlert}
          color="indigo"
        />
      </div>

      <DataTable
        columns={columns}
        data={fines}
        searchPlaceholder="Search fines by student or book title..."
        isLoading={loading}
      />

      {/* Waive Fine Modal */}
      <Modal
        isOpen={waiveModalOpen}
        onClose={() => setWaiveModalOpen(false)}
        title="Waive Library Fine"
        subtitle={`Waiving fine of ₹${selectedFine?.amount} for ${selectedFine?.user?.name}`}
      >
        <form onSubmit={handleWaiveSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mandatory Justification / Waiver Reason
            </label>
            <textarea
              required
              rows="3"
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
              placeholder="e.g. Medical emergency certificate verified by school dispensary, principal approval, etc."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWaiveModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={waiveLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              {waiveLoading ? 'Logging...' : 'Confirm Waiver'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collect Pay Modal */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Record Fine Payment"
        subtitle={`Collecting ₹${selectedFine?.amount} from ${selectedFine?.user?.name}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Channel</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="cash">Cash (Collected at Desk)</option>
              <option value="card">POS Debit / Credit Card</option>
              <option value="online">Online School Portal Transfer</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Mark ₹{selectedFine?.amount} as Paid
          </button>
        </form>
      </Modal>
    </div>
  );
}
