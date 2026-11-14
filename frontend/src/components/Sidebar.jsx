import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import {
  LayoutDashboard, BookOpen, Clock, Bookmark, Heart,
  Receipt, FileText, QrCode, ArrowLeftRight, Users,
  FolderTree, Sliders, BarChart3, History, Database,
  Megaphone, AlertTriangle, GraduationCap, BookCheck, UserX, User as UserIcon, BookMarked
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { role, user } = useAuth();

  const studentLinks = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserIcon },
    { name: 'Digital Library', path: '/student/books', icon: BookOpen },
    { name: 'My Loans & Due Dates', path: '/student/loans', icon: Clock },
    { name: 'My Book Requests', path: '/student/reservations', icon: Bookmark },
    { name: 'Personal Reading Lists', path: '/student/reading-lists', icon: BookMarked },
    { name: 'My Wishlist', path: '/student/wishlist', icon: Heart },
    { name: 'Fines & Payments', path: '/student/fines', icon: Receipt },
    { name: 'E-Resources & Notes', path: '/student/digital', icon: FileText },
    { name: 'Digital ID Card', path: '/student/card', icon: QrCode }
  ];

  const teacherLinks = [
    { name: 'Faculty Dashboard', path: '/teacher', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserIcon },
    { name: 'Academic Catalog', path: '/teacher/books', icon: BookOpen },
    { name: 'My Borrowings', path: '/teacher/loans', icon: Clock },
    { name: 'Book Requests', path: '/teacher/reservations', icon: Bookmark },
    { name: 'Research & Papers', path: '/teacher/digital', icon: FileText }
  ];

  const librarianLinks = [
    { name: 'Dashboard', path: '/librarian', icon: LayoutDashboard },
    { name: 'Students', path: '/librarian/students', icon: GraduationCap },
    { name: 'Books Catalogue', path: '/librarian/books', icon: BookOpen },
    { name: 'Book Requests', path: '/librarian/reservations', icon: Bookmark },
    { name: 'Issued Books', path: '/librarian/issued-books', icon: BookCheck },
    { name: 'Defaulters', path: '/librarian/defaulters', icon: UserX },
    { name: 'Fines', path: '/librarian/fines', icon: Receipt },
    { name: 'Notices', path: '/librarian/announcements', icon: Megaphone },
    { name: 'Circulation Terminal', path: '/librarian/circulation', icon: ArrowLeftRight },
    { name: 'Lost / Damaged', path: '/librarian/inventory-health', icon: AlertTriangle },
    { name: 'Circulation Reports', path: '/librarian/reports', icon: BarChart3 },
    { name: 'Profile', path: '/profile', icon: UserIcon }
  ];

  const adminLinks = [
    { name: 'Admin Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Admin Profile', path: '/profile', icon: UserIcon },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Master Catalog', path: '/admin/catalog', icon: FolderTree },
    { name: 'Circulation Monitor', path: '/admin/circulation', icon: ArrowLeftRight },
    { name: 'Fine Audits', path: '/admin/fines', icon: Receipt },
    { name: 'Rules & Policies', path: '/admin/rules', icon: Sliders },
    { name: 'Analytics & Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'System Activity Logs', path: '/admin/activity-logs', icon: History },
    { name: 'Database Backup', path: '/admin/backup', icon: Database }
  ];

  let links = studentLinks;
  if (role === 'admin') links = adminLinks;
  else if (role === 'librarian') links = librarianLinks;
  else if (role === 'teacher') links = teacherLinks;

  const avatarUrl = getImageUrl(user?.profile_picture || user?.avatar, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Profile Card Summary */}
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <NavLink
            to="/profile"
            onClick={() => onClose()}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              src={avatarUrl}
              alt={user?.name}
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-blue-500/20 shadow-xs"
            />
            <div className="overflow-hidden">
              <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {user?.name || 'Academic Patron'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  {role} Portal
                </span>
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/student' || link.path === '/teacher' || link.path === '/librarian' || link.path === '/admin' || link.path === '/profile'}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs dark:bg-blue-600 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <p className="font-bold text-slate-700 dark:text-slate-300">Adarsh Senior Secondary School</p>
          <p className="text-[10px] mt-0.5">Garhi Bazidpur, Gurugram</p>
        </div>
      </aside>
    </>
  );
}
