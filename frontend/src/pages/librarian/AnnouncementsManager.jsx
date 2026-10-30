import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { Megaphone, Plus, Trash2, Calendar } from 'lucide-react';

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    category: 'general',
    expiry_date: ''
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.announcements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/announcements', formData);
      if (res.data.success) {
        setModalOpen(false);
        setFormData({ title: '', content: '', priority: 'medium', category: 'general', expiry_date: '' });
        fetchAnnouncements();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create announcement.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const res = await api.delete(`/announcements/${id}`);
      if (res.data.success) fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'Notice Title',
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.title}</p>
          <p className="text-[11px] text-slate-500 line-clamp-1">{r.content}</p>
        </div>
      )
    },
    {
      header: 'Category',
      render: (r) => <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{r.category}</span>
    },
    {
      header: 'Priority',
      render: (r) => <Badge status={r.priority} text={r.priority} size="xs" />
    },
    {
      header: 'Posted Date',
      render: (r) => <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
    },
    {
      header: 'Valid Until',
      render: (r) => <span className="text-slate-500">{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : 'No expiry'}</span>
    },
    {
      header: 'Actions',
      render: (r) => (
        <button
          onClick={() => handleDelete(r.id)}
          className="text-slate-400 hover:text-rose-600 p-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Library Announcements & Bulletin Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Broadcast timing changes, examination study hours, and new acquisition alerts to students & faculty
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Post New Announcement
        </button>
      </div>

      <DataTable
        columns={columns}
        data={announcements}
        searchPlaceholder="Filter notices..."
        isLoading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Post New Library Notice"
        subtitle="Notice will appear across student and faculty dashboards with auto-expiry handling"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notice Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Extended Library Hours for Midterm Week"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="general">General</option>
                <option value="timings">Timings</option>
                <option value="holiday">Holiday</option>
                <option value="new_arrivals">New Arrivals</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(p => ({ ...p, priority: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date (Optional)</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData(p => ({ ...p, expiry_date: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Announcement Content</label>
            <textarea
              required
              rows="4"
              value={formData.content}
              onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
              placeholder="Full details of the announcement..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            Publish Announcement
          </button>
        </form>
      </Modal>
    </div>
  );
}
