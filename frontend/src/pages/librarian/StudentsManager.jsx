import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  GraduationCap, ChevronRight, Search, ArrowLeft,
  Users, BookOpen, Clock, AlertCircle, Receipt,
  CheckCircle2, Printer, RefreshCw, Filter, ArrowUpDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentsManager() {
  // Navigation State
  // selectedClass: null | '9' | '10' | '11' | '12'
  // selectedSection: null | 'A' | 'B' | 'C' | 'D'
  // selectedStudentId: null | number
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Data States
  const [classesSummary, setClassesSummary] = useState([]);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Section Students State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('roll_number'); // 'roll_number' | 'name'
  const [sortOrder, setSortOrder] = useState('ASC');

  // Student Profile State
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // General Error / Notification State
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setErrorMessage('');
    try {
      const res = await api.get('/students/classes-summary');
      if (res.data && res.data.success) {
        setClassesSummary(res.data.classes || []);
        setSummaryTotal(res.data.total_students || 0);
      }
    } catch (err) {
      console.error('Failed to load class summary:', err);
      setErrorMessage('Unable to load student distribution. Please verify your connection.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSectionStudents = async (cls, sec) => {
    setLoadingStudents(true);
    setErrorMessage('');
    try {
      const res = await api.get(`/students/class/${cls}/section/${sec}`);
      if (res.data && res.data.success) {
        setStudents(res.data.students || []);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to load section students:', err);
      setErrorMessage(`Unable to load students for Class ${cls} - Section ${sec}.`);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentLibraryProfile = async (id) => {
    setLoadingProfile(true);
    setErrorMessage('');
    try {
      const res = await api.get(`/students/${id}/library`);
      if (res.data && res.data.success) {
        setStudentProfile(res.data);
      } else {
        setErrorMessage(res.data?.message || 'Student not found.');
      }
    } catch (err) {
      console.error('Failed to load student profile:', err);
      setErrorMessage('Unable to load student information. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // 1. Fetch Class & Section Summary on mount
  useEffect(() => {
    fetchSummary();
  }, []);

  // 2. Fetch Students when Class & Section are selected
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchSectionStudents(selectedClass, selectedSection);
    } else {
      setStudents([]);
      setSearchQuery('');
    }
  }, [selectedClass, selectedSection]);

  // 3. Fetch Full Student Library Profile when a student is selected
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentLibraryProfile(selectedStudentId);
    } else {
      setStudentProfile(null);
    }
  }, [selectedStudentId]);

  // Handle Breadcrumb Clicks
  const handleNavToClasses = () => {
    setSelectedClass(null);
    setSelectedSection(null);
    setSelectedStudentId(null);
    setErrorMessage('');
  };

  const handleNavToSections = () => {
    setSelectedSection(null);
    setSelectedStudentId(null);
    setErrorMessage('');
  };

  const handleNavToStudentList = () => {
    setSelectedStudentId(null);
    setErrorMessage('');
  };

  // Filter & Sort Section Students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.roll_number && String(s.roll_number).toLowerCase().includes(q)) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(q)) ||
        (s.library_card_number && s.library_card_number.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'roll_number') {
        const numA = parseInt(a.roll_number, 10);
        const numB = parseInt(b.roll_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === 'ASC' ? numA - numB : numB - numA;
        }
        return sortOrder === 'ASC'
          ? String(a.roll_number).localeCompare(String(b.roll_number))
          : String(b.roll_number).localeCompare(String(a.roll_number));
      } else if (sortBy === 'name') {
        return sortOrder === 'ASC'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

    return result;
  }, [students, searchQuery, sortBy, sortOrder]);

  // Current active class data helper
  const currentClassInfo = classesSummary.find(
    c => String(c.class_number) === String(selectedClass)
  );

  return (
    <div className="space-y-6">
      {/* School Header & Context Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <GraduationCap className="h-4 w-4" />
              <span>Adarsh Senior Secondary School • Garhi Bazidpur, Gurugram</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Students Management
            </h1>
            <p className="mt-1 text-xs text-blue-100 max-w-2xl">
              Manage student records, section allocations, digital library ID cards, active borrowings, and fines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs border border-white/15">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-200">Total Enrolled</span>
              <span className="text-xl font-extrabold text-white">{summaryTotal || 512}</span>
            </div>
            <button
              onClick={() => {
                if (selectedStudentId) fetchStudentLibraryProfile(selectedStudentId);
                else if (selectedClass && selectedSection) fetchSectionStudents(selectedClass, selectedSection);
                else fetchSummary();
              }}
              title="Refresh Records"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/15"
            >
              <RefreshCw className={`h-4 w-4 ${(loadingSummary || loadingStudents || loadingProfile) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <button
          onClick={handleNavToClasses}
          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 ${!selectedClass ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Students</span>
        </button>

        {selectedClass && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={handleNavToSections}
              className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${!selectedSection ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
            >
              Class {selectedClass}
            </button>
          </>
        )}

        {selectedSection && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={handleNavToStudentList}
              className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${!selectedStudentId ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
            >
              Section {selectedSection}
            </button>
          </>
        )}

        {selectedStudentId && studentProfile?.student && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-blue-700 dark:text-blue-300 font-bold truncate max-w-xs">
              {studentProfile.student.name}
            </span>
          </>
        )}
      </nav>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: CLASS SELECTION (Class 9, 10, 11, 12)                           */}
      {/* ========================================================================= */}
      {!selectedClass && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Select Academic Class
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a grade level to inspect sections and student cohorts
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              4 Classes • 16 Active Sections
            </span>
          </div>

          {loadingSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[9, 10, 11, 12].map(num => (
                <div key={num} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {['9', '10', '11', '12'].map((clsNum) => {
                const info = classesSummary.find(c => String(c.class_number) === clsNum) || {
                  total_students: 0,
                  sections: { A: 0, B: 0, C: 0, D: 0 }
                };

                return (
                  <button
                    key={clsNum}
                    onClick={() => {
                      setSelectedClass(clsNum);
                      setSelectedSection(null);
                      setSelectedStudentId(null);
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-600 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {clsNum}
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {info.total_students} Students
                      </span>
                    </div>

                    {/* Middle info */}
                    <div className="my-5">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Class {clsNum}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Senior Secondary Curriculum
                      </p>
                    </div>

                    {/* Section pills mini preview */}
                    <div className="border-t border-slate-100 pt-4 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Sections:</span>
                        <div className="flex gap-1.5">
                          {['A', 'B', 'C', 'D'].map(sec => (
                            <span key={sec} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {sec}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                        <span>Open Section Selection</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: SECTION SELECTION (A, B, C, D for chosen class)                 */}
      {/* ========================================================================= */}
      {selectedClass && !selectedSection && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleNavToClasses}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Back to Classes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Class {selectedClass} • Select Section
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an academic section to view enrolled student profiles and library records
                </p>
              </div>
            </div>

            <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              {currentClassInfo?.total_students || 0} Total in Class {selectedClass}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {['A', 'B', 'C', 'D'].map(sec => {
              const secCount = currentClassInfo?.sections?.[sec] ?? 32;
              return (
                <button
                  key={sec}
                  onClick={() => {
                    setSelectedSection(sec);
                    setSelectedStudentId(null);
                  }}
                  className="group flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-600 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 font-black text-2xl text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors dark:bg-indigo-950/60 dark:text-indigo-300">
                      {sec}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {secCount} Students
                    </span>
                  </div>

                  <div className="my-5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Class {selectedClass} - Section {sec}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Enrolled Batch {selectedClass}{sec}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>View Student List</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 3: SECTION STUDENT LIST (Class X - Section Y)                      */}
      {/* ========================================================================= */}
      {selectedClass && selectedSection && !selectedStudentId && (
        <div className="space-y-5">
          {/* Section Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleNavToSections}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Back to Sections"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Class {selectedClass} - Section {selectedSection}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {students.length} Students enrolled in this section
                </p>
              </div>
            </div>

            {/* Quick Section Switcher Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 px-2">Section:</span>
              {['A', 'B', 'C', 'D'].map(sec => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`h-8 w-8 rounded-lg text-xs font-black transition-colors ${
                    selectedSection === sec
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Name, Student ID, Roll No, Admission No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-bold text-blue-600 dark:text-blue-400 focus:outline-hidden"
                >
                  <option value="roll_number">Roll No</option>
                  <option value="name">Student Name</option>
                </select>
              </div>

              <button
                onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Toggle Sort Order"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <span>{sortOrder === 'ASC' ? 'Asc' : 'Desc'}</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
                <p className="text-xs font-semibold">Loading students of Class {selectedClass}-{selectedSection}...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No students found in Class {selectedClass} - Section {selectedSection}.
                </p>
                {searchQuery && (
                  <p className="mt-1 text-xs text-slate-400">
                    No results match "{searchQuery}". Try a different keyword or clear search.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4 text-center w-16">Roll No</th>
                      <th className="py-3.5 px-4">Student ID</th>
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4 text-center">Class</th>
                      <th className="py-3.5 px-4 text-center">Section</th>
                      <th className="py-3.5 px-4">Library Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredStudents.map((stu) => {
                      const rollDisplay = String(stu.roll_number || '0').padStart(2, '0');
                      const avatarSrc = stu.profile_picture || stu.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80';

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      );

                      if (stu.total_pending_fine > 0) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                            <Receipt className="h-3 w-3" /> ₹{stu.total_pending_fine} Fine
                          </span>
                        );
                      } else if (stu.active_loans_count > 0) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                            <BookOpen className="h-3 w-3" /> {stu.active_loans_count} Issued
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={stu.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {rollDisplay}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {stu.student_id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={avatarSrc}
                                alt={stu.name}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block hover:text-blue-600">
                                  {stu.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {stu.admission_number || stu.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {selectedClass}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {selectedSection}
                          </td>
                          <td className="py-3.5 px-4">
                            {statusBadge}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudentId(stu.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 font-bold transition-colors shadow-2xs"
                            >
                              <span>View</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 4: STUDENT COMPLETE LIBRARY PROFILE                                 */}
      {/* ========================================================================= */}
      {selectedStudentId && (
        <div className="space-y-6">
          {/* Top Bar with Back Control */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              onClick={handleNavToStudentList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Class {selectedClass}-{selectedSection}</span>
            </button>

            <span className="text-xs font-bold text-slate-500">
              Student ID: {studentProfile?.student?.student_id || 'STU-ID'}
            </span>
          </div>

          {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
              <p className="text-xs font-semibold">Loading student profile and library records...</p>
            </div>
          ) : !studentProfile ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
              <p className="text-sm font-bold">Student record could not be loaded.</p>
            </div>
          ) : (
            <>
              {/* 1. Student Academic Profile Banner */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <img
                      src={studentProfile.student.profile_picture || studentProfile.student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                      alt={studentProfile.student.name}
                      className="h-20 w-20 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                          {studentProfile.student.name}
                        </h2>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {studentProfile.student.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        Class {studentProfile.student.class?.replace(/^class\s+/i, '') || selectedClass} • Section {studentProfile.student.section || selectedSection} • Roll #{studentProfile.student.roll_number}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <span><strong>Student ID:</strong> <span className="font-mono">{studentProfile.student.student_id}</span></span>
                        <span><strong>Admission No:</strong> <span className="font-mono">{studentProfile.student.admission_number || 'N/A'}</span></span>
                        <span><strong>Email:</strong> {studentProfile.student.email}</span>
                        <span><strong>Phone:</strong> {studentProfile.student.phone || '+91 98123 45678'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Library Card No</span>
                    <span className="font-mono text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 mt-1">
                      {studentProfile.student.library_card_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Library Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Books Currently Issued</span>
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {studentProfile.library_summary?.currently_issued ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Active loans in circulation</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Books</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                    {studentProfile.library_summary?.overdue_books ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Exceeded return date</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Total Books Borrowed</span>
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {studentProfile.library_summary?.total_borrowed ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cumulative borrowing record</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Fine</span>
                    <Receipt className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
                    ₹{studentProfile.library_summary?.outstanding_fine ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Unpaid overdue dues</p>
                </div>
              </div>

              {/* 3. Digital Library Card & Fine Summary in 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Digital Library Card (Left Column) */}
                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-blue-800/40 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950 text-xs shadow-xs">
                          AS
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black tracking-wide uppercase text-white">Adarsh Senior Secondary School</h4>
                          <p className="text-[9px] text-blue-200 font-semibold tracking-wider uppercase">Garhi Bazidpur, Gurugram</p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-300 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </div>

                    <div className="mt-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-blue-300/80">
                      Digital Library Card
                    </div>

                    {/* Student Info & Photo */}
                    <div className="mt-4 flex flex-col items-center text-center">
                      <img
                        src={studentProfile.student.profile_picture || studentProfile.student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                        alt={studentProfile.student.name}
                        className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-400/40 shadow-sm"
                      />
                      <h3 className="mt-2 text-base font-black tracking-tight text-white">
                        {studentProfile.student.name}
                      </h3>
                      <p className="text-[11px] text-blue-200 font-semibold">
                        Student ID: <span className="font-mono">{studentProfile.student.student_id}</span>
                      </p>
                      <p className="text-[10px] text-blue-300">
                        Class {studentProfile.student.class?.replace(/^class\s+/i, '') || selectedClass}-{studentProfile.student.section || selectedSection} • Roll No: {studentProfile.student.roll_number}
                      </p>

                      {/* QR Barcode */}
                      <div className="mt-4 rounded-xl bg-white p-3 shadow-md">
                        <QRCodeSVG
                          value={JSON.stringify({
                            school: 'Adarsh Senior Secondary School',
                            student_id: studentProfile.student.student_id,
                            name: studentProfile.student.name,
                            card_number: studentProfile.student.library_card_number,
                            class: studentProfile.student.class,
                            section: studentProfile.student.section
                          })}
                          size={110}
                          level="M"
                        />
                        <p className="mt-1 font-mono text-[11px] font-black text-slate-900">
                          {studentProfile.student.library_card_number}
                        </p>
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white transition-colors border border-white/20"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Library Card</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fine Information Card (Right Column) */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 h-full flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-rose-600" />
                          Fine Information
                        </h3>
                        <p className="text-xs text-slate-400">Disciplinary and overdue fine ledger</p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Paid</span>
                          <span className="font-bold text-emerald-600">₹{studentProfile.fine_information?.total_paid || 0}</span>
                        </div>
                        <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-3">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Outstanding</span>
                          <span className="font-extrabold text-rose-600">₹{studentProfile.fine_information?.outstanding_fine || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex-1">
                      {studentProfile.fine_information?.history?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                          <p className="text-xs font-semibold">No fine records. Account is in good standing.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                <th className="py-2">Reason</th>
                                <th className="py-2">Resource</th>
                                <th className="py-2 text-right">Amount</th>
                                <th className="py-2">Date</th>
                                <th className="py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {studentProfile.fine_information.history.map((fine, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{fine.reason}</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-400 truncate max-w-xs">{fine.book_title}</td>
                                  <td className="py-2.5 text-right font-bold text-rose-600">₹{fine.amount}</td>
                                  <td className="py-2.5 text-slate-500">{new Date(fine.date).toLocaleDateString()}</td>
                                  <td className="py-2.5 text-right">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      fine.status === 'Paid'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    }`}>
                                      {fine.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Currently Issued Books */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Currently Issued Books
                    </h3>
                    <p className="text-xs text-slate-400">Books currently in student's physical custody</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {studentProfile.currently_issued_books?.length || 0} Books Active
                  </span>
                </div>

                <div className="mt-4">
                  {(!studentProfile.currently_issued_books || studentProfile.currently_issued_books.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No books currently issued.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 text-[10px] font-black uppercase text-slate-500">
                            <th className="py-2.5 px-3">Book Title</th>
                            <th className="py-2.5 px-3">Author</th>
                            <th className="py-2.5 px-3">Issue Date</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {studentProfile.currently_issued_books.map((b, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                {b.title}
                                {b.copy_barcode && (
                                  <span className="block font-mono text-[10px] text-slate-400">{b.copy_barcode}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{b.author}</td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {b.issue_date ? new Date(b.issue_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {b.due_date ? new Date(b.due_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'Overdue'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Past Book History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      Book History
                    </h3>
                    <p className="text-xs text-slate-400">Previously borrowed and successfully returned library resources</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {studentProfile.past_book_history?.length || 0} Returned Records
                  </span>
                </div>

                <div className="mt-4">
                  {(!studentProfile.past_book_history || studentProfile.past_book_history.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No previous book records.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 text-[10px] font-black uppercase text-slate-500">
                            <th className="py-2.5 px-3">Book Title</th>
                            <th className="py-2.5 px-3">Author</th>
                            <th className="py-2.5 px-3">Issued Date</th>
                            <th className="py-2.5 px-3">Returned Date</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {studentProfile.past_book_history.map((h, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{h.title}</td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{h.author}</td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {h.issue_date ? new Date(h.issue_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {h.return_date ? new Date(h.return_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {h.status || 'Returned'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
