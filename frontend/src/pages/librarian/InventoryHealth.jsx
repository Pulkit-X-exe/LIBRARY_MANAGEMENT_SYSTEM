import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { 
  AlertTriangle, Wrench, CheckCircle, ShieldAlert, BookOpen, 
  Layers, PackageCheck, Bookmark, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InventoryHealth() {
  const [intelligence, setIntelligence] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'low_stock', 'never_borrowed'

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [intelRes, invRes] = await Promise.all([
        api.get('/reports/inventory-intelligence'),
        api.get('/reports/inventory')
      ]);

      if (intelRes.data.success) {
        setIntelligence(intelRes.data);
      }

      if (invRes.data.success) {
        const attentionCopies = (invRes.data.records || []).filter(c => 
          ['damaged', 'lost', 'under_repair'].includes(c.status)
        );
        setCopies(attentionCopies);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleStatusUpdate = async (copyId, newStatus) => {
    try {
      const res = await api.put(`/books/copies/${copyId}`, { status: newStatus });
      if (res.data.success) {
        fetchInventoryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const auditColumns = [
    {
      header: 'Barcode Identifier',
      accessor: 'barcode',
      cellClassName: 'font-mono font-bold text-indigo-600 dark:text-indigo-400'
    },
    {
      header: 'Book Title',
      render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.book?.title}</span>
    },
    {
      header: 'Shelf / Location',
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.book?.rack_number}, {r.book?.shelf_number}</span>
    },
    {
      header: 'Physical Condition',
      render: (r) => <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{r.condition}</span>
    },
    {
      header: 'Current Status',
      render: (r) => <Badge status={r.status} text={r.status.replace('_', ' ')} size="xs" />
    },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.status === 'damaged' && (
            <button
              onClick={() => handleStatusUpdate(r.id, 'under_repair')}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600"
            >
              <Wrench className="h-3 w-3" /> Mark In Repair
            </button>
          )}

          {r.status === 'under_repair' && (
            <button
              onClick={() => handleStatusUpdate(r.id, 'available')}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <CheckCircle className="h-3 w-3" /> Restore to Available
            </button>
          )}

          {['damaged', 'lost'].includes(r.status) && (
            <button
              onClick={() => handleStatusUpdate(r.id, 'archived')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Archive
            </button>
          )}
        </div>
      )
    }
  ];

  const lowStockColumns = [
    {
      header: 'Title & Author',
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white">{r.title}</span>
          <span className="block text-[11px] text-slate-400">By {r.author?.name || 'Academic Author'}</span>
        </div>
      )
    },
    {
      header: 'ISBN',
      accessor: 'isbn',
      cellClassName: 'font-mono text-xs text-slate-500'
    },
    {
      header: 'Stock Status',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-rose-600 dark:text-rose-400">{r.available_copies} available</span>
          <span className="text-slate-400 text-xs">/ {r.total_copies} total</span>
        </div>
      )
    },
    {
      header: 'Rack & Shelf',
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.rack_number}, {r.shelf_number}</span>
    },
    {
      header: 'Action',
      render: (r) => (
        <Link
          to="/librarian/books"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Add Copies <ArrowRight className="h-3 w-3" />
        </Link>
      )
    }
  ];

  const neverBorrowedColumns = [
    {
      header: 'Title & Author',
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white">{r.title}</span>
          <span className="block text-[11px] text-slate-400">By {r.author?.name || 'Academic Author'}</span>
        </div>
      )
    },
    {
      header: 'Category',
      render: (r) => <span>{r.category?.name || 'General'}</span>
    },
    {
      header: 'Location',
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.rack_number}, {r.shelf_number}</span>
    },
    {
      header: 'Copies in Stock',
      render: (r) => <span className="font-bold text-slate-700 dark:text-slate-300">{r.available_copies}</span>
    },
    {
      header: 'Suggestion',
      render: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          <Sparkles className="h-3 w-3" /> Feature in school reading list
        </span>
      )
    }
  ];

  const summary = intelligence?.summary || {};
  const alerts = intelligence?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Inventory Intelligence & Health Center
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Real-time physical asset health, automated stock warnings, and damaged/lost copy management
        </p>
      </div>

      {/* Intelligent Automated Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => {
            let bg = 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200';
            if (alert.severity === 'high') {
              bg = 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200';
            } else if (alert.severity === 'low') {
              bg = 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200';
            }

            return (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-2xl border p-4 text-xs font-semibold ${bg}`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
                {alert.action && (
                  <Link
                    to={alert.action}
                    className="ml-4 shrink-0 rounded-xl bg-white/80 dark:bg-slate-900 px-3 py-1 text-xs font-bold shadow-xs hover:bg-white transition-colors"
                  >
                    View →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Metric Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Titles</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.totalTitles || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Copies</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.totalCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Available</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{summary.availableCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase">Issued</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{summary.issuedCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase">Overdue</p>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{summary.overdueCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 dark:border-purple-900/60 dark:bg-purple-950/20">
          <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">Reserved</p>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">{summary.reservedCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase">Damaged</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{summary.damagedCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Lost</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.lostCopies || 0}</p>
        </div>
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/40 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
          <p className="text-[11px] font-bold text-orange-700 dark:text-orange-300 uppercase">Low Stock</p>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-1">{summary.lowStockCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Never Borrowed</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{summary.neverBorrowedCount || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('audit')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'audit'
              ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Damaged & Lost Audit ({copies.length})
        </button>
        <button
          onClick={() => setActiveTab('low_stock')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'low_stock'
              ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Low Availability Titles ({intelligence?.lowStockBooks?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('never_borrowed')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'never_borrowed'
              ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Never Borrowed Dormant ({intelligence?.neverBorrowedBooks?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'audit' && (
        <DataTable
          columns={auditColumns}
          data={copies}
          searchPlaceholder="Filter damaged or lost barcodes..."
          isLoading={loading}
          emptyMessage="No damaged, lost, or in-repair copies recorded. All inventory healthy!"
        />
      )}

      {activeTab === 'low_stock' && (
        <DataTable
          columns={lowStockColumns}
          data={intelligence?.lowStockBooks || []}
          searchPlaceholder="Filter low stock titles..."
          isLoading={loading}
          emptyMessage="All catalog titles have adequate stock."
        />
      )}

      {activeTab === 'never_borrowed' && (
        <DataTable
          columns={neverBorrowedColumns}
          data={intelligence?.neverBorrowedBooks || []}
          searchPlaceholder="Filter never borrowed titles..."
          isLoading={loading}
          emptyMessage="All books in the collection have been borrowed at least once!"
        />
      )}
    </div>
  );
}
