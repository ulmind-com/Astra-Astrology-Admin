"use client";

import { Check, ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { shopAdminApi } from "@/lib/api";

interface ProductImageUploaderProps {
  images: string[];
  featuredImage: string;
  onChange: (images: string[], featuredImage: string) => void;
  maxImages?: number;
}

export function ProductImageUploader({
  images,
  featuredImage,
  onChange,
  maxImages = 6,
}: ProductImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Please upload image files (JPG, PNG, WebP).");
      return;
    }

    if (images.length + validFiles.length > maxImages) {
      toast.error(`You can upload up to ${maxImages} images per product.`);
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Compressing to WebP & uploading to cloud...");

    try {
      const uploadedUrls: string[] = [];
      for (const file of validFiles) {
        const res = await shopAdminApi.uploadImage(file);
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const newImages = [...images, ...uploadedUrls];
        const newFeatured = featuredImage || newImages[0];
        onChange(newImages, newFeatured);
        toast.success(
          `Successfully uploaded and compressed ${uploadedUrls.length} image(s) to WebP format.`,
          { id: toastId }
        );
      } else {
        toast.error("Upload failed.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    const updatedImages = images.filter((url) => url !== urlToRemove);
    let updatedFeatured = featuredImage;
    if (featuredImage === urlToRemove) {
      updatedFeatured = updatedImages[0] || "";
    }
    onChange(updatedImages, updatedFeatured);
  };

  const handleSetFeatured = (url: string) => {
    onChange(images, url);
    toast.success("Primary featured thumbnail updated.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">Product Images & Gallery</h4>
          <p className="text-xs text-slate-500">
            Auto-converted to high-efficiency WebP (1200x1200 max) to conserve Cloudinary quota and customer bandwidth.
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {images.length} / {maxImages} Uploaded
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-amber-500 bg-amber-50/60"
            : "border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/20"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleUploadFiles(e.target.files);
              e.target.value = ""; // reset
            }
          }}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 text-amber-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-700">Compressing & optimizing WebP...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2">
            <div className="size-11 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
              <UploadCloud className="size-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Click to upload or drag & drop product photos
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PNG, JPG, WebP up to 10MB • Auto-resized & converted to lightweight WebP
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((url, idx) => {
            const isFeatured = url === featuredImage;
            return (
              <div
                key={url + idx}
                className={`relative group rounded-xl overflow-hidden border transition-all ${
                  isFeatured
                    ? "border-amber-500 ring-2 ring-amber-400/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="aspect-square relative w-full bg-slate-100">
                  <Image
                    src={url}
                    alt={`Product image ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Badges & Actions Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                  {!isFeatured && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetFeatured(url);
                      }}
                      title="Set as Main Thumbnail"
                      className="size-7 rounded-lg bg-white/90 text-slate-700 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Star className="size-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(url);
                    }}
                    title="Remove Image"
                    className="size-7 rounded-lg bg-white/90 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {isFeatured && (
                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                    <Check className="size-2.5 stroke-[3]" />
                    Featured
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
