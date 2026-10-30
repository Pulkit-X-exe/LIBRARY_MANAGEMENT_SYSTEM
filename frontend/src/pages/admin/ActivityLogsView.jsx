import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { History, Shield, Lock } from 'lucide-react';

export default function ActivityLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity-logs?limit=100');
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      header: 'Timestamp',
      render: (r) => (
        <span className="font-mono text-xs text-slate-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actor / User',
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.user_name || 'System'}</p>
          <span className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400">
            {r.user_role}
          </span>
        </div>
      )
    },
    {
      header: 'Action Event',
      render: (r) => (
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {r.action}
        </span>
      )
    },
    {
      header: 'Entity / Target',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {r.entity_type} {r.entity_id ? `(#${r.entity_id})` : ''}
        </span>
      )
    },
    {
      header: 'Audit Particulars',
      render: (r) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm line-clamp-2">
          {r.details}
        </p>
      )
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      cellClassName: 'font-mono text-[11px] text-slate-400'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            System Activity Audit Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable transaction log of all administrative actions, circulation transactions, and policy updates
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Lock className="h-3.5 w-3.5 text-emerald-500" /> Immutable Audit Log
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Search audit events by action or actor..."
        isLoading={loading}
      />
    </div>
  );
}
