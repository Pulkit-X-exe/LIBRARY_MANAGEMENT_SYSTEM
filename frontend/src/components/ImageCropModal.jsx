import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { 
  ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw, 
  Check, X, Upload, Sparkles, Image as ImageIcon, Sliders, AlertCircle
} from 'lucide-react';
import { getCroppedImg, validateImageFile } from '../utils/cropImage';

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onUploadSuccess,
  onPickNewFile
}) {
  // Step 1: 'crop', Step 2: 'preview'
  const [step, setStep] = useState('crop');

  // Cropper settings
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropShape, setCropShape] = useState('round'); // 'round' or 'rect'
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Preview & Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedResult, setCroppedResult] = useState(null); // { file, previewUrl, blob }
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Reset all adjustments when a new image source is opened
  useEffect(() => {
    if (isOpen) {
      setStep('crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedResult(null);
      setErrorMessage('');
      setUploadLoading(false);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc]);

  // Handle keyboard Escape to cancel and close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !uploadLoading) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, uploadLoading]);

  const onCropComplete = useCallback((croppedArea, currentCroppedAreaPixels) => {
    setCroppedAreaPixels(currentCroppedAreaPixels);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(1, +(prev - 0.1).toFixed(2)));

  // Rotation controls (90-degree steps)
  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  // Reset to initial defaults
  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setErrorMessage('');
  };

  // Close and cleanup
  const handleCancel = () => {
    if (croppedResult?.previewUrl) {
      URL.revokeObjectURL(croppedResult.previewUrl);
    }
    setCroppedResult(null);
    onClose();
  };

  // Apply Crop: Generate 512x512 preview without uploading
  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      setErrorMessage('Unable to process this image. Missing crop coordinates.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, 512);
      setCroppedResult(result);
      setStep('preview');
    } catch (err) {
      console.error('Crop processing failed:', err);
      setErrorMessage(err.message || 'Unable to process this image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Server Upload: ONLY triggered when user clicks "Save / Upload"
  const handleConfirmUpload = async () => {
    if (!croppedResult?.file) {
      setErrorMessage('Please crop the image before uploading.');
      return;
    }

    setUploadLoading(true);
    setErrorMessage('');
    try {
      await onUploadSuccess(croppedResult.file);
      // Clean up object URL
      if (croppedResult?.previewUrl) {
        URL.revokeObjectURL(croppedResult.previewUrl);
      }
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Selecting another image from device while modal is open
  const handleLocalFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      return;
    }

    if (onPickNewFile) {
      onPickNewFile(file);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !uploadLoading && handleCancel()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
          <div>
            <h2 id="crop-modal-title" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {step === 'crop' ? 'Crop & Adjust Profile Picture' : 'Preview & Confirm Upload'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {step === 'crop' 
                ? 'Drag, zoom, and rotate to position your photo for a crisp 1:1 square avatar' 
                : 'Review your optimized 512 × 512 px profile photo before saving'}
            </p>
          </div>
          <button
            type="button"
            disabled={uploadLoading}
            onClick={handleCancel}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'crop' ? (
            /* STEP 1: INTERACTIVE CROPPER */
            <div className="space-y-4">
              {/* Cropper Viewport */}
              <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800 shadow-inner">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape={cropShape}
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Crop Shape & Presets */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 font-semibold text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => setCropShape('round')}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      cropShape === 'round'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Circle View
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropShape('rect')}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      cropShape === 'rect'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Square View
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset View
                </button>
              </div>

              {/* Zoom Slider & Buttons */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Zoom Level
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{zoom.toFixed(1)}x</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    aria-label="Zoom out"
                    title="Zoom Out"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>

                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    aria-label="Zoom adjustment slider"
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                  />

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    aria-label="Zoom in"
                    title="Zoom In"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Rotation & Select New File Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotateLeft}
                    title="Rotate 90 degrees counter-clockwise"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Rotate Left (-90°)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRotateRight}
                    title="Rotate 90 degrees clockwise"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Rotate Right (+90°)</span>
                  </button>
                </div>

                {/* Change selected image file */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Change Photo File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            /* STEP 2: CRISP 512x512 PREVIEW */
            <div className="space-y-6 py-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40">
                {/* Round Avatar Preview */}
                <div className="text-center space-y-2">
                  <div className="relative mx-auto">
                    <img
                      src={croppedResult?.previewUrl}
                      alt="Cropped Avatar Preview"
                      className="h-32 w-32 rounded-full object-cover ring-4 ring-indigo-500/20 shadow-xl"
                    />
                  </div>
                  <span className="inline-block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Circular Badge (Navbar/Sidebar)
                  </span>
                </div>

                {/* Square Card Preview */}
                <div className="text-center space-y-2">
                  <div className="relative mx-auto">
                    <img
                      src={croppedResult?.previewUrl}
                      alt="Cropped Square Preview"
                      className="h-32 w-32 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-xl"
                    />
                  </div>
                  <span className="inline-block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Square Profile Card
                  </span>
                </div>
              </div>

              {/* Optimization Specs */}
              <div className="flex flex-wrap items-center justify-between rounded-xl bg-indigo-50/80 px-4 py-3 text-xs font-semibold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Resolution: <strong>512 × 512 pixels</strong> (HQ compressed)</span>
                </div>
                <span className="text-[11px] opacity-80">
                  Approx. {croppedResult?.blob ? Math.round(croppedResult.blob.size / 1024) : 45} KB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                disabled={uploadLoading}
                onClick={() => setStep('crop')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                ← Adjust & Recrop
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={uploadLoading}
              onClick={handleCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            {step === 'crop' ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApplyCrop}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Apply Crop
                  </>
                )}
              </button>
            ) : (
              /* The actual server upload happens ONLY after the user clicks "Save / Upload" */
              <button
                type="button"
                disabled={uploadLoading}
                onClick={handleConfirmUpload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {uploadLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Save & Upload Picture
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

