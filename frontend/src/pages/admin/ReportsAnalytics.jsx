import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { BarChart3, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';

export default function ReportsAnalytics() {
  const [reportType, setReportType] = useState('circulation');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/circulation';
      if (reportType === 'overdue') endpoint = '/reports/overdue';
      else if (reportType === 'fines') endpoint = '/reports/fines';
      else if (reportType === 'inventory') endpoint = '/reports/inventory';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setData(res.data.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => JSON.stringify(row[h] || '')).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_${reportType}_report_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadPDF = async (type) => {
    try {
      const response = await api.get(`/reports/pdf/${type}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Adarsh_School_${type}_report_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF report.');
    }
  };

  const circulationColumns = [
    { header: 'ID', accessor: 'id', cellClassName: 'font-mono text-indigo-600 font-bold' },
    { header: 'Book Title', render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.book?.title}</span> },
    { header: 'Barcode', render: (r) => <span className="font-mono text-slate-500">{r.copy?.barcode}</span> },
    { header: 'Patron', render: (r) => <span>{r.user?.name} ({r.user?.role})</span> },
    { header: 'Issue Date', render: (r) => <span>{new Date(r.issue_date).toLocaleDateString()}</span> },
    { header: 'Due Date', render: (r) => <span>{new Date(r.due_date).toLocaleDateString()}</span> },
    { header: 'Status', render: (r) => <Badge status={r.status} text={r.status} size="xs" /> }
  ];

  const fineColumns = [
    { header: 'Fine ID', accessor: 'id', cellClassName: 'font-mono text-indigo-600 font-bold' },
    { header: 'Patron', render: (r) => <span>{r.user?.name}</span> },
    { header: 'Book', render: (r) => <span>{r.issue?.book?.title || 'Academic Loan'}</span> },
    { header: 'Type', render: (r) => <span className="capitalize">{r.fine_type.replace('_', ' ')}</span> },
    { header: 'Amount', render: (r) => <span className="font-bold text-slate-900 dark:text-white">₹{r.amount}</span> },
    { header: 'Status', render: (r) => <Badge status={r.status} text={r.status} size="xs" /> }
  ];

  const inventoryColumns = [
    { header: 'Barcode', accessor: 'barcode', cellClassName: 'font-mono font-bold text-indigo-600' },
    { header: 'Title', render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.book?.title}</span> },
    { header: 'Category', render: (r) => <span>{r.book?.category?.name || 'General'}</span> },
    { header: 'Condition', render: (r) => <span className="capitalize">{r.condition}</span> },
    { header: 'Status', render: (r) => <Badge status={r.status} text={r.status.replace('_', ' ')} size="xs" /> }
  ];

  let activeColumns = circulationColumns;
  if (reportType === 'fines') activeColumns = fineColumns;
  else if (reportType === 'inventory') activeColumns = inventoryColumns;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Reports & Circulation Audit Generator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate and export institutional circulation reports, overdue logs, fine revenues, and inventory counts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadPDF(reportType)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Download className="h-4 w-4" /> Download Official PDF
          </button>
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold w-fit">
        {[
          { key: 'circulation', label: 'All Circulation Loans' },
          { key: 'overdue', label: 'Overdue Exceptions' },
          { key: 'fines', label: 'Fine Revenue & Waivers' },
          { key: 'inventory', label: 'Physical Inventory' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setReportType(t.key)}
            className={`rounded-xl px-4 py-2 capitalize transition-all ${
              reportType === t.key
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={activeColumns}
        data={data}
        searchPlaceholder={`Search ${reportType} report...`}
        isLoading={loading}
      />
    </div>
  );
}
