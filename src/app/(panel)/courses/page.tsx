"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  Edit2,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Users,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
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
import { courseAdminApi, shopAdminApi } from "@/lib/api";
import type { CourseAdminInput, CourseAdminItem } from "@/types";

const CATEGORIES = [
  { value: "vedic_astrology", label: "Vedic Astrology (বৈদিক জ্যোতিষ)" },
  { value: "tarot", label: "Tarot Reading (ট্যারোট রিডিং)" },
  { value: "palmistry", label: "Palmistry (হস্তরেখা বিচার)" },
  { value: "numerology", label: "Numerology (সংখ্যা জ্যোতিষ)" },
  { value: "lal_kitab", label: "Lal Kitab Canon (লাল কিতাব)" },
  { value: "vastu", label: "Vastu Shastra (বাস্তু শাস্ত্র)" },
  { value: "general", label: "General Spiritual Wisdom" },
];

const LEVELS = [
  { value: "all_levels", label: "All Levels (সকল স্তর)" },
  { value: "beginner", label: "Beginner (প্রারম্ভিক)" },
  { value: "intermediate", label: "Intermediate (মধ্যম)" },
  { value: "advanced", label: "Advanced (উচ্চতর)" },
  { value: "acharya", label: "Acharya Master (আচার্য স্তর)" },
];

