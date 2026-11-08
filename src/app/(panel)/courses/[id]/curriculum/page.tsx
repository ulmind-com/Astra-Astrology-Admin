"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Video,
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

  // Bunny quick placeholder creation
  const [bunnyVideoTitle, setBunnyVideoTitle] = React.useState("");
  const [isCreatingBunnySlot, setIsCreatingBunnySlot] = React.useState(false);

  // Deletion confirm
  const [deletingSectionId, setDeletingSectionId] = React.useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = React.useState<string | null>(null);

  // Fetch all courses to get current course metadata
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await courseAdminApi.listCourses({ limit: 100 });
      return (res as CourseAdminItem[]) || [];
    },
  });

  const course = courses.find((c: CourseAdminItem) => c.id === courseId);

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
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editingSection ? "Module updated" : "Module created");
      setSectionModalOpen(false);
      setEditingSection(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save section"),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => courseAdminApi.deleteSection(courseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Module deleted successfully");
      setDeletingSectionId(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete section"),
  });

  // Lesson mutations
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      if (editingLesson) {
        return courseAdminApi.updateLesson(courseId, editingLesson.id, {
          title: lessonTitle,
          duration_minutes: lessonDuration,
          video_provider: lessonProvider,
          video_id: lessonVideoId,
          is_free_preview: lessonIsFree,
          summary: lessonSummary,
          notes_markdown: lessonNotes,
        });
      }
      return courseAdminApi.createLesson(courseId, {
        section_id: targetSectionId,
        title: lessonTitle,
        order: 1,
        duration_minutes: lessonDuration,
        video_provider: lessonProvider,
        video_id: lessonVideoId,
        is_free_preview: lessonIsFree,
        summary: lessonSummary,
        notes_markdown: lessonNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editingLesson ? "Lesson updated" : "Lesson added to module");
      setLessonModalOpen(false);
      setEditingLesson(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save lesson"),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => courseAdminApi.deleteLesson(courseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Lesson deleted successfully");
      setDeletingLessonId(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete lesson"),
  });

  // Bunny helper
  const createBunnySlot = async () => {
    if (!bunnyVideoTitle.trim()) {
      toast.error("Please provide a title for the video slot");
      return;
    }
    setIsCreatingBunnySlot(true);
    try {
      const res = (await courseAdminApi.createBunnyVideo(bunnyVideoTitle)) as BunnyVideoPlaceholder;
      if (res?.video_id) {
        setLessonVideoId(res.video_id);
        setLessonProvider("bunny_stream");
        toast.success(`Bunny Video GUID created: ${res.video_id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create Bunny Video slot");
    } finally {
      setIsCreatingBunnySlot(false);
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
    setBunnyVideoTitle("");
    setLessonModalOpen(true);
  };

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
            Organize modules, upload Bunny Stream video lessons, and manage free preview chapters.
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="brand">
              {course?.category.replace("_", " ") || "Course"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {course?.total_lessons || 0} Lessons • {course?.duration_hours || 0} hrs total
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setEditingSection(null);
                setSectionTitle("");
                setSectionOrder(1);
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
          Bunny Stream Video Storage (Library ID: 803267)
        </p>
        <p className="leading-relaxed">
          You can paste any Bunny Video GUID directly from your Bunny dashboard, or click "Create Bunny Slot" inside the lesson form to generate a video slot automatically. The player embeds with dynamic token authentication and floating student watermark.
        </p>
      </div>

      {/* Module / Curriculum List */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-600" />
                Curriculum Structure
              </CardTitle>
              <CardDescription className="text-xs">
                Add sections to group your recorded lectures chronologically.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingSection(null);
                setSectionTitle("");
                setSectionOrder(1);
                setSectionModalOpen(true);
              }}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Module
            </Button>
          </CardHeader>

          <CardBody className="p-4">
            <EmptyState
              icon={Layers}
              title="Add your first module"
              description="Click '+ Add Module / Section' above to organize your lessons (e.g., 'Chapter 1: Basics of Kundli & 12 Houses')."
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
                  Add Module
                </Button>
              }
            />
          </CardBody>
        </Card>
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

      {/* Add / Edit Lesson Modal */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={editingLesson ? "Edit Lesson" : "Add Video Lesson to Module"}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Field label="Lesson Title *" hint="e.g. Understanding Lagna & 1st House Characteristics">
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Lesson Title"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Duration (Minutes) *">
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

          {/* Video ID & Bunny Helper */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
            <Field
              label={lessonProvider === "bunny_stream" ? "Bunny Video GUID *" : "YouTube Video ID *"}
              hint={
                lessonProvider === "bunny_stream"
                  ? "Paste Bunny Video GUID (e.g. 5f83c1e2-9b2a-4c12-8e2b-1a2b3c4d5e6f)"
                  : "e.g. dQw4w9WgXcQ (from youtube.com/watch?v=...)"
              }
            >
              <Input
                value={lessonVideoId}
                onChange={(e) => setLessonVideoId(e.target.value)}
                placeholder={lessonProvider === "bunny_stream" ? "Bunny Video GUID" : "YouTube ID"}
              />
            </Field>

            {lessonProvider === "bunny_stream" && (
              <div className="pt-2 border-t border-border flex items-center gap-2">
                <Input
                  value={bunnyVideoTitle}
                  onChange={(e) => setBunnyVideoTitle(e.target.value)}
                  placeholder="Or enter title to generate slot in Bunny"
                  className="text-xs"
                />
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={createBunnySlot}
                  disabled={isCreatingBunnySlot}
                  className="shrink-0 text-xs gap-1"
                >
                  {isCreatingBunnySlot && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Slot
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-bold">Free Preview Lesson</p>
              <p className="text-xs text-muted-foreground">Allow non-purchased visitors to watch this lesson as a demo</p>
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
            <Button variant="outline" onClick={() => setLessonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveLessonMutation.mutate()}
              disabled={saveLessonMutation.isPending || !lessonTitle.trim() || !lessonVideoId.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saveLessonMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Lesson
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
    </div>
  );
}
