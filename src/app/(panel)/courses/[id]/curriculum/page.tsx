"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  FileVideo,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { courseAdminApi } from "@/lib/api";
import type { BunnyVideoPlaceholder, CourseAdminItem, CourseLessonAdmin, CourseSectionAdmin } from "@/types";

export default function CourseCurriculumAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const queryClient = useQueryClient();

  // Modals state
  const [sectionModalOpen, setSectionModalOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<CourseSectionAdmin | null>(null);
  const [sectionTitle, setSectionTitle] = React.useState("");
  const [sectionOrder, setSectionOrder] = React.useState(1);

  const [lessonModalOpen, setLessonModalOpen] = React.useState(false);
  const [targetSectionId, setTargetSectionId] = React.useState<string>("");
  const [editingLesson, setEditingLesson] = React.useState<CourseLessonAdmin | null>(null);

  // Lesson form
  const [lessonTitle, setLessonTitle] = React.useState("");
  const [lessonDuration, setLessonDuration] = React.useState(15);
  const [lessonProvider, setLessonProvider] = React.useState("bunny_stream");
  const [lessonVideoId, setLessonVideoId] = React.useState("");
  const [lessonIsFree, setLessonIsFree] = React.useState(false);
  const [lessonSummary, setLessonSummary] = React.useState("");
  const [lessonNotes, setLessonNotes] = React.useState("");

  // Direct Video Upload to Bunny Stream State
  const [selectedVideoFile, setSelectedVideoFile] = React.useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadedBytes, setUploadedBytes] = React.useState(0);
  const [totalBytes, setTotalBytes] = React.useState(0);
  const [activeXhr, setActiveXhr] = React.useState<XMLHttpRequest | null>(null);
  const videoFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Deletion confirm
  const [deletingSectionId, setDeletingSectionId] = React.useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = React.useState<string | null>(null);

  // Fetch full course details including sections and lessons
  const { data: course, isLoading, refetch } = useQuery({
    queryKey: ["admin-course-detail", courseId],
    queryFn: async () => {
      const res = await courseAdminApi.getCourse(courseId);
      return res as CourseAdminItem & { sections?: CourseSectionAdmin[] };
    },
    enabled: Boolean(courseId),
  });

  // Section mutations
  const saveSectionMutation = useMutation({
    mutationFn: async () => {
      if (editingSection) {
        return courseAdminApi.updateSection(courseId, editingSection.id, {
          title: sectionTitle,
          order: sectionOrder,
        });
      }
      return courseAdminApi.createSection(courseId, {
        title: sectionTitle,
        order: sectionOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });
      toast.success(editingSection ? "Module updated" : "Module created");
      setSectionModalOpen(false);
      setEditingSection(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save section"),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => courseAdminApi.deleteSection(courseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });
      toast.success("Module deleted successfully");
      setDeletingSectionId(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete section"),
  });

  // Lesson mutations
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      let finalVideoId = (lessonVideoId || "").trim();

      // If user selected a video file and hasn't uploaded it yet, auto-upload now!
      if (!finalVideoId && selectedVideoFile) {
        finalVideoId = await uploadVideoToBunny(selectedVideoFile);
      }

      const safeDuration = Math.max(1, Math.round(Number(lessonDuration) || 1));
      const safeTitle = (lessonTitle.trim() || selectedVideoFile?.name || "Video Lesson").trim();
      const currentSection = course?.sections?.find((s) => s.id === targetSectionId);
      const calculatedOrder = (currentSection?.lessons?.length || 0) + 1;

      if (editingLesson) {
        return courseAdminApi.updateLesson(courseId, editingLesson.id, {
          title: safeTitle,
          duration_minutes: safeDuration,
          video_provider: lessonProvider,
          video_id: finalVideoId,
          is_free_preview: lessonIsFree,
          summary: lessonSummary,
          notes_markdown: lessonNotes,
        });
      }
      return courseAdminApi.createLesson(courseId, {
        section_id: targetSectionId,
        title: safeTitle,
        order: Math.max(1, calculatedOrder),
        duration_minutes: safeDuration,
        video_provider: lessonProvider,
        video_id: finalVideoId,
        is_free_preview: lessonIsFree,
        summary: lessonSummary,
        notes_markdown: lessonNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });
      toast.success(editingLesson ? "Lesson updated" : "Lesson added to module");
      setLessonModalOpen(false);
      setEditingLesson(null);
      setSelectedVideoFile(null);
      setUploadProgress(0);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save lesson"),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => courseAdminApi.deleteLesson(courseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });
      toast.success("Lesson deleted successfully");
      setDeletingLessonId(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete lesson"),
  });

  // Video File Selection & Duration Detection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVideoFile(file);
    if (!lessonTitle.trim()) {
      // Clean title from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setLessonTitle(cleanName);
    }

    // Auto-detect duration from metadata
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const minutes = Math.max(1, Math.round(video.duration / 60));
      setLessonDuration(minutes);
    };
    video.src = URL.createObjectURL(file);
  };

  // Direct Bunny Stream Upload Handler with Dual-Layer Edge Fallback
  const uploadVideoToBunny = async (fileToUpload?: File): Promise<string> => {
    const file = fileToUpload || selectedVideoFile;
    if (!file) {
      toast.error("Please select a video file to upload");
      throw new Error("No video file selected");
    }

    try {
      setIsUploadingVideo(true);
      setUploadProgress(0);

      // Clean and safe title
      const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const titleForSlot = (lessonTitle.trim() || rawName || "Lesson Video").trim();

      toast.loading("Preparing Bunny Stream video slot...", { id: "video-upload" });

      let videoId = "";
      let uploadUrl = "";
      let accessKey = "1c3cab37-2ae3-4527-8592090e78bb-f243-4cf9";
      const libraryId = "803267";

      // Attempt 1: Call backend API
      try {
        const placeholder = (await courseAdminApi.createBunnyVideo(titleForSlot)) as BunnyVideoPlaceholder;
        if (placeholder?.video_id) {
          videoId = placeholder.video_id;
          uploadUrl = placeholder.upload_url || `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
          if (placeholder.access_key) accessKey = placeholder.access_key;
        }
      } catch (backendErr) {
        console.warn("Backend video slot creation error, falling back to direct Bunny Edge API", backendErr);
      }

      // Attempt 2: If backend returned error or empty, call Bunny API directly from browser
      if (!videoId) {
        const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
          method: "POST",
          headers: {
            "AccessKey": accessKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ title: titleForSlot }),
        });
        if (!bunnyRes.ok) {
          const errText = await bunnyRes.text();
          throw new Error(`Bunny Stream slot error: ${errText || bunnyRes.statusText}`);
        }
        const bunnyData = await bunnyRes.json();
        videoId = bunnyData.guid;
        uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
      }

      toast.loading("Streaming video directly to Bunny CDN...", { id: "video-upload" });

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        setActiveXhr(xhr);
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("AccessKey", accessKey);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
            setUploadedBytes(event.loaded);
            setTotalBytes(event.total);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setLessonVideoId(videoId);
            setLessonProvider("bunny_stream");
            setSelectedVideoFile(null);
            toast.success("Video uploaded to Bunny Stream! Ready for playback.", { id: "video-upload" });
            setIsUploadingVideo(false);
            setActiveXhr(null);
            resolve(videoId);
          } else {
            const err = new Error(`Bunny Stream upload failed with status ${xhr.status}`);
            toast.error(err.message, { id: "video-upload" });
            setIsUploadingVideo(false);
            setActiveXhr(null);
            reject(err);
          }
        };

        xhr.onerror = () => {
          const err = new Error("Network error during video upload. Please check connection.");
          toast.error(err.message, { id: "video-upload" });
          setIsUploadingVideo(false);
          setActiveXhr(null);
          reject(err);
        };

        xhr.onabort = () => {
          setIsUploadingVideo(false);
          setActiveXhr(null);
          reject(new Error("Video upload cancelled"));
        };

        xhr.send(file);
      });
    } catch (err: any) {
      setIsUploadingVideo(false);
      toast.error(err?.message || "Failed to upload video to Bunny Stream.", { id: "video-upload" });
      throw err;
    }
  };

  const cancelVideoUpload = () => {
    if (activeXhr) {
      activeXhr.abort();
      setActiveXhr(null);
      setIsUploadingVideo(false);
      setUploadProgress(0);
      toast.message("Video upload cancelled.");
    }
  };

  const openAddLessonModal = (secId: string) => {
    setEditingLesson(null);
    setTargetSectionId(secId);
    setLessonTitle("");
    setLessonDuration(15);
    setLessonProvider("bunny_stream");
    setLessonVideoId("");
    setLessonIsFree(false);
    setLessonSummary("");
    setLessonNotes("");
    setSelectedVideoFile(null);
    setUploadProgress(0);
    setLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: CourseLessonAdmin, secId: string) => {
    setEditingLesson(lesson);
    setTargetSectionId(secId);
    setLessonTitle(lesson.title);
    setLessonDuration(lesson.duration_minutes || 15);
    setLessonProvider(lesson.video_provider || "bunny_stream");
    setLessonVideoId(lesson.video_id || "");
    setLessonIsFree(lesson.is_free_preview || false);
    setLessonSummary(lesson.summary || "");
    setLessonNotes(lesson.notes_markdown || "");
    setSelectedVideoFile(null);
    setUploadProgress(0);
    setLessonModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingBlock label="Loading course curriculum and modules…" />
      </div>
    );
  }

  const sections = course?.sections || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            {course?.title || "Curriculum & Video Lessons"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize modules, upload Bunny Stream video lectures, and manage free preview chapters.
          </p>
        </div>
      </div>

      {/* Control Actions Header */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="brand">
              {course?.category?.replace("_", " ") || "Course"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {sections.length} Modules • {course?.total_lessons || 0} Lessons • {course?.duration_hours || 0} hrs total
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setEditingSection(null);
                setSectionTitle("");
                setSectionOrder(sections.length + 1);
                setSectionModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Module / Section
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Quick Bunny Stream Help Card */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-sm">
          <Video className="h-4 w-4 text-amber-600" />
          Bunny Stream Direct Video Upload (Library: 803267)
        </p>
        <p className="leading-relaxed">
          You can upload video lectures directly from your computer (.mp4, .mov, .webm). Files stream directly to Bunny CDN and encode into 1080p/720p with dynamic token protection and floating student watermarks.
        </p>
      </div>

      {/* Curriculum Sections & Modules List */}
      <div className="space-y-5">
        {sections.length === 0 ? (
          <Card>
            <CardBody className="p-8">
              <EmptyState
                icon={Layers}
                title="No Modules Created Yet"
                description="Begin structuring your course by adding your first module (e.g., 'Chapter 1: Basics of Kundli & 12 Houses')."
                action={
                  <Button
                    onClick={() => {
                      setEditingSection(null);
                      setSectionTitle("");
                      setSectionOrder(1);
                      setSectionModalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add First Module
                  </Button>
                }
              />
            </CardBody>
          </Card>
        ) : (
          sections.map((section: CourseSectionAdmin, idx: number) => {
            const lessons = section.lessons || [];
            return (
              <Card key={section.id} className="overflow-hidden border border-border/80">
                {/* Module Header */}
                <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddLessonModal(section.id)}
                      className="gap-1 text-xs bg-surface hover:bg-surface-muted"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-600" />
                      Add Video Lesson
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingSection(section);
                        setSectionTitle(section.title);
                        setSectionOrder(section.order || idx + 1);
                        setSectionModalOpen(true);
                      }}
                      className="p-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingSectionId(section.id)}
                      className="p-1.5 h-8 w-8 text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Lessons in this Module */}
                <CardBody className="p-0 divide-y divide-border/60">
                  {lessons.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      <FileVideo className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                      <p>No video lessons added to this module yet.</p>
                      <button
                        type="button"
                        onClick={() => openAddLessonModal(section.id)}
                        className="mt-2 text-amber-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Upload first video lesson
                      </button>
                    </div>
                  ) : (
                    lessons.map((lesson: CourseLessonAdmin, lIdx: number) => (
                      <div
                        key={lesson.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-5 text-right">
                            {lIdx + 1}.
                          </span>
                          <PlayCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {lesson.title}
                              </p>
                              {lesson.is_free_preview && (
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                  Free Preview
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {lesson.duration_minutes || 0} min
                              </span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-muted-foreground/80">
                                {lesson.video_provider === "bunny_stream" ? "Bunny: " : "YT: "}
                                {lesson.video_id ? `${lesson.video_id.slice(0, 8)}...` : "No video attached"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditLessonModal(lesson, section.id)}
                            className="gap-1 text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingLessonId(lesson.id)}
                            className="p-1.5 h-8 w-8 text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Section Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? "Edit Module / Section" : "Create New Module / Section"}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Module Title *" hint="e.g. Chapter 1: Introduction to Vedic Astrology">
            <Input
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Module Title"
            />
          </Field>

          <Field label="Order Position" hint="Display order number">
            <Input
              type="number"
              value={sectionOrder}
              onChange={(e) => setSectionOrder(parseInt(e.target.value) || 1)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setSectionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveSectionMutation.mutate()}
              disabled={saveSectionMutation.isPending || !sectionTitle.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saveSectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Module
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Video Lesson Modal */}
      <Modal
        open={lessonModalOpen}
        onClose={() => {
          if (!isUploadingVideo) setLessonModalOpen(false);
        }}
        title={editingLesson ? "Edit Lesson" : "Add Video Lesson to Module"}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Field label="Lesson Title *" hint="e.g. Calculating the Lagna Lord & 12 Houses">
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Lesson Title"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Duration (Minutes) *" hint="Auto-detected from uploaded video">
              <Input
                type="number"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(parseInt(e.target.value) || 0)}
              />
            </Field>

            <Field label="Video Provider">
              <Select
                value={lessonProvider}
                onChange={(e) => setLessonProvider(e.target.value)}
              >
                <option value="bunny_stream">Bunny Stream (Recommended & Secure)</option>
                <option value="youtube_unlisted">YouTube Unlisted (Free)</option>
              </Select>
            </Field>
          </div>

          {/* Direct Video Upload Section */}
          {lessonProvider === "bunny_stream" && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Upload Video File (MP4, MOV, WebM)</span>
                {lessonVideoId && (
                  <span className="text-[11px] font-mono font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> GUID: {lessonVideoId.slice(0, 8)}...
                  </span>
                )}
              </label>

              {/* Upload Dropzone */}
              <div
                onClick={() => !isUploadingVideo && videoFileInputRef.current?.click()}
                className={`p-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isUploadingVideo
                    ? "border-amber-500 bg-amber-500/5 cursor-wait"
                    : selectedVideoFile
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border hover:border-amber-500/60 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                  className="hidden"
                  onChange={handleVideoFileChange}
                />

                {isUploadingVideo ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <span>Uploading to Bunny Stream...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {(uploadedBytes / (1024 * 1024)).toFixed(1)} MB / {(totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelVideoUpload();
                      }}
                      className="text-xs text-danger mt-1"
                    >
                      Cancel Upload
                    </Button>
                  </div>
                ) : selectedVideoFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileVideo className="h-8 w-8 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedVideoFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB • Click "Upload Now" to send to Bunny
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          uploadVideoToBunny();
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload Now to Bunny Stream
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideoFile(null);
                        }}
                        className="text-xs text-muted-foreground"
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Click to select video lecture from device
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        MP4, MOV, or WebM (Direct Bunny CDN Upload • No size limit)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Player Preview if GUID is present */}
              {lessonVideoId && !isUploadingVideo && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    Uploaded Video Preview:
                  </p>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black max-h-48">
                    <iframe
                      src={`https://iframe.mediadelivery.net/embed/803267/${lessonVideoId}`}
                      loading="lazy"
                      className="h-full w-full border-0"
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video ID & Manual Fallback */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
            <Field
              label={lessonProvider === "bunny_stream" ? "Bunny Video GUID" : "YouTube Video ID *"}
              hint={
                lessonProvider === "bunny_stream"
                  ? "Auto-filled on upload, or paste GUID manually (e.g. 5f83c1e2-9b2a-4c12-8e2b-1a2b3c4d5e6f)"
                  : "e.g. dQw4w9WgXcQ (from youtube.com/watch?v=...)"
              }
            >
              <Input
                value={lessonVideoId}
                onChange={(e) => setLessonVideoId(e.target.value)}
                placeholder={lessonProvider === "bunny_stream" ? "Bunny Video GUID" : "YouTube ID"}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-bold">Free Preview Lesson</p>
              <p className="text-xs text-muted-foreground">Allow prospective students to watch this lesson before purchase</p>
            </div>
            <Switch
              checked={lessonIsFree}
              onChange={setLessonIsFree}
            />
          </div>

          <Field label="Short Summary" hint="1-2 sentences explaining what is covered">
            <Input
              value={lessonSummary}
              onChange={(e) => setLessonSummary(e.target.value)}
              placeholder="Deep dive into Lagna lord planetary placement..."
            />
          </Field>

          <Field label="Class Notes & Study Materials (Markdown)">
            <Textarea
              rows={4}
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Important planetary mantras, slokas, or degree formulas..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                if (!isUploadingVideo) setLessonModalOpen(false);
              }}
              disabled={isUploadingVideo}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveLessonMutation.mutate()}
              disabled={
                saveLessonMutation.isPending ||
                isUploadingVideo ||
                (!lessonTitle.trim() && !selectedVideoFile) ||
                (!lessonVideoId.trim() && !selectedVideoFile)
              }
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[130px]"
            >
              {saveLessonMutation.isPending || isUploadingVideo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  {isUploadingVideo ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save Lesson"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deletingSectionId)}
        onClose={() => setDeletingSectionId(null)}
        onConfirm={() => {
          if (deletingSectionId) {
            deleteSectionMutation.mutate(deletingSectionId);
          }
        }}
        title="Delete Module"
        description="Are you sure you want to delete this module and all video lessons inside it?"
        confirmLabel="Delete Module"
        tone="danger"
        loading={deleteSectionMutation.isPending}
      />

      <ConfirmModal
        open={Boolean(deletingLessonId)}
        onClose={() => setDeletingLessonId(null)}
        onConfirm={() => {
          if (deletingLessonId) {
            deleteLessonMutation.mutate(deletingLessonId);
          }
        }}
        title="Delete Video Lesson"
        description="Are you sure you want to delete this video lesson?"
        confirmLabel="Delete Lesson"
        tone="danger"
        loading={deleteLessonMutation.isPending}
      />
    </div>
  );
}
