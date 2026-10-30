import React, { useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';

const categoryColorMap = {
  'Fiction': 'from-blue-700 to-indigo-900',
  'Science': 'from-emerald-700 to-teal-900',
  'Mathematics': 'from-indigo-800 to-violet-950',
  'Computer Science': 'from-cyan-800 to-slate-900',
  'Literature': 'from-amber-800 to-amber-950',
  'History': 'from-amber-900 to-stone-900',
  'Geography': 'from-teal-800 to-emerald-950',
  'Biography': 'from-purple-800 to-slate-900',
  'Reference': 'from-slate-700 to-slate-900',
  'School Curriculum': 'from-blue-800 to-slate-900',
  'Competitive Exams': 'from-rose-800 to-slate-900',
  'General Knowledge': 'from-sky-700 to-indigo-950'
};

export default function BookCover({
  src,
  alt = 'Book Cover',
  title = '',
  author = '',
  category = '',
  className = '',
  aspectRatio = 'aspect-[2/3]',
  size = 'md'
}) {
  const [hasError, setHasError] = useState(false);

  // If valid external image and hasn't errored
  if (src && !hasError) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${aspectRatio} ${className}`}>
        <img
          src={src}
          alt={alt || title}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Subtle top edge gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none opacity-40 group-hover:opacity-20 transition-opacity" />
      </div>
    );
  }

  // Fallback: Elegant Academic Book Cover
  const gradientClass = categoryColorMap[category] || 'from-indigo-800 to-slate-900';

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br ${gradientClass} p-3.5 text-white shadow-sm border border-slate-700/30 ${aspectRatio} ${className}`}
    >
      {/* Spine effect */}
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10" />

      {/* Top Header */}
      <div className="pl-2">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-white/70 font-semibold">
          <span className="truncate max-w-[85px]">{category || 'Academic'}</span>
          <GraduationCap className="h-3 w-3 text-white/60" />
        </div>
        <div className="h-0.5 w-6 bg-amber-400/80 mt-1 rounded-full" />
      </div>

      {/* Center Title & Author */}
      <div className="pl-2 my-auto py-2">
        <h4 className="font-serif font-bold text-xs sm:text-sm leading-tight text-white line-clamp-3 drop-shadow-xs">
          {title || 'Book Title'}
        </h4>
        <p className="mt-1 text-[10px] text-white/80 line-clamp-1 italic font-sans">
          {author || 'Adarsh Library'}
        </p>
      </div>

      {/* Bottom Footer / Seal */}
      <div className="pl-2 pt-1 border-t border-white/15 flex items-center justify-between text-[8px] text-white/60">
        <span className="truncate">Adarsh Sr. Sec. School</span>
        <BookOpen className="h-2.5 w-2.5 opacity-70" />
      </div>
    </div>
  );
}
