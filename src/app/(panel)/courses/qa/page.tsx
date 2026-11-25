"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  Phone,
  Eye,
  EyeOff,
  Pin,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Select,
  Textarea,
} from "@/components/ui";
import { courseAdminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminCourseQuestion, AdminCourseQuestionAnswer, CourseAdminItem } from "@/types";

export default function GurukulQAPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const initialCourseId = searchParams.get("courseId") || "";
  const initialLessonId = searchParams.get("lessonId") || "";

  const [selectedCourseId, setSelectedCourseId] = React.useState(initialCourseId);
  const [selectedLessonId, setSelectedLessonId] = React.useState(initialLessonId);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "unanswered" | "answered" | "resolved" | "hidden">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Reply state
  const [replyingQuestionId, setReplyingQuestionId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");
  const [markResolvedOnReply, setMarkResolvedOnReply] = React.useState(true);

  // Deletion state
  const [deletingQuestionId, setDeletingQuestionId] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch all courses for the dropdown filter
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-dropdown"],
    queryFn: async () => {
      const res = await courseAdminApi.listCourses({ limit: 100 });
      return res as CourseAdminItem[];
    },
  });

  // 2. Fetch full course details if selected to get lessons
  const { data: selectedCourseDetail } = useQuery({
    queryKey: ["admin-course-detail-for-qa", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      return courseAdminApi.getCourse(selectedCourseId);
    },
    enabled: Boolean(selectedCourseId),
  });

  const availableLessons = React.useMemo(() => {
    if (!selectedCourseDetail?.sections) return [];
    const list: { id: string; title: string; sectionTitle: string }[] = [];
    selectedCourseDetail.sections.forEach((sec: any) => {
      if (sec.lessons) {
        sec.lessons.forEach((les: any) => {
          list.push({ id: les.id, title: les.title, sectionTitle: sec.title });
        });
      }
    });
    return list;
  }, [selectedCourseDetail]);

  // 3. Fetch Questions with filters
  const {
    data: qaData,
    isLoading,
    refetch,
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "admin-course-questions",
      selectedCourseId,
      selectedLessonId,
      statusFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      return courseAdminApi.getQuestions({
        course_id: selectedCourseId || undefined,
        lesson_id: selectedLessonId || undefined,
        status: statusFilter,
        search: debouncedSearch || undefined,
        limit: 100,
      });
    },
  });

  const questions = qaData?.questions || [];
  const totalCount = qaData?.total || 0;
  const unansweredCount = qaData?.unanswered_count || 0;
  const resolvedCount = qaData?.resolved_count || 0;
  const hiddenCount = qaData?.hidden_count || 0;

  // Mutations
  const replyMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!replyContent.trim()) throw new Error("Please write an answer before submitting.");
      return courseAdminApi.answerQuestion(questionId, {
        content: replyContent.trim(),
        mark_resolved: markResolvedOnReply,
      });
    },
    onSuccess: () => {
      toast.success("Official Acharya answer posted successfully!");
      setReplyingQuestionId(null);
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["admin-course-questions"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to post answer"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      questionId,
      isResolved,
      isPinned,
      isHidden,
    }: {
      questionId: string;
      isResolved?: boolean;
      isPinned?: boolean;
      isHidden?: boolean;
    }) => {
      return courseAdminApi.updateQuestion(questionId, {
        is_resolved: isResolved,
        is_pinned: isPinned,
        is_hidden: isHidden,
      });
    },
    onSuccess: () => {
      toast.success("Question status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-course-questions"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => courseAdminApi.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question deleted");
      setDeletingQuestionId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-course-questions"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete question"),
  });

  const deleteAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answerId }: { questionId: string; answerId: string }) =>
      courseAdminApi.deleteAnswer(questionId, answerId),
    onSuccess: () => {
      toast.success("Answer deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-course-questions"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete answer"),
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All Masterclasses
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2.5">
            <MessageSquareQuote className="h-6 w-6 text-amber-600" />
            গুরুকুল জিজ্ঞাসা (Student Q&A Forum & Inquiries)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            ভিডিও লেকচারের নির্দিষ্ট মিনিট/সেকেন্ড অনুযায়ী ছাত্রদের প্রশ্নসমূহ পর্যালোচনা করুন এবং আচার্য উত্তর প্রদান করুন।
          </p>
        </div>

        {/* Quick Stats & Refresh */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-amber-600" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Counters - Ultra Pro Luxury Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 dark:border-amber-900/40 bg-gradient-to-br from-white via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                মোট জিজ্ঞাসা (Total Inquiries)
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">{totalCount}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">সব লেকচারের সম্মিলিত ডাউট</p>
            </div>
            <div className="size-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <MessageSquare className="size-6" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-orange-200/90 dark:border-orange-900/40 bg-gradient-to-br from-white via-white to-orange-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                <span>অপেক্ষমান উত্তর (Pending Reply)</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">{unansweredCount}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">আচার্যের উত্তরের অপেক্ষায়</p>
            </div>
            <div className="size-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Clock className="size-6" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/90 dark:border-emerald-900/40 bg-gradient-to-br from-white via-white to-emerald-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                সমাধান হয়েছে (Resolved)
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">{resolvedCount}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">সন্তুষ্ট শিক্ষার্থী ও মীমাংসিত</p>
            </div>
            <div className="size-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <CheckCircle2 className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar - Ultra Pro Enterprise Card */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Filter by Course */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              কোর্স অনুযায়ী ফিল্টার
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedLessonId("");
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden transition-colors cursor-pointer"
            >
              <option value="">সকল কোর্স (All Masterclasses)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Lesson (Video) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              নির্দিষ্ট ভিডিও লেকচার
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              disabled={!selectedCourseId || availableLessons.length === 0}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="">সকল ভিডিও লেকচার (All Lessons)</option>
              {availableLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.sectionTitle}: {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              ছাত্র বা বিষয়ের নাম খুঁজুন
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student name, email, phone, or question..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1">অবস্থা:</span>
          {[
            { id: "all", label: `সকল প্রশ্ন (${totalCount})` },
            { id: "unanswered", label: `অপেক্ষমান উত্তর (${unansweredCount})` },
            { id: "answered", label: "উত্তর দেওয়া হয়েছে" },
            { id: "resolved", label: `মীমাংসিত (${resolvedCount})` },
            { id: "hidden", label: `লুকানো / স্প্যাম (${hiddenCount})` },
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setStatusFilter(tabItem.id as any)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer border",
                statusFilter === tabItem.id
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-black"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry Feed */}
      {error ? (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-5 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400">
          <span>প্রশ্ন লোড করতে সমস্যা হয়েছে: {(error as any)?.message || "সার্ভার সংযোগ ত্রুটি"}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer"
          >
            <RefreshCw className="size-3" /> পুনরায় চেষ্টা করুন
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center">
          <LoadingBlock label="লোড হচ্ছে গুরুকুল জিজ্ঞাসা..." />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-amber-300/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 dark:from-slate-900/60 dark:via-slate-900 dark:to-amber-950/10 p-12 text-center space-y-3">
          <div className="size-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <MessageSquareQuote className="size-7" />
          </div>
          <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
            কোনো জিজ্ঞাসা পাওয়া যায়নি
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            যখন ছাত্ররা ভিডিও লেকচারের নির্দিষ্ট অংশে কোনো পয়েন্টে প্রশ্ন জিজ্ঞাসা করবেন, এখানে তাৎক্ষণিকভাবে রিয়েল-টাইম দেখা যাবে এবং আচার্য সরাসরি উত্তর প্রদান করতে পারবেন।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q: AdminCourseQuestion) => (
            <div key={q.id} className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/80 transition-all">
                {/* Top Row: Course & Video Lecture Context */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1 font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                      {q.course_title}
                    </span>

                    <span className="rounded-xl bg-amber-500/10 px-3 py-1 font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border border-amber-500/25">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {q.section_title} • {q.lesson_title}
                    </span>

                    {/* Timestamp Tag */}
                    {q.timestamp_seconds > 0 ? (
                      <span className="rounded-xl bg-emerald-500/10 px-2.5 py-1 font-mono font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 border border-emerald-500/25">
                        <Clock className="h-3 w-3" />
                        <span>ভিডিও সময়: {q.timestamp_formatted}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        (সাধারণ জিজ্ঞাসা)
                      </span>
                    )}

                    {q.has_official_answer && (
                      <span className="rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1 border border-emerald-600/30">
                        <ShieldCheck className="h-3 w-3" /> আচার্য উত্তর প্রদত্ত
                      </span>
                    )}

                    {q.is_resolved && (
                      <span className="rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-[10px] font-bold border border-blue-500/30">
                        ✓ সমাধান হয়েছে
                      </span>
                    )}

                    {q.is_hidden && (
                      <span className="rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1 border border-rose-500/30">
                        <EyeOff className="h-3 w-3" /> লুকানো / স্প্যাম
                      </span>
                    )}
                  </div>

                  {/* Actions: Pin, Hide & Delete */}
                  <div className="flex items-center gap-1 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          questionId: q.id,
                          isHidden: !q.is_hidden,
                        })
                      }
                      className={`p-1.5 h-8 w-8 rounded-xl ${q.is_hidden ? "text-rose-600 bg-rose-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      title={q.is_hidden ? "প্রশ্ন পুনরায় প্রকাশ করুন (Unhide)" : "প্রশ্ন লুকিয়ে রাখুন (Hide/Spam)"}
                    >
                      {q.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          questionId: q.id,
                          isPinned: !q.is_pinned,
                        })
                      }
                      className={`p-1.5 h-8 w-8 rounded-xl ${q.is_pinned ? "text-amber-600 bg-amber-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      title={q.is_pinned ? "Unpin question" : "Pin question to top"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingQuestionId(q.id)}
                      className="p-1.5 h-8 w-8 rounded-xl text-rose-600 hover:bg-rose-500/10"
                      title="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Middle: Student Details Box & Question Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Student Profile Card */}
                  <div className="md:col-span-1 rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs shadow-2xs">
                    <p className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5 text-amber-600" /> ছাত্রের বিবরণ (Student)
                    </p>
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={q.user_avatar}
                        name={q.user_name}
                        className="h-8 w-8 text-xs font-bold"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{q.user_name}</p>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {q.student_enrolled_at ? "এনরোল্ড স্টুডেন্ট" : "ভিজিটর"}
                        </span>
                      </div>
                    </div>

                    {q.user_email && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{q.user_email}</span>
                      </p>
                    )}

                    {q.user_phone && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                        <span>{q.user_phone}</span>
                      </p>
                    )}

                    {q.student_progress_percent !== undefined && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>কোর্স অগ্রগতি:</span>
                          <span className="font-black text-slate-900 dark:text-white">{q.student_progress_percent}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Content */}
                  <div className="md:col-span-3 space-y-2.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {q.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {q.content}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <ThumbsUp className="h-3.5 w-3.5" /> {q.upvote_count} আপভোট
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> {q.answers?.length || 0} উত্তর
                      </span>
                      <span>•</span>
                      <span>
                        জিজ্ঞাসা করা হয়েছে:{" "}
                        {new Date(q.created_at).toLocaleString("bn-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answers List */}
                {q.answers && q.answers.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                      পূর্ববর্তী উত্তরসমূহ ({q.answers.length}):
                    </p>
                    <div className="space-y-2 pl-2">
                      {q.answers.map((ans: AdminCourseQuestionAnswer) => (
                        <div
                          key={ans.id}
                          className={`rounded-2xl p-3.5 text-xs space-y-2 ${
                            ans.is_official
                              ? "border-2 border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-2xs"
                              : "border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={ans.user_avatar}
                                name={ans.user_name}
                                className="h-5 w-5 text-[10px] font-bold"
                              />
                              <span className="font-bold text-slate-900 dark:text-white">{ans.user_name}</span>
                              {ans.is_official && (
                                <span className="rounded-lg bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 flex items-center gap-1 uppercase tracking-wider shadow-2xs">
                                  <ShieldCheck className="h-2.5 w-2.5" /> আচার্য উত্তর
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {new Date(ans.created_at).toLocaleDateString("bn-IN", {
                                  dateStyle: "medium",
                                })}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                deleteAnswerMutation.mutate({
                                  questionId: q.id,
                                  answerId: ans.id,
                                })
                              }
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Delete reply"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed pl-7">
                            {ans.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acharya Reply Accordion */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  {replyingQuestionId === q.id ? (
                    <div className="rounded-2xl border border-amber-400/80 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 p-4 space-y-3 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          আচার্য গুরু হিসেবে সরাসরি উত্তর লিখুন (Official Answer)
                        </p>
                        <label className="flex items-center gap-2 text-xs cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={markResolvedOnReply}
                            onChange={(e) => setMarkResolvedOnReply(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>উত্তরের পর প্রশ্নটি "সমাধান (Resolved)" হিসেবে চিহ্নিত করুন</span>
                        </label>
                      </div>

                      <Textarea
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="শাস্ত্রীয় প্রমাণ, লগ্ন ও নক্ষত্রের ফলাফল অনুযায়ী ছাত্রের প্রশ্নটির বিশদ ও সঠিক উত্তর লিখুন..."
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyingQuestionId(null);
                            setReplyContent("");
                          }}
                          disabled={replyMutation.isPending}
                          className="rounded-xl"
                        >
                          বাতিল
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => replyMutation.mutate(q.id)}
                          disabled={replyMutation.isPending || !replyContent.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs rounded-xl shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{replyMutation.isPending ? "পাঠানো হচ্ছে..." : "আচার্য উত্তর পোস্ট করুন"}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingQuestionId(q.id);
                          setReplyContent("");
                        }}
                        className="gap-1.5 text-xs bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-500/40 rounded-xl font-bold cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>উত্তর দিন / Reply to Student</span>
                      </Button>

                      {/* Toggle Resolved */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            questionId: q.id,
                            isResolved: !q.is_resolved,
                          })
                        }
                        className={`text-xs gap-1 font-semibold rounded-xl ${q.is_resolved ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{q.is_resolved ? "Mark Unresolved" : "Mark as Resolved"}</span>
                      </Button>
                    </div>
                  )}
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Question Confirmation */}
      <ConfirmModal
        open={Boolean(deletingQuestionId)}
        onClose={() => setDeletingQuestionId(null)}
        onConfirm={() => {
          if (deletingQuestionId) {
            deleteQuestionMutation.mutate(deletingQuestionId);
          }
        }}
        title="Delete Question"
        description="Are you sure you want to permanently delete this student inquiry and all answers inside it?"
        confirmLabel="Delete Question"
        tone="danger"
        loading={deleteQuestionMutation.isPending}
      />
    </div>
  );
}
