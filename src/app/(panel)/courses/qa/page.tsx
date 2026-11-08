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
import type { AdminCourseQuestion, AdminCourseQuestionAnswer, CourseAdminItem } from "@/types";

export default function GurukulQAPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const initialCourseId = searchParams.get("courseId") || "";
  const initialLessonId = searchParams.get("lessonId") || "";

  const [selectedCourseId, setSelectedCourseId] = React.useState(initialCourseId);
  const [selectedLessonId, setSelectedLessonId] = React.useState(initialLessonId);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "unanswered" | "answered" | "resolved">("all");
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
    }: {
      questionId: string;
      isResolved?: boolean;
      isPinned?: boolean;
    }) => {
      return courseAdminApi.updateQuestion(questionId, {
        is_resolved: isResolved,
        is_pinned: isPinned,
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

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">মোট জিজ্ঞাসা (Total Inquiries)</p>
            <p className="text-2xl font-serif font-bold text-foreground mt-0.5">{totalCount}</p>
          </div>
          <div className="p-3 rounded-full bg-brand-500/10 text-brand-600">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">অপেক্ষমান উত্তর (Pending Reply)</p>
            <p className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400 mt-0.5">{unansweredCount}</p>
          </div>
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">সমাধান হয়েছে (Resolved)</p>
            <p className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{resolvedCount}</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filter by Course */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">কোর্স অনুযায়ী ফিল্টার</label>
              <Select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedLessonId("");
                }}
              >
                <option value="">সকল কোর্স (All Masterclasses)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filter by Lesson (Video) */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">নির্দিষ্ট ভিডিও লেকচার</label>
              <Select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                disabled={!selectedCourseId || availableLessons.length === 0}
              >
                <option value="">সকল ভিডিও লেকচার (All Lessons)</option>
                {availableLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.sectionTitle}: {l.title}
                  </option>
                ))}
              </Select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">ছাত্র বা বিষয়ের নাম খুঁজুন</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Student name, email, phone, or question..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground mr-1">অবস্থা:</span>
            <Button
              size="sm"
              variant={statusFilter === "all" ? "primary" : "outline"}
              onClick={() => setStatusFilter("all")}
              className="text-xs py-1 h-7"
            >
              সকল প্রশ্ন ({totalCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "unanswered" ? "primary" : "outline"}
              onClick={() => setStatusFilter("unanswered")}
              className="text-xs py-1 h-7 gap-1"
            >
              <span>অপেক্ষমান উত্তর</span>
              {unansweredCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                  {unansweredCount}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "answered" ? "primary" : "outline"}
              onClick={() => setStatusFilter("answered")}
              className="text-xs py-1 h-7"
            >
              উত্তর দেওয়া হয়েছে
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "resolved" ? "primary" : "outline"}
              onClick={() => setStatusFilter("resolved")}
              className="text-xs py-1 h-7"
            >
              মীমাংসিত ({resolvedCount})
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Inquiry Feed */}
      {isLoading ? (
        <LoadingBlock label="লোড হচ্ছে গুরুকুল জিজ্ঞাসা..." />
      ) : questions.length === 0 ? (
        <EmptyState
          title="কোনো জিজ্ঞাসা পাওয়া যায়নি"
          description="বর্তমান ফিল্টারে কোনো ছাত্রের প্রশ্ন নেই।"
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q: AdminCourseQuestion) => (
            <Card key={q.id} className="overflow-hidden border-border transition-colors hover:border-amber-500/40">
              <CardBody className="p-5 space-y-4">
                {/* Top Row: Course & Video Lecture Context */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg bg-surface-muted px-2.5 py-1 font-semibold text-foreground flex items-center gap-1.5 border border-border">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                      {q.course_title}
                    </span>

                    <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border border-amber-500/20">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {q.section_title} • {q.lesson_title}
                    </span>

                    {/* Timestamp Tag */}
                    {q.timestamp_seconds > 0 ? (
                      <span className="rounded-lg bg-emerald-500/10 px-2 py-1 font-mono font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 border border-emerald-500/20">
                        <Clock className="h-3 w-3" />
                        <span>ভিডিও সময়: {q.timestamp_formatted}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        (সাধারণ জিজ্ঞাসা)
                      </span>
                    )}

                    {q.has_official_answer && (
                      <span className="rounded-full bg-emerald-600/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 border border-emerald-600/20">
                        <ShieldCheck className="h-3 w-3" /> আচার্য উত্তর প্রদত্ত
                      </span>
                    )}

                    {q.is_resolved && (
                      <span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[10px] font-bold">
                        ✓ সমাধান হয়েছে
                      </span>
                    )}
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center gap-1 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          questionId: q.id,
                          isPinned: !q.is_pinned,
                        })
                      }
                      className={`p-1.5 h-8 w-8 ${q.is_pinned ? "text-amber-600" : "text-muted-foreground"}`}
                      title={q.is_pinned ? "Unpin question" : "Pin question to top"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingQuestionId(q.id)}
                      className="p-1.5 h-8 w-8 text-danger hover:bg-danger/10"
                      title="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Middle: Student Details Box & Question Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Student Profile Card */}
                  <div className="md:col-span-1 rounded-xl bg-surface-muted/50 p-3.5 border border-border/80 space-y-2 text-xs">
                    <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-amber-600" /> ছাত্রের বিবরণ (Student)
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={q.user_avatar}
                        name={q.user_name}
                        className="h-8 w-8 text-xs"
                      />
                      <div>
                        <p className="font-bold text-foreground">{q.user_name}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {q.student_enrolled_at ? "এনরোল্ড স্টুডেন্ট" : "ভিজিটর"}
                        </span>
                      </div>
                    </div>

                    {q.user_email && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{q.user_email}</span>
                      </p>
                    )}

                    {q.user_phone && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{q.user_phone}</span>
                      </p>
                    )}

                    {q.student_progress_percent !== undefined && (
                      <div className="pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>কোর্স অগ্রগতি:</span>
                          <span className="font-bold text-foreground">{q.student_progress_percent}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Content */}
                  <div className="md:col-span-3 space-y-2">
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {q.title}
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {q.content}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-amber-600" /> {q.upvote_count} আপভোট
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {q.answers?.length || 0} উত্তর
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
                  <div className="border-t border-border/60 pt-3 space-y-2.5">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                      পূর্ববর্তী উত্তরসমূহ ({q.answers.length}):
                    </p>
                    <div className="space-y-2 pl-2">
                      {q.answers.map((ans: AdminCourseQuestionAnswer) => (
                        <div
                          key={ans.id}
                          className={`rounded-xl p-3 text-xs space-y-1.5 ${
                            ans.is_official
                              ? "border-2 border-emerald-500/30 bg-emerald-500/5 shadow-sm"
                              : "border border-border/60 bg-surface-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={ans.user_avatar}
                                name={ans.user_name}
                                className="h-5 w-5 text-[10px]"
                              />
                              <span className="font-bold text-foreground">{ans.user_name}</span>
                              {ans.is_official && (
                                <span className="rounded bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1 uppercase tracking-wider">
                                  <ShieldCheck className="h-2.5 w-2.5" /> আচার্য উত্তর
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
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
                              className="text-muted-foreground hover:text-danger p-1"
                              title="Delete reply"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-foreground whitespace-pre-line leading-relaxed pl-7">
                            {ans.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acharya Reply Accordion */}
                <div className="border-t border-border/60 pt-3">
                  {replyingQuestionId === q.id ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          আচার্য গুরু হিসেবে সরাসরি উত্তর লিখুন (Official Answer)
                        </p>
                        <label className="flex items-center gap-2 text-xs cursor-pointer font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={markResolvedOnReply}
                            onChange={(e) => setMarkResolvedOnReply(e.target.checked)}
                            className="rounded border-border text-amber-600 focus:ring-amber-500"
                          />
                          <span>উত্তরের পর প্রশ্নটি "সমাধান (Resolved)" হিসেবে চিহ্নিত করুন</span>
                        </label>
                      </div>

                      <Textarea
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="শাস্ত্রীয় প্রমাণ, লগ্ন ও নক্ষত্রের ফলাফল অনুযায়ী ছাত্রের প্রশ্নটির বিশদ ও সঠিক উত্তর লিখুন..."
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
                        >
                          বাতিল
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => replyMutation.mutate(q.id)}
                          disabled={replyMutation.isPending || !replyContent.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs"
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
                        className="gap-1.5 text-xs bg-surface hover:bg-surface-muted text-amber-600 border-amber-500/30"
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
                        className={`text-xs gap-1 ${q.is_resolved ? "text-blue-600" : "text-muted-foreground"}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{q.is_resolved ? "Mark Unresolved" : "Mark as Resolved"}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
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
