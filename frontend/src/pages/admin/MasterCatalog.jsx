import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { FolderTree, Plus, BookOpen, User, Building, Trash2 } from 'lucide-react';

export default function MasterCatalog() {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', biography: '', address: '', contact: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, s, a, p] = await Promise.all([
        api.get('/categories'),
        api.get('/subjects'),
        api.get('/authors'),
        api.get('/publishers')
      ]);
      if (c.data.success) setCategories(c.data.categories);
      if (s.data.success) setSubjects(s.data.subjects);
      if (a.data.success) setAuthors(a.data.authors);
      if (p.data.success) setPublishers(p.data.publishers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/${activeTab}`, formData);
      if (res.data.success) {
        setModalOpen(false);
        setFormData({ name: '', code: '', description: '', biography: '', address: '', contact: '' });
        fetchAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Creation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  let currentData = categories;
  if (activeTab === 'subjects') currentData = subjects;
  else if (activeTab === 'authors') currentData = authors;
  else if (activeTab === 'publishers') currentData = publishers;

  const columns = [
    { header: 'Name / Title', accessor: 'name', cellClassName: 'font-bold text-slate-900 dark:text-white' },
    {
      header: 'Metadata / Description',
      render: (r) => (
        <span className="text-xs text-slate-500 line-clamp-1">
          {r.description || r.code || r.biography || r.address || '—'}
        </span>
      )
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
            Master Academic Catalog Taxonomies
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define categories, subjects, authors, and publishing houses for normalized book classification
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add to {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold w-fit">
        {[
          { key: 'categories', label: 'Categories' },
          { key: 'subjects', label: 'Subjects' },
          { key: 'authors', label: 'Authors' },
          { key: 'publishers', label: 'Publishers' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-xl px-4 py-2 capitalize transition-all ${
              activeTab === t.key
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={currentData}
        searchPlaceholder={`Filter ${activeTab}...`}
        isLoading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Add New ${activeTab.slice(0, -1)}`}
        subtitle="Expands relational classification options for cataloged books"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {activeTab === 'categories' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          {activeTab === 'authors' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Biography</label>
              <textarea
                rows="3"
                value={formData.biography}
                onChange={(e) => setFormData(p => ({ ...p, biography: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          {activeTab === 'publishers' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Address / Contact</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Save Record
          </button>
        </form>
      </Modal>
    </div>
  );
}
