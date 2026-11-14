import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { 
  Plus, Edit, Trash2, Layers, MapPin, Printer, 
  CheckCircle2, AlertTriangle, BookOpen, Upload, FileSpreadsheet, QrCode, X
} from 'lucide-react';

export default function BookManager() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopiesOpen, setIsCopiesOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [activeBook, setActiveBook] = useState(null);

  // Bulk Import State
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    category_id: '',
    author_id: '',
    total_copies: 3,
    shelf_number: 'Shelf 1',
    rack_number: 'Rack A',
    row_number: 'Row 1',
    price: 29.99,
    description: '',
    cover_image: ''
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, aRes] = await Promise.all([
        api.get('/books?limit=150'),
        api.get('/categories'),
        api.get('/authors')
      ]);
      if (bRes.data.success) setBooks(bRes.data.books);
      if (cRes.data.success) setCategories(cRes.data.categories);
      if (aRes.data.success) setAuthors(aRes.data.authors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/books', formData);
      if (res.data.success) {
        setIsAddOpen(false);
        fetchBooks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create book.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/books/${activeBook.id}`, formData);
      if (res.data.success) {
        setIsEditOpen(false);
        fetchBooks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update book.');
    }
  };

  const openCopiesManager = async (book) => {
    try {
      const res = await api.get(`/books/${book.id}`);
      if (res.data.success) {
        setActiveBook(res.data.book);
        setIsCopiesOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCopyStatus = async (copyId, newStatus) => {
    try {
      const res = await api.put(`/books/copies/${copyId}`, { status: newStatus });
      if (res.data.success) {
        openCopiesManager(activeBook);
        fetchBooks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update copy.');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;

    setBulkUploading(true);
    setBulkResult(null);

    const data = new FormData();
    data.append('file', bulkFile);

    try {
      const res = await api.post('/books/bulk-import', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setBulkResult(res.data);
        fetchBooks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk import failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  const columns = [
    {
      header: 'Cover & Title',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=100&q=80'}
            alt={row.title}
            className="h-14 w-10 rounded-lg object-cover shadow-xs"
          />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{row.title}</p>
            <p className="text-[11px] text-slate-400">By {row.author?.name || 'Academic Author'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'ISBN',
      accessor: 'isbn',
      cellClassName: 'font-mono text-slate-600 dark:text-slate-400'
    },
    {
      header: 'Category',
      render: (row) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {row.category?.name || 'General'}
        </span>
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 text-indigo-500" /> {row.rack_number}, {row.shelf_number}
        </span>
      )
    },
    {
      header: 'Inventory Stock',
      render: (row) => (
        <div>
          <span className="font-black text-slate-900 dark:text-white">
            {row.available_copies} / {row.total_copies}
          </span>
          <span className="text-[10px] text-slate-400 block">Available / Total</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          status={row.available_copies > 0 ? 'available' : 'reserved'}
          text={row.available_copies > 0 ? 'In Stock' : 'Checked Out'}
          size="xs"
        />
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCopiesManager(row)}
            title="Manage Copies & Barcodes"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </button>
          <button
            onClick={() => {
              setActiveBook(row);
              setFormData({
                isbn: row.isbn,
                title: row.title,
                category_id: row.category_id || '',
                author_id: row.author_id || '',
                total_copies: row.total_copies,
                shelf_number: row.shelf_number,
                rack_number: row.rack_number,
                row_number: row.row_number,
                price: row.price,
                description: row.description || '',
                cover_image: row.cover_image || ''
              });
              setIsEditOpen(true);
            }}
            title="Edit Title"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Book Inventory & Physical Barcodes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catalog academic volumes, generate unique barcodes, and monitor condition of individual copies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBulkFile(null);
              setBulkResult(null);
              setIsBulkOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
          >
            <Upload className="h-4 w-4" /> Bulk Import (Excel/CSV)
          </button>
          <button
            onClick={() => {
              setFormData({
                isbn: `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                title: '',
                category_id: categories[0]?.id || '',
                author_id: authors[0]?.id || '',
                total_copies: 3,
                shelf_number: 'Shelf 1',
                rack_number: 'Rack A',
                row_number: 'Row 1',
                price: 39.99,
                description: '',
                cover_image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=400&q=80'
              });
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Catalog New Book
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={books}
        searchPlaceholder="Search catalog by title, author, or ISBN..."
        searchKey="title"
        isLoading={loading}
      />

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Import Books via Excel or CSV"
        subtitle="Upload a spreadsheet with Title, ISBN, Author, Category, and Total Copies columns"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose an .xlsx, .xls, or .csv file
              </p>
              <p className="text-[11px] text-slate-400 mt-1 mb-3">
                Expected columns: Title (required), ISBN (required), Author, Category, Total Copies
              </p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                required
                onChange={(e) => setBulkFile(e.target.files[0])}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={!bulkFile || bulkUploading}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bulkUploading ? 'Parsing & Importing Books...' : 'Start Bulk Import'}
            </button>
          </form>

          {bulkResult && (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Import Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Total Rows</span>
                  <span className="font-black text-slate-800 dark:text-white text-base">{bulkResult.summary?.totalRows || 0}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="block text-emerald-600 text-[10px] uppercase font-bold">Imported</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">{bulkResult.summary?.imported || 0}</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="block text-amber-600 text-[10px] uppercase font-bold">Duplicates</span>
                  <span className="font-black text-amber-700 dark:text-amber-300 text-base">{bulkResult.summary?.duplicates || 0}</span>
                </div>
              </div>

              {bulkResult.errors?.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 max-h-32 overflow-y-auto space-y-1">
                  <p className="font-bold">Row Errors / Skipped:</p>
                  {bulkResult.errors.map((err, i) => (
                    <p key={i}>• {err.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Book Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Catalog New Academic Book" subtitle="Adds title to database and auto-generates unique physical copy barcodes">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ISBN Code</label>
              <input
                type="text"
                required
                value={formData.isbn}
                onChange={(e) => setFormData(p => ({ ...p, isbn: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Modern Operating Systems"
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(p => ({ ...p, category_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Author</label>
              <select
                value={formData.author_id}
                onChange={(e) => setFormData(p => ({ ...p, author_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rack Number</label>
              <input
                type="text"
                value={formData.rack_number}
                onChange={(e) => setFormData(p => ({ ...p, rack_number: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shelf Number</label>
              <input
                type="text"
                value={formData.shelf_number}
                onChange={(e) => setFormData(p => ({ ...p, shelf_number: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Copies Count</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.total_copies}
                onChange={(e) => setFormData(p => ({ ...p, total_copies: parseInt(e.target.value) || 1 }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cover Image URL</label>
            <input
              type="url"
              value={formData.cover_image}
              onChange={(e) => setFormData(p => ({ ...p, cover_image: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 mt-2"
          >
            Create Book & Generate Barcodes
          </button>
        </form>
      </Modal>

      {/* Edit Book Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit: ${activeBook?.title || ''}`} subtitle="Update book metadata and location">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ISBN</label>
              <input
                type="text"
                required
                value={formData.isbn}
                onChange={(e) => setFormData(p => ({ ...p, isbn: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(p => ({ ...p, category_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Author</label>
              <select
                value={formData.author_id}
                onChange={(e) => setFormData(p => ({ ...p, author_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rack</label>
              <input
                type="text"
                value={formData.rack_number}
                onChange={(e) => setFormData(p => ({ ...p, rack_number: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shelf</label>
              <input
                type="text"
                value={formData.shelf_number}
                onChange={(e) => setFormData(p => ({ ...p, shelf_number: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 mt-2"
          >
            Save Changes
          </button>
        </form>
      </Modal>

      {/* Copies & Barcodes Sheet Modal */}
      <Modal
        isOpen={isCopiesOpen}
        onClose={() => setIsCopiesOpen(false)}
        title={`Inventory Copies: ${activeBook?.title || ''}`}
        subtitle="Manage physical copies condition, loss reporting, and printable barcode & QR identifiers"
        maxWidth="max-w-2xl"
      >
        {activeBook && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Total Physical Inventory: {activeBook.copies?.length || 0} Cop(ies)
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
              >
                <Printer className="h-3.5 w-3.5" /> Print Barcode Sheet
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(activeBook.copies || []).map((copy) => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(copy.barcode)}`;
                return (
                  <div
                    key={copy.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={qrUrl}
                        alt={copy.barcode}
                        className="h-14 w-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                      />
                      <div>
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                          {copy.barcode}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>Condition: <strong className="capitalize">{copy.condition}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge status={copy.status} text={copy.status} size="xs" />

                      <select
                        value={copy.status}
                        onChange={(e) => updateCopyStatus(copy.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="available">Available</option>
                        <option value="issued">Issued</option>
                        <option value="reserved">Reserved</option>
                        <option value="damaged">Damaged</option>
                        <option value="lost">Lost</option>
                        <option value="under_repair">Under Repair</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
