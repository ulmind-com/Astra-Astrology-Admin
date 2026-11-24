"use client";

/**
 * The Palm Reading Rule Book (হস্তরেখা বিচার রুলস ইঞ্জিন).
 *
 * This screen allows the platform astrologers and admins to audit, calibrate,
 * and expand Vedic chirology rules without touching code or deploying.
 * Every edit takes effect on the next palm scan dynamically.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Hand,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
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
import { palmReadingApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { PalmRule, PalmRuleCondition, PalmRuleCreateInput } from "@/types";

const KEY = ["admin", "palm-rules"] as const;
const META_KEY = ["admin", "palm-rules-meta"] as const;

const DEFAULT_FEATURE_LABELS: Record<string, string> = {
  hand_type: "Hand Element & Constitution",
  palm_shape: "Palm Geometry & Proportion",
  fingers: "Finger Proportion",
  finger_length: "Mental Processing Pace",
  finger_dynamics: "Temperament & Social Stance",
  thumb: "Willpower & Logic (Thumb)",
  jupiter_finger: "Ambition & Authority (Jupiter)",
  mercury_finger: "Communication & Commerce (Mercury)",
  phalanges: "Phalangeal Orientation",
  heart_line: "Emotional Flow (Water Line)",
  head_line: "Intellect & Strategy (Air Line)",
  life_line: "Vitality & Roots (Earth Line)",
  fate_line: "Career & Destiny (Fire Line)",
  line_relationship: "Mind-Heart Equilibrium",
  career_forecast: "Career & Financial Synthesis",
  relationship_forecast: "Love & Marriage Synthesis",
  health_forecast: "Vitality & Wellness Synthesis",
  mounts_3d: "3D Mount Topography & Planetary Energies",
  finger_flexibility_3d: "3D Joint Flexibility & Spontaneity",
  palm_hollow_3d: "3D Plain of Mars & Core Fortitude",
  sun_line: "Sun Line (Fame, Public Eminence & Surya Radiance)",
  mars_line: "Mars Line (Guardian Vitality & Sanjeevani Shield)",
  sacred_marks: "Sacred Marks & Auspicious Yogas (Chihnas)",
  skin_vitality: "Ayurvedic Skin Radiance & Prana Flush",
  dermatoglyphic_loops: "Dermatoglyphic Loops (Palmer Energy Flows)",
  marriage_relationships: "Marriage & Soul Connections (Vivaha Rekha)",
  temperament_archetype: "Vedic Temperament Archetype (Nature Analysis)",
  medical_constitution: "Medical Chirology & Ayurvedic Constitution",
  kundli_palm_sync: "Kundli-Palm Planetary Synchronization (Graha-Mount Alignment)",
};

const REQUIREMENT_OPTIONS = [
  { value: "geometry", label: "Geometry (Always Available)" },
  { value: "heart_line", label: "Heart Line Traced" },
  { value: "head_line", label: "Head Line Traced" },
  { value: "life_line", label: "Life Line Traced" },
  { value: "fate_line", label: "Fate Line Traced" },
  { value: "fingerprints", label: "Fingerprints (High Res Required)" },
  { value: "skin_texture", label: "Skin Texture (Micro Detail)" },
  { value: "mount_height", label: "Mount Height (3D Depth)" },
  { value: "minor_marks", label: "Minor Marks (High Res Required)" },
];

export default function PalmRulesPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => palmReadingApi.rules(),
  });

  const { data: meta } = useQuery({
    queryKey: META_KEY,
    queryFn: () => palmReadingApi.meta(),
  });

  const featureLabels = React.useMemo(() => {
    return { ...DEFAULT_FEATURE_LABELS, ...(meta?.feature_labels || {}) };
  }, [meta]);

  // Filtering states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedFeature, setSelectedFeature] = React.useState<string>("all");
  const [selectedArea, setSelectedArea] = React.useState<string>("all");
  const [selectedReviewFilter, setSelectedReviewFilter] = React.useState<"all" | "reviewed" | "unreviewed">("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<"all" | "active" | "disabled">("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSeedModalOpen, setIsSeedModalOpen] = React.useState(false);
  const [ruleToDelete, setRuleToDelete] = React.useState<PalmRule | null>(null);

  // Mutations
  const seedMutation = useMutation({
    mutationFn: (force: boolean) => palmReadingApi.seedRules(force),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(`Vedic Palm rules synchronized: ${data.created} created, ${data.updated} updated, ${data.skipped} preserved.`);
      setIsSeedModalOpen(false);
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to seed palm rules."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => palmReadingApi.deleteRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Rule deleted successfully.");
      setRuleToDelete(null);
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to delete rule."),
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const list = rules ?? [];
    const total = list.length;
    const reviewed = list.filter((r) => r.reviewed).length;
    const active = list.filter((r) => r.enabled).length;
    const fallbacks = list.filter((r) => r.is_default).length;
    const uniqueFeatures = new Set(list.map((r) => r.feature)).size;
    return { total, reviewed, active, fallbacks, uniqueFeatures };
  }, [rules]);

  // Distinct areas from rules or meta
  const distinctAreas = React.useMemo(() => {
    if (meta?.areas && meta.areas.length > 0) return meta.areas;
    const areas = new Set<string>();
    (rules ?? []).forEach((r) => {
      if (r.area) areas.add(r.area);
    });
    return Array.from(areas).sort();
  }, [meta, rules]);

  // Filtered and grouped rules
  const groupedRules = React.useMemo(() => {
    let filtered = rules ?? [];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.option.toLowerCase().includes(q) ||
          r.meaning.toLowerCase().includes(q) ||
          (r.area && r.area.toLowerCase().includes(q)) ||
          r.conditions.some((c) => c.metric.toLowerCase().includes(q)),
      );
    }

    if (selectedFeature !== "all") {
      filtered = filtered.filter((r) => r.feature === selectedFeature);
    }

    if (selectedArea !== "all") {
      filtered = filtered.filter((r) => r.area === selectedArea);
    }

    if (selectedReviewFilter === "reviewed") {
      filtered = filtered.filter((r) => r.reviewed);
    } else if (selectedReviewFilter === "unreviewed") {
      filtered = filtered.filter((r) => !r.reviewed);
    }

    if (selectedStatusFilter === "active") {
      filtered = filtered.filter((r) => r.enabled);
    } else if (selectedStatusFilter === "disabled") {
      filtered = filtered.filter((r) => !r.enabled);
    }

    // Group by feature
    const map = new Map<string, PalmRule[]>();
    filtered.forEach((r) => {
      const list = map.get(r.feature) ?? [];
      list.push(r);
      map.set(r.feature, list);
    });

    // Sort features logically
    const featureKeys = Object.keys(featureLabels);
    return Array.from(map.entries()).sort((a, b) => {
      const idxA = featureKeys.indexOf(a[0]);
      const idxB = featureKeys.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [rules, searchTerm, selectedFeature, selectedArea, selectedReviewFilter, selectedStatusFilter, featureLabels]);

  return (
    <>
      <PanelHeader
        title="Palm Rules Engine"
        description="Vedic Chirology (হস্তরেখা বিচার) rules, condition thresholds, and astrological interpretations."
      />

      <Alert tone="info" className="mb-6">
        <strong>Dynamic Palm Chirology Calibration:</strong> Wording, sensitivity bands, and priority weights
        are stored in MongoDB. Any adjustment or new rule saved here updates the astrological evaluation immediately
        for all users on Web and Mobile — without requiring code changes or server deployments.
      </Alert>

      {/* Top Action & Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Total Rules</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Astrologer Reviewed</span>
            <p className="mt-1 text-2xl font-bold text-success">{stats.reviewed}</p>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Active in Use</span>
            <p className="mt-1 text-2xl font-bold text-brand-900">{stats.active}</p>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Default Fallbacks</span>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.fallbacks}</p>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Active Categories</span>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.uniqueFeatures}</p>
          </CardBody>
        </Card>
      </div>

      {/* Filter and Action Toolbar */}
      <Card className="mb-6 border-border">
        <CardBody className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rule title, slug, metric or meaning…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setIsSeedModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="size-4" />
                Seed Vedic Rules
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                Add New Rule
              </Button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Feature Category</label>
              <Select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                className="h-10 text-xs"
              >
                <option value="all">All Categories ({Object.keys(featureLabels).length})</option>
                {Object.entries(featureLabels).map(([f, label]) => (
                  <option key={f} value={f}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Life Area</label>
              <Select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="h-10 text-xs"
              >
                <option value="all">All Life Areas</option>
                {distinctAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Astrologer Review</label>
              <Select
                value={selectedReviewFilter}
                onChange={(e) => setSelectedReviewFilter(e.target.value as any)}
                className="h-10 text-xs"
              >
                <option value="all">All Reviews</option>
                <option value="reviewed">Reviewed Only</option>
                <option value="unreviewed">Needs Review</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Active Status</label>
              <Select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="h-10 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Rules Content */}
      {isLoading ? (
        <LoadingBlock label="Loading Vedic Chirology Rule Book…" />
      ) : groupedRules.length === 0 ? (
        <EmptyState
          title="No palm rules matched"
          description="Try clearing search filters or seed the baseline Vedic rules library."
          action={
            <Button variant="secondary" onClick={() => setIsSeedModalOpen(true)}>
              <RotateCcw className="mr-1.5 size-4" /> Seed Default 120 Rules
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedRules.map(([feature, items]) => (
            <Card key={feature} className="border-border">
              <CardHeader className="bg-surface-subtle/40 pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Hand className="size-5 text-brand-700" />
                    <span>{featureLabels[feature] || feature}</span>
                  </span>
                  <Badge tone="neutral">{items.length} rule{items.length !== 1 ? "s" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 pt-3">
                {items.map((rule) => (
                  <PalmRuleRow
                    key={rule.id}
                    rule={rule}
                    onDelete={() => setRuleToDelete(rule)}
                  />
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Rule Modal */}
      <CreatePalmRuleModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        featureLabels={featureLabels}
        areas={distinctAreas}
      />

      {/* Delete Rule Confirm Modal */}
      <ConfirmModal
        open={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={() => {
          if (ruleToDelete) deleteMutation.mutate(ruleToDelete.id);
        }}
        title="Delete Palm Rule"
        description={`Are you sure you want to delete "${ruleToDelete?.label}" (${ruleToDelete?.option})? This cannot be undone.`}
        confirmLabel="Delete Rule"
        tone="danger"
        loading={deleteMutation.isPending}
      />

      {/* Seed Rules Confirm Modal */}
      <ConfirmModal
        open={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onConfirm={() => seedMutation.mutate(false)}
        title="Synchronize Vedic Chirology Rules"
        description="This will import or update the 120 authentic Vedic palmistry rules from the repository without overwriting any rules that have already been marked as 'reviewed' by an astrologer."
        confirmLabel="Sync Rules Now"
        tone="primary"
        loading={seedMutation.isPending}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// Rule Row Component with Accordion Editing
// -----------------------------------------------------------------------------
function PalmRuleRow({
  rule,
  onDelete,
}: {
  rule: PalmRule;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  // Form states
  const [label, setLabel] = React.useState(rule.label);
  const [meaning, setMeaning] = React.useState(rule.meaning);
  const [area, setArea] = React.useState(rule.area || "");
  const [source, setSource] = React.useState(rule.source || "");
  const [priority, setPriority] = React.useState(rule.priority.toString());
  const [isDefault, setIsDefault] = React.useState(rule.is_default);
  const [requiresStr, setRequiresStr] = React.useState(rule.requires.join(", "));
  const [bands, setBands] = React.useState(() => JSON.stringify(rule.conditions, null, 2));
  const [bandError, setBandError] = React.useState<string | null>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    setLabel(rule.label);
    setMeaning(rule.meaning);
    setArea(rule.area || "");
    setSource(rule.source || "");
    setPriority(rule.priority.toString());
    setIsDefault(rule.is_default);
    setRequiresStr(rule.requires.join(", "));
    setBands(JSON.stringify(rule.conditions, null, 2));
  }, [rule]);

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof palmReadingApi.updateRule>[1]) =>
      palmReadingApi.updateRule(rule.id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Saved. New parameters apply to all next palm scans.");
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to update rule."),
  });

  function handleSaveAll() {
    setBandError(null);
    let parsed: PalmRuleCondition[];
    try {
      parsed = JSON.parse(bands);
      if (!Array.isArray(parsed)) throw new Error("not an array");
    } catch {
      setBandError('Conditions must be a JSON array of objects, e.g. [{"metric": "heart_line.curvature", "min": 0.4}]');
      return;
    }

    const reqList = requiresStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    updateMutation.mutate({
      label,
      meaning,
      area: area.trim() || null,
      source: source.trim() || null,
      priority: parseInt(priority, 10) || 0,
      is_default: isDefault,
      requires: reqList.length > 0 ? reqList : ["geometry"],
      conditions: parsed,
    });
  }

  const isDirty =
    label !== rule.label ||
    meaning !== rule.meaning ||
    (area.trim() || null) !== (rule.area || null) ||
    (source.trim() || null) !== (rule.source || null) ||
    parseInt(priority, 10) !== rule.priority ||
    isDefault !== rule.is_default ||
    bands !== JSON.stringify(rule.conditions, null, 2);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex w-full items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{rule.label}</span>
              <span className="font-mono text-xs text-muted-foreground">({rule.option})</span>
              {rule.area && <Badge tone="blue">{rule.area}</Badge>}
              {rule.priority > 0 && <Badge tone="neutral">p:{rule.priority}</Badge>}
              {rule.is_default && <Badge tone="gold">fallback</Badge>}
              {rule.reviewed && (
                <Badge tone="green">
                  <Check className="size-3" /> reviewed
                </Badge>
              )}
              {!rule.enabled && <Badge tone="red">disabled</Badge>}
            </div>

            {!open && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {rule.meaning}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Rule Label (Title)">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 text-xs" />
            </Field>

            <Field label="Life Area">
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Love, Career, Health"
                className="h-10 text-xs"
              />
            </Field>

            <Field label="Priority Weight">
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-10 text-xs"
              />
            </Field>

            <Field label="Source Material">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Heart line.docx"
                className="h-10 text-xs"
              />
            </Field>
          </div>

          <Field label="Required Metrics / Features (comma-separated)">
            <Input
              value={requiresStr}
              onChange={(e) => setRequiresStr(e.target.value)}
              placeholder="geometry, heart_line, head_line"
              className="h-10 text-xs font-mono"
            />
          </Field>

          <Field label="Astrological Interpretation (What reading says to user)">
            <Textarea
              rows={4}
              value={meaning}
              maxLength={4000}
              onChange={(e) => setMeaning(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </Field>

          <Field
            label="Condition Thresholds & Metrics (JSON)"
            error={bandError ?? undefined}
            hint={
              isDefault
                ? "This rule is marked as Fallback default: it fires when no other rule in this category matches."
                : 'Condition array: every condition must hold. Example: [{"metric": "heart_line.length", "min": 0.5}]'
            }
          >
            <Textarea
              rows={4}
              value={bands}
              onChange={(e) => setBands(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-4">
              <Switch
                checked={rule.reviewed}
                label="Astrologer Verified"
                onChange={(next) => updateMutation.mutate({ reviewed: next })}
              />
              <Switch
                checked={rule.enabled}
                label="In Use (Active)"
                onChange={(next) => updateMutation.mutate({ enabled: next })}
              />
              <Switch
                checked={isDefault}
                label="Is Fallback"
                onChange={(next) => setIsDefault(next)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-danger hover:bg-danger-surface"
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                loading={updateMutation.isPending}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Create New Palm Rule Modal Component
// -----------------------------------------------------------------------------
function CreatePalmRuleModal({
  open,
  onClose,
  featureLabels,
  areas,
}: {
  open: boolean;
  onClose: () => void;
  featureLabels: Record<string, string>;
  areas: string[];
}) {
  const queryClient = useQueryClient();

  const [feature, setFeature] = React.useState("heart_line");
  const [option, setOption] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [area, setArea] = React.useState("Love");
  const [source, setSource] = React.useState("Vedic Chirology");
  const [priority, setPriority] = React.useState("10");
  const [meaning, setMeaning] = React.useState("");
  const [requiresStr, setRequiresStr] = React.useState("geometry, heart_line");
  const [conditionsStr, setConditionsStr] = React.useState('[{\n  "metric": "heart_line.curvature",\n  "min": 0.45\n}]');
  const [isDefault, setIsDefault] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  const [reviewed, setReviewed] = React.useState(true);

  const [jsonError, setJsonError] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: PalmRuleCreateInput) => palmReadingApi.createRule(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("New Palm rule created successfully!");
      onClose();
      // Reset form
      setOption("");
      setLabel("");
      setMeaning("");
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to create rule."),
  });

  function handleSubmit() {
    setJsonError(null);

    if (!option.trim()) {
      toast.error("Please provide a unique option slug (e.g. curved_deep).");
      return;
    }
    if (!label.trim()) {
      toast.error("Please provide a title/label for the rule.");
      return;
    }
    if (!meaning.trim()) {
      toast.error("Please write the astrological reading text.");
      return;
    }

    let parsedConditions: PalmRuleCondition[] = [];
    if (!isDefault && conditionsStr.trim()) {
      try {
        parsedConditions = JSON.parse(conditionsStr);
        if (!Array.isArray(parsedConditions)) throw new Error("Must be array");
      } catch {
        setJsonError("Conditions must be a valid JSON array.");
        return;
      }
    }

    const reqList = requiresStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createMutation.mutate({
      feature,
      option: option.trim().toLowerCase().replace(/\s+/g, "_"),
      label: label.trim(),
      meaning: meaning.trim(),
      area: area.trim() || null,
      source: source.trim() || null,
      priority: parseInt(priority, 10) || 0,
      requires: reqList.length > 0 ? reqList : ["geometry"],
      conditions: parsedConditions,
      is_default: isDefault,
      enabled,
      reviewed,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Vedic Palm Rule"
      description="Define a new chirological interpretation and threshold condition."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Create Rule
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category / Feature" required>
            <Select
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className="h-10 text-xs"
            >
              {Object.entries(featureLabels).map(([f, fLabel]) => (
                <option key={f} value={f}>
                  {fLabel}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Option Slug (Identifier)" required hint="e.g. deep_curved_saturn">
            <Input
              value={option}
              onChange={(e) => setOption(e.target.value)}
              placeholder="e.g. steep_curve"
              className="h-10 text-xs"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Rule Label (Title)" required>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Steeply Curved Water Line"
              className="h-10 text-xs"
            />
          </Field>

          <Field label="Life Area">
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Love, Temperament"
              className="h-10 text-xs"
            />
          </Field>

          <Field label="Priority (0-100)">
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
        </div>

        <Field label="Required Tracing Features" hint="comma-separated: geometry, heart_line, head_line, life_line, fate_line">
          <Input
            value={requiresStr}
            onChange={(e) => setRequiresStr(e.target.value)}
            className="h-10 text-xs font-mono"
          />
        </Field>

        <Field label="Astrological Interpretation" required>
          <Textarea
            rows={4}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="Detailed chirological forecast and karmic significance…"
            className="text-xs"
          />
        </Field>

        <Field
          label="Conditions Array (JSON)"
          error={jsonError ?? undefined}
          hint={
            isDefault
              ? "Rule is set to Fallback Default. Conditions will be ignored."
              : 'Format: [{"metric": "heart_line.length", "min": 0.5}]'
          }
        >
          <Textarea
            rows={4}
            value={conditionsStr}
            onChange={(e) => setConditionsStr(e.target.value)}
            className="font-mono text-xs"
            disabled={isDefault}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <Switch checked={enabled} label="Active In Use" onChange={setEnabled} />
          <Switch checked={reviewed} label="Astrologer Checked" onChange={setReviewed} />
          <Switch checked={isDefault} label="Is Fallback Rule" onChange={setIsDefault} />
        </div>
      </div>
    </Modal>
  );
}
