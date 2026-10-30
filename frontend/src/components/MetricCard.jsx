import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) {
  const colorMap = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:to-transparent',
      border: 'border-indigo-100 dark:border-indigo-900/40',
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-transparent',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-transparent',
      border: 'border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-transparent',
      border: 'border-rose-100 dark:border-rose-900/40',
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-transparent',
      border: 'border-purple-100 dark:border-purple-900/40',
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-transparent',
      border: 'border-blue-100 dark:border-blue-900/40',
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-white dark:bg-slate-900/90 ${scheme.border} ${scheme.bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${scheme.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