function CourseCardThumbnail({
  course,
  onEdit,
}: {
  course: CourseAdminItem;
  onEdit: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);

  if (course.thumbnail_url && !imgError) {
    return (
      <Image
        src={course.thumbnail_url}
        alt={course.title}
        fill
        className="object-cover"
        unoptimized
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      onClick={onEdit}
      className="w-full h-full flex flex-col items-center justify-center bg-stone-900/90 text-muted-foreground cursor-pointer hover:bg-stone-800/80 transition-colors p-3 text-center"
    >
      <GraduationCap className="h-9 w-9 text-amber-500/60 mb-1" />
      <span className="text-[11px] font-semibold text-amber-400">No Thumbnail</span>
      <span className="text-[10px] text-stone-400">Click to upload thumbnail</span>
    </div>
  );
}

export default function CoursesAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<CourseAdminItem | null>(null);
  const [deletingCourseId, setDeletingCourseId] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<CourseAdminInput>({
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    category: "vedic_astrology",
    level: "all_levels",
    language: "bn",
    instructor_name: "Pt. Acharya Rahul Sharma",
    instructor_title: "Senior Vedic Jyotishacharya",
    instructor_avatar: "",
    thumbnail_url: "",
    promo_video_url: "",
    promo_video_provider: "youtube",
    price: 999,
    mrp: 2999,
    certificate_enabled: true,
    is_published: true,
    is_featured: false,
    what_you_will_learn: [],
    prerequisites: [],
    tags: [],
  });
  const [learningPointsText, setLearningPointsText] = React.useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP).");
      return;
    }
    const toastId = toast.loading("Compressing & uploading 16:9 thumbnail to Cloudinary...");
    try {
      setIsUploadingThumbnail(true);
      const res = await courseAdminApi.uploadThumbnail(file);
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, thumbnail_url: res.url }));
        toast.success("Thumbnail uploaded successfully!", { id: toastId });
      } else {
        toast.error("Could not obtain image URL.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload thumbnail.", { id: toastId });
    } finally {
      setIsUploadingThumbnail(false);
      if (e.target) e.target.value = "";
    }
  };

  const { data: courses = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await courseAdminApi.listCourses({ limit: 100 });
      return (res as CourseAdminItem[]) || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.thumbnail_url?.trim()) {
        throw new Error("Please upload or enter a course thumbnail image.");
      }
      const payload: CourseAdminInput = {
        ...formData,
        what_you_will_learn: learningPointsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (editingCourse) {
        return courseAdminApi.updateCourse(editingCourse.id, payload);
      }
      return courseAdminApi.createCourse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editingCourse ? "Course updated successfully!" : "Course created successfully!");
      setIsModalOpen(false);
      setEditingCourse(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save course");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return courseAdminApi.deleteCourse(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted successfully");
      setDeletingCourseId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete course");
    },
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      title: "",
      slug: "",
      subtitle: "",
      description: "",
      category: "vedic_astrology",
      level: "all_levels",
      language: "bn",
      instructor_name: "Pt. Acharya Rahul Sharma",
      instructor_title: "Senior Vedic Jyotishacharya",
      instructor_avatar: "https://res.cloudinary.com/astra/acharya-rahul-sharma.jpg",
      thumbnail_url: "",
      promo_video_url: "",
      promo_video_provider: "youtube",
      price: 1499,
      mrp: 4999,
      certificate_enabled: true,
      is_published: true,
      is_featured: false,
      what_you_will_learn: [],
      prerequisites: [],
      tags: [],
    });
    setLearningPointsText("");
    setIsModalOpen(true);
  };

  const openEditModal = async (c: CourseAdminItem) => {
    setEditingCourse(c);
    setFormData({
      title: c.title,
      slug: c.slug,
      subtitle: c.subtitle || "",
      description: "",
      category: c.category,
      level: c.level,
      language: c.language,
      instructor_name: c.instructor_name,
      instructor_title: c.instructor_title,
      instructor_avatar: c.instructor_avatar || "",
      thumbnail_url: c.thumbnail_url || "",
      promo_video_url: "",
      promo_video_provider: "youtube",
      price: c.price,
      mrp: c.mrp,
      certificate_enabled: c.certificate_enabled,
      is_published: true,
      is_featured: c.is_featured,
      what_you_will_learn: [],
      prerequisites: [],
      tags: [],
    });
    setLearningPointsText("");
    setIsModalOpen(true);

    try {
      const fullDetail = await courseAdminApi.getCourse(c.id);
      if (fullDetail) {
        setFormData((prev) => ({
          ...prev,
          description: fullDetail.description || prev.description,
          thumbnail_url: fullDetail.thumbnail_url || prev.thumbnail_url,
          subtitle: fullDetail.subtitle || prev.subtitle,
          what_you_will_learn: fullDetail.what_you_will_learn || [],
          prerequisites: fullDetail.prerequisites || [],
          tags: fullDetail.tags || [],
        }));
        if (fullDetail.what_you_will_learn?.length) {
          setLearningPointsText(fullDetail.what_you_will_learn.join("\n"));
        }
      }
    } catch (err) {
      console.warn("Could not load full course detail for edit:", err);
    }
  };

  const filteredCourses = React.useMemo(() => {
    return courses.filter((c: CourseAdminItem) => {
      const matchSearch =
        search === "" ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor_name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || c.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [courses, search, categoryFilter]);

  const totalStudents = courses.reduce((acc: number, c: CourseAdminItem) => acc + (c.total_students || 0), 0);
  const totalLessons = courses.reduce((acc: number, c: CourseAdminItem) => acc + (c.total_lessons || 0), 0);

  return (
    <div className="space-y-6">
      <PanelHeader
        title="DivinLink Gurukul Courses"
        description="Create and manage video masterclasses, curriculum modules, and Bunny Stream lessons."
        action={
          <div className="flex items-center gap-2">
            <Link href="/courses/qa">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-500/30 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <MessageSquareQuote className="h-4 w-4" />
                গুরুকুল জিজ্ঞাসা (Q&A)
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={openCreateModal} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4" />
              New Masterclass
            </Button>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Courses</p>
              <p className="text-2xl font-black text-foreground mt-1">{courses.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Students</p>
              <p className="text-2xl font-black text-foreground mt-1">{totalStudents}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Video Lessons</p>
              <p className="text-2xl font-black text-foreground mt-1">{totalLessons}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Video className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Certificates</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">Enabled</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, instructor, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-56"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Course List */}
      {isLoading ? (
        <LoadingBlock label="Loading Gurukul courses..." />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses found"
          description="Click '+ New Masterclass' to create your first astrology or tarot video course."
          action={
            <Button onClick={openCreateModal} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Course
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c: CourseAdminItem) => (
            <Card key={c.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="relative h-44 w-full bg-stone-900">
                  <CourseCardThumbnail course={c} onEdit={() => openEditModal(c)} />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge tone="brand">
                      {c.category.replace("_", " ")}
                    </Badge>
                    {c.is_featured && (
                      <Badge tone="gold">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      {c.duration_hours > 0 ? `${c.duration_hours} hrs` : "Flexible"}
                    </span>
                  </div>
                </div>

                <CardBody className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-base line-clamp-1 text-foreground" title={c.title}>
                      {c.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {c.subtitle || "Comprehensive step-by-step masterclass with verified Vedic formulas."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="font-medium text-stone-700 dark:text-stone-300">{c.instructor_name}</span>
                    <span className="flex items-center gap-1 font-bold text-foreground">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      {c.total_students} Students
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                        ₹{c.price.toLocaleString("en-IN")}
                      </span>
                      {c.mrp > c.price && (
                        <span className="text-xs text-muted-foreground line-through ml-1.5">
                          ₹{c.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <Badge tone="neutral">
                      {c.total_lessons} Lessons
                    </Badge>
                  </div>
                </CardBody>
              </div>

              <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between gap-2">
                <Link
                  href={`/courses/${c.id}/curriculum`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Manage Curriculum ({c.total_lessons})
                </Link>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(c)}
                    className="h-8 w-8 p-0"
                    title="Edit Course"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingCourseId(c.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete Course"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Course Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        title={editingCourse ? "Edit Masterclass" : "Create New Masterclass"}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Course Title *" hint="e.g. Complete Vedic Astrology Masterclass">
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const slug = title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: editingCourse ? prev.slug : slug,
                  }));
                }}
                placeholder="Course Title"
              />
            </Field>

            <Field label="URL Slug *" hint="Unique URL identifier">
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="vedic-astrology-masterclass"
              />
            </Field>
          </div>

          <Field label="Subtitle / Headline" hint="Short 1-2 sentence hook for landing card">
            <Input
              value={formData.subtitle || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Learn Kundli, 12 Bhavas, Vimshottari Dasha and Authentic Lal Kitab Remedies"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Category">
              <Select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Difficulty Level">
              <Select
                value={formData.level}
                onChange={(e) => setFormData((prev) => ({ ...prev, level: e.target.value }))}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Language">
              <Select
                value={formData.language}
                onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
              >
                <option value="bn">Bengali (বাংলা)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="en">English</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Selling Price (₹ INR) *" hint="What student pays">
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
            </Field>

            <Field label="Original MRP (₹ INR)" hint="Crossed-out original fee">
              <Input
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData((prev) => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Instructor Name">
              <Input
                value={formData.instructor_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, instructor_name: e.target.value }))}
              />
            </Field>

            <Field label="Instructor Title">
              <Input
                value={formData.instructor_title}
                onChange={(e) => setFormData((prev) => ({ ...prev, instructor_title: e.target.value }))}
              />
            </Field>
          </div>

          {/* Direct Thumbnail Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Thumbnail Image (16:9) *
              </label>
              {formData.thumbnail_url && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, thumbnail_url: "" }))}
                  className="text-[11px] text-danger hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Remove Image
                </button>
              )}
            </div>

            {formData.thumbnail_url ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black group max-h-56">
                <Image
                  src={formData.thumbnail_url}
                  alt="Thumbnail Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    className="bg-black/70 text-white border-white/30 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingThumbnail}
                  >
                    Change Thumbnail
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isUploadingThumbnail && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isUploadingThumbnail
                    ? "border-amber-500 bg-amber-500/5 cursor-wait"
                    : "border-border hover:border-amber-500/60 hover:bg-muted/30"
                }`}
              >
                {isUploadingThumbnail ? (
                  <div className="flex flex-col items-center gap-2 text-amber-600">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-xs font-semibold">Uploading & compressing thumbnail to WebP...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-center">
                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Click to upload course thumbnail</p>
                      <p className="text-[11px] text-muted-foreground">Upload from device (JPG, PNG, WebP) - compressed automatically</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailUpload}
            />

            <div className="pt-1">
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="Or paste external image URL directly (https://...)"
                className="text-xs"
              />
            </div>
          </div>

          <Field label="Detailed Description (Markdown) *">
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Full curriculum description, topics covered, spiritual background..."
            />
          </Field>

          <Field label="What You Will Learn (1 bullet point per line)">
            <Textarea
              rows={3}
              value={learningPointsText}
              onChange={(e) => setLearningPointsText(e.target.value)}
              placeholder="Calculate Lagna & Planetary Degrees manually&#10;Analyze Vimshottari Mahadasha & Antardasha&#10;Vedic Matchmaking & 36 Guna Milan"
            />
          </Field>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-bold">Verifiable Vedic Certificate</p>
              <p className="text-xs text-muted-foreground">Auto-issue signed completion certificate with QR code</p>
            </div>
            <Switch
              checked={formData.certificate_enabled ?? true}
              onChange={(checked) => setFormData((prev) => ({ ...prev, certificate_enabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-bold">Featured Course</p>
              <p className="text-xs text-muted-foreground">Highlight on homepage & Gurukul banner</p>
            </div>
            <Switch
              checked={formData.is_featured ?? false}
              onChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCourse(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formData.title || !formData.slug}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCourse ? "Update Masterclass" : "Create Masterclass"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deletingCourseId)}
        onClose={() => setDeletingCourseId(null)}
        onConfirm={() => {
          if (deletingCourseId) {
            deleteMutation.mutate(deletingCourseId);
          }
        }}
        title="Delete Masterclass"
        description="Are you sure you want to remove this course from Gurukul? Past enrolled students will retain access."
        confirmLabel="Delete Course"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
