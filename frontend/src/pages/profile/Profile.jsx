import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Mail, Phone, GraduationCap, Briefcase, 
  Camera, Check, X, Edit3, Shield, AlertCircle, CheckCircle2
} from 'lucide-react';
import ImageCropModal from '../../components/ImageCropModal';
import { validateImageFile } from '../../utils/cropImage';

export default function Profile() {
  const { user, updateProfile, updateProfilePicture } = useAuth();
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    class_name: user?.student_profile?.class_name || '',
    section: user?.student_profile?.section || '',
    roll_number: user?.student_profile?.roll_number || '',
    department: user?.teacher_profile?.department || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Change Picture & Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);

  const studentProfile = user?.student_profile;
  const teacherProfile = user?.teacher_profile;
  const librarianProfile = user?.librarian_profile;

  // Handle Edit Profile Form Change
  const handleEditChange = (e) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Submit Profile Info Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });
    try {
      await updateProfile(editFormData);
      setIsEditing(false);
      setProfileMessage({ type: 'success', text: 'Profile details updated successfully.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Select File for Profile Picture and Open Crop Modal
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Clear the input value so selecting the same file again triggers onChange
    e.target.value = '';

    setProfileMessage({ type: '', text: '' });

    // Validate file type, size, and integrity
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setProfileMessage({ type: 'error', text: validation.error });
      return;
    }

    // Open modern crop modal
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
  };

  const handlePickNewFile = (newFile) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    const objectUrl = URL.createObjectURL(newFile);
    setCropImageSrc(objectUrl);
  };

  const handleCropModalClose = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc('');
    setCropModalOpen(false);
  };

  // Upload New Profile Picture (Called ONLY after user clicks "Save / Upload" in Crop Modal)
  const handleUploadSuccess = async (croppedFile) => {
    await updateProfilePicture(croppedFile);
    setToastMessage('Profile picture updated successfully.');
    setProfileMessage({ type: 'success', text: 'Profile picture updated successfully.' });
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  const currentAvatarUrl = user?.profile_picture || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80';

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-12">
      {/* School Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Profile Picture with Change Button */}
          <div className="relative group shrink-0">
            <img
              src={currentAvatarUrl}
              alt={user?.name}
              className="h-28 w-28 rounded-2xl object-cover ring-4 ring-indigo-50 dark:ring-slate-800 shadow-md"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Picture"
              className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* User Overview */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {user?.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adarsh Senior Secondary School • Garhi Bazidpur, Gurugram
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditFormData({
                        name: user?.name || '',
                        phone: user?.phone || '',
                        class_name: studentProfile?.class_name || '',
                        section: studentProfile?.section || '',
                        roll_number: studentProfile?.roll_number || '',
                        department: teacherProfile?.department || ''
                      });
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" /> Change Photo
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold capitalize text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50">
                <Shield className="h-3 w-3" /> {user?.role} Account
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                <Check className="h-3 w-3" /> Status: {user?.status || 'Active'}
              </span>
              {studentProfile?.class_name && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <GraduationCap className="h-3 w-3" /> {studentProfile.class_name} - {studentProfile.section || 'A'}
                </span>
              )}
              {teacherProfile?.department && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Briefcase className="h-3 w-3" /> {teacherProfile.department}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Notice / Feedback Alert */}
      {profileMessage.text && (
        <div className={`rounded-xl p-3.5 text-xs font-medium border flex items-center justify-between ${
          profileMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-300'
        }`}>
          <span>{profileMessage.text}</span>
          <button onClick={() => setProfileMessage({ type: '', text: '' })} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Details Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {!isEditing ? (
          /* View Mode */
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                Contact & Account Information
              </h2>
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <dt className="text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Full Name
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                    {user?.name}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <dt className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Official Email
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                    {user?.email}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <dt className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Contact Phone
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                    {user?.phone || 'Not provided'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <dt className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> System Role
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800 dark:text-white capitalize text-sm">
                    {user?.role}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Role Specific Section */}
            {user?.role === 'student' && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                  Student Academic Credentials
                </h2>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Standard / Class</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {studentProfile?.class_name || 'Class X'}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Section</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {studentProfile?.section || 'A'}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Roll Number</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {studentProfile?.roll_number || 'N/A'}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Admission No.</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {studentProfile?.admission_number || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {user?.role === 'teacher' && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                  Faculty Credentials
                </h2>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Academic Department</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {teacherProfile?.department || 'General Studies'}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Employee Identification</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {teacherProfile?.employee_id || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {(user?.role === 'admin' || user?.role === 'librarian') && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                  Staff & Administrative Authorization
                </h2>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Staff ID</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {librarianProfile?.employee_id || 'ADM-STAFF'}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <dt className="text-slate-400 font-medium">Access Rights</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-white text-sm">
                      {user?.role === 'admin' ? 'Full System Administrator' : 'Circulation & Catalog Officer'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        ) : (
          /* Edit Mode Form */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
              Edit Profile Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={editFormData.name}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditChange}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {user?.role === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Class / Grade</label>
                  <input
                    type="text"
                    name="class_name"
                    value={editFormData.class_name}
                    onChange={handleEditChange}
                    placeholder="Class XI"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Section</label>
                  <input
                    type="text"
                    name="section"
                    value={editFormData.section}
                    onChange={handleEditChange}
                    placeholder="A"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Roll Number</label>
                  <input
                    type="text"
                    name="roll_number"
                    value={editFormData.roll_number}
                    onChange={handleEditChange}
                    placeholder="101"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            {user?.role === 'teacher' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                <input
                  type="text"
                  name="department"
                  value={editFormData.department}
                  onChange={handleEditChange}
                  placeholder="e.g. Mathematics & Computer Science"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Hidden File Input for Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modern Profile Picture Crop & Preview Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={handleCropModalClose}
        onUploadSuccess={handleUploadSuccess}
        onPickNewFile={handlePickNewFile}
      />

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-600 px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage('')} 
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
