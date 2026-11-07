"use client";

import {
  ChevronRight,
  Compass,
  Crosshair,
  Download,
  Eye,
  Highlighter,
  Info,
  Maximize2,
  Minimize2,
  Moon,
  PenTool,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Button, Modal } from "@/components/ui";
import { whiteboardApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtime, useWhiteboardEvents } from "@/providers/realtime-provider";
import type {
  WhiteboardData,
  WhiteboardDrishti,
  WhiteboardPlanet,
  WhiteboardStroke,
  WhiteboardStrokePoint,
} from "@/types";

// ------------------------------------------------------------- Vedic Reference Data

export const HOUSE_INFO: Record<
  number,
  {
    name_en: string;
    name_bn: string;
    sanskrit: string;
    significations_en: string;
    significations_bn: string;
    karaka: string;
  }
> = {
  1: {
    name_en: "1st House (Lagna / Ascendant)",
    name_bn: "১ম ঘর (লগ্ন ভাব)",
    sanskrit: "Tanu Bhava",
    significations_en: "Self, physical body, vitality, personality, life path",
    significations_bn: "আত্মা, শরীর, স্বাস্থ্য, ব্যক্তিত্ব, জীবনীশক্তি ও জীবনের গতি",
    karaka: "Sun (সূর্য)",
  },
  2: {
    name_en: "2nd House (Dhana / Wealth)",
    name_bn: "২য় ঘর (ধন ও পরিবার)",
    sanskrit: "Dhana Bhava",
    significations_en: "Accumulated wealth, savings, speech, family, nutrition, eye sight",
    significations_bn: "সঞ্চিত ধন, পারিবারিক সম্পর্ক, বাকপটুতা, খাদ্য, চোখ",
    karaka: "Jupiter (বৃহস্পতি)",
  },
  3: {
    name_en: "3rd House (Sahaja / Courage)",
    name_bn: "৩য় ঘর (সহজ / পরাক্রম)",
    sanskrit: "Sahaja Bhava",
    significations_en: "Courage, initiative, younger siblings, short journeys, communication",
    significations_bn: "সাহস, উদ্যম, কনিষ্ঠ ভাইবোন, স্বল্প ভ্রমণ, হস্তশিল্প ও যোগাযোগ",
    karaka: "Mars (মঙ্গল)",
  },
  4: {
    name_en: "4th House (Sukha / Home)",
    name_bn: "৪র্থ ঘর (সুখ ও মাতৃ ভাব)",
    sanskrit: "Sukha Bhava",
    significations_en: "Mother, mental peace, home, real estate, vehicles, education",
    significations_bn: "মাতা, মানসিক শান্তি, গৃহ, জমি-বাড়ি, যানবাহন, প্রাথমিক শিক্ষা",
    karaka: "Moon (চন্দ্র) & Venus (শুক্র)",
  },
  5: {
    name_en: "5th House (Putra / Intellect)",
    name_bn: "৫ম ঘর (পুত্র ও পূর্বপুণ্য)",
    sanskrit: "Putra Bhava",
    significations_en: "Children, creativity, intellect, romance, past karma, speculation",
    significations_bn: "সন্তানসন্ততি, উচ্চশিক্ষা, পূর্বজন্মের পুণ্য, সৃজনশীলতা, প্রেম",
    karaka: "Jupiter (বৃহস্পতি)",
  },
  6: {
    name_en: "6th House (Ari / Enemies & Health)",
    name_bn: "৬ষ্ঠ ঘর (শত্রু, ঋণ ও রোগ)",
    sanskrit: "Ari Bhava",
    significations_en: "Obstacles, enemies, debts, diseases, daily service, litigation",
    significations_bn: "রোগ, শত্রু, ঋণ, প্রতিযোগিতা, মামলা-মোকদ্দমা, কর্মক্ষেত্রের শ্রম",
    karaka: "Mars (মঙ্গল) & Saturn (শনি)",
  },
  7: {
    name_en: "7th House (Yuvati / Marriage)",
    name_bn: "৭ম ঘর (জায়া / দাম্পত্য ও অংশীদারি)",
    sanskrit: "Yuvati Bhava",
    significations_en: "Spouse, marriage, business partnerships, public relations",
    significations_bn: "জীবনসঙ্গী, বিবাহিত জীবন, ব্যবসায়িক পার্টনার, জনসম্পর্ক",
    karaka: "Venus (শুক্র) & Jupiter (বৃহস্পতি)",
  },
  8: {
    name_en: "8th House (Randhra / Longevity)",
    name_bn: "৮ম ঘর (আয়ু ও রূপান্তর)",
    sanskrit: "Randhra Bhava",
    significations_en: "Longevity, sudden transformations, occult, inheritance, research",
    significations_bn: "আয়ু, আকস্মিক পরিবর্তন, গুহ্যবিদ্যা, উত্তরাধিকার, রূপান্তর",
    karaka: "Saturn (শনি)",
  },
  9: {
    name_en: "9th House (Bhagya / Fortune)",
    name_bn: "৯ম ঘর (ভাগ্য ও ধর্ম ভাব)",
    sanskrit: "Dharma / Bhagya Bhava",
    significations_en: "Fortune, higher wisdom, Guru, father, spirituality, long journeys",
    significations_bn: "ভাগ্য, ধর্ম, গুরুকৃপা, পিতা, আধ্যাত্মিকতা, দূর ভ্রমণ ও তীর্থযাত্রা",
    karaka: "Jupiter (বৃহস্পতি) & Sun (সূর্য)",
  },
  10: {
    name_en: "10th House (Karma / Career)",
    name_bn: "১০ম ঘর (কর্ম ও যশ ভাব)",
    sanskrit: "Karma Bhava",
    significations_en: "Career, profession, social standing, authority, fame, governance",
    significations_bn: "কর্মজীবন, পদমর্যাদা, সম্মান, রাজযোগ, প্রশাসনিক কর্তৃত্ব, প্রতিষ্ঠা",
    karaka: "Sun, Mercury, Jupiter, Saturn",
  },
  11: {
    name_en: "11th House (Labha / Gains)",
    name_bn: "১১শ ঘর (লাভ ও সিদ্ধি ভাব)",
    sanskrit: "Labha Bhava",
    significations_en: "Gains, regular cashflow, elder siblings, wishes fulfillment, networks",
    significations_bn: "উপার্জন, সমৃদ্ধি, জ্যেষ্ঠ ভাইবোন, মনোবাঞ্ছা পূরণ, বন্ধু ও নেটওয়ার্ক",
    karaka: "Jupiter (বৃহস্পতি)",
  },
  12: {
    name_en: "12th House (Vyaya / Expenses)",
    name_bn: "১২শ ঘর (ব্যয় ও মোক্ষ ভাব)",
    sanskrit: "Vyaya Bhava",
    significations_en: "Expenses, foreign residence, subconscious, spirituality, liberation",
    significations_bn: "ব্যয়, দূরদেশ ভ্রমণ, হাসপাতাল/বিচ্ছিন্নতা, শয়নসুখ, মোক্ষলাভ",
    karaka: "Saturn (শনি) & Ketu (কেতু)",
  },
};

export const RASHI_NAMES: Record<
  number,
  { en: string; bn: string; lord: string; symbol: string }
