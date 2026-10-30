import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { AlertTriangle, Wrench, FileX, CheckCircle, ShieldAlert } from 'lucide-react';

export default function InventoryHealth() {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [actionType, setActionType] = useState('repair'); // 'repair' or 'lost'
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory');
      if (res.data.success) {
        // Filter out normal available/issued to focus on exceptions
        const attentionCopies = (res.data.records || []).filter(c => 
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
    fetchInventory();
  }, []);

  const handleStatusUpdate = async (copyId, newStatus) => {
    try {
      const res = await api.put(`/books/copies/${copyId}`, { status: newStatus });
      if (res.data.success) {
        setModalOpen(false);
        fetchInventory();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const columns = [
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Lost & Damaged Inventory Health
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track books reported lost, inspect physical damage, and route copies through bookbinding/repair workflows
        </p>
      </div>

      <DataTable
        columns={columns}
        data={copies}
        searchPlaceholder="Filter damaged or lost barcodes..."
        isLoading={loading}
        emptyMessage="No damaged, lost, or in-repair copies recorded. All inventory healthy!"
      />
    </div>
  );
}
