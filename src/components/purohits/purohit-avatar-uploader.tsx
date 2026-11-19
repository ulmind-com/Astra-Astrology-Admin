"use client";

import { CheckCircle2, Flame, Loader2, Trash2, UploadCloud, User } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { adminPurohitApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

interface PurohitAvatarUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  name?: string;
  disabled?: boolean;
}

export function PurohitAvatarUploader({
  value,
  onChange,
  name = "Purohit",
  disabled = false,
}: PurohitAvatarUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, or WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading and compressing avatar to Cloudinary...");

    try {
      // Pass previous value so the backend can immediately destroy the replaced asset in Cloudinary
      const res = await adminPurohitApi.uploadAvatar(file, value || undefined);
      if (res?.data?.url) {
        onChange(res.data.url);
        toast.success("Avatar uploaded and converted to WebP successfully!", { id: toastId });
      } else {
        toast.error("Upload did not return a valid image URL.", { id: toastId });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload avatar to Cloudinary.";
      toast.error(msg, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    // If it's stored on Cloudinary, purge the asset immediately
    if (value.includes("cloudinary.com")) {
      const toastId = toast.loading("Removing image from Cloudinary...");
      try {
        await adminPurohitApi.deleteAvatar(value);
        toast.success("Image removed from cloud storage.", { id: toastId });
      } catch {
        toast.dismiss(toastId);
      }
    }

    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
          <Flame className="size-3.5 text-amber-600" />
          <span>Purohit Profile Avatar (Sacred Photo)</span>
        </label>
        {value && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            Optimized on Cloudinary
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 ${
          isDragging
            ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
            : "border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/40 hover:border-amber-400 dark:hover:border-amber-600"
        }`}
      >
        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />

        {/* Circular Avatar Preview */}
        <div className="relative size-24 rounded-full overflow-hidden shrink-0 border-2 border-amber-500/40 shadow-md bg-stone-100 dark:bg-stone-800">
          {value ? (
            <Image
              src={value}
              alt={name || "Purohit Avatar"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="size-full flex flex-col items-center justify-center text-stone-400 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-stone-900 dark:to-stone-800">
              <User className="size-9 text-amber-700/60 dark:text-amber-400/60" />
              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mt-0.5">
                No Photo
              </span>
            </div>
          )}

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <Loader2 className="size-6 animate-spin text-amber-400" />
              <span className="text-[9px] font-bold mt-1">Uploading...</span>
            </div>
          )}
        </div>

        {/* Upload Controls & Instructions */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-white">
              {value ? "Update Profile Photo" : "Upload Vedic Purohit Avatar"}
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mt-0.5">
              Click below to choose or drag and drop an image. Photos are automatically compressed to
              lightweight WebP format (800×800) and securely hosted on Cloudinary.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold bg-white dark:bg-stone-900 hover:bg-amber-50 hover:text-amber-700 border-stone-300 dark:border-stone-700 hover:border-amber-300"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Compressing...
                </>
              ) : (
                <>
                  <UploadCloud className="size-3.5 mr-1.5 text-amber-600" />
                  {value ? "Change Avatar Image" : "Select Image to Upload"}
                </>
              )}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isUploading}
                onClick={handleRemove}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="size-3.5 mr-1" />
                Remove Photo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