> = {
  1: { en: "Aries", bn: "মেষ", lord: "Mars", symbol: "♈" },
  2: { en: "Taurus", bn: "বৃষ", lord: "Venus", symbol: "♉" },
  3: { en: "Gemini", bn: "মিথুন", lord: "Mercury", symbol: "♊" },
  4: { en: "Cancer", bn: "কর্কট", lord: "Moon", symbol: "♋" },
  5: { en: "Leo", bn: "সিংহ", lord: "Sun", symbol: "♌" },
  6: { en: "Virgo", bn: "কন্যা", lord: "Mercury", symbol: "♍" },
  7: { en: "Libra", bn: "তুলা", lord: "Venus", symbol: "♎" },
  8: { en: "Scorpio", bn: "বৃশ্চিক", lord: "Mars", symbol: "♏" },
  9: { en: "Sagittarius", bn: "ধনু", lord: "Jupiter", symbol: "♐" },
  10: { en: "Capricorn", bn: "মকর", lord: "Saturn", symbol: "♑" },
  11: { en: "Aquarius", bn: "কুম্ভ", lord: "Saturn", symbol: "♒" },
  12: { en: "Pisces", bn: "মীন", lord: "Jupiter", symbol: "♓" },
};

export const NORTH_INDIAN_CENTERS: Record<number, { x: number; y: number }> = {
  1: { x: 250, y: 125 },
  2: { x: 125, y: 55 },
  3: { x: 55, y: 125 },
  4: { x: 125, y: 250 },
  5: { x: 55, y: 375 },
  6: { x: 125, y: 445 },
  7: { x: 250, y: 375 },
  8: { x: 375, y: 445 },
  9: { x: 445, y: 375 },
  10: { x: 375, y: 250 },
  11: { x: 445, y: 125 },
  12: { x: 375, y: 55 },
};

export const NORTH_INDIAN_POLYGONS: Record<number, string> = {
  1: "250,0 375,125 250,250 125,125",
  2: "0,0 250,0 125,125",
  3: "0,0 125,125 0,250",
  4: "0,250 125,125 250,250 125,375",
  5: "0,250 125,375 0,500",
  6: "0,500 125,375 250,500",
  7: "250,250 375,375 250,500 125,375",
  8: "250,500 375,375 500,500",
  9: "375,375 500,250 500,500",
  10: "375,125 500,250 375,375 250,250",
  11: "500,0 500,250 375,125",
  12: "250,0 500,0 375,125",
};

// South Indian 4x4 Grid layout (fixed signs clockwise)
const SOUTH_GRID_COORDS: Record<number, { col: number; row: number }> = {
  12: { col: 0, row: 0 },
  1: { col: 1, row: 0 },
  2: { col: 2, row: 0 },
  3: { col: 3, row: 0 },
  4: { col: 3, row: 1 },
  5: { col: 3, row: 2 },
  6: { col: 3, row: 3 },
  7: { col: 2, row: 3 },
  8: { col: 1, row: 3 },
  9: { col: 0, row: 3 },
  10: { col: 0, row: 2 },
  11: { col: 0, row: 1 },
};

export function computeLocalDrishti(planetName: string, fromHouse: number): WhiteboardDrishti {
  const norm = planetName.toLowerCase();
  let offsets: number[] = [7];
  let nature: "auspicious" | "challenging" | "neutral" = "neutral";
  let label_en = `${planetName} casts 7th house aspect`;
  let label_bn = `${planetName}-এর ৭ম দৃষ্টি`;

  if (norm.includes("jupiter") || norm.includes("guru") || norm.includes("বৃহস্পতি")) {
    offsets = [5, 7, 9];
    nature = "auspicious";
    label_en = "Jupiter Amrita Drishti (5th, 7th, 9th) — highly protective & expansive";
    label_bn = "বৃহস্পতির শুভ অমৃত দৃষ্টি (৫ম, ৭ম, ৯ম) — পরম রক্ষা কবচ ও প্রজ্ঞা";
  } else if (norm.includes("mars") || norm.includes("mangal") || norm.includes("মঙ্গল")) {
    offsets = [4, 7, 8];
    nature = "challenging";
    label_en = "Mars Special Aspect (4th, 7th, 8th) — passionate, courage & drive";
    label_bn = "মঙ্গলের বিশেষ দৃষ্টি (৪র্থ, ৭ম, ৮ম) — তেজস্বী, উদ্যোগ ও পরাক্রম";
  } else if (norm.includes("saturn") || norm.includes("shani") || norm.includes("শনি")) {
    offsets = [3, 7, 10];
    nature = "challenging";
    label_en = "Saturn Karma Drishti (3rd, 7th, 10th) — discipline, endurance & karmic justice";
    label_bn = "শনির কর্ম বিচার দৃষ্টি (৩য়, ৭ম, ১০ম) — ধৈর্য ও ন্যায়ের পরীক্ষা";
  } else if (
    norm.includes("rahu") ||
    norm.includes("ketu") ||
    norm.includes("রাহু") ||
    norm.includes("কেতু")
  ) {
    offsets = [5, 7, 9];
    nature = "challenging";
    label_en = `${planetName} Chhaya Drishti (5th, 7th, 9th) — karmic intensification`;
    label_bn = `${planetName}-এর ছায়া দৃষ্টি (৫ম, ৭ম, ৯ম)`;
  } else if (norm.includes("venus") || norm.includes("shukra") || norm.includes("শুক্র")) {
    nature = "auspicious";
    label_en = "Venus 7th Aspect — artistic, relationship & prosperity harmony";
    label_bn = "শুক্রের ৭ম দৃষ্টি — সৌম্য, প্রেম ও সৌহার্দ্যপূর্ণ প্রভাব";
  } else if (norm.includes("moon") || norm.includes("chandra") || norm.includes("চন্দ্র")) {
    nature = "auspicious";
    label_en = "Moon 7th Aspect — emotional nourishment & mental clarity";
    label_bn = "চন্দ্রের ৭ম দৃষ্টি — মানসিক শান্তি ও শীতল প্রভাব";
  }

  const aspects_houses = offsets.map((off) => ((fromHouse - 1 + off - 1) % 12) + 1);

  return {
    planet: planetName,
    planet_name: planetName,
    from_house: fromHouse,
    aspect_offsets: offsets,
    aspects_houses,
    nature,
    label_en,
    label_bn,
  };
}

// ------------------------------------------------------------- Component Props

