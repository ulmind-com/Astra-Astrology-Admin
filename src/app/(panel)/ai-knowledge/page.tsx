"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  Edit3,
  FileText,
  Lightbulb,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsDown,
  Trash2,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingBlock,
  Switch,
  Textarea,
} from "@/components/ui";
import {
  aiAdminApi,
  type AICustomRuleItem,
  type AIFeedbackItem,
  type AIKnowledgeDocItem,
} from "@/lib/api";

const RULES_KEY = ["admin", "ai-rules"] as const;
const FEEDBACK_KEY = ["admin", "ai-feedback"] as const;
const KNOWLEDGE_KEY = ["admin", "ai-knowledge"] as const;

export default function AIKnowledgePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"rules" | "feedback" | "knowledge">("rules");

  // State for Add/Edit Rule modal
  const [showRuleModal, setShowRuleModal] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AICustomRuleItem | null>(null);
  const [ruleTitle, setRuleTitle] = React.useState("");
  const [ruleKeywords, setRuleKeywords] = React.useState("");
  const [ruleCategory, setRuleCategory] = React.useState("kundli");
  const [ruleResponseBn, setRuleResponseBn] = React.useState("");
  const [ruleRemedyBn, setRuleRemedyBn] = React.useState("");
  const [rulePriority, setRulePriority] = React.useState(5);

  // State for Feedback Correction
  const [correctingFeedback, setCorrectingFeedback] = React.useState<AIFeedbackItem | null>(null);
  const [correctionText, setCorrectionText] = React.useState("");
  const [correctionTitle, setCorrectionTitle] = React.useState("");

  // Search & filter for knowledge docs
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchDocQuery, setSearchDocQuery] = React.useState("");

  // Queries
  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: RULES_KEY,
    queryFn: () => aiAdminApi.getRules(),
  });

  const { data: feedbacks = [], isLoading: loadingFeedback } = useQuery({
    queryKey: FEEDBACK_KEY,
    queryFn: () => aiAdminApi.getFeedback(50),
  });

  const { data: knowledgeData, isLoading: loadingKnowledge, refetch: refetchKnowledge } = useQuery({
    queryKey: [...KNOWLEDGE_KEY, selectedCategory],
    queryFn: () =>
      aiAdminApi.getKnowledge({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: 100,
      }),
  });

  // Mutations
  const seedMutation = useMutation({
    mutationFn: () => aiAdminApi.seedKnowledge(),
    onSuccess: (res) => {
      toast.success(`সফলভাবে ${res.seeded_count} টি শাস্ত্রীয় নথি ডাটাবেজে ইনডেক্স করা হয়েছে!`);
      queryClient.invalidateQueries({ queryKey: KNOWLEDGE_KEY });
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
    onError: () => toast.error("নথি ইনডেক্স করতে সমস্যা হয়েছে"),
  });

  const saveRuleMutation = useMutation({
    mutationFn: (payload: {
      id?: string;
      rule_title: string;
      trigger_keywords: string[];
      category: string;
      response_bn: string;
      remedy_bn: string;
      priority: number;
    }) => {
      if (payload.id) {
        return aiAdminApi.updateRule(payload.id, payload);
      }
      return aiAdminApi.createRule(payload);
    },
    onSuccess: () => {
      toast.success(editingRule ? "নিয়ম সফলভাবে আপডেট করা হয়েছে!" : "নতুন নিয়ম যুক্ত হয়েছে!");
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
      closeRuleModal();
    },
    onError: () => toast.error("নিয়ম সংরক্ষণ করা সম্ভব হয়নি"),
  });

  const toggleRuleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      aiAdminApi.updateRule(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
      toast.success("নিয়ম স্থিতি পরিবর্তিত হয়েছে");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => aiAdminApi.deleteRule(id),
    onSuccess: () => {
      toast.success("নিয়ম ডিলিট করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });

  const approveFeedbackMutation = useMutation({
    mutationFn: ({ id, correctedResponse, title }: { id: string; correctedResponse: string; title: string }) =>
      aiAdminApi.approveFeedback(id, {
        admin_corrected_response: correctedResponse,
        rule_title: title,
      }),
    onSuccess: () => {
      toast.success("সংশোধনটি অনুমোদিত হয়েছে এবং স্থায়ী জ্ঞানে যুক্ত হয়েছে!");
      queryClient.invalidateQueries({ queryKey: FEEDBACK_KEY });
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
      setCorrectingFeedback(null);
    },
    onError: () => toast.error("অনুমোদন ব্যর্থ হয়েছে"),
  });

  function openAddModal() {
    setEditingRule(null);
    setRuleTitle("");
    setRuleKeywords("");
    setRuleCategory("kundli");
    setRuleResponseBn("");
    setRuleRemedyBn("");
    setRulePriority(5);
    setShowRuleModal(true);
  }

  function openEditModal(rule: AICustomRuleItem) {
    setEditingRule(rule);
    setRuleTitle(rule.rule_title);
    setRuleKeywords(rule.trigger_keywords.join(", "));
    setRuleCategory(rule.category);
    setRuleResponseBn(rule.response_bn);
    setRuleRemedyBn(rule.remedy_bn);
    setRulePriority(rule.priority);
    setShowRuleModal(true);
  }

  function closeRuleModal() {
    setShowRuleModal(false);
    setEditingRule(null);
  }

  function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleResponseBn.trim()) {
      toast.error("শিরোনাম এবং বৈদিক ব্যাখ্যা প্রদান আবশ্যক");
      return;
    }
    const kw = ruleKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (kw.length === 0) {
      toast.error("কমপক্ষে একটি ট্রিগার কি-ওয়ার্ড দিন");
      return;
    }

    saveRuleMutation.mutate({
      id: editingRule?.id,
      rule_title: ruleTitle.trim(),
      trigger_keywords: kw,
      category: ruleCategory,
      response_bn: ruleResponseBn.trim(),
      remedy_bn: ruleRemedyBn.trim(),
      priority: Number(rulePriority),
    });
  }

  const filteredDocs = React.useMemo(() => {
    if (!knowledgeData?.docs) return [];
    if (!searchDocQuery.trim()) return knowledgeData.docs;
    const q = searchDocQuery.toLowerCase();
    return knowledgeData.docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.snippet.toLowerCase().includes(q) ||
        d.source_file.toLowerCase().includes(q)
    );
  }, [knowledgeData, searchDocQuery]);

  return (
    <div className="space-y-6 pb-12">
      <PanelHeader
        title="AI Astrologer Hub & Knowledge Portal"
        description="বৃহৎ পরাশর শাস্ত্র ও ক্লায়েন্টের নিজস্ব নথির ভিত্তিতে কৃত্রিম বুদ্ধিমত্তা সম্পন্ন বৈদিক জ্যোতিষী ব্যবস্থাপনা"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="border-amber-500/40 text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${seedMutation.isPending ? "animate-spin" : ""}`}
              />
              {seedMutation.isPending ? "ইনডেক্সিং চলছে..." : "রিসোর্স নথি ইনডেক্স করুন"}
            </Button>
            <Button size="sm" onClick={openAddModal} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              নতুন শাস্ত্রীয় নিয়ম
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                সক্রিয় বৈদিক নিয়ম
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-serif">
                {rules.filter((r) => r.is_active).length} / {rules.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600">
              <BrainCircuit className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-card">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                পর্যালোচনাযোগ্য ফিডব্যাক
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-serif">
                {feedbacks.filter((f) => !f.reviewed_by_admin).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600">
              <ThumbsDown className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                ইনডেক্সড শাস্ত্রীয় নথি
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-serif">
                {knowledgeData?.total ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600">
              <Database className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "rules"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BrainCircuit className="h-4 w-4" />
          শাস্ত্রীয় নিয়মাবলী ও প্রতিকার ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "feedback"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          স্বয়ংক্রিয় শিক্ষা ও মানবীয় অনুমোদন ({feedbacks.length})
        </button>
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "knowledge"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          ইনডেক্সড বৈদিক নথি (RAG) ({knowledgeData?.total ?? 0})
        </button>
      </div>

      {/* Tab 1: Custom Q&A Rules */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {loadingRules ? (
            <LoadingBlock />
          ) : rules.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-lg font-medium text-foreground">এখনও কোনো কাস্টম নিয়ম যুক্ত হয়নি</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                উপরে &quot;রিসোর্স নথি ইনডেক্স করুন&quot; বোতামে ক্লিক করুন অথবা &quot;নতুন শাস্ত্রীয় নিয়ম&quot; থেকে সরাসরি আপনার নিজস্ব নিয়ম তৈরি করুন।
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={`border transition-all ${
                    rule.is_active
                      ? "border-amber-500/30 hover:border-amber-500/60 shadow-sm"
                      : "border-border/40 opacity-60 bg-muted/20"
                  }`}
                >
                  <CardBody className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-lg font-bold text-foreground">
                            {rule.rule_title}
                          </span>
                          <Badge tone="gold" className="text-xs uppercase">
                            {rule.category}
                          </Badge>
                          <Badge tone="neutral" className="text-xs">
                            অগ্রাধিকার: {rule.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-xs text-muted-foreground font-medium">ট্রিগার কি-ওয়ার্ড:</span>
                          {rule.trigger_keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-foreground/80 border border-border/50"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">সক্রিয়</span>
                          <Switch
                            checked={rule.is_active}
                            onChange={(checked: boolean) =>
                              toggleRuleActive.mutate({ id: rule.id, is_active: checked })
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(rule)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("আপনি কি নিশ্চিতভাবে এই নিয়মটি ডিলিট করতে চান?")) {
                              deleteRuleMutation.mutate(rule.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-card/60 p-3.5 border border-border/40 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          শাস্ত্রীয় বৈদিক ব্যাখ্যা:
                        </p>
                        <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">
                          {rule.response_bn}
                        </p>
                      </div>

                      {rule.remedy_bn && (
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            শাস্ত্রীয় বৈদিক প্রতিকার:
                          </p>
                          <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">
                            {rule.remedy_bn}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Feedback & Self Learning */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          {loadingFeedback ? (
            <LoadingBlock />
          ) : feedbacks.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/60 mb-3" />
              <p className="text-lg font-medium text-foreground">কোনো ঋণাত্মক ফিডব্যাক নেই</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                ব্যবহারকারীরা সমস্ত উত্তরের সাথে সন্তুষ্ট। নতুন কোনো অপ্রস্তুত প্রশ্ন এলে তা এখানে প্রদর্শিত হবে।
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((f) => (
                <Card
                  key={f.id}
                  className={`border transition-all ${
                    f.added_to_knowledge
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/40 bg-card"
                  }`}
                >
                  <CardBody className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge tone={f.added_to_knowledge ? "green" : "red"}>
                          {f.added_to_knowledge ? "জ্ঞানে যুক্ত হয়েছে (Learned)" : "সংশোধন আবশ্যক"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          তারিখ: {new Date(f.created_at).toLocaleDateString("bn-BD")}
                        </p>
                      </div>

                      {!f.added_to_knowledge && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCorrectingFeedback(f);
                            setCorrectionTitle(`সংশোধিত নিয়ম: ${f.user_query.slice(0, 40)}`);
                            setCorrectionText(f.admin_corrected_response || f.ai_response);
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                          উত্তর সংশোধন ও শেখান
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-md bg-muted/40 p-3 border border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground">ব্যবহারকারীর প্রশ্ন:</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{f.user_query}</p>
                      </div>

                      <div className="rounded-md bg-card p-3 border border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground">পূর্বের এআই উত্তর:</p>
                        <p className="text-sm text-foreground/80 mt-0.5 line-clamp-3">{f.ai_response}</p>
                      </div>

                      {f.admin_corrected_response && (
                        <div className="rounded-md bg-emerald-500/10 p-3 border border-emerald-500/20">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            এডমিন অনুমোদিত সঠিক উত্তর:
                          </p>
                          <p className="text-sm text-foreground/90 mt-0.5">{f.admin_corrected_response}</p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Indexed Knowledge Docs (RAG) */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="নথির নাম বা বিষয়বস্তু খুঁজুন..."
                value={searchDocQuery}
                onChange={(e) => setSearchDocQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "kundli", "rashi", "vastu", "numerology", "palmistry", "face_reading"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-amber-600 text-white font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat === "all" ? "সকল বিষয়" : cat.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </div>

          {loadingKnowledge ? (
            <LoadingBlock />
          ) : filteredDocs.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-lg font-medium text-foreground">কোনো নথি পাওয়া যায়নি</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                রিসোর্স ফোল্ডারে কোনো নথি নেই অথবা ইনডেক্সিং শুরু করা হয়নি।
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="border border-border/50 hover:border-amber-500/40 transition-all">
                  <CardBody className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1">{doc.title}</h4>
                      <Badge tone="gold" className="text-xs uppercase">
                        {doc.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">উৎস: {doc.source_file}</p>
                    <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 p-2.5 rounded border border-border/30 line-clamp-4">
                      {doc.snippet}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-amber-500/30 bg-background shadow-2xl">
            <CardHeader className="border-b border-border/50 p-5">
              <CardTitle className="font-serif text-xl font-bold text-foreground">
                {editingRule ? "শাস্ত্রীয় নিয়ম সম্পাদনা" : "নতুন শাস্ত্রীয় নিয়ম ও প্রতিকার তৈরি"}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveRule}>
              <CardBody className="p-5 space-y-4">
                <Field label="নিয়মের শিরোনাম (Rule Title)">
                  <Input
                    placeholder="যেমন: মাঙ্গলিক দোষ ও ৭ম ভাবে শনির দৃষ্টি"
                    value={ruleTitle}
                    onChange={(e) => setRuleTitle(e.target.value)}
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="বিষয়শ্রেণী (Category)">
                    <select
                      value={ruleCategory}
                      onChange={(e) => setRuleCategory(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="kundli">কুন্ডলী ও লগ্ন (Kundli)</option>
                      <option value="rashi">রাশি ও গোচর (Rashi Transit)</option>
                      <option value="vastu">বাস্তু শাস্ত্র (Vastu)</option>
                      <option value="numerology">সংখ্যা জ্যোতিষ (Numerology)</option>
                      <option value="palmistry">হস্তরেখা (Palmistry)</option>
                      <option value="face_reading">মুখাবয়ব পাঠ (Face Reading)</option>
                      <option value="matchmaking">যোটক বিচার (Matchmaking)</option>
                      <option value="general">সাধারণ নিয়ম (General)</option>
                    </select>
                  </Field>

                  <Field label="অগ্রাধিকার (Priority 1-10)">
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={rulePriority}
                      onChange={(e) => setRulePriority(Number(e.target.value))}
                    />
                  </Field>
                </div>

                <Field label="ট্রিগার কি-ওয়ার্ড (কমা দিয়ে পৃথক করুন)">
                  <Input
                    placeholder="যেমন: মাঙ্গলিক, মঙ্গল দোষ, বিবাহে বাধা, manglik"
                    value={ruleKeywords}
                    onChange={(e) => setRuleKeywords(e.target.value)}
                    required
                  />
                </Field>

                <Field label="শাস্ত্রীয় সিদ্ধান্ত ও সঠিক ব্যাখ্যা (Bengali Response)">
                  <Textarea
                    placeholder="বৃহৎ পরাশর হোরাশাস্ত্র বা ক্লায়েন্টের নির্দেশিত সিদ্ধান্ত অনুযায়ী খাঁটি ব্যাখ্যা লিখুন..."
                    rows={4}
                    value={ruleResponseBn}
                    onChange={(e) => setRuleResponseBn(e.target.value)}
                    required
                  />
                </Field>

                <Field label="অনুমোদিত শাস্ত্রীয় প্রতিকার (Vedic Remedy)">
                  <Textarea
                    placeholder="যেমন: মঙ্গলবার হনুমান চালিসা পাঠ, উজ্জ্বল রক্তচন্দন ধারণ ও দান..."
                    rows={3}
                    value={ruleRemedyBn}
                    onChange={(e) => setRuleRemedyBn(e.target.value)}
                  />
                </Field>
              </CardBody>

              <div className="flex items-center justify-end gap-3 border-t border-border/50 p-4">
                <Button type="button" variant="outline" onClick={closeRuleModal}>
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={saveRuleMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {saveRuleMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "নিয়ম সংরক্ষণ করুন"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Human-in-the-loop Correction Modal */}
      {correctingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-amber-500/30 bg-background shadow-2xl">
            <CardHeader className="border-b border-border/50 p-5">
              <CardTitle className="font-serif text-xl font-bold text-foreground">
                ভুল উত্তরের মানবিক সংশোধন ও স্থায়ী শিক্ষা
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5 space-y-4">
              <div className="rounded-md bg-muted/40 p-3 border border-border/40">
                <p className="text-xs font-semibold text-muted-foreground">ব্যবহারকারীর প্রশ্ন:</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{correctingFeedback.user_query}</p>
              </div>

              <Field label="নিয়মের শিরোনাম (Rule Title)">
                <Input
                  value={correctionTitle}
                  onChange={(e) => setCorrectionTitle(e.target.value)}
                />
              </Field>

              <Field label="এডমিন কর্তৃক সংশোধিত খাঁটি শাস্ত্রীয় উত্তর (যা ভবিষ্যতে শেখানো হবে)">
                <Textarea
                  rows={5}
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="এখানে সঠিক বৈদিক বিশ্লেষণ ও সমাধান লিখুন..."
                />
              </Field>
            </CardBody>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 p-4">
              <Button type="button" variant="outline" onClick={() => setCorrectingFeedback(null)}>
                বাতিল
              </Button>
              <Button
                onClick={() => {
                  if (!correctionText.trim()) {
                    toast.error("সংশোধিত উত্তর প্রদান আবশ্যক");
                    return;
                  }
                  approveFeedbackMutation.mutate({
                    id: correctingFeedback.id,
                    correctedResponse: correctionText.trim(),
                    title: correctionTitle.trim(),
                  });
                }}
                disabled={approveFeedbackMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {approveFeedbackMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "অনুমোদন ও জ্ঞানে রূপান্তর করুন"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
