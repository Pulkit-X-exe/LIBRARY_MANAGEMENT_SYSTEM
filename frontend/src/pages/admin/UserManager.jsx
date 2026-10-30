import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { Users, Plus, Edit, Trash2, Shield, UserCheck, CheckCircle2 } from 'lucide-react';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Password@123',
    role: 'student',
    phone: '',
    class_name: 'Grade 10',
    section: 'A',
    roll_number: '',
    department: 'General Studies'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = roleFilter ? `/users?role=${roleFilter}` : '/users';
      const res = await api.get(url);
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users', formData);
      if (res.data.success) {
        setIsAddOpen(false);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.put(`/users/${user.id}`, { status: newStatus });
      if (res.data.success) fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      const res = await api.delete(`/users/${id}`);
      if (res.data.success) fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const columns = [
    {
      header: 'User Account',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img
            src={r.profile_picture || r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
            alt={r.name}
            className="h-9 w-9 rounded-xl object-cover shadow-xs"
          />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
            <p className="text-[11px] text-slate-400">{r.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      render: (r) => (
        <span className="capitalize font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {r.role}
        </span>
      )
    },
    {
      header: 'Profile Particulars',
      render: (r) => (
        r.role === 'student' ? (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {r.student_profile?.class_name} • Sec {r.student_profile?.section} (Roll: {r.student_profile?.roll_number})
          </span>
        ) : r.role === 'teacher' ? (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Dept: {r.teacher_profile?.department}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Staff Administrator</span>
        )
      )
    },
    {
      header: 'Active Loans',
      render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.active_loans_count || 0} books</span>
    },
    {
      header: 'Pending Fines',
      render: (r) => (
        <span className={`font-bold ${r.total_pending_fine > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          ₹{r.total_pending_fine || 0}
        </span>
      )
    },
    {
      header: 'Status',
      render: (r) => <Badge status={r.status} text={r.status} size="xs" />
    },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleStatus(r)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            {r.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="p-1 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
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
            User Accounts & Role Permissions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage Students, Faculty, Librarians, and Administrators with account status controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="librarian">Librarians</option>
            <option value="admin">Administrators</option>
          </select>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search users by name, email, or roll number..."
        isLoading={loading}
      />

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create System Account" subtitle="Configures authentication credentials and specific role profile">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Eleanor Vance"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="user@school.edu"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Faculty</option>
                <option value="librarian">Librarian</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {formData.role === 'student' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class</label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData(p => ({ ...p, class_name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData(p => ({ ...p, section: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Roll No.</label>
                <input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData(p => ({ ...p, roll_number: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {formData.role === 'teacher' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 mt-2"
          >
            Create User Account
          </button>
        </form>
      </Modal>
    </div>
  );
}
