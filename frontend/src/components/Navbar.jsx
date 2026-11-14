import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Sun, Moon, Bell, LogOut, User as UserIcon, 
  GraduationCap, CheckCheck, Menu, ChevronDown, LayoutDashboard
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUrl';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    setShowUserDropdown(false);
    logout();
    navigate('/login');
  };

  const avatarUrl = getImageUrl(user?.profile_picture || user?.avatar, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80');

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      {/* Left: Mobile Toggle & School Identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Open Sidebar Menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Adarsh Senior Secondary School
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Garhi Bazidpur, Gurugram • Management Portal
            </p>
          </div>
        </Link>
      </div>

      {/* Center: Helpful School Portal Nav Links */}
      <div className="hidden md:flex items-center gap-1 text-xs">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/profile"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
          <UserIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>My Profile</span>
        </Link>
      </div>

      {/* Right Controls: Theme Toggle, Notifications, Authenticated User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark/Light Mode Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-700" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowUserDropdown(false);
            }}
            aria-label="View Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                    School Notices & Alerts
                  </h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No notices at this time.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`cursor-pointer rounded-xl p-3 text-xs transition-colors ${
                        n.is_read
                          ? 'bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/30 dark:hover:bg-slate-800/60'
                          : 'bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                            {n.type?.replace('_', ' ') || 'Notice'}
                          </span>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{n.title}</p>
                        </div>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0"></span>}
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                      <span className="mt-1.5 block text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-1.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              src={avatarUrl}
              alt={user?.name || 'Patron'}
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="hidden sm:block text-left text-xs leading-none pr-1">
              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                {user?.name || 'User'}
              </p>
              <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                {role}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in z-50">
              <div className="border-b border-slate-100 p-3 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                <span className="mt-1.5 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {user?.role} Portal
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> My Profile
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Dashboard
                </Link>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
