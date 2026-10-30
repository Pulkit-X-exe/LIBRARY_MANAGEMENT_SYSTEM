import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import confetti from 'canvas-confetti';
import { Receipt, CheckCircle, CreditCard, AlertTriangle, ShieldCheck, Download } from 'lucide-react';

export default function FinesView() {
  const [fines, setFines] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedFine, setSelectedFine] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [paying, setPaying] = useState(false);
  const [successPayment, setSuccessPayment] = useState(null);

  const fetchFines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fines');
      if (res.data.success) {
        setFines(res.data.fines);
        setTotalPending(res.data.totalPending || 0);
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

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;
    setPaying(true);
    try {
      const res = await api.post(`/fines/${selectedFine.id}/pay`, {
        payment_method: paymentMethod
      });
      if (res.data.success) {
        setSuccessPayment(res.data.payment);
        confetti({ particleCount: 80, spread: 60 });
        fetchFines();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Balance Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Library Fines & Payment History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated late return assessments, fine waivers, and electronic payment receipts
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-3 dark:border-amber-900/60 dark:bg-amber-950/30 flex items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Outstanding Dues
            </span>
            <span className="text-2xl font-black text-amber-800 dark:text-amber-200">
              ₹{totalPending}
            </span>
          </div>
          {totalPending > 0 ? (
            <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-600 border border-rose-500/20">
              Payment Due
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-500/20">
              Clear Record
            </span>
          )}
        </div>
      </div>

      {/* Fines Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Associated Book</th>
                <th className="px-5 py-3.5">Fine Type</th>
                <th className="px-5 py-3.5">Date Assessed</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">Loading fine statements...</td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Clean library record</p>
                      <p className="text-xs text-slate-400">No overdue fines recorded on your student account.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                fines.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #FINE-{f.id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {f.issue?.book?.title || 'Academic Title'}
                    </td>
                    <td className="px-5 py-3.5 capitalize text-slate-600 dark:text-slate-300">
                      {f.fine_type.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white text-sm">
                      ₹{f.amount}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={f.status} text={f.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {f.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFine(f);
                            setSuccessPayment(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay Now
                        </button>
                      ) : f.status === 'waived' ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Waived: {f.waiver_reason || 'Administrative waiver'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Paid on {new Date(f.paid_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Fine Modal */}
      <Modal
        isOpen={!!selectedFine}
        onClose={() => {
          setSelectedFine(null);
          setSuccessPayment(null);
        }}
        title="Electronic Fine Settlement"
        subtitle={`Settling overdue fine for: ${selectedFine?.issue?.book?.title || 'Academic Loan'}`}
      >
        {successPayment ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Successful!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transaction Ref: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{successPayment.transaction_reference}</strong>
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Amount Paid: <strong>₹{successPayment.amount_paid}</strong> via {successPayment.payment_method}
            </div>
            <button
              onClick={() => setSelectedFine(null)}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        ) : (
          selectedFine && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="rounded-2xl bg-indigo-50/70 p-4 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Total Fine Due:</span>
                  <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">₹{selectedFine.amount}</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Late return assessment calculated based on library rules (Grace period: 1 day, ₹5 per late day).
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['online', 'card', 'cash'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-xl border p-2.5 text-xs font-bold capitalize transition-all ${
                        paymentMethod === m
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={paying}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 mt-2"
              >
                {paying ? 'Processing Payment...' : `Authorize ₹${selectedFine.amount} Payment`}
              </button>
            </form>
          )
        )}
      </Modal>
    </div>
  );
}
