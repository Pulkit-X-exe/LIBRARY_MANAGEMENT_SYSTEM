import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import BookCover from '../../components/BookCover';
import { 
  Bookmark, Plus, FolderPlus, Trash2, Edit2, 
  BookOpen, Heart, ArrowRight, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function ReadingListsView() {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create List Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit List Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editListId, setEditListId] = useState(null);
  const [editListName, setEditListName] = useState('');
  const [editListDesc, setEditListDesc] = useState('');

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reading-lists');
      if (res.data.success) {
        const data = res.data.lists || [];
        setLists(data);
        if (data.length > 0 && !selectedList) {
          setSelectedList(data[0]);
        } else if (selectedList) {
          const updated = data.find(l => l.id === selectedList.id) || data[0] || null;
          setSelectedList(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load reading lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/reading-lists', {
        name: newListName,
        description: newListDesc
      });
      if (res.data.success) {
        showToast(`Reading list "${res.data.list.name}" created!`);
        setNewListName('');
        setNewListDesc('');
        setCreateModalOpen(false);
        fetchLists();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create list', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    if (!editListName.trim()) return;
    try {
      const res = await api.put(`/reading-lists/${editListId}`, {
        name: editListName,
        description: editListDesc
      });
      if (res.data.success) {
        showToast('Reading list updated successfully!');
        setEditModalOpen(false);
        fetchLists();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update list', 'error');
    }
  };

  const handleDeleteList = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the list "${name}"?`)) return;
    try {
      const res = await api.delete(`/reading-lists/${id}`);
      if (res.data.success) {
        showToast(`List "${name}" deleted.`, 'info');
        if (selectedList?.id === id) setSelectedList(null);
        fetchLists();
      }
    } catch (err) {
      showToast('Failed to delete list.', 'error');
    }
  };

  const handleRemoveBook = async (listId, bookId, bookTitle) => {
    try {
      const res = await api.delete(`/reading-lists/${listId}/books/${bookId}`);
      if (res.data.success) {
        showToast(`Removed "${bookTitle}" from this list.`, 'info');
        fetchLists();
      }
    } catch (err) {
      showToast('Failed to remove book.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold shadow-xl border animate-slide-up ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : toast.type === 'error'
            ? 'bg-rose-600 text-white border-rose-500'
            : 'bg-indigo-600 text-white border-indigo-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Personal Reading Lists
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create custom curated bookshelves (Exam Prep, To Read, Favorites, Computer Science)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <FolderPlus className="h-4 w-4" /> Create New List
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading your reading lists...</div>
      ) : lists.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <Bookmark className="h-10 w-10 text-indigo-500 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Custom Reading Lists Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Organize your library books into personal study shelves like "Exam Preparation", "Holiday Reads", or "Science Projects".
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Create Your First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols): Reading Lists Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Lists ({lists.length})</h3>
            <div className="space-y-2">
              {lists.map((list) => {
                const isSelected = selectedList?.id === list.id;
                const bookCount = (list.items || []).length;
                return (
                  <div
                    key={list.id}
                    onClick={() => setSelectedList(list)}
                    className={`group flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-xs dark:border-indigo-600 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <Bookmark className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        {list.name}
                      </h4>
                      {list.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {list.description}
                        </p>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        {bookCount} {bookCount === 1 ? 'book' : 'books'} saved
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditListId(list.id);
                          setEditListName(list.name);
                          setEditListDesc(list.description || '');
                          setEditModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Edit List"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id, list.name);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Delete List"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (8 cols): Selected List Books */}
          <div className="lg:col-span-8">
            {selectedList ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedList.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedList.description || 'Personal reading bookshelf'}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {(selectedList.items || []).length} Titles
                  </span>
                </div>

                <div className="mt-6">
                  {(!selectedList.items || selectedList.items.length === 0) ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No books have been added to this list yet. Browse the catalog to add books!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedList.items.map((item) => {
                        const book = item.book;
                        if (!book) return null;
                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-3">
                              <BookCover
                                src={book.cover_image}
                                title={book.title}
                                author={book.author?.name}
                                category={book.category?.name}
                                className="h-16 w-12 rounded-lg shadow-xs"
                              />
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{book.title}</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{book.author?.name}</p>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
                                  {book.available_copies} available
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBook(selectedList.id, book.id, book.title)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Remove from list"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Select a list to view its contents</div>
            )}
          </div>
        </div>
      )}

      {/* Create List Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Reading List"
        subtitle="Organize your curriculum or leisure reading into dedicated shelves"
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              List Name *
            </label>
            <input
              type="text"
              required
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g. CBSE 10th Boards, Physics Olympiad, To Read..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
              placeholder="Short description of this reading collection..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newListName.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              Create List
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit List Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Reading List"
      >
        <form onSubmit={handleUpdateList} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              List Name *
            </label>
            <input
              type="text"
              required
              value={editListName}
              onChange={(e) => setEditListName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={editListDesc}
              onChange={(e) => setEditListDesc(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

