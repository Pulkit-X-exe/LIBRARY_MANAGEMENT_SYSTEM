import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import { FileText, Download, Eye, BookOpen, GraduationCap, Sparkles } from 'lucide-react';

export default function DigitalLibraryView() {
  const [resources, setResources] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const url = selectedType ? `/digital?resource_type=${selectedType}` : '/digital';
      const res = await api.get(url);
      if (res.data.success) {
        setResources(res.data.resources);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedType]);

  const handleDownload = (id, title) => {
    window.open(`/api/digital/${id}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" /> Digital Academic Repository
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
            Academic E-Books & Examination Papers
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Access authorized digital course materials, previous year solved question papers, and high-yield department notes.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: 'All Resources', value: '' },
            { label: 'Solved Past Papers', value: 'question_paper' },
            { label: 'Department Notes', value: 'notes' },
            { label: 'Journals & Magazines', value: 'magazine' },
            { label: 'E-Books', value: 'ebook_pdf' }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSelectedType(item.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedType === item.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Digital Assets */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading digital resources...</div>
      ) : resources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2 dark:text-slate-700" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No resources found</h3>
          <p className="text-xs text-slate-400 mt-1">Check back later or change the category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {item.resource_type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {item.file_size}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {item.downloads_count} downloads
                </span>

                <button
                  type="button"
                  onClick={() => handleDownload(item.id, item.title)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Read / Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
