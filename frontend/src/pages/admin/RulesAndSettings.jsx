import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Sliders, Building, CheckCircle2, Save, ShieldAlert } from 'lucide-react';

export default function RulesAndSettings() {
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/rules'),
        api.get('/settings')
      ]);
      if (rRes.data.success) setRules(rRes.data.rules);
      if (sRes.data.success) setSettings(sRes.data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRuleChange = (id, newVal) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, rule_value: newVal } : r));
  };

  const handleSaveRule = async (rule) => {
    setSaveStatus('');
    try {
      const res = await api.put(`/rules/${rule.id}`, { rule_value: rule.rule_value });
      if (res.data.success) {
        setSaveStatus(`Rule "${rule.rule_key}" updated successfully!`);
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (err) {
      alert('Failed to update rule');
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSaveStatus('');
    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSaveStatus('School and library settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Library Rules, Policies & System Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enforce database-driven loan allowances, fine rates, grace periods, and school institutional details
        </p>
      </div>

      {saveStatus && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {saveStatus}
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Live Circulation & Policy Rules (Database Driven)
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
              <div className="max-w-md">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {rule.rule_key}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {rule.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={rule.rule_value}
                  onChange={(e) => handleRuleChange(rule.id, e.target.value)}
                  className="w-28 rounded-xl border border-slate-200 bg-slate-50/60 p-2 text-center text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRule(rule)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Institutional Settings Form */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            School & Library Institutional Information
          </h3>
        </div>

        <form onSubmit={handleSettingsSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">School Name</label>
              <input
                type="text"
                value={settings.school_name || ''}
                onChange={(e) => setSettings(p => ({ ...p, school_name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Library Facility Name</label>
              <input
                type="text"
                value={settings.library_name || ''}
                onChange={(e) => setSettings(p => ({ ...p, library_name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Email</label>
              <input
                type="email"
                value={settings.school_email || ''}
                onChange={(e) => setSettings(p => ({ ...p, school_email: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="text"
                value={settings.school_phone || ''}
                onChange={(e) => setSettings(p => ({ ...p, school_phone: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Weekday Operating Hours</label>
              <input
                type="text"
                value={settings.opening_hours || ''}
                onChange={(e) => setSettings(p => ({ ...p, opening_hours: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Weekend Hours</label>
              <input
                type="text"
                value={settings.weekend_hours || ''}
                onChange={(e) => setSettings(p => ({ ...p, weekend_hours: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Campus Address</label>
            <input
              type="text"
              value={settings.school_address || ''}
              onChange={(e) => setSettings(p => ({ ...p, school_address: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" /> Save System Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