interface CosmicWhiteboardProps {
  callId: string;
  peerUserId?: string;
  role?: "astrologer" | "seeker";
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export function CosmicWhiteboard({
  callId,
  peerUserId,
  role = "astrologer",
  isOpen,
  onClose,
  className,
  theme: propTheme,
  onToggleTheme,
}: CosmicWhiteboardProps) {
  // Theme State (Supports Ultra Pro Light & Dark)
  const [internalTheme, setInternalTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("astra_whiteboard_theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "light";
  });
  const currentTheme = propTheme || internalTheme;
  const isDark = currentTheme === "dark";

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = isDark ? "light" : "dark";
      setInternalTheme(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("astra_whiteboard_theme", next);
      }
    }
  };

  const isAstrologer = role === "astrologer";
  const { sendLive } = useRealtime();

  // Whiteboard State
  const [data, setData] = React.useState<WhiteboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [showTransit, setShowTransit] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"d1" | "d9" | "transit" | "freehand">("d1");
  const [chartStyle, setChartStyle] = React.useState<"north" | "south">("north");
  const [activeDrishti, setActiveDrishti] = React.useState<WhiteboardDrishti | null>(null);
  const [hoveredHouse, setHoveredHouse] = React.useState<number | null>(null);
  const [selectedHouse, setSelectedHouse] = React.useState<number | null>(null);

  // Drawing Tools State (Astrologer)
  const [tool, setTool] = React.useState<"pen" | "highlighter" | "laser" | "stamp" | "house_select">("pen");
  const [color, setColor] = React.useState<string>("#F59E0B"); // Cosmic Gold
  const [width, setWidth] = React.useState<number>(4);
  const [stamp, setStamp] = React.useState<string>("🕉️");
  const [laserPoint, setLaserPoint] = React.useState<{ x: number; y: number } | null>(null);

  // BTR Modal State
  const [btrOpen, setBtrOpen] = React.useState(false);
  const [btrName, setBtrName] = React.useState("");
  const [btrDate, setBtrDate] = React.useState("");
  const [btrTime, setBtrTime] = React.useState("");
  const [btrPlace, setBtrPlace] = React.useState("");
  const [recalculating, setRecalculating] = React.useState(false);

  // Canvas Refs
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawing = React.useRef(false);
  const currentStroke = React.useRef<WhiteboardStrokePoint[]>([]);

  // 1. Initial Load
  const fetchWhiteboard = React.useCallback(async () => {
    try {
      const wb = await whiteboardApi.get(callId);
      setData(wb);
      setActiveTab(wb.active_tab || "d1");
      setChartStyle((wb.chart_style as any) === "south" ? "south" : "north");
      if (wb.drishti) setActiveDrishti(wb.drishti);
      if (wb.birth_date) setBtrDate(wb.birth_date);
      if (wb.birth_time) setBtrTime(wb.birth_time);
      if (wb.client_name) setBtrName(wb.client_name);
      if (wb.birth_place) setBtrPlace(wb.birth_place);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load cosmic whiteboard");
    } finally {
      setLoading(false);
    }
  }, [callId]);

  React.useEffect(() => {
    if (isOpen) {
      void fetchWhiteboard();
    }
  }, [isOpen, fetchWhiteboard]);

  // 2. Realtime WebSocket Listener
  useWhiteboardEvents(
    React.useCallback(
      (event) => {
        if (!isOpen) return;

        if (event.type === "whiteboard_event") {
          const payload = event.data;
          if (payload.call_id && payload.call_id !== callId) return;

          setData((prev) => {
            if (!prev) return prev;
            let nextStrokes = prev.strokes;
            if (payload.clear_strokes) {
              nextStrokes = [];
            } else if (payload.strokes) {
              nextStrokes = payload.strokes;
            } else if (payload.append_stroke) {
              if (!prev.strokes.some((s) => s.id && s.id === payload.append_stroke.id)) {
                nextStrokes = [...prev.strokes, payload.append_stroke];
              }
            }
            return {
              ...prev,
              version: payload.version ?? prev.version,
              strokes: nextStrokes,
              drishti: payload.drishti !== undefined ? payload.drishti : prev.drishti,
              highlighted_houses: payload.highlighted_houses ?? prev.highlighted_houses,
              active_tab: payload.active_tab ?? prev.active_tab,
              is_open: payload.is_open ?? prev.is_open,
              chart_style: payload.chart_style ?? prev.chart_style,
              planets: payload.planets ?? prev.planets,
              transit_planets: payload.transit_planets ?? prev.transit_planets,
              asc_sign_num: payload.asc_sign_num ?? prev.asc_sign_num,
              client_name: payload.client_name ?? prev.client_name,
              birth_date: payload.birth_date ?? prev.birth_date,
              birth_time: payload.birth_time ?? prev.birth_time,
              birth_place: payload.birth_place ?? prev.birth_place,
            };
          });

          if (payload.active_tab) setActiveTab(payload.active_tab);
          if (payload.chart_style) setChartStyle(payload.chart_style === "south" ? "south" : "north");
          if (payload.drishti !== undefined) setActiveDrishti(payload.drishti);
        } else if (event.type === "whiteboard_live") {
          const frame = event.data;
          if (frame.call_id && frame.call_id !== callId) return;

          if (frame.laser) {
            setLaserPoint(frame.laser);
          } else if (frame.stroke) {
            setData((prev) => {
              if (!prev) return prev;
              if (prev.strokes.some((s) => s.id && s.id === frame.stroke.id)) return prev;
              return { ...prev, strokes: [...prev.strokes, frame.stroke] };
            });
          } else if (frame.strokes) {
            setData((prev) => (prev ? { ...prev, strokes: frame.strokes } : prev));
          } else if (frame.clear_strokes) {
            setData((prev) => (prev ? { ...prev, strokes: [] } : prev));
          } else if (frame.live_stroke) {
            // Draw temporary live stroke segment on canvas
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx && frame.live_stroke.points?.length > 1) {
              const pts = frame.live_stroke.points;
              ctx.save();
              ctx.strokeStyle = frame.live_stroke.color;
              ctx.lineWidth = frame.live_stroke.width;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              if (frame.live_stroke.tool === "highlighter") {
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 14;
              }
              ctx.beginPath();
              ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
              ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      },
      [isOpen, callId],
    ),
  );

  // 3. Redraw Canvas Strokes
  const redrawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = data?.strokes || [];
    for (const s of strokes) {
      if (s.tool === "stamp" && s.points.length > 0) {
        ctx.save();
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.stamp_icon || "🕉️", s.points[0].x, s.points[0].y);
        ctx.restore();
        continue;
      }

      if (s.points.length === 1) {
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.points[0].x, s.points[0].y, (s.tool === "highlighter" ? 14 : s.width) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (s.points.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.tool === "highlighter") {
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(s.width, 14);
      }

      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [data?.strokes]);

  React.useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Laser Pointer Decay Timer
  React.useEffect(() => {
    if (!laserPoint) return;
    const t = setTimeout(() => setLaserPoint(null), 1200);
    return () => clearTimeout(t);
  }, [laserPoint]);

  // 4. Mouse / Touch Drawing Handlers (Astrologer Only)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAstrologer) return;
    const { x, y } = getCanvasCoords(e);

    if (tool === "laser") {
      setLaserPoint({ x, y });
      sendLive({
        type: "whiteboard_live",
        to_user: peerUserId,
        data: { call_id: callId, laser: { x, y } },
      });
      return;
    }

    if (tool === "stamp") {
      const newStroke: WhiteboardStroke = {
        id: `stamp_${Date.now()}`,
        tool: "stamp",
        color,
        width: 24,
        points: [{ x, y }],
        stamp_icon: stamp,
      };
      const nextStrokes = [...(data?.strokes || []), newStroke];
      setData((prev) => (prev ? { ...prev, strokes: nextStrokes } : prev));

      // Broadcast stamp immediately over WebSocket to peer
      sendLive({
        type: "whiteboard_live",
        to_user: peerUserId,
        data: {
          call_id: callId,
          stroke: newStroke,
        },
      });

      void whiteboardApi.sync(callId, { append_stroke: newStroke });
      return;
    }

    isDrawing.current = true;
    currentStroke.current = [{ x, y }];

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, (tool === "highlighter" ? 14 : width) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (tool === "laser" && (e.buttons === 1 || isDrawing.current)) {
      setLaserPoint({ x, y });
      sendLive({
        type: "whiteboard_live",
        to_user: peerUserId,
        data: { call_id: callId, laser: { x, y } },
      });
      return;
    }

    if (!isDrawing.current || !isAstrologer) return;

    currentStroke.current.push({ x, y });

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && currentStroke.current.length > 1) {
      const pts = currentStroke.current;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (tool === "highlighter") {
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 14;
      }
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();

      // Broadcast low-latency live stroke segment over WebSocket
      sendLive({
        type: "whiteboard_live",
        to_user: peerUserId,
        data: {
          call_id: callId,
          live_stroke: {
            tool,
            color,
            width,
            points: [pts[pts.length - 2], pts[pts.length - 1]],
          },
        },
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing.current || !isAstrologer) return;
    isDrawing.current = false;

    if (currentStroke.current.length > 0) {
      const newStroke: WhiteboardStroke = {
        id: `s_${Date.now()}`,
        tool,
        color,
        width: tool === "highlighter" ? 14 : width,
        points: [...currentStroke.current],
      };
      const nextStrokes = [...(data?.strokes || []), newStroke];
      setData((prev) => (prev ? { ...prev, strokes: nextStrokes } : prev));
      currentStroke.current = [];

      // Broadcast finished stroke immediately over WebSocket to peer
      sendLive({
        type: "whiteboard_live",
        to_user: peerUserId,
        data: {
          call_id: callId,
          stroke: newStroke,
        },
      });

      // Persist stroke to MongoDB & broadcast authoritative event
      void whiteboardApi.sync(callId, { append_stroke: newStroke });
    }
  };

  // 5. Undo & Clear Canvas
  const handleUndo = async () => {
    if (!data?.strokes.length) return;
    const nextStrokes = data.strokes.slice(0, -1);
    setData((prev) => (prev ? { ...prev, strokes: nextStrokes } : prev));
    sendLive({
      type: "whiteboard_live",
      to_user: peerUserId,
      data: {
        call_id: callId,
        strokes: nextStrokes,
      },
    });
    try {
      await whiteboardApi.sync(callId, { strokes: nextStrokes });
      toast.success("Last annotation undone");
    } catch {
      toast.error("Failed to undo");
    }
  };

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all markings and annotations?")) return;
    setData((prev) => (prev ? { ...prev, strokes: [], drishti: null, highlighted_houses: [] } : prev));
    setActiveDrishti(null);
    sendLive({
      type: "whiteboard_live",
      to_user: peerUserId,
      data: {
        call_id: callId,
        clear_strokes: true,
      },
    });
    try {
      await whiteboardApi.clear(callId);
      toast.success("Cosmic whiteboard cleared");
    } catch {
      toast.error("Failed to clear whiteboard");
    }
  };

  // 6. Drishti Aspect Selection
  const handleSelectPlanetDrishti = (planet: WhiteboardPlanet) => {
    if ((activeDrishti?.planet || activeDrishti?.planet_name) === planet.name) {
      setActiveDrishti(null);
      void whiteboardApi.sync(callId, { drishti: null });
      return;
    }

    const houseNum = activeTab === "d9" ? planet.d9_house_num || planet.house_num : planet.house_num;
    const drishti = computeLocalDrishti(planet.name, houseNum);
    setActiveDrishti(drishti);
    void whiteboardApi.sync(callId, { drishti });
  };

  // 7. House Highlight Toggle
  const handleHouseClick = (houseNum: number) => {
    setSelectedHouse((prev) => (prev === houseNum ? null : houseNum));

    if (isAstrologer && tool === "house_select") {
      const current = data?.highlighted_houses || [];
      const next = current.includes(houseNum)
        ? current.filter((h) => h !== houseNum)
        : [...current, houseNum];
      setData((prev) => (prev ? { ...prev, highlighted_houses: next } : prev));
      void whiteboardApi.sync(callId, { highlighted_houses: next });
    }
  };

  // 8. BTR Recalculation
  const handleRecalculateBtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!btrDate || !btrTime) {
      toast.error("Please enter birth date and exact rectified time");
      return;
    }
    setRecalculating(true);
    try {
      const updated = await whiteboardApi.loadChart(callId, {
        name: btrName || undefined,
        date: btrDate,
        time: btrTime,
        place: btrPlace || undefined,
      });
      setData(updated);
      setBtrOpen(false);
      toast.success("Kundali recalculated with rectified birth time!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to recalculate chart");
    } finally {
      setRecalculating(false);
    }
  };

  // 9. Download High-Res Marked Kundali Snapshot
  const handleDownloadSnapshot = async () => {
    try {
      const svg = document.getElementById(`cosmic-chart-svg-${callId}`);
      const canvas = canvasRef.current;
      if (!svg || !canvas) {
        toast.error("Could not capture chart");
        return;
      }

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1000;
      exportCanvas.height = 1100;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      const clientName = data?.client_name || "Seeker";
      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const ascSign = data?.asc_sign_num ? RASHI_NAMES[data.asc_sign_num] : null;

      if (isDark) {
        // Dark Cosmic Starry Background
        const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1100);
        bgGrad.addColorStop(0, "#090d16");
        bgGrad.addColorStop(0.5, "#0b1329");
        bgGrad.addColorStop(1, "#030712");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1000, 1100);

        // Star particles
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        for (let i = 0; i < 70; i++) {
          const sx = (i * 137.5) % 1000;
          const sy = (i * 223.7) % 1100;
          ctx.fillRect(sx, sy, (i % 3) + 1, (i % 3) + 1);
        }

        // Title & Header Banner
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ASTRA ASTROLOGY • LIVE COSMIC CONSULTATION", 500, 45);

        ctx.fillStyle = "#E2E8F0";
        ctx.font = "16px sans-serif";
        ctx.fillText(
          `Consultation with ${clientName}  |  Date: ${dateStr}  |  Lagna: ${ascSign?.en || "Aries"} (${ascSign?.bn || "মেষ"})`,
          500,
          75,
        );
      } else {
        // Sacred Light Ivory Parchment Keepsake Background
        const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1100);
        bgGrad.addColorStop(0, "#fffdf6");
        bgGrad.addColorStop(0.5, "#faf3e1");
        bgGrad.addColorStop(1, "#f2e6cb");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1000, 1100);

        // Gold decorative outer border
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 960, 1060);

        ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(26, 26, 948, 1048);

        // Title & Header Banner
        ctx.fillStyle = "#78350f";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ASTRA ASTROLOGY • LIVE SACRED KUNDALI", 500, 48);

        ctx.fillStyle = "#57482f";
        ctx.font = "16px sans-serif";
        ctx.fillText(
          `Consultation with ${clientName}  |  Date: ${dateStr}  |  Lagna: ${ascSign?.en || "Aries"} (${ascSign?.bn || "মেষ"})`,
          500,
          75,
        );
      }

      // Render SVG Chart onto offscreen image
      const svgXml = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 50, 95, 900, 900);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Overlay the freehand pen & stamp canvas
      ctx.drawImage(canvas, 50, 95, 900, 900);

      // Watermark footer
      ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.7)" : "#78350f";
      ctx.font = "14px sans-serif";
      ctx.fillText(
        "Astra Astrology Authentic Vedic Analysis • Live Chamber Sacred Whiteboard",
        500,
        1040,
      );

      // Trigger download
      const pngUrl = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `Astra-Cosmic-Chart-${(data?.client_name || "Seeker").replace(/\s+/g, "_")}-${Date.now()}.png`;
      a.click();
      toast.success("Cosmic chart snapshot downloaded!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download chart");
    }
  };

  if (!isOpen) return null;

  // Active Planets based on current tab
  const ascSignNum = data?.asc_sign_num || 1;
  const planetsList = (data?.planets || []).map((p) => {
    const house = activeTab === "d9" ? p.d9_house_num || p.house_num : p.house_num;
    const sign = activeTab === "d9" ? p.d9_sign_num || p.sign_num : p.sign_num;
    return { ...p, house_num: house, sign_num: sign };
  });

  const transitPlanetsList = data?.transit_planets || [];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl transition-all duration-300 z-30 overflow-hidden",
        isDark
          ? "border border-amber-500/30 bg-night-950/95 text-white backdrop-blur-xl shadow-2xl"
          : "border border-[#e2d5a3] bg-[#fffdfa]/95 text-[#1c1917] backdrop-blur-xl shadow-2xl ring-1 ring-amber-400/20",
        fullscreen
          ? "fixed inset-2 md:inset-6 z-50 h-[calc(100vh-3rem)]"
          : "absolute inset-x-2 bottom-2 top-16 md:inset-auto md:right-4 md:top-16 md:w-[600px] md:h-[calc(100vh-6rem)]",
        className,
      )}
    >
      {/* ---------------- Header Toolbar ---------------- */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5 transition-colors",
          isDark
            ? "border-white/10 bg-night-900/90 text-white"
            : "border-[#ecdcb0] bg-gradient-to-r from-[#fefbf1] to-[#f8f1dc] text-[#1c1917]",
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-[#854d0e]",
            )}
          >
            <Sparkles className="size-4 animate-spin-slow" />
          </div>
          <div>
            <h3
              className={cn(
                "text-xs font-bold tracking-wide flex items-center gap-1.5",
                isDark ? "text-amber-300" : "text-[#78350f] font-extrabold",
              )}
            >
              Cosmic Whiteboard (কসমিক হোয়াইটবোর্ড)
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  isDark
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300/60",
                )}
              >
                Live Sync
              </span>
            </h3>
            <p className={cn("text-[10px]", isDark ? "text-white/60" : "text-[#57482f] font-medium")}>
              {data?.client_name || "Seeker"} • Lagna: {RASHI_NAMES[ascSignNum]?.bn} (
              {RASHI_NAMES[ascSignNum]?.en} {ascSignNum})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={handleToggleTheme}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg border transition-all",
              isDark
                ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10 hover:text-amber-200"
                : "border-[#d8c38c] bg-white text-amber-700 hover:bg-amber-50 shadow-xs",
            )}
            title={isDark ? "Switch to Sacred Ivory Light Mode" : "Switch to Cosmic Night Dark Mode"}
          >
            {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>

          {isAstrologer && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBtrOpen(true)}
              className={cn(
                "h-7 px-2 text-[10px] font-semibold transition-all",
                isDark
                  ? "border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
                  : "border-[#d4a853] bg-amber-50 text-[#78350f] hover:bg-amber-100 font-bold",
              )}
              title="Rectify client's birth time and recalculate chart"
            >
              <RefreshCw className="size-3 mr-1" />
              BTR / Edit
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownloadSnapshot}
            className={cn(
              "h-7 px-2 text-[10px] font-semibold transition-all",
              isDark
                ? "border-white/10 hover:bg-white/10 text-white"
                : "border-[#ecdcb0] bg-white text-[#78350f] hover:bg-amber-50 font-bold shadow-xs",
            )}
            title="Download high-resolution marked cosmic chart"
          >
            <Download className="size-3 mr-1 text-amber-500" />
            Snapshot
          </Button>

          <button
            onClick={() => setFullscreen((v) => !v)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              isDark
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-[#78350f]/80 hover:bg-amber-100/70 hover:text-[#78350f]",
            )}
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            onClick={onClose}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              isDark
                ? "text-white/70 hover:bg-rose-500/20 hover:text-rose-300"
                : "text-rose-700/80 hover:bg-rose-100 hover:text-rose-900",
            )}
            title="Close Whiteboard"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ---------------- Subheader Tabs & Quick Toggles ---------------- */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-xs transition-colors",
          isDark ? "border-white/10 bg-night-950/80" : "border-[#ecdcb0] bg-[#faf4e4]",
        )}
      >
        {/* Chart View Tabs */}
        <div
          className={cn(
            "flex items-center rounded-xl p-0.5 border",
            isDark ? "bg-black/40 border-white/10" : "bg-[#f0e6ca] border-[#e2d5a3]",
          )}
        >
          {(
            [
              { id: "d1", label: "D1 Lagna (জন্ম)" },
              { id: "d9", label: "D9 Navamsha (নবাংশ)" },
              { id: "freehand", label: "Freehand (ক্যানভাস)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                if (isAstrologer) void whiteboardApi.sync(callId, { active_tab: t.id });
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                activeTab === t.id
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : isDark
                    ? "text-white/70 hover:text-white"
                    : "text-[#78350f]/80 hover:text-[#78350f] font-medium",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chart Style & Transit Overlay Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTransit((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-colors",
              showTransit
                ? isDark
                  ? "border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  : "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                : isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:text-white"
                  : "border-[#e2d5a3] bg-white/70 text-[#78350f]/80 hover:bg-white",
            )}
            title="Toggle current real-time planetary transits (গোচর)"
          >
            <Eye className="size-3" />
            Gochar (গোচর)
          </button>

          <button
            onClick={() => setChartStyle((s) => (s === "north" ? "south" : "north"))}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] transition-colors",
              isDark
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                : "border-[#e2d5a3] bg-white/80 text-[#78350f] hover:bg-white font-medium shadow-2xs",
            )}
            title="Toggle North Diamond vs South Grid chart style"
          >
            <Compass className="size-3 text-amber-500" />
            {chartStyle === "north" ? "North (ডায়মন্ড)" : "South (গ্রিড)"}
          </button>
        </div>
      </div>

      {/* ---------------- Astrologer Drawing & Aspect Toolbar ---------------- */}
      {isAstrologer && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-xs transition-colors",
            isDark ? "border-white/10 bg-night-900/60 text-white" : "border-[#ecdcb0] bg-[#f8f0d8] text-[#1c1917]",
          )}
        >
          {/* Tool Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool("pen")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                tool === "pen"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                    ? "text-white/70 hover:bg-white/10"
                    : "text-[#78350f] hover:bg-amber-200/60",
              )}
              title="Cosmic Pen (ড্রয়িং পেন)"
            >
              <PenTool className="size-3.5" />
            </button>
            <button
              onClick={() => setTool("highlighter")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                tool === "highlighter"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                    ? "text-white/70 hover:bg-white/10"
                    : "text-[#78350f] hover:bg-amber-200/60",
              )}
              title="Highlighter (হাইলাইটার)"
            >
              <Highlighter className="size-3.5" />
            </button>
            <button
              onClick={() => setTool("laser")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                tool === "laser"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                    ? "text-white/70 hover:bg-white/10"
                    : "text-[#78350f] hover:bg-amber-200/60",
              )}
              title="Laser Pointer (লেজার নির্দেশক)"
            >
              <Crosshair className="size-3.5" />
            </button>
            <button
              onClick={() => setTool("house_select")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                tool === "house_select"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                    ? "text-white/70 hover:bg-white/10"
                    : "text-[#78350f] hover:bg-amber-200/60",
              )}
              title="Bhava Glow (ঘর হাইলাইট)"
            >
              <Zap className="size-3.5" />
            </button>

            {/* Colors */}
            <div className={cn("mx-1 h-4 w-px", isDark ? "bg-white/20" : "bg-amber-300")} />
            {(
              [
                { c: "#F59E0B", name: "Gold" },
                { c: "#EF4444", name: "Crimson" },
                { c: "#06B6D4", name: "Cyan" },
                { c: "#10B981", name: "Emerald" },
                { c: "#A855F7", name: "Purple" },
                { c: "#1c1917", name: "Mahogany" },
              ] as const
            ).map((item) => (
              <button
                key={item.c}
                onClick={() => setColor(item.c)}
                className={cn(
                  "size-4 rounded-full transition-transform",
                  isDark ? "border border-white/40" : "border border-[#78350f]/30",
                  color === item.c && (isDark ? "scale-125 ring-2 ring-white" : "scale-125 ring-2 ring-amber-700"),
                )}
                style={{ backgroundColor: item.c }}
                title={item.name}
              />
            ))}

            {/* Sacred Stamps */}
            <div className={cn("mx-1 h-4 w-px", isDark ? "bg-white/20" : "bg-amber-300")} />
            {(["🕉️", "卐", "⭐", "⚠️", "💎"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setTool("stamp");
                  setStamp(s);
                }}
                className={cn(
                  "rounded-md px-1 py-0.5 text-xs transition-colors",
                  tool === "stamp" && stamp === s
                    ? isDark
                      ? "bg-white/20 scale-110"
                      : "bg-amber-200 scale-110 ring-1 ring-amber-500"
                    : isDark
                      ? "hover:bg-white/10"
                      : "hover:bg-amber-200/50 text-[#78350f]",
                )}
                title={`Place sacred symbol ${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Undo & Clear */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!data?.strokes?.length}
              className={cn(
                "rounded-lg p-1 transition-colors disabled:opacity-30",
                isDark ? "text-white/70 hover:bg-white/10" : "text-[#78350f] hover:bg-amber-200/50",
              )}
              title="Undo last stroke"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              onClick={handleClear}
              className={cn(
                "rounded-lg p-1 transition-colors",
                isDark ? "text-rose-300 hover:bg-rose-500/20" : "text-rose-700 hover:bg-rose-100",
              )}
              title="Clear all annotations"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Drishti (Planetary Aspects) Quick Bar ---------------- */}
      <div
        className={cn(
          "flex items-center gap-1 overflow-x-auto border-b px-3 py-1 scrollbar-none text-[11px] transition-colors",
          isDark ? "border-white/10 bg-night-950/60" : "border-[#ecdcb0] bg-[#faf5e8]",
        )}
      >
        <span
          className={cn(
            "text-[10px] font-bold whitespace-nowrap mr-1 flex items-center gap-1",
            isDark ? "text-amber-400" : "text-[#854d0e] font-extrabold",
          )}
        >
          <Zap className="size-3" />
          Drishti (দৃষ্টি):
        </span>
        {planetsList.map((p) => {
          const isSelected = (activeDrishti?.planet || activeDrishti?.planet_name) === p.name;
          return (
            <button
              key={p.name}
              onClick={() => handleSelectPlanetDrishti(p)}
              className={cn(
                "rounded-lg px-2 py-0.5 whitespace-nowrap transition-all font-medium flex items-center gap-1",
                isSelected
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                  : isDark
                    ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/5"
                    : "bg-white/80 text-[#57482f] hover:bg-white border border-[#e2d5a3] font-medium shadow-2xs",
              )}
            >
              <span>{p.symbol || p.code || p.name.slice(0, 2)}</span>
              <span>{p.name}</span>
            </button>
          );
        })}
        {activeDrishti && (
          <button
            onClick={() => {
              setActiveDrishti(null);
              void whiteboardApi.sync(callId, { drishti: null });
            }}
            className={cn(
              "rounded-lg px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
              isDark
                ? "bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300",
            )}
          >
            Clear
          </button>
        )}
      </div>

      {/* Active Drishti Explanation Banner */}
      {activeDrishti && (
        <div
          className={cn(
            "flex items-center justify-between px-3 py-1 text-[11px] font-medium border-b transition-colors",
            activeDrishti.nature === "auspicious"
              ? isDark
                ? "bg-emerald-950/60 text-emerald-200 border-emerald-500/30"
                : "bg-emerald-50 text-[#065f46] border-emerald-200 font-semibold"
              : activeDrishti.nature === "challenging"
                ? isDark
                  ? "bg-rose-950/60 text-rose-200 border-rose-500/30"
                  : "bg-rose-50 text-[#9f1239] border-rose-200 font-semibold"
                : isDark
                  ? "bg-sky-950/60 text-sky-200 border-sky-500/30"
                  : "bg-sky-50 text-[#0369a1] border-sky-200 font-semibold",
          )}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0" />
            <span>
              {activeDrishti.label_bn} — House {activeDrishti.from_house} → Aspects:{" "}
              {activeDrishti.aspects_houses.map((h) => `${h}th`).join(", ")}
            </span>
          </div>
          <span className="text-[10px] opacity-75 font-mono">
            {activeDrishti.nature.toUpperCase()}
          </span>
        </div>
      )}

      {/* ---------------- Main Chart + Canvas Canvas ---------------- */}
      <div
        className={cn(
          "relative flex-1 overflow-auto flex items-center justify-center p-2 select-none transition-colors",
          isDark
            ? "bg-gradient-to-b from-night-950 via-night-900 to-black"
            : "bg-gradient-to-b from-[#fbf8ef] via-[#f7f1df] to-[#ede3c6]",
        )}
      >
        {loading ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 text-xs animate-pulse",
              isDark ? "text-amber-300" : "text-[#78350f] font-semibold",
            )}
          >
            <Sparkles className="size-6 animate-spin-slow" />
            Calculating Vedic Kundali & Gochar...
          </div>
        ) : (
          <div className="relative aspect-square w-full max-w-[500px]">
            {/* North Indian Diamond Chart SVG */}
            {chartStyle === "north" ? (
              <svg
                id={`cosmic-chart-svg-${callId}`}
                viewBox="0 0 500 500"
                className="size-full overflow-visible drop-shadow-md"
              >
                <defs>
                  {/* Aspect Arrowhead */}
                  <marker
                    id="drishti-arrow-auspicious"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
                  </marker>
                  <marker
                    id="drishti-arrow-challenging"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
                  </marker>
                  <marker
                    id="drishti-arrow-neutral"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
                  </marker>

                  <radialGradient id="house-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="drishti-target-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Chart Background Box */}
                <rect
                  width="500"
                  height="500"
                  fill={isDark ? "#080d1a" : "#fffef9"}
                  stroke={isDark ? "#d97706" : "#b45309"}
                  strokeWidth="2.5"
                />

                {/* 12 House Polygons */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((houseNum) => {
                  const pts = NORTH_INDIAN_POLYGONS[houseNum];
                  const signNum = ((ascSignNum - 1 + houseNum - 1) % 12) + 1;
                  const center = NORTH_INDIAN_CENTERS[houseNum];
                  const isHighlighted = (data?.highlighted_houses || []).includes(houseNum);
                  const isDrishtiTarget = activeDrishti?.aspects_houses.includes(houseNum);
                  const isDrishtiSource = activeDrishti?.from_house === houseNum;
                  const isHouseHovered = hoveredHouse === houseNum || selectedHouse === houseNum;

                  // Natal Planets in this House
                  const natalInHouse = planetsList.filter((p) => p.house_num === houseNum);
                  // Transit Planets in this House
                  const transitInHouse = showTransit
                    ? transitPlanetsList.filter((p) => {
                        const trHouse = ((p.sign_num - ascSignNum + 12) % 12) + 1;
                        return trHouse === houseNum;
                      })
                    : [];

                  return (
                    <g
                      key={houseNum}
                      onClick={() => handleHouseClick(houseNum)}
                      onMouseEnter={() => setHoveredHouse(houseNum)}
                      onMouseLeave={() => setHoveredHouse(null)}
                      className="cursor-pointer transition-colors"
                    >
                      <polygon
                        points={pts}
                        fill={
                          isDrishtiSource
                            ? isDark
                              ? "#78350f"
                              : "#fde68a"
                            : isDrishtiTarget
                              ? isDark
                                ? "rgba(16, 185, 129, 0.22)"
                                : "rgba(16, 185, 129, 0.18)"
                              : isHighlighted
                                ? isDark
                                  ? "rgba(245, 158, 11, 0.25)"
                                  : "rgba(245, 158, 11, 0.2)"
                                : isHouseHovered
                                  ? isDark
                                    ? "#1e293b"
                                    : "#fef3c7"
                                  : isDark
                                    ? "#0b1329"
                                    : "#fffbf0"
                        }
                        stroke={
                          isDrishtiTarget
                            ? "#10B981"
                            : isDrishtiSource
                              ? "#F59E0B"
                              : isHighlighted
                                ? "#FBBF24"
                                : "#b45309"
                        }
                        strokeWidth={isDrishtiTarget || isHighlighted ? "2.5" : "1.2"}
                      />

                      {/* Rashi (Sign Number) */}
                      <text
                        x={
                          houseNum === 1
                            ? center.x
                            : houseNum === 2
                              ? center.x - 20
                              : houseNum === 4
                                ? center.x - 30
                                : houseNum === 7
                                  ? center.x
                                  : houseNum === 10
                                    ? center.x + 30
                                    : center.x
                        }
                        y={
                          houseNum === 1
                            ? center.y - 35
                            : houseNum === 7
                              ? center.y + 40
                              : center.y - 18
                        }
                        fill={isDark ? "#fbbf24" : "#92400e"}
                        fontSize="13"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="select-none opacity-85"
                      >
                        {signNum}
                      </text>

                      {/* House Label */}
                      <text
                        x={center.x}
                        y={center.y - 5}
                        fill={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(120, 53, 15, 0.65)"}
                        fontSize="9"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {HOUSE_INFO[houseNum]?.name_bn?.split(" ")[0]} ({houseNum})
                      </text>

                      {/* Natal Planets Listing */}
                      <g transform={`translate(${center.x}, ${center.y + 10})`}>
                        {natalInHouse.map((p, idx) => {
                          const yOffset = idx * 13;
                          return (
                            <text
                              key={p.name}
                              x="0"
                              y={yOffset}
                              fill={p.is_retrograde ? (isDark ? "#f87171" : "#dc2626") : isDark ? "#fef08a" : "#1c1917"}
                              fontSize="11"
                              fontWeight={isDark ? "600" : "700"}
                              textAnchor="middle"
                              className="select-none"
                            >
                              {p.symbol || p.code || p.name.slice(0, 2)}
                              {p.is_retrograde ? " (R)" : ""}
                              {p.degree !== undefined ? ` ${Math.round(p.degree)}°` : ""}
                            </text>
                          );
                        })}
                      </g>

                      {/* Transit Planets Overlay */}
                      {transitInHouse.length > 0 && (
                        <g transform={`translate(${center.x}, ${center.y + 25 + natalInHouse.length * 10})`}>
                          {transitInHouse.map((tp, idx) => (
                            <text
                              key={tp.name}
                              x="0"
                              y={idx * 11}
                              fill={isDark ? "#34d399" : "#047857"}
                              fontSize="9.5"
                              fontWeight="bold"
                              textAnchor="middle"
                              className="select-none"
                            >
                              [TR] {tp.code || tp.name.slice(0, 2)}
                            </text>
                          ))}
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Outer Diamond Line */}
                <polygon
                  points="250,0 500,250 250,500 0,250"
                  fill="none"
                  stroke={isDark ? "#d97706" : "#b45309"}
                  strokeWidth="2"
                />

                {/* Diagonal Cross Lines */}
                <line x1="0" y1="0" x2="500" y2="500" stroke={isDark ? "#b45309" : "#b45309"} strokeWidth="1.5" />
                <line x1="500" y1="0" x2="0" y2="500" stroke={isDark ? "#b45309" : "#b45309"} strokeWidth="1.5" />

                {/* Animated Drishti Aspect Arrows */}
                {activeDrishti &&
                  activeDrishti.aspects_houses.map((targetHouse) => {
                    const fromC = NORTH_INDIAN_CENTERS[activeDrishti.from_house];
                    const toC = NORTH_INDIAN_CENTERS[targetHouse];
                    const markerId =
                      activeDrishti.nature === "auspicious"
                        ? "drishti-arrow-auspicious"
                        : activeDrishti.nature === "challenging"
                          ? "drishti-arrow-challenging"
                          : "drishti-arrow-neutral";
                    const strokeColor =
                      activeDrishti.nature === "auspicious"
                        ? "#10B981"
                        : activeDrishti.nature === "challenging"
                          ? "#EF4444"
                          : "#38BDF8";

                    // Curvature control point
                    const midX = (fromC.x + toC.x) / 2;
                    const midY = (fromC.y + toC.y) / 2;
                    const dx = toC.x - fromC.x;
                    const dy = toC.y - fromC.y;
                    const ctrlX = midX - dy * 0.15;
                    const ctrlY = midY + dx * 0.15;

                    return (
                      <g key={targetHouse}>
                        <path
                          d={`M ${fromC.x} ${fromC.y} Q ${ctrlX} ${ctrlY} ${toC.x} ${toC.y}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.5"
                          strokeDasharray="6,4"
                          markerEnd={`url(#${markerId})`}
                          className="animate-pulse"
                        />
                      </g>
                    );
                  })}
              </svg>
            ) : (
              /* South Indian 4x4 Grid SVG */
              <svg
                id={`cosmic-chart-svg-${callId}`}
                viewBox="0 0 500 500"
                className="size-full overflow-visible drop-shadow-md"
              >
                <rect
                  width="500"
                  height="500"
                  fill={isDark ? "#080d1a" : "#fffef9"}
                  stroke={isDark ? "#d97706" : "#b45309"}
                  strokeWidth="2.5"
                />
                {/* 12 Zodiac Houses in South Indian Grid */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((signNum) => {
                  const coord = SOUTH_GRID_COORDS[signNum];
                  const x = coord.col * 125;
                  const y = coord.row * 125;
                  const houseNum = ((signNum - ascSignNum + 12) % 12) + 1;
                  const isLagna = houseNum === 1;
                  const isDrishtiTarget = activeDrishti?.aspects_houses.includes(houseNum);
                  const isDrishtiSource = activeDrishti?.from_house === houseNum;
                  const natalInHouse = planetsList.filter((p) => p.house_num === houseNum);

                  return (
                    <g
                      key={signNum}
                      onClick={() => handleHouseClick(houseNum)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width="125"
                        height="125"
                        fill={
                          isDrishtiSource
                            ? isDark
                              ? "#78350f"
                              : "#fde68a"
                            : isDrishtiTarget
                              ? isDark
                                ? "rgba(16, 185, 129, 0.22)"
                                : "rgba(16, 185, 129, 0.18)"
                              : isLagna
                                ? isDark
                                  ? "rgba(245, 158, 11, 0.2)"
                                  : "rgba(245, 158, 11, 0.18)"
                                : isDark
                                  ? "#0b1329"
                                  : "#fffbf0"
                        }
                        stroke="#b45309"
                        strokeWidth="1.2"
                      />
                      <text
                        x={x + 8}
                        y={y + 16}
                        fill={isDark ? "#fbbf24" : "#92400e"}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {RASHI_NAMES[signNum]?.bn} ({signNum})
                      </text>
                      {isLagna && (
                        <text
                          x={x + 115}
                          y={y + 16}
                          fill={isDark ? "#f59e0b" : "#b45309"}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          [LAGNA]
                        </text>
                      )}
                      <g transform={`translate(${x + 62}, ${y + 40})`}>
                        {natalInHouse.map((p, idx) => (
                          <text
                            key={p.name}
                            x="0"
                            y={idx * 14}
                            fill={isDark ? "#fef08a" : "#1c1917"}
                            fontSize="10"
                            fontWeight={isDark ? "600" : "700"}
                            textAnchor="middle"
                          >
                            {p.symbol || p.name}
                          </text>
                        ))}
                      </g>
                    </g>
                  );
                })}
                {/* Center Brahmastana Info Box */}
                <rect
                  x="125"
                  y="125"
                  width="250"
                  height="250"
                  fill={isDark ? "#030712" : "#fefce8"}
                  stroke={isDark ? "#d97706" : "#b45309"}
                />
                <text
                  x="250"
                  y="235"
                  fill={isDark ? "#f59e0b" : "#b45309"}
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ASTRA ASTROLOGY
                </text>
                <text
                  x="250"
                  y="260"
                  fill={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(120, 53, 15, 0.75)"}
                  fontSize="11"
                  fontWeight="medium"
                  textAnchor="middle"
                >
                  South Indian Grid View
                </text>
              </svg>
            )}

            {/* Collaborative Transparent HTML5 Canvas Overlay */}
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={cn(
                "absolute inset-0 size-full touch-none z-10",
                isAstrologer ? "cursor-crosshair" : "cursor-default pointer-events-none",
              )}
            />

            {/* Live Laser Pointer Marker */}
            {laserPoint && (
              <div
                className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_12px_#ef4444] animate-ping"
                style={{
                  left: `${(laserPoint.x / 500) * 100}%`,
                  top: `${(laserPoint.y / 500) * 100}%`,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ---------------- House Inspector Footnote ---------------- */}
      {(hoveredHouse || selectedHouse) && (
        <div
          className={cn(
            "border-t px-3 py-2 text-xs transition-colors",
            isDark
              ? "border-white/10 bg-night-950/95 text-white"
              : "border-[#e2d5a3] bg-gradient-to-r from-[#fff9ea] to-[#fbf4de] text-[#1a1208] shadow-xs",
          )}
        >
          {(() => {
            const h = hoveredHouse || selectedHouse || 1;
            const info = HOUSE_INFO[h];
            const sign = ((ascSignNum - 1 + h - 1) % 12) + 1;
            const inHouse = planetsList.filter((p) => p.house_num === h);

            return (
              <div className="flex flex-col gap-1">
                <div
                  className={cn(
                    "flex items-center justify-between font-bold",
                    isDark ? "text-amber-300" : "text-[#854d0e] font-black",
                  )}
                >
                  <span>
                    {info.name_bn} ({info.name_en}) • Sign: {RASHI_NAMES[sign]?.bn} ({RASHI_NAMES[sign]?.en})
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      isDark ? "text-white/60" : "text-[#78350f]/80 font-bold",
                    )}
                  >
                    Karaka: {info.karaka}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px] leading-relaxed",
                    isDark ? "text-white/80" : "text-[#57482f] font-medium",
                  )}
                >
                  {info.significations_bn}
                </p>
                {inHouse.length > 0 && (
                  <p
                    className={cn(
                      "text-[10px] font-semibold",
                      isDark ? "text-emerald-300" : "text-[#065f46] font-bold",
                    )}
                  >
                    Planets in House:{" "}
                    {inHouse
                      .map((p) => `${p.name}${p.is_retrograde ? " (R)" : ""} ${p.degree ? `${Math.round(p.degree)}°` : ""}`)
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ---------------- BTR / Birth Time Rectification Modal ---------------- */}
      {btrOpen && (
        <Modal
          open={btrOpen}
          onClose={() => setBtrOpen(false)}
          title="Birth Time Rectification (BTR / জন্মসময় সংশোধন)"
          description="Adjust client's exact birth details to recalculate the Lagna, D1, D9, and transit chart live during the consultation."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setBtrOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={recalculating}
                onClick={handleRecalculateBtr}
                className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
              >
                {recalculating ? "Recalculating..." : "Recalculate Chart"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRecalculateBtr} className="space-y-3 py-2 text-xs text-slate-800">
            <div>
              <label className="block text-[11px] font-bold mb-1">Client Name</label>
              <input
                type="text"
                value={btrName}
                onChange={(e) => setBtrName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold mb-1">Birth Date *</label>
                <input
                  type="date"
                  required
                  value={btrDate}
                  onChange={(e) => setBtrDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Rectified Time (HH:MM) *</label>
                <input
                  type="time"
                  required
                  value={btrTime}
                  onChange={(e) => setBtrTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1">Place of Birth (City / Country)</label>
              <input
                type="text"
                value={btrPlace}
                onChange={(e) => setBtrPlace(e.target.value)}
                placeholder="e.g. Kolkata, India"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
