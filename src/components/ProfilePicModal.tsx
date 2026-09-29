import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Trash2, 
  Check, 
  Sparkles, 
  User as UserIcon, 
  Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { savePermanentPhoto } from '../utils/photoStorage';

interface ProfilePicModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPic?: string;
  empName: string;
  onSavePic: (newPicUrl: string) => void;
  triggerToast?: (title: string, msg?: string, isError?: boolean) => void;
}

// Preset avatars for photobooth staff
const PRESET_AVATARS = [
  { id: 'av1', label: 'Photobooth Pro', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Sales Specialist', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Creative Lead', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Store Manager', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Studio Host', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Senior Agent', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
];

export default function ProfilePicModal({
  isOpen,
  onClose,
  currentPic,
  empName,
  onSavePic,
  triggerToast,
}: ProfilePicModalProps) {
  const [selectedPic, setSelectedPic] = useState<string>(currentPic || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and resize image to lightweight Data URL (240x240 JPEG)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (triggerToast) triggerToast('Invalid File', 'Please select an image file (JPG, PNG, WEBP).', true);
      return;
    }

    // Check size limit (max 10MB input before compression)
    if (file.size > 10 * 1024 * 1024) {
      if (triggerToast) triggerToast('File Too Large', 'Please choose an image under 10MB.', true);
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 240; // 240x240 for high quality crisp avatar
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Calculate aspect ratio fill cropping
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        // Convert to lightweight compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedPic(compressedDataUrl);
        setIsProcessing(false);
        if (triggerToast) triggerToast('Photo Processed', 'Ready to save profile picture.');
      };

      img.onerror = () => {
        setIsProcessing(false);
        if (triggerToast) triggerToast('Image Error', 'Failed to load selected image.', true);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleApply = async () => {
    onSavePic(selectedPic);
    if (selectedPic) {
      const photoKey = empName ? `emp_profile_${empName.trim().replace(/\s+/g, '_')}` : 'emp_profile_active';
      await savePermanentPhoto(photoKey, selectedPic, 'avatar');
      await savePermanentPhoto('emp_profile_active', selectedPic, 'avatar');
    }
    if (triggerToast) triggerToast('Profile Picture Updated', 'Photo permanently saved to device storage.');
    onClose();
  };

  const handleClearPic = async () => {
    setSelectedPic('');
    const photoKey = empName ? `emp_profile_${empName.trim().replace(/\s+/g, '_')}` : 'emp_profile_active';
    await savePermanentPhoto(photoKey, '', 'avatar');
    await savePermanentPhoto('emp_profile_active', '', 'avatar');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/35 dark:border-white/15 overflow-hidden"
          >
          {/* Top Specular Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-20" />
          {/* Modal Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Employee Profile Picture</h3>
                <p className="text-xs text-indigo-100 font-medium opacity-90">
                  Upload custom photo or select a preset avatar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Live Preview Area */}
            <div className="flex flex-col items-center justify-center gap-3 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="relative group">
                {selectedPic ? (
                  <img
                    src={selectedPic}
                    alt={empName || 'Employee Profile'}
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-indigo-500/30 shadow-xl"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-4xl shadow-xl border-4 border-white/20">
                    {empName ? empName.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                  </div>
                )}

                {selectedPic && (
                  <button
                    onClick={handleClearPic}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-700 transition cursor-pointer"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-center">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {empName || 'Employee Name'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedPic ? 'Custom Profile Photo Active' : 'Default Monogram Initial'}
                </p>
              </div>
            </div>

            {/* Custom Upload Trigger */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Upload Custom Image
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-xl flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {isProcessing ? 'Processing Image...' : 'Choose Photo from Device (JPG / PNG)'}
              </button>
            </div>

            {/* Preset Avatars Selection */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Or Select Preset Photobooth Avatar
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedPic === av.url;
                  return (
                    <button
                      key={av.id}
                      onClick={() => setSelectedPic(av.url)}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/50'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                        {av.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 p-0.5 bg-indigo-600 text-white rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save Profile Photo
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
  );
}
