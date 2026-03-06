import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ============================================================
// HAJWALAH CORSA 2 — AI MARKETING AGENT
// وكيل التسويق الذكي — هجولة كورسا ٢
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_HEADERS = {
  "content-type": "application/json",
  "x-api-key": ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
};
const IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const PURPLE = {
  50: "#faf5ff",
  100: "#f3e8ff",
  200: "#e9d5ff",
  300: "#d8b4fe",
  400: "#c084fc",
  500: "#a855f7",
  600: "#9333ea",
  700: "#7e22ce",
  800: "#6b21a8",
  900: "#581c87",
};

const POST_TYPE_IDS = ["update", "event", "car", "tip", "season", "collab"];
const STYLE_OPTIONS = {
  compositions: ["dynamic-diagonal", "centered", "rule-of-thirds"],
  textPlacements: ["bottom-right", "center", "top-right"],
  arabicFonts: ["bold-kufi", "naskh", "ruqaa"],
};
const COLOR_CANDIDATES = ["#7e22ce", "#1a1a2e", "#ff6b35", "#000000", "#ffffff", "#e74c3c", "#3498db"];

const COLOR_NAMES_AR = {
  "#7e22ce": "بنفسجي",
  "#1a1a2e": "أسود غامق",
  "#ff6b35": "برتقالي",
  "#000000": "أسود",
  "#ffffff": "أبيض",
  "#e74c3c": "أحمر",
  "#3498db": "أزرق",
};
const COMPOSITION_LABELS_AR = {
  "dynamic-diagonal": "قطري ديناميكي",
  centered: "مركزي",
  "rule-of-thirds": "قاعدة الأثلاث",
};
const FONT_LABELS_AR = {
  "bold-kufi": "كوفي عريض",
  naskh: "نسخ",
  ruqaa: "رقعة",
};
const PLACEMENT_LABELS_AR = {
  "bottom-right": "أسفل-يمين",
  center: "وسط",
  "top-right": "أعلى-يمين",
};
const REJECTION_REASON_LABELS_AR = {
  style: "الستايل مو حلو",
  text: "النص العربي فيه مشكلة",
  composition: "التكوين ضعيف",
  colors: "الألوان مو مناسبة",
  vibe: "الفايب مو هجولة",
  quality: "الجودة ضعيفة",
  general: "النتيجة العامة غير مناسبة",
};

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const roundScore = (n) => Number(clamp01(n).toFixed(3));

const createScoreNode = (initialScore = 0.5) => ({
  score: roundScore(initialScore),
  uses: 0,
  accepts: 0,
  rejects: 0,
});

const updateScoreNode = (node, accepted) => {
  const uses = (node?.uses || 0) + 1;
  const accepts = (node?.accepts || 0) + (accepted ? 1 : 0);
  const rejects = (node?.rejects || 0) + (accepted ? 0 : 1);
  // Smoothed acceptance estimate to avoid overreacting on tiny sample sizes.
  const score = roundScore((accepts + 1) / (uses + 2));
  return { score, uses, accepts, rejects };
};

const mergeScoreMap = (defaults = {}, incoming = {}) => {
  const merged = {};
  const keys = new Set([...Object.keys(defaults), ...Object.keys(incoming || {})]);
  keys.forEach((key) => {
    const base = defaults[key] || createScoreNode(0.5);
    const value = incoming?.[key] || {};
    merged[key] = {
      score: roundScore(typeof value.score === "number" ? value.score : base.score),
      uses: Number.isFinite(value.uses) ? value.uses : base.uses,
      accepts: Number.isFinite(value.accepts) ? value.accepts : base.accepts,
      rejects: Number.isFinite(value.rejects) ? value.rejects : base.rejects,
    };
  });
  return merged;
};

const pickBestKeyFromScores = (scoreMap = {}, fallback) => {
  const sorted = Object.entries(scoreMap).sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0));
  return sorted[0]?.[0] || fallback;
};

const pickTopColorsFromScores = (colorScores = {}, fallback = [], count = 3) => {
  const ranked = Object.entries(colorScores)
    .sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0))
    .map(([color]) => color);
  const merged = [...ranked, ...fallback].filter(Boolean);
  return Array.from(new Set(merged)).slice(0, count);
};

const getTopScoreEntries = (scoreMap = {}, limit = 3) =>
  Object.entries(scoreMap)
    .sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0))
    .slice(0, limit);

const buildDefaultScoreMap = (keys, seed = {}) =>
  keys.reduce((acc, key) => {
    acc[key] = createScoreNode(seed[key] ?? 0.5);
    return acc;
  }, {});

const DEFAULT_SCORING_ENGINE = {
  version: 1,
  totalFeedback: 0,
  acceptedFeedback: 0,
  acceptanceRate: 0,
  colorScores: buildDefaultScoreMap(COLOR_CANDIDATES, {
    "#7e22ce": 0.68,
    "#1a1a2e": 0.66,
    "#ff6b35": 0.64,
  }),
  compositionScores: buildDefaultScoreMap(STYLE_OPTIONS.compositions, {
    "dynamic-diagonal": 0.7,
    centered: 0.55,
    "rule-of-thirds": 0.6,
  }),
  textPlacementScores: buildDefaultScoreMap(STYLE_OPTIONS.textPlacements, {
    "bottom-right": 0.65,
    center: 0.55,
    "top-right": 0.58,
  }),
  arabicFontScores: buildDefaultScoreMap(STYLE_OPTIONS.arabicFonts, {
    "bold-kufi": 0.7,
    naskh: 0.55,
    ruqaa: 0.52,
  }),
  textPolicyScores: buildDefaultScoreMap(["no-text", "exact-text"], {
    "no-text": 0.62,
    "exact-text": 0.58,
  }),
  postTypeScores: buildDefaultScoreMap(POST_TYPE_IDS),
  patternScores: {},
};

const FALLBACK_TRAINING_VARIATIONS = [
  { label: "مطاردة ليلية", prefix: "Ultra-wide night pursuit drift on Saudi highway, long light trails, cinematic depth, aggressive speed lines, game-realistic reflections," },
  { label: "زاوية منخفضة", prefix: "Low-angle close tracking shot near rear wheel, intense tire smoke, dramatic road texture, fast corner entry, high contrast rim light," },
  { label: "ساحة صحراوية", prefix: "Open desert drift arena at golden hour, dusty atmosphere, wide spatial composition, warm highlights with cool shadows, dynamic skids," },
  { label: "نيون ممطر", prefix: "Rain-soaked neon Saudi city street at night, wet asphalt reflections, controlled motion blur, moody cinematic glow, high drama drift moment," },
  { label: "تفاصيل ميكانيكية", prefix: "Detailed close-up on suspension and spinning wheel, macro-like focus transitions, sparks and smoke interaction, tactile metallic materials," },
  { label: "إثارة جماهيرية", prefix: "Event-style drift showdown with crowd barriers and floodlights, energetic atmosphere, hero-car framing, layered foreground background depth," },
];

const normalizePromptFingerprint = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const dedupeTrainingVariations = (items = [], limit = 6) => {
  const seen = new Set();
  const seenLabels = new Set();
  const out = [];
  for (const item of items) {
    const label = (item?.label || "").trim();
    const prefix = (item?.prefix || "").trim();
    if (!label || !prefix) continue;
    const labelKey = normalizePromptFingerprint(label);
    const fingerprint = normalizePromptFingerprint(prefix);
    if (!fingerprint || seen.has(fingerprint) || seenLabels.has(labelKey)) continue;
    seen.add(fingerprint);
    seenLabels.add(labelKey);
    out.push({ label, prefix });
    if (out.length >= limit) break;
  }
  return out;
};

// 3D Icon Components
const Icon3D = ({ type, size = 48 }) => {
  const icons = {
    brain: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="brain1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <filter id="shadow1">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7e22ce" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#brain1)" filter="url(#shadow1)" />
        <path d="M32 20c-4 0-7 2-8 5-2 0-4 2-4 5s2 5 4 5c1 3 4 5 8 5s7-2 8-5c2 0 4-2 4-5s-2-5-4-5c-1-3-4-5-8-5z" fill="white" opacity="0.9" />
        <path d="M32 20v24M24 30h16" stroke="#7e22ce" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    image: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="img1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <filter id="shadow2">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#db2777" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#img1)" filter="url(#shadow2)" />
        <rect x="18" y="18" width="28" height="28" rx="4" fill="white" opacity="0.9" />
        <circle cx="26" cy="26" r="3" fill="#db2777" />
        <path d="M18 40l8-10 6 6 4-4 10 8" fill="#f9a8d4" />
      </svg>
    ),
    rocket: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="rkt1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <filter id="shadow3">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#ea580c" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#rkt1)" filter="url(#shadow3)" />
        <path d="M32 18c-2 4-4 10-4 16h8c0-6-2-12-4-16z" fill="white" opacity="0.9" />
        <path d="M26 34l-2 6h4zM38 34l2 6h-4z" fill="white" opacity="0.7" />
        <circle cx="32" cy="30" r="2" fill="#ea580c" />
        <path d="M30 42l2 4 2-4" fill="#fbbf24" />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="ch1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="shadow4">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#059669" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#ch1)" filter="url(#shadow4)" />
        <rect x="18" y="34" width="6" height="10" rx="1" fill="white" opacity="0.9" />
        <rect x="29" y="26" width="6" height="18" rx="1" fill="white" opacity="0.9" />
        <rect x="40" y="20" width="6" height="24" rx="1" fill="white" opacity="0.9" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="str1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="shadow5">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#d97706" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#str1)" filter="url(#shadow5)" />
        <path d="M32 18l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z" fill="white" opacity="0.9" />
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="sh1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="shadow6">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#sh1)" filter="url(#shadow6)" />
        <path d="M32 18l-10 4v8c0 8 4 14 10 16 6-2 10-8 10-16v-8z" fill="white" opacity="0.9" />
        <path d="M28 32l3 3 6-6" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    memory: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="mem1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id="shadow7">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#mem1)" filter="url(#shadow7)" />
        <rect x="20" y="20" width="24" height="24" rx="4" fill="white" opacity="0.9" />
        <rect x="24" y="24" width="7" height="7" rx="1" fill="#7c3aed" />
        <rect x="33" y="24" width="7" height="7" rx="1" fill="#a78bfa" />
        <rect x="24" y="33" width="7" height="7" rx="1" fill="#a78bfa" />
        <rect x="33" y="33" width="7" height="7" rx="1" fill="#7c3aed" />
      </svg>
    ),
    loop: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="lp1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="shadow8">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#dc2626" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#lp1)" filter="url(#shadow8)" />
        <path d="M38 24a8 8 0 11-12 7" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M26 40a8 8 0 1112-7" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M24 28l3 3 3-3" fill="white" />
        <path d="M40 36l-3-3-3 3" fill="white" />
      </svg>
    ),
  };
  return icons[type] || null;
};

const PARTICLE_PALETTE = [PURPLE[200], PURPLE[300], PURPLE[400], "#f9a8d4", "#fbbf24", "#34d399"];
const STATIC_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: 4 + Math.random() * 8,
  delay: Math.random() * 5,
  duration: 3 + Math.random() * 4,
  color: PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)],
}));

// Animated background particles
const ParticleField = () => {

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {STATIC_PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            opacity: 0.2,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) scale(1); opacity: 0.15; }
          100% { transform: translateY(-30px) scale(1.3); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
};

// Extract first valid JSON object from a string (handles markdown code blocks, trailing text, etc.)
const extractJSON = (text) => {
  // Strip markdown code fences
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the first '{' and then match balanced braces
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") depth--;
    if (depth === 0) {
      try {
        return JSON.parse(cleaned.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
};

// ============================================================
// Supabase — Cloud Persistence Helpers
// ============================================================

const AGENT_STATE_ID = "default";

const sbFetchPatterns = async () => {
  const { data, error } = await supabase
    .from("learned_patterns")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    pattern: r.pattern,
    weight: (r.priority ?? 50) / 100,
    source: r.source || "manual",
  }));
};

const sbFetchRejections = async () => {
  const { data, error } = await supabase
    .from("rejection_reasons")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    reason: r.reason,
    type: r.type || "manual",
    time: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  }));
};

const sbFetchStyleRefs = async () => {
  const { data, error } = await supabase
    .from("style_refs")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    mimeType: r.media_type || "image/jpeg",
    data: r.image_data,
    thumbnail: r.thumbnail || `data:${r.media_type || "image/jpeg"};base64,${r.image_data}`,
    addedAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  }));
};

const sbFetchAgentState = async () => {
  const { data, error } = await supabase
    .from("agent_state")
    .select("*")
    .eq("id", AGENT_STATE_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const sbUpsertAgentState = async (state) => {
  const { error } = await supabase.from("agent_state").upsert({
    id: AGENT_STATE_ID,
    agent_level: state.agentLevel,
    agent_xp: state.agentXP,
    total_generated: state.totalGenerated,
    accepted_count: state.acceptedCount,
    rejected_count: state.rejectedCount,
    style_profile: state.agentMemory.styleProfile,
    scoring_engine: state.agentMemory.scoringEngine,
    successful_prompts: state.agentMemory.successfulPrompts,
    total_interactions: state.agentMemory.totalInteractions,
    recent_posts: state.recentPosts || [],
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("Failed to upsert agent state:", error);
};

const sbInsertPattern = async (pattern) => {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("learned_patterns").insert({
    id,
    pattern: pattern.pattern,
    priority: Math.round((pattern.weight ?? 0.7) * 100),
    performance: 50,
    source: pattern.source || "manual",
  });
  if (error) console.warn("Failed to insert pattern:", error);
  return id;
};

const sbInsertRejection = async (rejection) => {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("rejection_reasons").insert({
    id,
    reason: rejection.reason,
    type: rejection.type || "manual",
    post_type: rejection.type !== "manual" ? rejection.type : null,
  });
  if (error) console.warn("Failed to insert rejection:", error);
  return id;
};

const sbInsertStyleRef = async (record) => {
  const { error } = await supabase.from("style_refs").insert({
    id: record.id,
    name: record.name || null,
    image_data: record.data,
    media_type: record.mimeType,
    thumbnail: record.thumbnail,
  });
  if (error) console.warn("Failed to insert style ref:", error);
};

const sbDeleteRow = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.warn(`Failed to delete from ${table}:`, error);
};

// Canvas-based image resize for API-safe payloads
const resizeImageToBase64 = (file, maxDim = 512) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      // Thumbnail for gallery
      const thumbScale = 128 / Math.max(width, height);
      const tw = Math.round(width * thumbScale);
      const th = Math.round(height * thumbScale);
      canvas.width = tw;
      canvas.height = th;
      ctx.drawImage(img, 0, 0, tw, th);
      const thumbUrl = canvas.toDataURL("image/jpeg", 0.7);
      resolve({
        mimeType: "image/jpeg",
        data: dataUrl.split(",")[1],
        thumbnail: thumbUrl,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });

// ============================================================
// DARK MODE THEME
// ============================================================
const DARK_MODE_KEY = "hajwalah-dark-mode";

const makeTheme = (dark) => ({
  dark,
  pageBg: dark
    ? "linear-gradient(180deg, #0f0a1a 0%, #1a1028 30%, #0f0a1a 100%)"
    : "linear-gradient(180deg, #faf5ff 0%, #ffffff 30%, #faf5ff 100%)",
  cardBg: dark ? "#1e1730" : "white",
  cardBorder: dark ? PURPLE[800] : PURPLE[100],
  navBg: dark ? "rgba(15,10,26,0.88)" : "rgba(255,255,255,0.85)",
  navBorder: dark ? PURPLE[900] : PURPLE[100],
  text: dark ? "#e2e8f0" : PURPLE[900],
  textSecondary: dark ? "#94a3b8" : "#64748b",
  textMuted: dark ? "#64748b" : "#94a3b8",
  inputBg: dark ? "#261e38" : "white",
  inputBorder: dark ? PURPLE[700] : PURPLE[100],
  softBg: dark ? "#261e38" : PURPLE[50],
  softBorder: dark ? PURPLE[700] : PURPLE[200],
  tagBg: dark ? "rgba(147,51,234,0.2)" : "white",
  tagBorder: dark ? PURPLE[700] : PURPLE[200],
  tagText: dark ? PURPLE[200] : PURPLE[700],
  navBtnBg: dark ? PURPLE[900] : PURPLE[100],
  navBtnText: dark ? PURPLE[200] : PURPLE[800],
  navBtnInactive: dark ? "#94a3b8" : "#64748b",
  logoText: dark ? PURPLE[200] : PURPLE[800],
  successBg: dark ? "rgba(5,150,105,0.15)" : "#ecfdf5",
  successBorder: dark ? "#065f46" : "#bbf7d0",
  successText: dark ? "#34d399" : "#059669",
  errorBg: dark ? "rgba(220,38,38,0.15)" : "#fef2f2",
  errorBorder: dark ? "#7f1d1d" : "#fecaca",
  errorText: dark ? "#fca5a5" : "#dc2626",
  scrollThumb: dark ? PURPLE[700] : PURPLE[200],
});

// ============================================================
// MAIN APP
// ============================================================
// localStorage helpers
// localStorage removed — all state now persisted via Supabase

const DEFAULT_MEMORY = {
  styleProfile: {
    preferredColors: ["#7e22ce", "#1a1a2e", "#ff6b35"],
    preferredComposition: "dynamic-diagonal",
    textPlacement: "bottom-right",
    arabicFont: "bold-kufi",
    confidence: 0.15,
  },
  learnedPatterns: [
    { pattern: "دخان التفحيط يكون كثيف", weight: 0.8, source: "initial" },
    { pattern: "الخلفية داكنة مع إضاءة نيون", weight: 0.7, source: "initial" },
    { pattern: "النص العربي بخط عريض", weight: 0.9, source: "initial" },
  ],
  rejectionReasons: [],
  successfulPrompts: [],
  totalInteractions: 0,
  scoringEngine: DEFAULT_SCORING_ENGINE,
};

const normalizeScoringEngine = (engine = {}) => {
  const totalFeedback = Number.isFinite(engine.totalFeedback) ? engine.totalFeedback : 0;
  const acceptedFeedback = Number.isFinite(engine.acceptedFeedback) ? engine.acceptedFeedback : 0;
  const acceptanceRate = totalFeedback > 0
    ? roundScore(acceptedFeedback / totalFeedback)
    : roundScore(engine.acceptanceRate || 0);

  return {
    version: 1,
    totalFeedback,
    acceptedFeedback,
    acceptanceRate,
    colorScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.colorScores, engine.colorScores),
    compositionScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.compositionScores, engine.compositionScores),
    textPlacementScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.textPlacementScores, engine.textPlacementScores),
    arabicFontScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.arabicFontScores, engine.arabicFontScores),
    textPolicyScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.textPolicyScores, engine.textPolicyScores),
    postTypeScores: mergeScoreMap(DEFAULT_SCORING_ENGINE.postTypeScores, engine.postTypeScores),
    patternScores: mergeScoreMap({}, engine.patternScores),
  };
};

const deriveStyleProfileFromScoring = (scoringEngine, fallbackStyleProfile) => ({
  ...fallbackStyleProfile,
  preferredColors: pickTopColorsFromScores(
    scoringEngine.colorScores,
    fallbackStyleProfile.preferredColors || DEFAULT_MEMORY.styleProfile.preferredColors,
    3,
  ),
  preferredComposition: pickBestKeyFromScores(
    scoringEngine.compositionScores,
    fallbackStyleProfile.preferredComposition || DEFAULT_MEMORY.styleProfile.preferredComposition,
  ),
  textPlacement: pickBestKeyFromScores(
    scoringEngine.textPlacementScores,
    fallbackStyleProfile.textPlacement || DEFAULT_MEMORY.styleProfile.textPlacement,
  ),
  arabicFont: pickBestKeyFromScores(
    scoringEngine.arabicFontScores,
    fallbackStyleProfile.arabicFont || DEFAULT_MEMORY.styleProfile.arabicFont,
  ),
});

const normalizeAgentMemory = (memory) => {
  const fallback = DEFAULT_MEMORY;
  const incoming = memory || {};
  const styleProfile = {
    ...fallback.styleProfile,
    ...(incoming.styleProfile || {}),
    confidence: clamp01(incoming.styleProfile?.confidence ?? fallback.styleProfile.confidence),
  };

  const scoringEngine = normalizeScoringEngine(incoming.scoringEngine || fallback.scoringEngine);
  const derivedStyle = deriveStyleProfileFromScoring(scoringEngine, styleProfile);

  return {
    ...fallback,
    ...incoming,
    styleProfile: {
      ...derivedStyle,
      confidence: styleProfile.confidence,
    },
    learnedPatterns: Array.isArray(incoming.learnedPatterns) ? incoming.learnedPatterns : fallback.learnedPatterns,
    rejectionReasons: Array.isArray(incoming.rejectionReasons) ? incoming.rejectionReasons : fallback.rejectionReasons,
    successfulPrompts: Array.isArray(incoming.successfulPrompts) ? incoming.successfulPrompts : fallback.successfulPrompts,
    totalInteractions: Number.isFinite(incoming.totalInteractions) ? incoming.totalInteractions : fallback.totalInteractions,
    scoringEngine,
  };
};

const patchScoreMap = (scoreMap, key, accepted, times = 1) => {
  if (!key) return scoreMap;
  const next = { ...scoreMap };
  const count = Math.max(1, times);
  for (let i = 0; i < count; i++) {
    next[key] = updateScoreNode(next[key] || createScoreNode(0.5), accepted);
  }
  return next;
};

const applyFeedbackToMemory = (memory, context, accepted, reason = "") => {
  const normalized = normalizeAgentMemory(memory);
  const scoring = normalizeScoringEngine(normalized.scoringEngine);

  scoring.totalFeedback += 1;
  if (accepted) scoring.acceptedFeedback += 1;
  scoring.acceptanceRate = roundScore(
    scoring.totalFeedback > 0 ? scoring.acceptedFeedback / scoring.totalFeedback : 0,
  );

  if (context) {
    const sp = context.styleProfile || {};
    scoring.compositionScores = patchScoreMap(scoring.compositionScores, sp.preferredComposition, accepted);
    scoring.textPlacementScores = patchScoreMap(scoring.textPlacementScores, sp.textPlacement, accepted);
    scoring.arabicFontScores = patchScoreMap(scoring.arabicFontScores, sp.arabicFont, accepted);
    scoring.textPolicyScores = patchScoreMap(scoring.textPolicyScores, context.textPolicy, accepted);
    scoring.postTypeScores = patchScoreMap(scoring.postTypeScores, context.postType, accepted);

    (context.usedColors || []).forEach((color) => {
      scoring.colorScores = patchScoreMap(scoring.colorScores, color, accepted);
    });
    (context.usedPatterns || []).forEach((pattern) => {
      scoring.patternScores = patchScoreMap(scoring.patternScores, pattern, accepted);
    });

    // Optional extra penalties to accelerate learning from explicit rejection reasons.
    if (!accepted) {
      if (reason === "colors") {
        (context.usedColors || []).forEach((color) => {
          scoring.colorScores = patchScoreMap(scoring.colorScores, color, false);
        });
      }
      if (reason === "composition") {
        scoring.compositionScores = patchScoreMap(scoring.compositionScores, sp.preferredComposition, false);
      }
      if (reason === "text") {
        scoring.textPolicyScores = patchScoreMap(scoring.textPolicyScores, context.textPolicy, false);
        scoring.textPlacementScores = patchScoreMap(scoring.textPlacementScores, sp.textPlacement, false);
        scoring.arabicFontScores = patchScoreMap(scoring.arabicFontScores, sp.arabicFont, false);
      }
      if (reason === "style" || reason === "vibe") {
        (context.usedPatterns || []).forEach((pattern) => {
          scoring.patternScores = patchScoreMap(scoring.patternScores, pattern, false);
        });
      }
    }
  }

  const derivedStyle = deriveStyleProfileFromScoring(scoring, normalized.styleProfile);
  return {
    ...normalized,
    styleProfile: {
      ...derivedStyle,
      confidence: normalized.styleProfile.confidence,
    },
    scoringEngine: scoring,
  };
};

export default function HajwalahAgent() {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem(DARK_MODE_KEY) === "true"; } catch { return false; }
  });
  const T = makeTheme(darkMode);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(DARK_MODE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const [currentPage, setCurrentPage] = useState("home");
  const [agentLevel, setAgentLevel] = useState(1);
  const [agentXP, setAgentXP] = useState(0);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState(null);
  const [promptInput, setPromptInput] = useState("");
  const [agentThinking, setAgentThinking] = useState([]);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [lastGenerationContext, setLastGenerationContext] = useState(null);
  const [imageRefinementMode, setImageRefinementMode] = useState(null); // "replace" | "edit" | null
  const [imageRefinementComment, setImageRefinementComment] = useState("");
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [textOverlayEnabled, setTextOverlayEnabled] = useState(true);
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlayCta, setOverlayCta] = useState("");
  const [overlayFontSize, setOverlayFontSize] = useState(100);
  const rawImageRef = useRef(null); // stores pre-overlay base64
  const fontSizeDebounceRef = useRef(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [expandedGuideStep, setExpandedGuideStep] = useState(null);
  const [previewRecentPost, setPreviewRecentPost] = useState(null);

  // Manual memory management state
  const [newPatternText, setNewPatternText] = useState("");
  const [newPatternWeight, setNewPatternWeight] = useState(0.7);
  const [newRejectionText, setNewRejectionText] = useState("");

  // Image upload + style analysis state
  const [styleImageFile, setStyleImageFile] = useState(null);
  const [styleImagePreview, setStyleImagePreview] = useState(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [styleAnalysisResult, setStyleAnalysisResult] = useState(null);

  // Style Reference Library state
  const [styleRefs, setStyleRefs] = useState([]);
  const [styleRefsLoading, setStyleRefsLoading] = useState(true);

  // Training Mode state
  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingTopic, setTrainingTopic] = useState("");
  const [trainingImages, setTrainingImages] = useState([]);
  const [trainingDirections, setTrainingDirections] = useState([]);
  const [trainingPlanSource, setTrainingPlanSource] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [isPreparingTraining, setIsPreparingTraining] = useState(false);
  const [trainingLikedIndexes, setTrainingLikedIndexes] = useState([]);
  const [trainingDislikedIndexes, setTrainingDislikedIndexes] = useState([]);
  const [trainingComments, setTrainingComments] = useState({});
  const [trainingLearning, setTrainingLearning] = useState(false);
  const [trainingToast, setTrainingToast] = useState("");
  const [trainingPreviewIndex, setTrainingPreviewIndex] = useState(null);

  // Agent Memory System — persisted via Supabase
  const [agentMemory, setAgentMemory] = useState(
    normalizeAgentMemory(DEFAULT_MEMORY),
  );

  // Load all data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [patterns, rejections, refs, agentState] = await Promise.all([
          sbFetchPatterns().catch(() => []),
          sbFetchRejections().catch(() => []),
          sbFetchStyleRefs().catch(() => []),
          sbFetchAgentState().catch(() => null),
        ]);
        if (cancelled) return;

        // Reconstruct agentMemory from Supabase tables
        const memoryFromDB = {
          ...DEFAULT_MEMORY,
          learnedPatterns: patterns.length > 0 ? patterns : DEFAULT_MEMORY.learnedPatterns,
          rejectionReasons: rejections,
          styleProfile: agentState?.style_profile
            ? { ...DEFAULT_MEMORY.styleProfile, ...agentState.style_profile }
            : DEFAULT_MEMORY.styleProfile,
          scoringEngine: agentState?.scoring_engine || DEFAULT_MEMORY.scoringEngine,
          successfulPrompts: agentState?.successful_prompts || [],
          totalInteractions: agentState?.total_interactions ?? 0,
        };
        setAgentMemory(normalizeAgentMemory(memoryFromDB));

        if (agentState) {
          setAgentLevel(agentState.agent_level ?? 1);
          setAgentXP(agentState.agent_xp ?? 0);
          setTotalGenerated(agentState.total_generated ?? 0);
          setAcceptedCount(agentState.accepted_count ?? 0);
          setRejectedCount(agentState.rejected_count ?? 0);
          if (Array.isArray(agentState.recent_posts)) setRecentPosts(agentState.recent_posts);
        }

        setStyleRefs(refs);
      } catch (err) {
        console.warn("Failed to load from Supabase:", err);
      } finally {
        if (!cancelled) {
          setSupabaseLoading(false);
          setStyleRefsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync agent state to Supabase on changes (debounced)
  const syncTimerRef = useRef(null);
  const syncToSupabase = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      sbUpsertAgentState({ agentLevel, agentXP, totalGenerated, acceptedCount, rejectedCount, agentMemory, recentPosts });
    }, 1000);
  }, [agentLevel, agentXP, totalGenerated, acceptedCount, rejectedCount, agentMemory, recentPosts]);

  useEffect(() => {
    if (supabaseLoading) return;
    syncToSupabase();
  }, [supabaseLoading, syncToSupabase]);

  // Load Tajawal font for Canvas text overlay
  const tajawalLoadedRef = useRef(false);
  useEffect(() => {
    if (tajawalLoadedRef.current) return;
    tajawalLoadedRef.current = true;
    const font = new FontFace("Tajawal", "url(https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1nzSBC45I.woff2)");
    font.load().then((loaded) => { document.fonts.add(loaded); }).catch(() => {});
  }, []);

  // Canvas-based text overlay for generated images
  const overlayTextOnImage = (base64Image, title, ctaText, fontScale = 1) =>
    new Promise((resolve) => {
      console.log("overlayTextOnImage called", title, ctaText, "fontScale:", fontScale);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const W = canvas.width;
        const H = canvas.height;
        const s = W / 1024; // scale factor
        const maxTextW = W * 0.78;

        // Helper: wrap text into lines
        const wrapText = (text, font, maxW) => {
          ctx.font = font;
          const words = text.split(" ");
          const lines = [];
          let line = "";
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxW && line) {
              lines.push(line);
              line = word;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
          return lines;
        };

        // Helper: rounded rect
        const roundRect = (x, y, w, h, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        };

        const resetShadow = () => {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        };

        ctx.textAlign = "center";
        ctx.direction = "rtl";

        // Title pill (top zone)
        if (title) {
          const fontSize = Math.round(54 * s * fontScale);
          const titleFont = `bold ${fontSize}px 'Tajawal', sans-serif`;
          const titleLines = wrapText(title, titleFont, maxTextW);
          ctx.font = titleFont;
          const lineH = Math.round(fontSize * 1.4);
          const totalTextH = titleLines.length * lineH;
          const padX = Math.round(16 * s);
          const padY = Math.round(10 * s);
          const accentW = Math.round(3 * s);

          // Measure widest line
          let pillW = 0;
          for (const ln of titleLines) {
            const w = ctx.measureText(ln).width;
            if (w > pillW) pillW = w;
          }
          pillW += padX * 2 + accentW + Math.round(8 * s);
          const pillH = totalTextH + padY * 2;
          const pillX = (W - pillW) / 2;
          const pillY = H * 0.06;
          const pillR = Math.round(14 * s);

          // Draw pill background with shadow
          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = Math.round(16 * s);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(4 * s);
          roundRect(pillX, pillY, pillW, pillH, pillR);
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fill();
          resetShadow();

          // Right accent bar (RTL — right side)
          const barX = pillX + pillW - accentW;
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          roundRect(barX, pillY + Math.round(6 * s), accentW, pillH - Math.round(12 * s), accentW / 2);
          ctx.fill();

          // Draw title text
          ctx.font = titleFont;
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = Math.round(12 * s);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(2 * s);
          let y = pillY + padY + lineH * 0.78;
          for (const ln of titleLines) {
            ctx.fillText(ln, W / 2, y);
            y += lineH;
          }
          resetShadow();
        }

        // CTA pill (bottom zone)
        if (ctaText) {
          const fontSize = Math.round(40 * s * fontScale);
          const ctaFont = `bold ${fontSize}px 'Tajawal', sans-serif`;
          const ctaLines = wrapText(ctaText, ctaFont, maxTextW);
          ctx.font = ctaFont;
          const lineH = Math.round(fontSize * 1.4);
          const totalTextH = ctaLines.length * lineH;
          const padX = Math.round(18 * s);
          const padY = Math.round(12 * s);

          // Measure widest line
          let pillW = 0;
          for (const ln of ctaLines) {
            const w = ctx.measureText(ln).width;
            if (w > pillW) pillW = w;
          }
          pillW += padX * 2;
          const pillH = totalTextH + padY * 2;
          const pillX = (W - pillW) / 2;
          const pillY = H - H * 0.06 - pillH;
          const pillR = Math.round(14 * s);

          // Draw gold pill with shadow
          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = Math.round(20 * s);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(4 * s);
          roundRect(pillX, pillY, pillW, pillH, pillR);
          const goldGrad = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
          goldGrad.addColorStop(0, "#f59e0b");
          goldGrad.addColorStop(1, "#d97706");
          ctx.fillStyle = goldGrad;
          ctx.fill();
          resetShadow();

          // Draw CTA text
          ctx.font = ctaFont;
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = Math.round(4 * s);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(1 * s);
          let y = pillY + padY + lineH * 0.78;
          for (const ln of ctaLines) {
            ctx.fillText(ln, W / 2, y);
            y += lineH;
          }
          resetShadow();
        }

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(base64Image); // fallback to original
      img.src = base64Image;
    });

  useEffect(() => {
    if (trainingPreviewIndex === null) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setTrainingPreviewIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trainingPreviewIndex]);

  // Shared text-override regex patterns (used by both text model + image model)
  const deriveGenerationStrategy = () => {
    const scoring = normalizeScoringEngine(agentMemory.scoringEngine);
    const styleProfile = deriveStyleProfileFromScoring(scoring, agentMemory.styleProfile);
    const patternScores = scoring.patternScores || {};

    const selectedPatterns = (agentMemory.learnedPatterns || [])
      .map((p) => {
        const scoreSignal = patternScores[p.pattern]?.score ?? 0.5;
        const effectiveWeight = roundScore((p.weight * 0.7) + (scoreSignal * 0.3));
        return { ...p, effectiveWeight, scoreSignal };
      })
      .sort((a, b) => b.effectiveWeight - a.effectiveWeight)
      .slice(0, 8);

    return {
      scoring,
      styleProfile,
      selectedPatterns,
      textPolicy: textOverlayEnabled ? "with-text" : "no-text",
    };
  };

  const buildAgentPrompt = (strategy) => {
    const postType = postTypes.find((p) => p.id === selectedPostType);
    const patterns = strategy.selectedPatterns.map((p) => {
      const sourceTag = p.source === "image-analysis" ? " [من صورة]" : p.source === "manual" ? " [يدوي]" : "";
      return `- ${p.pattern} (أولوية: ${Math.round(p.effectiveWeight * 100)}% | أداء: ${Math.round(p.scoreSignal * 100)}%)${sourceTag}`;
    }).join("\n");
    const rejections = agentMemory.rejectionReasons.length > 0
      ? agentMemory.rejectionReasons.slice(-12).map((r) => `- ${REJECTION_REASON_LABELS_AR[r.reason] || r.reason}`).join("\n")
      : "لا يوجد رفض سابق";
    const confidence = Math.round(agentMemory.styleProfile.confidence * 100);

    const sp = strategy.styleProfile;
    const colorsAr = sp.preferredColors.map((c) => COLOR_NAMES_AR[c] || c).join("، ");
    const postTypeScore = strategy.scoring.postTypeScores[selectedPostType]?.score ?? 0.5;
    const textPolicyScore = strategy.scoring.textPolicyScores[strategy.textPolicy]?.score ?? 0.5;
    const acceptanceRate = Math.round((strategy.scoring.acceptanceRate || 0) * 100);

    const textInstruction = "   - ⛔ لا تذكر أي نص أو كتابة في وصف الصورة — الصورة بصرية فقط بدون حروف أو كلمات";

    return `أنت وكيل تسويق ذكي متخصص في لعبة "هجولة كورسا ٢" — لعبة تفحيط وسيارات عربية سعودية.

نوع البوست المطلوب: ${postType?.label || "عام"} — ${postType?.desc || ""}
${promptInput ? `توجيه إضافي من المستخدم: ${promptInput}` : ""}

===== ملف الستايل المتعلّم (أولوية قصوى) =====
الألوان المفضلة: ${colorsAr} (${sp.preferredColors.join(", ")})
التكوين: ${COMPOSITION_LABELS_AR[sp.preferredComposition] || sp.preferredComposition}
الخط العربي: ${FONT_LABELS_AR[sp.arabicFont] || sp.arabicFont}
موقع النص: ${PLACEMENT_LABELS_AR[sp.textPlacement] || sp.textPlacement}
===============================================

الأنماط المتعلمة من تفاعلات المستخدم:
${patterns}

أسباب الرفض السابقة (تجنبها):
${rejections}

مستوى ثقة الوكيل: ${confidence}%
عدد التفاعلات السابقة: ${agentMemory.totalInteractions}

===== مؤشرات محرك القياس (Scoring Engine) =====
- نسبة القبول الكلية: ${acceptanceRate}% من ${strategy.scoring.totalFeedback} تقييم
- أداء نوع البوست "${postType?.label || selectedPostType || "عام"}": ${Math.round(postTypeScore * 100)}%
- أداء سياسة النص (${strategy.textPolicy}): ${Math.round(textPolicyScore * 100)}%
===============================================

===== مرحلة التفكير (مطلوبة قبل الكتابة) =====
قبل ما تكتب البوست، فكّر وأجب على هذي الأسئلة:
1. وش الإحساس الأساسي اللي لازم هالبوست يثيره عند جمهور الألعاب السعودي؟ (حماس / فضول / خوف يفوته شي / فخر / فكاهة)
2. وش الفعل الواحد اللي المفروض القارئ يسويه بعد ما يقرأ البوست؟
3. وش أسباب الرفض السابقة من الذاكرة اللي لازم هالبوست يتجنبها بشكل فعّال؟
4. وش الأنماط الناجحة من الذاكرة اللي وزنها عالي (≥ 80%) واللي لازم أطبّقها؟
5. وش اللي يخلي هالبوست حصري لهجولة كورسا ٢ — مو مجرد بوست لعبة عام؟
اكتب تحليلك في حقل "thinking" بالعربي.
==================================================

بعد التفكير، اكتب بوست تسويقي بالعامية السعودية للعبة هجولة كورسا ٢ يتضمن:
1. عنوان جذاب (سطر واحد)
2. نص البوست (2-3 أسطر بالعامية السعودية، يكون حماسي وجذاب)
3. وصف تفصيلي للصورة المقترحة بالإنجليزي (image prompt):
   - صف المشهد البصري: السيارة، البيئة، الإضاءة، الدخان، الألوان
   - الألوان: ${sp.preferredColors.join(", ")}
   - التكوين: ${sp.preferredComposition}
${textInstruction}
4. هاشتاقات مناسبة (3-5)

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"thinking": "تحليلك للأسئلة الخمسة...", "title": "...", "body": "...", "imagePrompt": "...", "hashtags": ["..."]}`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowResult(false);
    setFeedbackGiven(false);
    setAgentThinking([]);
    setGeneratedContent(null);
    setGeneratedImage(null);
    setGenerateError(null);
    setImageError(null);
    setLastGenerationContext(null);

    const addThought = (t) => setAgentThinking((prev) => [...prev, t]);

    try {
      // Step 1: Build prompt & get text content from Claude Sonnet
      addThought("🔍 تحليل نوع البوست المطلوب...");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🧠 تحميل الذاكرة وأنماط النجاح السابقة...");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🎨 بناء البرومبت بناءً على الأنماط المتعلمة...");

      // Detect text override ONCE — shared by text model + image model
      const generationStrategy = deriveGenerationStrategy();
      const prompt = buildAgentPrompt(generationStrategy);
      addThought("🤔 الوكيل يفكّر ويحلل قبل الكتابة...");
      addThought("📡 إرسال البرومبت إلى Claude Sonnet...");

      const textController = new AbortController();
      const textTimeout = setTimeout(() => textController.abort(), 60000);

      const textResponse = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { ...ANTHROPIC_HEADERS },
        signal: textController.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          temperature: 0.9,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      clearTimeout(textTimeout);

      if (!textResponse.ok) {
        const errBody = await textResponse.text().catch(() => "");
        let detail = "";
        try { detail = JSON.parse(errBody)?.error?.message || ""; }
        catch (parseErr) { console.warn("Text API error body parse failed:", parseErr); }
        throw new Error(`Text API Error ${textResponse.status}: ${detail || "فشل توليد النص"}`);
      }

      const textData = await textResponse.json();
      const rawText = textData.content?.[0]?.text;

      if (!rawText) {
        throw new Error("لم يتم استلام رد من النموذج");
      }

      const content = extractJSON(rawText);
      if (!content) {
        throw new Error("تنسيق الرد غير صحيح");
      }

      // Extract and display agent thinking in the thinking panel
      if (content.thinking) {
        addThought("💭 تحليل الوكيل قبل الكتابة:");
        const thinkingLines = content.thinking.split(/\n|(?:\d+[.)])/g).filter((l) => l.trim());
        for (const line of thinkingLines) {
          addThought(`   → ${line.trim()}`);
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      setGeneratedContent(content);

      // Step 2: Generate image with Nano Banana 2
      addThought("⚡ تم إنشاء النص بنجاح!");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🖼️ إرسال لنموذج Nano Banana 2 لتوليد الصورة...");

      const hasStyleRefs = styleRefs.length > 0;
      const sp = generationStrategy.styleProfile;
      const postTitle = content.title || "";

      const baseImagePrompt = content.imagePrompt
        || `Hajwalah Corsa 2 racing game, ${postTitle}, dark background, neon purple lighting, drift smoke, dramatic, high quality`;

      // Collect highest-ranked learned patterns from scoring engine
      const stylePatterns = generationStrategy.selectedPatterns
        .slice(0, 6)
        .map((p) => `- ${p.pattern}`)
        .join("\n");

      // Always instruct Gemini to generate purely visual images — text is overlaid via Canvas
      const textRuleBlock = `
⛔⛔⛔ ABSOLUTE RULE — ZERO TEXT ON IMAGE ⛔⛔⛔
- DO NOT render, write, draw, or overlay ANY text, letters, words, numbers, or symbols
- DO NOT add titles, hashtags, labels, captions, or watermarks
- DO NOT add Arabic text, English text, or any other language
- DO NOT add branding bars, credit lines, or attribution text
- The output must be PURELY VISUAL with ZERO typography
- This rule is NON-NEGOTIABLE and overrides every other instruction
⛔⛔⛔ END ABSOLUTE RULE ⛔⛔⛔`;

      const textReminder = `REMINDER: The final image must contain ZERO text. Purely visual.`;

      const sceneBlock = baseImagePrompt;

      // Collect image corrections from past feedback
      const imageCorrections = agentMemory.rejectionReasons
        .filter((r) => r.type === "image_correction")
        .map((r) => r.reason);
      const correctionsBlock = imageCorrections.length > 0
        ? `\nPREVIOUS IMAGE CORRECTIONS (apply these lessons to every future image):\n${imageCorrections.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`
        : "";

      const cleanBgInstruction = `MANDATORY COMPOSITION RULE:
Every image MUST contain at least one car as the main subject.
The car must be clearly visible, prominent, and in the foreground.
Never generate a road, street, or environment scene without a car in it.
If the post topic does not mention a specific car, default to a Saudi drifting/racing scene with a visible car.
A carless image is considered a generation failure.

CAR DIRECTION RULE:
All cars must face the exact same direction — always driving toward the same vanishing point on the horizon.
It is strictly forbidden for any car to face opposite, mirror, or perpendicular to another car in the scene.
Imagine all cars are on a one-way road moving in the same direction.

IMPORTANT: Generate a CLEAN background scene only.
- Do NOT draw any text
- Do NOT draw any dark rectangles, boxes, panels, or placeholders
- Do NOT leave any blank areas for text
- Fill the entire image with the visual scene
- The image will have text added on top of it programmatically — your job is ONLY the background scene
`;

      const imagePromptText = hasStyleRefs
        ? `${cleanBgInstruction}
CRITICAL: Match the visual style of the provided reference images FIRST.
The reference images show the game's actual aesthetic: realistic Saudi streets,
daylight/natural lighting, real road environments.
Learned patterns below are suggestions only — NEVER apply them if they contradict the reference image style.
If a learned pattern says "dark background" or "neon lighting" but the reference images show daylight or natural colors, IGNORE that pattern and follow the reference images.

${textRuleBlock}

Create an image for: "${postTitle}"

REFERENCE IMAGES (PRIMARY STYLE GUIDE — highest priority):
- The ${Math.min(styleRefs.length, 3)} attached screenshots define the visual DNA of this game
- Match their lighting, color grading, environment style, and rendering quality exactly
- These images are the ground truth — everything else is secondary
- DO NOT copy any text, words, or specific content from references

STYLE PROFILE (secondary):
- Color palette: ${sp.preferredColors.join(", ")} (only if compatible with reference images)
- Composition: ${sp.preferredComposition}
${correctionsBlock}
LEARNED PATTERNS (hints only — override if they conflict with reference images):
${stylePatterns}

SCENE: ${sceneBlock}

${textReminder}`
        : `${cleanBgInstruction}
${textRuleBlock}

${sceneBlock}

STYLE PROFILE:
- Color palette: ${sp.preferredColors.join(", ")}
- Composition: ${sp.preferredComposition}
- High contrast, dramatic lighting
${correctionsBlock}
LEARNED PATTERNS:
${stylePatterns}

${textReminder}`;

      const usedPatternNames = generationStrategy.selectedPatterns
        .slice(0, 6)
        .map((p) => p.pattern);

      setLastGenerationContext({
        postType: selectedPostType,
        textPolicy: generationStrategy.textPolicy,
        styleProfile: sp,
        usedColors: sp.preferredColors,
        usedPatterns: usedPatternNames,
        hasStyleRefs,
        textOverlay: textOverlayEnabled,
        finalImagePrompt: imagePromptText,
        timestamp: Date.now(),
      });

      // Build multimodal parts: reference images (up to 3) + text prompt
      const imageParts = [];
      if (hasStyleRefs) {
        const refsToSend = styleRefs.slice(-3);
        for (const ref of refsToSend) {
          imageParts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
        }
        addThought(`🎮 إرفاق ${refsToSend.length} صور مرجعية لستايل اللعبة...`);
      }
      imageParts.push({ text: imagePromptText });

      console.log("[DEBUG-IMG] textOverlayEnabled:", textOverlayEnabled);
      console.log("[DEBUG-IMG] FULL imagePromptText:", imagePromptText);

      const imageController = new AbortController();
      const imageTimeout = setTimeout(() => imageController.abort(), 120000);

      try {
        const imageResponse = await fetch(IMAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: imageController.signal,
          body: JSON.stringify({
            contents: [{ parts: imageParts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        });

        clearTimeout(imageTimeout);

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log("Image API response:", JSON.stringify(imageData).slice(0, 500));
          const candidate = imageData.candidates?.[0];
          // Check for safety/filter blocks
          if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
            console.error("Image blocked:", candidate.finishReason);
            setImageError(`Nano Banana 2: ${candidate.finishReason}`);
            addThought(`⚠️ الصورة تم حجبها: ${candidate.finishReason}`);
          } else {
            const parts = candidate?.content?.parts || [];
            const imagePart = parts.find((p) => p.inlineData);
            if (imagePart) {
              const { mimeType, data } = imagePart.inlineData;
              const rawBase64 = `data:${mimeType};base64,${data}`;
              rawImageRef.current = rawBase64;
              let finalImage = rawBase64;

              // Canvas text overlay when toggle is enabled
              if (textOverlayEnabled && content) {
                addThought("✍️ إضافة النص على الصورة بتقنية Canvas...");
                try {
                  const title = content.title || "";
                  const bodyLines = (content.body || "").split("\n").filter((l) => l.trim());
                  const cta = bodyLines.length > 0 ? bodyLines[bodyLines.length - 1].trim() : "شارك الآن 🎮";
                  setOverlayTitle(title);
                  setOverlayCta(cta);
                  finalImage = await overlayTextOnImage(rawBase64, title, cta, overlayFontSize / 100);
                } catch (overlayErr) {
                  console.warn("[TextOverlay] error:", overlayErr);
                }
              }

              setGeneratedImage(finalImage);
              // Save to recent posts (keep last 4, store thumbnail)
              try {
                const thumbCanvas = document.createElement("canvas");
                thumbCanvas.width = 256;
                thumbCanvas.height = 256;
                const thumbCtx = thumbCanvas.getContext("2d");
                const thumbImg = new Image();
                await new Promise((res) => { thumbImg.onload = res; thumbImg.src = finalImage; });
                const scale = Math.max(256 / thumbImg.width, 256 / thumbImg.height);
                const sw = thumbImg.width * scale;
                const sh = thumbImg.height * scale;
                thumbCtx.drawImage(thumbImg, (256 - sw) / 2, (256 - sh) / 2, sw, sh);
                const thumb = thumbCanvas.toDataURL("image/jpeg", 0.7);
                setRecentPosts((prev) => [{ image: thumb, title: content.title || "", time: Date.now() }, ...prev].slice(0, 4));
              } catch {}
              addThought("✅ تم توليد الصورة بنجاح!");
            } else {
              const textParts = parts.filter((p) => p.text).map((p) => p.text).join(" ");
              console.error("No image in response. Parts:", JSON.stringify(parts).slice(0, 300));
              setImageError(`Nano Banana 2 لم يُرجع صورة${textParts ? ": " + textParts.slice(0, 100) : ""}`);
              addThought("⚠️ الصورة لم تُولّد — سيتم عرض النص فقط");
            }
          }
        } else {
          const errBody = await imageResponse.text().catch(() => "");
          console.error("Image API error:", imageResponse.status, errBody);
          let detail = "";
          try { detail = JSON.parse(errBody)?.error?.message || ""; }
          catch (parseErr) { console.warn("Image API error body parse failed:", parseErr); }
          setImageError(`خطأ ${imageResponse.status}: ${detail || "فشل توليد الصورة"}`);
          addThought(`⚠️ خطأ في توليد الصورة (${imageResponse.status}) — سيتم عرض النص فقط`);
        }
      } catch (imgErr) {
        clearTimeout(imageTimeout);
        if (imgErr.name === "AbortError") {
          console.error("Image generation timed out after 120s");
          setImageError("انتهت مهلة توليد الصورة (120 ثانية)");
          addThought("⚠️ انتهت مهلة توليد الصورة — سيتم عرض النص فقط");
        } else {
          console.error("Image generation error:", imgErr);
          setImageError(imgErr.message || "خطأ غير متوقع في توليد الصورة");
          addThought("⚠️ خطأ في توليد الصورة — سيتم عرض النص فقط");
        }
      }

      setTotalGenerated((p) => p + 1);
    } catch (err) {
      console.error("Generation error:", err);
      if (err.name === "AbortError") {
        setGenerateError("انتهت مهلة الاتصال بالسيرفر (60 ثانية) — حاول مرة ثانية");
      } else {
        setGenerateError(err.message || "حدث خطأ أثناء التوليد");
      }
    } finally {
      setIsGenerating(false);
      setShowResult(true);
    }
  };

  const handleRegenerateImage = async () => {
    const comment = imageRefinementComment.trim();
    if (!comment || !lastGenerationContext?.finalImagePrompt) return;

    const mode = imageRefinementMode; // "replace" or "edit"
    setIsRegeneratingImage(true);
    setImageError(null);
    setGeneratedImage(null);

    try {
      // Save comment as a permanent image correction
      const rejId = await sbInsertRejection({ reason: comment, type: "image_correction" });
      setAgentMemory((prev) => ({
        ...prev,
        rejectionReasons: [...prev.rejectionReasons, { id: rejId, reason: comment, type: "image_correction", time: Date.now() }],
      }));

      // Build the corrected prompt
      const basePrompt = lastGenerationContext.finalImagePrompt;
      let correctedPrompt;
      if (mode === "edit") {
        correctedPrompt = `${basePrompt}

USER CORRECTION (highest priority):
${comment}
Apply this correction to the previous image concept while keeping the rest of the style.`;
      } else {
        correctedPrompt = `${basePrompt}

AVOID (based on user feedback):
${comment}
Generate a completely fresh interpretation — do NOT reuse the previous image concept.`;
      }

      const imageParts = [];
      if (styleRefs.length > 0) {
        for (const ref of styleRefs.slice(-3)) {
          imageParts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
        }
      }
      imageParts.push({ text: correctedPrompt });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: imageParts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p.inlineData);
        if (imgPart) {
          const rawBase64 = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
          rawImageRef.current = rawBase64;
          let finalImage = rawBase64;
          if (textOverlayEnabled) {
            try {
              finalImage = await overlayTextOnImage(rawBase64, overlayTitle, overlayCta, overlayFontSize / 100);
            } catch {}
          }
          setGeneratedImage(finalImage);
          setLastGenerationContext((prev) => ({ ...prev, finalImagePrompt: correctedPrompt }));
        } else {
          setImageError("لم يتم توليد صورة جديدة");
        }
      } else {
        const errBody = await response.text().catch(() => "");
        let detail = "";
        try { detail = JSON.parse(errBody)?.error?.message || ""; } catch {}
        setImageError(`خطأ ${response.status}: ${detail || "فشل توليد الصورة"}`);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setImageError("انتهت مهلة توليد الصورة (120 ثانية)");
      } else {
        setImageError(err.message || "خطأ غير متوقع");
      }
    } finally {
      setIsRegeneratingImage(false);
      setImageRefinementMode(null);
      setImageRefinementComment("");
    }
  };

  const handleFeedback = async (accepted, reason = "") => {
    setFeedbackGiven(true);
    if (accepted) {
      setAcceptedCount((p) => p + 1);
      setAgentXP((p) => {
        const newXP = p + 25;
        if (newXP >= 100) {
          setAgentLevel((l) => l + 1);
          return newXP - 100;
        }
        return newXP;
      });
      setAgentMemory((prev) => {
        const withInteraction = {
          ...prev,
          successfulPrompts: [...prev.successfulPrompts, { type: selectedPostType, time: Date.now() }],
          styleProfile: { ...prev.styleProfile, confidence: Math.min(prev.styleProfile.confidence + 0.05, 1) },
          totalInteractions: prev.totalInteractions + 1,
        };
        return applyFeedbackToMemory(withInteraction, lastGenerationContext, true, "");
      });
    } else {
      setRejectedCount((p) => p + 1);
      setAgentXP((p) => Math.min(p + 10, 99));
      const rejectionId = await sbInsertRejection({ reason, type: selectedPostType });
      setAgentMemory((prev) => {
        const withInteraction = {
          ...prev,
          rejectionReasons: [...prev.rejectionReasons, { id: rejectionId, reason, type: selectedPostType, time: Date.now() }],
          totalInteractions: prev.totalInteractions + 1,
        };
        return applyFeedbackToMemory(withInteraction, lastGenerationContext, false, reason);
      });
    }
  };

  // --- Manual memory management handlers ---

  const handleAddPattern = async () => {
    const text = newPatternText.trim();
    if (!text) return;
    const newPattern = { pattern: text, weight: newPatternWeight, source: "manual" };
    const id = await sbInsertPattern(newPattern);
    setAgentMemory((prev) => ({
      ...prev,
      learnedPatterns: [
        ...prev.learnedPatterns,
        { id, ...newPattern },
      ],
    }));
    setNewPatternText("");
    setNewPatternWeight(0.7);
  };

  const handleDeletePattern = async (id) => {
    await sbDeleteRow("learned_patterns", id);
    setAgentMemory((prev) => ({
      ...prev,
      learnedPatterns: prev.learnedPatterns.filter((p) => p.id !== id),
    }));
  };

  const handleAddRejection = async () => {
    const text = newRejectionText.trim();
    if (!text) return;
    const newRejection = { reason: text, type: "manual", time: Date.now() };
    const id = await sbInsertRejection(newRejection);
    setAgentMemory((prev) => ({
      ...prev,
      rejectionReasons: [
        ...prev.rejectionReasons,
        { id, ...newRejection },
      ],
    }));
    setNewRejectionText("");
  };

  const handleDeleteRejection = async (id) => {
    await sbDeleteRow("rejection_reasons", id);
    setAgentMemory((prev) => ({
      ...prev,
      rejectionReasons: prev.rejectionReasons.filter((r) => r.id !== id),
    }));
  };

  // --- Style Reference Library handlers ---

  const handleAddStyleRef = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      try {
        const { mimeType, data, thumbnail } = await resizeImageToBase64(file, 512);
        const record = {
          id: crypto.randomUUID(),
          mimeType,
          data,
          thumbnail,
          addedAt: Date.now(),
        };
        await sbInsertStyleRef(record);
        setStyleRefs((prev) => [...prev, record]);
      } catch (err) {
        console.warn("Failed to add style ref:", err);
      }
    }
    e.target.value = "";
  };

  const handleDeleteStyleRef = async (id) => {
    try {
      await sbDeleteRow("style_refs", id);
      setStyleRefs((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.warn("Failed to delete style ref:", err);
    }
  };

  // --- Training Mode handlers ---

  const createThumbnailFromDataURL = (dataURL, maxDim = 128) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = maxDim / Math.max(width, height);
        const tw = Math.round(width * scale);
        const th = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        canvas.getContext("2d").drawImage(img, 0, 0, tw, th);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataURL;
    });

  const generateTrainingDirections = async (topic, styleProfile, stylePatterns) => {
    const fallback = dedupeTrainingVariations(FALLBACK_TRAINING_VARIATIONS, 6);

    const planningPrompt = `You are planning diverse image training directions for a car drift game marketing agent.
Topic: "${topic}"

Current style profile:
- Colors: ${styleProfile.preferredColors.join(", ")}
- Composition: ${styleProfile.preferredComposition}
- Arabic font style preference: ${styleProfile.arabicFont}
- Learned patterns: ${stylePatterns || "none"}

Task:
- Create 6 visually distinct directions (NOT repetitive).
- Each direction must differ clearly in camera angle, environment, lighting, and motion feeling.
- Keep direction labels in Arabic (2-4 words).
- Keep direction prompt prefixes in English only.
- Do not include any text-on-image instructions.

Return JSON only:
{"directions":[{"label":"...", "prefix":"..."}, ...]}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { ...ANTHROPIC_HEADERS },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
          temperature: 0.95,
          messages: [{ role: "user", content: planningPrompt }],
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Training planning API ${response.status}`);
      const data = await response.json();
      const raw = data.content?.[0]?.text;
      const parsed = raw ? extractJSON(raw) : null;

      const rawDirections = parsed?.directions || parsed?.variations || [];
      const modelDirections = dedupeTrainingVariations(
        rawDirections.map((d) => ({
          label: d?.label || d?.name || "",
          prefix: d?.prefix || d?.prompt || d?.direction || "",
        })),
        6,
      );

      const merged = dedupeTrainingVariations([...modelDirections, ...fallback], 6);
      if (merged.length >= 4) return { directions: merged, source: "ai" };
      return { directions: fallback, source: "fallback" };
    } catch (err) {
      clearTimeout(timeout);
      console.warn("Training direction planning fallback:", err);
      return { directions: fallback, source: "fallback" };
    }
  };

  const handleOpenTrainingPreview = (index) => {
    const item = trainingImages[index];
    if (!item || item.status !== "done" || !item.image) return;
    setTrainingPreviewIndex(index);
  };

  const handleStartTraining = async () => {
    if (!trainingTopic.trim()) return;

    setIsTraining(true);
    setIsPreparingTraining(true);
    setTrainingLikedIndexes([]);
    setTrainingDislikedIndexes([]);
    setTrainingComments({});
    setTrainingToast("");
    setTrainingPreviewIndex(null);
    setTrainingPlanSource("");

    try {
      const scoring = normalizeScoringEngine(agentMemory.scoringEngine);
      const sp = deriveStyleProfileFromScoring(scoring, agentMemory.styleProfile);
      const rankedPatterns = (agentMemory.learnedPatterns || [])
        .map((p) => {
          const signal = scoring.patternScores[p.pattern]?.score ?? 0.5;
          return { pattern: p.pattern, effective: (p.weight * 0.7) + (signal * 0.3) };
        })
        .sort((a, b) => b.effective - a.effective)
        .slice(0, 6);
      const stylePatternList = rankedPatterns.map((p) => p.pattern);
      const stylePatterns = stylePatternList.join(", ");

      const topic = trainingTopic.trim();
      const { directions, source } = await generateTrainingDirections(topic, sp, stylePatterns);
      setTrainingDirections(directions);
      setTrainingPlanSource(source);
      setTrainingImages(directions.map((v) => ({
        image: null,
        prompt: "",
        label: v.label,
        direction: v.prefix,
        trainingContext: {
          postType: selectedPostType || "training",
          textPolicy: "no-text",
          styleProfile: sp,
          usedColors: [...(sp.preferredColors || [])],
          usedPatterns: [...stylePatternList, v.label, v.prefix].filter(Boolean),
        },
        status: "loading",
      })));
      setIsPreparingTraining(false);

      const basePrompt = `Hajwalah Corsa 2 racing game, ${topic}, color palette: ${sp.preferredColors.join(", ")}, composition: ${sp.preferredComposition}, ${stylePatterns}`;

      const textRuleBlock = `⛔ ABSOLUTE RULE — ZERO TEXT ON IMAGE ⛔
- DO NOT render any text, letters, words, numbers, or symbols
- DO NOT add titles, hashtags, labels, captions, or watermarks
- The output must be PURELY VISUAL with ZERO typography`;

      // Build style ref inlineData parts (up to 3)
      const refParts = [];
      if (styleRefs.length > 0) {
        for (const ref of styleRefs.slice(-3)) {
          refParts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
        }
      }

      const promises = directions.map(async (variation, index) => {
        const nonce = crypto.randomUUID().slice(0, 8);
        const fullPrompt = `${textRuleBlock}

VARIATION OBJECTIVE:
- Variation #${index + 1}: ${variation.label}
- Must be visually DISTINCT from other outputs in this training round
- Primary direction: ${variation.prefix}
- Uniqueness token: ${nonce}

BASE STYLE CONTEXT:
${basePrompt}`;

        const parts = [...refParts, { text: fullPrompt }];
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        try {
          const response = await fetch(IMAGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          });
          clearTimeout(timeout);

          if (!response.ok) throw new Error(`API ${response.status}`);
          const data = await response.json();
          const candidate = data.candidates?.[0];
          if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
            throw new Error(candidate.finishReason);
          }
          const imagePart = (candidate?.content?.parts || []).find((p) => p.inlineData);
          if (!imagePart) throw new Error("No image returned");

          const { mimeType, data: imgData } = imagePart.inlineData;
          const dataURL = `data:${mimeType};base64,${imgData}`;
          return {
            image: dataURL,
            prompt: fullPrompt,
            label: variation.label,
            direction: variation.prefix,
            trainingContext: {
              postType: selectedPostType || "training",
              textPolicy: "no-text",
              styleProfile: sp,
              usedColors: [...(sp.preferredColors || [])],
              usedPatterns: [...stylePatternList, variation.label, variation.prefix].filter(Boolean),
            },
            status: "done",
          };
        } catch (err) {
          clearTimeout(timeout);
          return {
            image: null,
            prompt: fullPrompt,
            label: variation.label,
            direction: variation.prefix,
            trainingContext: {
              postType: selectedPostType || "training",
              textPolicy: "no-text",
              styleProfile: sp,
              usedColors: [...(sp.preferredColors || [])],
              usedPatterns: [...stylePatternList, variation.label, variation.prefix].filter(Boolean),
            },
            status: "error",
            error: err.message,
          };
        }
      });

      // Update results progressively
      promises.forEach((p, i) => {
        p.then((result) => {
          setTrainingImages((prev) => prev.map((item, idx) => idx === i ? result : item));
        });
      });

      await Promise.allSettled(promises);
    } finally {
      setIsPreparingTraining(false);
      setIsTraining(false);
    }
  };

  const handleToggleTrainingLike = (index) => {
    const item = trainingImages[index];
    if (!item || item.status !== "done" || !item.image || trainingLearning) return;
    setTrainingLikedIndexes((prev) => (
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    ));
    setTrainingDislikedIndexes((prev) => prev.filter((i) => i !== index));
  };

  const handleToggleTrainingDislike = (index) => {
    const item = trainingImages[index];
    if (!item || item.status !== "done" || !item.image || trainingLearning) return;
    setTrainingDislikedIndexes((prev) => (
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    ));
    setTrainingLikedIndexes((prev) => prev.filter((i) => i !== index));
  };

  const handleAnalyzeTrainingFeedback = async () => {
    if (trainingLearning) return;

    const doneImages = trainingImages
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === "done" && item.image);

    const likedSet = new Set(trainingLikedIndexes);
    const dislikedSet = new Set(trainingDislikedIndexes);
    const likedItems = doneImages.filter(({ index }) => likedSet.has(index)).map(({ item, index }) => ({ ...item, _comment: trainingComments[index] || "" }));
    const dislikedItems = doneImages.filter(({ index }) => dislikedSet.has(index)).map(({ item, index }) => ({ ...item, _comment: trainingComments[index] || "" }));
    const neutralItems = doneImages
      .filter(({ index }) => !likedSet.has(index) && !dislikedSet.has(index) && trainingComments[index]?.trim())
      .map(({ item, index }) => ({ ...item, _comment: trainingComments[index] }));

    if (likedItems.length === 0 && dislikedItems.length === 0 && neutralItems.length === 0) {
      setTrainingToast("حدد على الأقل صورة واحدة بلايك أو دسلايك أو اكتب ملاحظة");
      setTimeout(() => setTrainingToast(""), 3500);
      return;
    }

    setTrainingLearning(true);
    try {
      // 1) Persist all liked images as style references via Supabase.
      const newRefs = [];
      for (const liked of likedItems) {
        const [, payload] = liked.image.split(",");
        const mimeType = liked.image.match(/data:([^;]+)/)?.[1] || "image/png";
        const thumbnail = await createThumbnailFromDataURL(liked.image);
        const record = {
          id: crypto.randomUUID(),
          mimeType,
          data: payload,
          thumbnail,
          addedAt: Date.now(),
        };
        await sbInsertStyleRef(record);
        newRefs.push(record);
      }
      if (newRefs.length > 0) {
        setStyleRefs((prev) => [...prev, ...newRefs]);
      }

      // 2) Ask model to extract positive, negative, and neutral visual signals.
      const formatItem = (t, i, tag) => {
        let block = `[${tag} ${i + 1}] label: ${t.label}\ndirection: ${t.direction || ""}\nprompt: ${t.prompt}`;
        if (t._comment) block += `\nuser_comment: "${t._comment}"`;
        return block;
      };
      const likedPromptBlock = likedItems.length > 0
        ? likedItems.map((t, i) => formatItem(t, i, "LIKE")).join("\n\n")
        : "none";
      const dislikedPromptBlock = dislikedItems.length > 0
        ? dislikedItems.map((t, i) => formatItem(t, i, "DISLIKE")).join("\n\n")
        : "none";
      const neutralPromptBlock = neutralItems.length > 0
        ? neutralItems.map((t, i) => formatItem(t, i, "NEUTRAL")).join("\n\n")
        : "none";

      const analysisPrompt = `The user has rated a batch of generated drift images.

LIKED images:
${likedPromptBlock}

DISLIKED images:
${dislikedPromptBlock}

NEUTRAL images (no like/dislike, but user left a comment):
${neutralPromptBlock}

RULES:
- If a user_comment exists for an image, treat it as a PRECISE correction request — higher priority than the general liked/disliked signal. Extract it as a specific actionable pattern (positive or negative).
- For NEUTRAL images: do NOT boost or penalize scores. Only extract the user_comment as a directional learned pattern.
- Analyze all sides and return concise structured learning.

Return JSON only:
{
  "positivePatterns": [{"pattern":"Arabic short description","weight":0.82}],
  "negativePatterns": [{"reason":"Arabic short description","weight":0.74}]
}`;

      let positivePatterns = [];
      let negativePatterns = [];

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: { ...ANTHROPIC_HEADERS },
          signal: controller.signal,
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 700,
            temperature: 0.7,
            messages: [{ role: "user", content: analysisPrompt }],
          }),
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const rawText = data.content?.[0]?.text;
          if (rawText) {
            const result = extractJSON(rawText);
            positivePatterns = Array.isArray(result?.positivePatterns)
              ? result.positivePatterns
              : Array.isArray(result?.patterns) ? result.patterns : [];
            negativePatterns = Array.isArray(result?.negativePatterns)
              ? result.negativePatterns
              : Array.isArray(result?.avoidPatterns) ? result.avoidPatterns : [];
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        console.warn("Training batch analysis fallback:", err);
      }

      // 3) Persist new patterns + rejections to Supabase, then update memory.
      const newPatternIds = [];
      for (const p of positivePatterns) {
        const id = await sbInsertPattern({
          pattern: p.pattern || p.text || "نمط إيجابي من التقييم",
          weight: Math.max(0.1, Math.min(1, p.weight || 0.82)),
          source: "training-feedback",
        });
        newPatternIds.push(id);
      }
      const newRejectionIds = [];
      for (const p of negativePatterns) {
        const id = await sbInsertRejection({
          reason: p.reason || p.pattern || p.text || "نمط غير مرغوب",
          type: "training",
        });
        newRejectionIds.push(id);
      }

      setAgentMemory((prev) => {
        let next = {
          ...prev,
          totalInteractions: prev.totalInteractions + likedItems.length + dislikedItems.length,
          successfulPrompts: [
            ...prev.successfulPrompts,
            ...likedItems.map(() => ({ type: selectedPostType || "training", time: Date.now() })),
          ],
          styleProfile: {
            ...prev.styleProfile,
            confidence: clamp01(
              prev.styleProfile.confidence + (likedItems.length * 0.03) - (dislikedItems.length * 0.015),
            ),
          },
        };

        if (positivePatterns.length > 0) {
          const newPatterns = positivePatterns.map((p) => ({
            id: newPatternIds.shift(),
            pattern: p.pattern || p.text || "نمط إيجابي من التقييم",
            weight: Math.max(0.1, Math.min(1, p.weight || 0.82)),
            source: "training-feedback",
          }));
          next.learnedPatterns = [...next.learnedPatterns, ...newPatterns];
        }

        if (negativePatterns.length > 0) {
          const newRejections = negativePatterns.map((p) => ({
            id: newRejectionIds.shift(),
            reason: p.reason || p.pattern || p.text || "نمط غير مرغوب",
            type: "training",
            time: Date.now(),
          }));
          next.rejectionReasons = [...next.rejectionReasons, ...newRejections];
        }

        for (const item of likedItems) {
          next = applyFeedbackToMemory(next, item.trainingContext, true, "");
        }
        for (const item of dislikedItems) {
          next = applyFeedbackToMemory(next, item.trainingContext, false, "style");
        }
        return next;
      });

      const parts = [];
      if (likedItems.length > 0) parts.push(`${likedItems.length} لايك`);
      if (dislikedItems.length > 0) parts.push(`${dislikedItems.length} دسلايك`);
      if (neutralItems.length > 0) parts.push(`${neutralItems.length} ملاحظة`);
      setTrainingToast(`تم التعلم من ${parts.join(" و ")}`);
      setTrainingLikedIndexes([]);
      setTrainingDislikedIndexes([]);
      setTrainingComments({});
    } catch (err) {
      console.warn("Training feedback analysis error:", err);
      setTrainingToast("صار خطأ أثناء تحليل التقييمات");
    } finally {
      setTrainingLearning(false);
      setTimeout(() => setTrainingToast(""), 4000);
    }
  };

  // --- Image upload + Claude style analysis ---

  const handleStyleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStyleImageFile(file);
    setStyleAnalysisResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setStyleImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyzeStyle = async () => {
    if (!styleImageFile) return;
    setIsAnalyzingStyle(true);
    setStyleAnalysisResult(null);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(styleImageFile);
      });

      const mimeType = styleImageFile.type || "image/png";

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { ...ANTHROPIC_HEADERS },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          temperature: 0.7,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `حلل الستايل البصري لهذه الصورة بالتفصيل. أبي تحلل:
1. الألوان الرئيسية والمزاج اللوني
2. التكوين والتخطيط البصري
3. أسلوب الإضاءة
4. الطابع العام (mood)
5. أي عناصر تصميمية مميزة

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"patterns": [{"text": "وصف قصير بالعربي", "weight": 0.0-1.0}, ...]}

اعطني 3-5 أنماط مستخلصة من الصورة. الوزن يعكس مدى وضوح النمط في الصورة.`,
              },
            ],
          }],
        }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const rawText = data.content?.[0]?.text;
      if (!rawText) throw new Error("لم يتم استلام رد من النموذج");

      const result = extractJSON(rawText);
      if (!result) throw new Error("تنسيق الرد غير صحيح");

      setStyleAnalysisResult(result);

      if (result.patterns && Array.isArray(result.patterns)) {
        const patternsWithIds = [];
        for (const p of result.patterns) {
          const newP = {
            pattern: p.text,
            weight: Math.max(0.1, Math.min(1, p.weight || 0.6)),
            source: "image-analysis",
          };
          const id = await sbInsertPattern(newP);
          patternsWithIds.push({ id, ...newP });
        }
        setAgentMemory((prev) => ({
          ...prev,
          learnedPatterns: [...prev.learnedPatterns, ...patternsWithIds],
        }));
      }
    } catch (err) {
      console.error("Style analysis error:", err);
      setStyleAnalysisResult({ error: err.message || "حدث خطأ أثناء تحليل الصورة" });
    } finally {
      setIsAnalyzingStyle(false);
    }
  };

  const postTypes = [
    { id: "update", label: "تحديث جديد", emoji: "🆕", desc: "إعلان عن تحديث أو ميزة جديدة" },
    { id: "event", label: "حدث / مسابقة", emoji: "🏆", desc: "إعلان مسابقة أو تحدي" },
    { id: "car", label: "سيارة جديدة", emoji: "🚗", desc: "عرض سيارة جديدة باللعبة" },
    { id: "tip", label: "نصيحة لعب", emoji: "💡", desc: "نصيحة أو حركة هجولة" },
    { id: "season", label: "موسم جديد", emoji: "🌟", desc: "إعلان موسم أو باتل باس" },
    { id: "collab", label: "تعاون", emoji: "🤝", desc: "شراكة أو تعاون مع براند" },
    { id: "other", label: "أخرى", emoji: "✏️", desc: "نوع بوست مخصص حسب توجيهك" },
  ];

  const rejectionReasons = [
    { id: "style", label: "الستايل مو حلو", emoji: "🎨" },
    { id: "text", label: "النص العربي فيه مشكلة", emoji: "✏️" },
    { id: "composition", label: "التكوين ضعيف", emoji: "📐" },
    { id: "colors", label: "الألوان مو مناسبة", emoji: "🌈" },
    { id: "vibe", label: "الفايب مو هجولة", emoji: "🏎️" },
    { id: "quality", label: "الجودة ضعيفة", emoji: "📷" },
  ];

  // ============================================================
  // PAGES
  // ============================================================

  const renderHome = () => (
    <div style={{ animation: "fadeUp 0.6s ease" }}>
      {/* Hero */}
      <div style={{
        textAlign: "center",
        padding: "60px 20px 40px",
        position: "relative",
      }}>
        <div style={{
          display: "inline-flex",
          gap: 8,
          background: "rgba(147,51,234,0.08)",
          borderRadius: 40,
          padding: "8px 20px",
          marginBottom: 24,
          border: `1px solid ${T.softBorder}`,
        }}>
          <span>🤖</span>
          <span style={{ color: T.tagText, fontWeight: 600, fontSize: 14 }}>
            الوكيل الذكي — الإصدار ٢.٠
          </span>
        </div>

        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          background: `linear-gradient(135deg, ${PURPLE[900]}, ${PURPLE[600]}, #db2777)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.2,
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          صمّم بوستات هجولة كورسا ٢
          <br />
          <span style={{ fontSize: 28, opacity: 0.8 }}>بذكاء يتعلّم من ذوقك</span>
        </h1>

        <p style={{
          color: T.textSecondary,
          fontSize: 17,
          maxWidth: 520,
          margin: "0 auto 40px",
          lineHeight: 1.8,
        }}>
          وكيل ذكاء اصطناعي يفهم ستايل لعبتك ويتطور مع كل تفاعل.
          <br />
          كل ما تقبل أو ترفض صورة، الوكيل يصير أذكى 🧠
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setCurrentPage("generate")}
            style={{
              background: `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`,
              color: "white",
              border: "none",
              padding: "16px 36px",
              borderRadius: 16,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 8px 32px ${PURPLE[400]}50`,
              transition: "all 0.3s",
              fontFamily: "'Tajawal', sans-serif",
            }}
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            ✨ ابدأ التصميم
          </button>
          <button
            onClick={() => setShowArchitecture(true)}
            style={{
              background: T.cardBg,
              color: T.tagText,
              border: `2px solid ${T.softBorder}`,
              padding: "16px 36px",
              borderRadius: 16,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "'Tajawal', sans-serif",
            }}
            onMouseOver={(e) => e.target.style.background = T.softBg}
            onMouseOut={(e) => e.target.style.background = T.cardBg}
          >
            🏗️ كيف يشتغل الوكيل؟
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 16,
        margin: "0 auto 48px",
        maxWidth: 700,
        padding: "0 20px",
      }}>
        {[
          { label: "مستوى الوكيل", value: agentLevel, icon: "⚡" },
          { label: "صور مولدة", value: totalGenerated, icon: "🖼️" },
          { label: "مقبولة", value: acceptedCount, icon: "✅" },
          { label: "مرفوضة", value: rejectedCount, icon: "❌" },
        ].map((s, i) => (
          <div key={i} style={{
            background: T.cardBg,
            borderRadius: 20,
            padding: "20px 16px",
            textAlign: "center",
            border: `1px solid ${T.cardBorder}`,
            boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
          }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.text, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2, fontFamily: "'Tajawal', sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Posts Gallery */}
      <div style={{ padding: "0 20px", maxWidth: 900, margin: "0 auto 48px" }}>
        <h2 style={{
          textAlign: "center",
          fontSize: 22,
          fontWeight: 800,
          color: T.text,
          marginBottom: 20,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          آخر البوستات المولّدة
        </h2>
        {recentPosts.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {recentPosts.map((post, i) => (
              <div
                key={i}
                onClick={() => setPreviewRecentPost(post)}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  border: `1px solid ${T.cardBorder}`,
                  aspectRatio: "1",
                }}
              >
                <img src={post.image} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "20px 10px 8px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                  direction: "rtl",
                  lineHeight: 1.4,
                }}>
                  {post.title}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: 40,
            background: T.softBg,
            borderRadius: 20,
            border: `1px solid ${T.cardBorder}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
            <p style={{ fontSize: 15, color: T.textSecondary, fontFamily: "'Tajawal', sans-serif" }}>
              لم تولّد أي بوست بعد — ابدأ الآن!
            </p>
          </div>
        )}
      </div>

      {/* Recent Post Preview Modal */}
      {previewRecentPost && (
        <div
          onClick={() => setPreviewRecentPost(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <img
            src={previewRecentPost.image}
            alt={previewRecentPost.title}
            style={{ maxWidth: "90%", maxHeight: "85vh", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* How to Use the Agent - Guide */}
      <div style={{ padding: "0 20px", maxWidth: 900, margin: "0 auto 48px" }}>
        <h2 style={{
          textAlign: "center",
          fontSize: 22,
          fontWeight: 800,
          color: T.text,
          marginBottom: 20,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          🎯 كيف تستخدم الوكيل بشكل صحيح؟
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, direction: "rtl" }}>
          {[
            {
              num: "1️⃣",
              title: "كيف تكتب برومبت صح",
              content: `✅ اكتب الهدف بوضوح:\n"بوست يعلن عن تحديث جديد للعبة فيه سيارة كامري"\n\n✅ حدد النبرة:\n"أسلوب حماسي يخاطب شباب السعودية"\n\n✅ اطلب نص على الصورة إذا تبيه:\n"ضع على الصورة: حمّل الآن"\n\n❌ تجنب البرومبت المبهم:\n"سوّي بوست حلو"`,
            },
            {
              num: "2️⃣",
              title: "كيف تدرّب الوكيل على ذوقك",
              content: `• بعد كل بوست: اضغط ✅ قبول أو ❌ رفض\n  الوكيل يتعلم من كل تقييم تلقائياً\n\n• في وضع التدريب: يولّد 6 صور متنوعة\n  قيّمها وحلّل — الوكيل يستخرج أنماطك البصرية\n\n• كلما زادت تقييماتك، كلما صارت النتائج أدق`,
            },
            {
              num: "3️⃣",
              title: "كيف تضيف قاعدة ثابتة للوكيل",
              content: `روح صفحة الذاكرة ← ذاكرة الرفض ← أضف يدوياً:\n\nمثال:\n"لا تستخدم اللهجة المصرية أبداً"\n"الخلفية تكون دايماً داكنة"\n"لا تذكر أسماء منافسين"\n\nهذي تصبح قوانين صارمة في كل بوست جديد`,
            },
            {
              num: "4️⃣",
              title: "كيف تعدّل النص على الصورة",
              content: `بعد توليد الصورة، تظهر خانتان:\n• العنوان — عدّله كيف تبي\n• نص الدعوة — اكتب الـ CTA اللي تبيه\n\nاضغط "تحديث النص على الصورة" وتشوف التغيير فوراً\nكذلك تقدر تكبر أو تصغر النص بالـ slider`,
            },
            {
              num: "5️⃣",
              title: "كيف تعدّل الصورة إذا ما عجبتك",
              content: `• تعديل الصورة: نفس الستايل مع تصحيح محدد\n  اكتب ملاحظتك مثل: "أبي السيارة أوضح من الأمام"\n\n• استبدال الصورة: صورة جديدة كلياً\n  اكتب ملاحظتك مثل: "تجنب الدخان الكثير"\n\n⚡ ملاحظاتك تُحفظ وتؤثر على الصور القادمة`,
            },
            {
              num: "6️⃣",
              title: "كيف ترفع صور مرجعية للعبة",
              content: `صفحة الذاكرة ← مكتبة صور اللعبة\nارفع سكرينشوتات من اللعبة\n\nالوكيل يستخدمها كـ "DNA البصري" عند توليد الصور\nكلما رفعت أكثر، كلما اقتربت الصور من ستايل لعبتك`,
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                background: T.cardBg,
                borderRadius: 16,
                border: `1px solid ${T.cardBorder}`,
                overflow: "hidden",
                transition: "all 0.2s",
              }}
            >
              <button
                onClick={() => setExpandedGuideStep(expandedGuideStep === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 18px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  direction: "rtl",
                }}
              >
                <span style={{ fontSize: 20 }}>{step.num}</span>
                <span style={{
                  flex: 1,
                  textAlign: "right",
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.text,
                  fontFamily: "'Tajawal', sans-serif",
                }}>{step.title}</span>
                <span style={{
                  fontSize: 16,
                  color: T.textMuted,
                  transform: expandedGuideStep === i ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                }}>▼</span>
              </button>
              {expandedGuideStep === i && (
                <div style={{
                  padding: "0 18px 16px",
                  fontSize: 14,
                  color: T.textSecondary,
                  lineHeight: 2,
                  fontFamily: "'Tajawal', sans-serif",
                  whiteSpace: "pre-line",
                  borderTop: `1px solid ${T.cardBorder}`,
                  paddingTop: 14,
                }}>
                  {step.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Comparison Card */}
      <div style={{
        maxWidth: 900,
        margin: "0 auto 48px",
        padding: "0 20px",
      }}>
        <div style={{
          background: T.cardBg,
          borderRadius: 24,
          padding: 28,
          border: `1px solid ${T.cardBorder}`,
          boxShadow: darkMode ? "0 4px 24px rgba(0,0,0,0.2)" : "0 4px 24px rgba(147,51,234,0.06)",
          direction: "rtl",
        }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 800,
            color: T.text,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 20,
            textAlign: "center",
          }}>
            كيف تكتب برومبت يفهمه الوكيل؟
          </h3>

          <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#ef4444", fontFamily: "'Tajawal', sans-serif", padding: "8px 0" }}>
              ❌ برومبت ضعيف
            </div>
            <div style={{ width: 1 }} />
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#22c55e", fontFamily: "'Tajawal', sans-serif", padding: "8px 0" }}>
              ✅ برومبت قوي
            </div>
          </div>

          {[
            {
              weak: "سوّي بوست حلو عن اللعبة",
              strong: "بوست يعلن عن تحديث جديد فيه سيارة كامري 2024 تتفحط في شارع الرياض بالليل مع دخان كثيف",
            },
            {
              weak: "بوست تسويقي",
              strong: "بوست حماسي يخاطب شباب السعودية يقول إن التحديث الجديد فيه 3 سيارات جديدة ويحمسهم يحملون اللعبة",
            },
            {
              weak: "صورة سيارة",
              strong: "صورة درفت من الخلف لسيارة دودج تشارجر سوداء على طريق صحراوي وقت الغروب مع غبار يتطاير",
            },
            {
              weak: "بوست مسابقة",
              strong: "بوست يعلن عن تحدي أسبوعي: أسرع لفة في حلبة جدة — الفائز يحصل على سيارة حصرية داخل اللعبة",
            },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 0,
              marginBottom: i < 3 ? 8 : 0,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${T.cardBorder}`,
            }}>
              <div style={{
                flex: 1,
                padding: "12px 14px",
                background: darkMode ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
                borderLeft: `1px solid ${T.cardBorder}`,
              }}>
                <p style={{
                  fontSize: 13,
                  color: darkMode ? "#fca5a5" : "#b91c1c",
                  lineHeight: 1.7,
                  fontFamily: "monospace, 'Tajawal'",
                  direction: "rtl",
                  margin: 0,
                }}>"{row.weak}"</p>
              </div>
              <div style={{
                width: 2,
                background: T.cardBorder,
                flexShrink: 0,
              }} />
              <div style={{
                flex: 1,
                padding: "12px 14px",
                background: darkMode ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)",
              }}>
                <p style={{
                  fontSize: 13,
                  color: darkMode ? "#86efac" : "#15803d",
                  lineHeight: 1.7,
                  fontFamily: "monospace, 'Tajawal'",
                  direction: "rtl",
                  margin: 0,
                }}>"{row.strong}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div style={{ animation: "fadeUp 0.6s ease", maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <button
        onClick={() => { setCurrentPage("home"); setShowResult(false); setSelectedPostType(null); setGeneratedContent(null); setGeneratedImage(null); setGenerateError(null); setLastGenerationContext(null); setTrainingMode(false); setTrainingImages([]); setTrainingDirections([]); setTrainingPlanSource(""); setTrainingLikedIndexes([]); setTrainingDislikedIndexes([]); setTrainingComments({}); setTrainingPreviewIndex(null); }}
        style={{
          background: "none",
          border: "none",
          color: T.tagText,
          fontSize: 15,
          cursor: "pointer",
          marginBottom: 24,
          fontFamily: "'Tajawal', sans-serif",
          fontWeight: 600,
        }}
      >
        → العودة للرئيسية
      </button>

      <h2 style={{
        fontSize: 30,
        fontWeight: 800,
        color: T.text,
        marginBottom: 8,
        fontFamily: "'Tajawal', sans-serif",
      }}>
        ✨ مولّد البوستات الذكي
      </h2>
      <p style={{
        color: T.textSecondary,
        fontSize: 15,
        marginBottom: 32,
        fontFamily: "'Tajawal', sans-serif",
      }}>
        اختر نوع البوست والوكيل يتكفل بالباقي بناءً على ذاكرته
      </p>

      {/* Step 1: Post Type */}
      {!showResult && (
        <>
          <div style={{ marginBottom: 32 }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              color: T.text,
              marginBottom: 16,
              fontFamily: "'Tajawal', sans-serif",
            }}>
              ١. اختر نوع البوست
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {postTypes.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setSelectedPostType(pt.id)}
                  style={{
                    background: selectedPostType === pt.id ? `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})` : T.cardBg,
                    color: selectedPostType === pt.id ? "white" : T.text,
                    border: `2px solid ${selectedPostType === pt.id ? PURPLE[600] : T.cardBorder}`,
                    borderRadius: 16,
                    padding: "16px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{pt.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pt.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Optional prompt */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              color: T.text,
              marginBottom: 16,
              fontFamily: "'Tajawal', sans-serif",
            }}>
              ٢. توجيه إضافي (اختياري)
            </h3>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: أبي الصورة فيها سيارة كامارو مع دخان تفحيط وخلفية ليل..."
              style={{
                width: "100%",
                minHeight: 100,
                borderRadius: 16,
                border: `2px solid ${T.inputBorder}`,
                padding: 16,
                fontSize: 15,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                background: T.inputBg,
                color: T.text,
              }}
              onFocus={(e) => e.target.style.borderColor = PURPLE[400]}
              onBlur={(e) => e.target.style.borderColor = T.inputBorder}
            />
          </div>

          {/* Agent Memory Preview */}
          <div style={{
            background: T.softBg,
            borderRadius: 20,
            padding: 24,
            marginBottom: 32,
            border: `1px solid ${T.cardBorder}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <span style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.text,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                الوكيل بيستخدم هالمعلومات المتعلمة:
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {agentMemory.learnedPatterns.map((p, i) => (
                <span
                  key={i}
                  style={{
                    background: T.tagBg,
                    color: T.tagText,
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "'Tajawal', sans-serif",
                    border: `1px solid ${T.tagBorder}`,
                  }}
                >
                  {p.pattern}
                  <span style={{
                    marginRight: 6,
                    color: T.textMuted,
                    fontSize: 11,
                  }}>
                    ({Math.round(p.weight * 100)}%)
                  </span>
                </span>
              ))}
              {agentMemory.rejectionReasons.length > 0 && (
                <span style={{
                  background: T.errorBg,
                  color: T.errorText,
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontFamily: "'Tajawal', sans-serif",
                  border: `1px solid ${T.errorBorder}`,
                }}>
                  🚫 يتجنب: {agentMemory.rejectionReasons.length} نمط مرفوض
                </span>
              )}
            </div>
          </div>

          {/* Style Reference Indicator */}
          {styleRefs.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: `${PURPLE[900]}30`,
              border: `1px solid ${PURPLE[700]}40`,
              borderRadius: 12,
              marginBottom: 12,
              direction: "rtl",
            }}>
              <span style={{ fontSize: 18 }}>🎮</span>
              <span style={{ fontSize: 14, color: PURPLE[300], fontFamily: "'Tajawal', sans-serif" }}>
                {styleRefs.length} صور مرجعية من اللعبة سيتم إرسالها مع البرومبت
              </span>
            </div>
          )}

          {/* Text Overlay Toggle */}
          <button
            onClick={() => setTextOverlayEnabled(!textOverlayEnabled)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${textOverlayEnabled ? PURPLE[500] : T.cardBorder}`,
              background: textOverlayEnabled ? `${PURPLE[500]}15` : T.softBg,
              cursor: "pointer",
              marginBottom: 10,
              direction: "rtl",
              transition: "all 0.2s",
            }}
          >
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              color: T.text,
            }}>
              نص على الصورة
            </span>
            <div style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: textOverlayEnabled ? PURPLE[500] : "#cbd5e1",
              position: "relative",
              transition: "background 0.2s",
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "white",
                position: "absolute",
                top: 2,
                transition: "left 0.2s",
                left: textOverlayEnabled ? 20 : 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </button>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedPostType || isGenerating}
            style={{
              width: "100%",
              background: selectedPostType
                ? `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`
                : "#e2e8f0",
              color: selectedPostType ? "white" : T.textMuted,
              border: "none",
              padding: "18px 36px",
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 700,
              cursor: selectedPostType ? "pointer" : "not-allowed",
              boxShadow: selectedPostType ? `0 8px 32px ${PURPLE[400]}40` : "none",
              transition: "all 0.3s",
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {isGenerating ? "⏳ الوكيل يشتغل..." : "🎨 ولّد البوست"}
          </button>

          {/* Training Mode Toggle */}
          <button
            onClick={() => {
              if (trainingMode) {
                setTrainingPreviewIndex(null);
                setTrainingDirections([]);
                setTrainingPlanSource("");
                setTrainingLikedIndexes([]);
                setTrainingDislikedIndexes([]);
                setTrainingComments({});
              }
              setTrainingMode(!trainingMode);
            }}
            style={{
              width: "100%",
              marginTop: 12,
              background: trainingMode ? `linear-gradient(135deg, #f59e0b, #d97706)` : T.cardBg,
              color: trainingMode ? "white" : T.tagText,
              border: `2px solid ${trainingMode ? "#d97706" : T.cardBorder}`,
              padding: "14px 36px",
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            🎯 وضع التدريب
          </button>

          {/* Training Mode Panel */}
          {trainingMode && (
            <div style={{
              marginTop: 24,
              background: T.cardBg,
              borderRadius: 24,
              padding: 28,
              border: `2px solid #f59e0b`,
              boxShadow: "0 8px 32px rgba(245,158,11,0.12)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                direction: "rtl",
              }}>
                <span style={{ fontSize: 24 }}>🎯</span>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: T.text,
                  fontFamily: "'Tajawal', sans-serif",
                  margin: 0,
                }}>
                  وضع التدريب
                </h3>
              </div>

              <p style={{
                fontSize: 14,
                color: T.textSecondary,
                marginBottom: 16,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
              }}>
                أدخل موضوع، قيّم الصور بـ لايك/دسلايك (تقدر تختار أكثر من صورة)، ثم خل الوكيل يحلل تقييماتك ويتعلم منها مباشرة
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 20, direction: "rtl" }}>
                <input
                  type="text"
                  value={trainingTopic}
                  onChange={(e) => setTrainingTopic(e.target.value)}
                  placeholder="مثال: سيارة دريفت في الليل..."
                  disabled={isTraining}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `2px solid ${T.inputBorder}`,
                    fontSize: 15,
                    fontFamily: "'Tajawal', sans-serif",
                    direction: "rtl",
                    outline: "none",
                    background: T.inputBg,
                    color: T.text,
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                  onBlur={(e) => e.target.style.borderColor = T.inputBorder}
                  onKeyDown={(e) => e.key === "Enter" && handleStartTraining()}
                />
                <button
                  onClick={handleStartTraining}
                  disabled={isTraining || !trainingTopic.trim()}
                  style={{
                    background: trainingTopic.trim() && !isTraining
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "#e2e8f0",
                    color: trainingTopic.trim() && !isTraining ? "white" : "#94a3b8",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: trainingTopic.trim() && !isTraining ? "pointer" : "not-allowed",
                    fontFamily: "'Tajawal', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isPreparingTraining ? "🧠 تجهيز الاتجاهات..." : isTraining ? "⏳ جاري التوليد..." : "🚀 ابدأ التدريب"}
                </button>
              </div>

              {(trainingDirections.length > 0 || isPreparingTraining) && (
                <div style={{
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  direction: "rtl",
                }}>
                  <span style={{
                    fontSize: 13,
                    color: T.tagText,
                    fontFamily: "'Tajawal', sans-serif",
                    background: T.softBg,
                    border: `1px solid ${T.softBorder}`,
                    borderRadius: 10,
                    padding: "6px 12px",
                  }}>
                    {isPreparingTraining
                      ? "جاري تخطيط اتجاهات مختلفة..."
                      : `جاهز: ${trainingDirections.length} اتجاهات تدريبية متنوعة`}
                  </span>
                  {trainingPlanSource && !isPreparingTraining && (
                    <span style={{
                      fontSize: 12,
                      color: trainingPlanSource === "ai" ? "#047857" : "#92400e",
                      fontFamily: "'Tajawal', sans-serif",
                      background: trainingPlanSource === "ai" ? "#ecfdf5" : "#fffbeb",
                      border: `1px solid ${trainingPlanSource === "ai" ? "#bbf7d0" : "#fde68a"}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                    }}>
                      {trainingPlanSource === "ai" ? "⚡ اتجاهات مولدة بالذكاء" : "🛟 تم استخدام خطة بديلة"}
                    </span>
                  )}
                </div>
              )}

              {trainingImages.length > 0 && (
                <div style={{
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  direction: "rtl",
                }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #bbf7d0",
                      borderRadius: 10,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontFamily: "'Tajawal', sans-serif",
                      fontWeight: 700,
                    }}>
                      ❤️ لايك: {trainingLikedIndexes.length}
                    </span>
                    <span style={{
                      background: T.errorBg,
                      color: T.errorText,
                      border: `1px solid ${T.errorBorder}`,
                      borderRadius: 10,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontFamily: "'Tajawal', sans-serif",
                      fontWeight: 700,
                    }}>
                      👎 دسلايك: {trainingDislikedIndexes.length}
                    </span>
                  </div>
                  <button
                    onClick={handleAnalyzeTrainingFeedback}
                    disabled={trainingLearning || (trainingLikedIndexes.length === 0 && trainingDislikedIndexes.length === 0 && Object.values(trainingComments).every((c) => !c?.trim()))}
                    style={{
                      background: (trainingLikedIndexes.length > 0 || trainingDislikedIndexes.length > 0 || Object.values(trainingComments).some((c) => c?.trim())) && !trainingLearning
                        ? "linear-gradient(135deg, #059669, #047857)"
                        : "#e2e8f0",
                      color: (trainingLikedIndexes.length > 0 || trainingDislikedIndexes.length > 0 || Object.values(trainingComments).some((c) => c?.trim())) && !trainingLearning ? "white" : "#94a3b8",
                      border: "none",
                      borderRadius: 12,
                      padding: "9px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'Tajawal', sans-serif",
                      cursor: (trainingLikedIndexes.length > 0 || trainingDislikedIndexes.length > 0 || Object.values(trainingComments).some((c) => c?.trim())) && !trainingLearning ? "pointer" : "not-allowed",
                    }}
                  >
                    {trainingLearning ? "⏳ تحليل التقييمات..." : "🧠 حلل التقييمات والملاحظات"}
                  </button>
                </div>
              )}

              {/* Training Images Grid */}
              {trainingImages.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}>
                  {trainingImages.map((item, i) => {
                      const isLiked = trainingLikedIndexes.includes(i);
                      const isDisliked = trainingDislikedIndexes.includes(i);
                      const highlightColor = isLiked ? "#10b981" : isDisliked ? "#ef4444" : PURPLE[100];
                      const highlightShadow = isLiked
                        ? "0 4px 20px rgba(16,185,129,0.28)"
                        : isDisliked
                          ? "0 4px 20px rgba(239,68,68,0.25)"
                          : "none";
                      return (
                    <div key={i} style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      border: `2px solid ${highlightColor}`,
                      background: T.softBg,
                      transition: "all 0.3s",
                      boxShadow: highlightShadow,
                    }}>
                      {/* Image Area */}
                      <div style={{
                        position: "relative",
                        minHeight: 190,
                        maxHeight: 260,
                        overflow: "hidden",
                        background: "#0f0a1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 10,
                      }}>
                        {item.status === "loading" && (
                          <div style={{
                            width: "100%",
                            height: "100%",
                            background: `linear-gradient(135deg, ${PURPLE[100]}, ${PURPLE[200]})`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              border: `4px solid ${PURPLE[200]}`,
                              borderTopColor: PURPLE[600],
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }} />
                          </div>
                        )}
                        {item.status === "done" && item.image && (
                          <>
                            <img
                              src={item.image}
                              alt={item.label}
                              onClick={() => handleOpenTrainingPreview(i)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                display: "block",
                                cursor: "zoom-in",
                              }}
                            />
                            <button
                              onClick={() => handleOpenTrainingPreview(i)}
                              style={{
                                position: "absolute",
                                bottom: 8,
                                left: 8,
                                background: "rgba(15,10,26,0.8)",
                                color: "white",
                                border: "1px solid rgba(255,255,255,0.25)",
                                borderRadius: 10,
                                padding: "6px 10px",
                                fontSize: 12,
                                cursor: "zoom-in",
                                fontFamily: "'Tajawal', sans-serif",
                                backdropFilter: "blur(6px)",
                              }}
                            >
                              🔍 عرض كامل
                            </button>
                          </>
                        )}
                        {item.status === "error" && (
                          <div style={{
                            width: "100%",
                            height: "100%",
                            background: T.errorBg,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}>
                            <span style={{ fontSize: 28 }}>⚠️</span>
                            <span style={{ fontSize: 12, color: "#dc2626", fontFamily: "'Tajawal', sans-serif" }}>
                              {item.error || "خطأ"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Label + Like Button */}
                      <div style={{
                        padding: "10px 12px",
                        direction: "rtl",
                      }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: T.text,
                          fontFamily: "'Tajawal', sans-serif",
                          marginBottom: 5,
                        }}>
                          {item.label}
                        </div>
                        {item.direction && (
                          <div style={{
                            fontSize: 11,
                            color: T.textSecondary,
                            fontFamily: "monospace",
                            lineHeight: 1.5,
                            marginBottom: 8,
                            direction: "ltr",
                            textAlign: "left",
                            background: T.inputBg,
                            border: `1px solid ${T.inputBorder}`,
                            borderRadius: 8,
                            padding: "6px 8px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {item.direction}
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => item.status === "done" && item.image && handleOpenTrainingPreview(i)}
                            disabled={item.status !== "done" || !item.image}
                            style={{
                              background: item.status === "done" && item.image ? T.cardBg : "#e2e8f0",
                              color: item.status === "done" && item.image ? T.tagText : "#94a3b8",
                              border: `1px solid ${item.status === "done" && item.image ? T.cardBorder : "#cbd5e1"}`,
                              borderRadius: 10,
                              padding: "6px 10px",
                              cursor: item.status === "done" && item.image ? "zoom-in" : "not-allowed",
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: "'Tajawal', sans-serif",
                            }}
                          >
                            🔎 تكبير
                          </button>
                          {item.status === "done" && item.image && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleToggleTrainingLike(i)}
                                disabled={trainingLearning}
                                style={{
                                  background: isLiked ? "#10b981" : "transparent",
                                  color: isLiked ? "white" : "#047857",
                                  border: `2px solid ${isLiked ? "#10b981" : "#86efac"}`,
                                  borderRadius: 10,
                                  padding: "6px 9px",
                                  cursor: trainingLearning ? "not-allowed" : "pointer",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  transition: "all 0.2s",
                                  opacity: trainingLearning ? 0.6 : 1,
                                }}
                              >
                                ❤️
                              </button>
                              <button
                                onClick={() => handleToggleTrainingDislike(i)}
                                disabled={trainingLearning}
                                style={{
                                  background: isDisliked ? "#ef4444" : "transparent",
                                  color: isDisliked ? "white" : "#b91c1c",
                                  border: `2px solid ${isDisliked ? "#ef4444" : "#fca5a5"}`,
                                  borderRadius: 10,
                                  padding: "6px 9px",
                                  cursor: trainingLearning ? "not-allowed" : "pointer",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  transition: "all 0.2s",
                                  opacity: trainingLearning ? 0.6 : 1,
                                }}
                              >
                                👎
                              </button>
                            </div>
                          )}
                        </div>
                        {item.status === "done" && item.image && (
                          <input
                            type="text"
                            value={trainingComments[i] || ""}
                            onChange={(e) => setTrainingComments((prev) => ({ ...prev, [i]: e.target.value }))}
                            placeholder="اكتب ملاحظتك على هذه الصورة..."
                            disabled={trainingLearning}
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1px solid ${T.inputBorder}`,
                              background: T.inputBg,
                              color: T.text,
                              fontSize: 12,
                              fontFamily: "'Tajawal', sans-serif",
                              direction: "rtl",
                              outline: "none",
                              opacity: trainingLearning ? 0.6 : 1,
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                            onBlur={(e) => e.target.style.borderColor = T.inputBorder}
                          />
                        )}
                      </div>
                    </div>
                      );
                    })}

                  {/* Retry Cell */}
                  <div
                    onClick={() => !isTraining && handleStartTraining()}
                    style={{
                      borderRadius: 16,
                      border: `2px dashed ${T.softBorder}`,
                      background: T.softBg,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isTraining ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      minHeight: 160,
                      opacity: isTraining ? 0.5 : 1,
                    }}
                    >
                    <span style={{ fontSize: 32 }}>🔄</span>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: PURPLE[600],
                      fontFamily: "'Tajawal', sans-serif",
                      marginTop: 8,
                    }}>
                      جولة جديدة مختلفة
                    </span>
                  </div>
                </div>
              )}

              {trainingPreviewIndex !== null && trainingImages[trainingPreviewIndex]?.image && (
                <div
                  onClick={() => setTrainingPreviewIndex(null)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1200,
                    background: "rgba(0,0,0,0.82)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "min(1020px, 100%)",
                      maxHeight: "92vh",
                      background: "#0f0a1a",
                      borderRadius: 18,
                      border: `1px solid ${PURPLE[500]}`,
                      boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(147,51,234,0.15)",
                      borderBottom: `1px solid ${PURPLE[700]}`,
                      direction: "rtl",
                    }}>
                      <div style={{ color: "white", fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 14 }}>
                        {trainingImages[trainingPreviewIndex].label}
                      </div>
                      <button
                        onClick={() => setTrainingPreviewIndex(null)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.3)",
                          color: "white",
                          borderRadius: 10,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontFamily: "'Tajawal', sans-serif",
                        }}
                      >
                        ✕ إغلاق
                      </button>
                    </div>

                    <div style={{
                      background: "#0f0a1a",
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 300,
                      maxHeight: "calc(92vh - 56px)",
                    }}>
                      <img
                        src={trainingImages[trainingPreviewIndex].image}
                        alt={trainingImages[trainingPreviewIndex].label}
                        style={{
                          width: "100%",
                          height: "100%",
                          maxHeight: "calc(92vh - 90px)",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Toast */}
              {trainingToast && (
                <div style={{
                  marginTop: 16,
                  padding: "12px 20px",
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "white",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "'Tajawal', sans-serif",
                  textAlign: "center",
                  direction: "rtl",
                  animation: "fadeUp 0.4s ease",
                }}>
                  ✅ {trainingToast}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Agent Thinking Process */}
      {isGenerating && (
        <div style={{
          marginTop: 32,
          background: "#0f0a1a",
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${PURPLE[800]}`,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: PURPLE[300],
            marginBottom: 16,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ⚙️ عملية تفكير الوكيل:
          </div>
          {agentThinking.map((t, i) => (
            <div
              key={i}
              style={{
                color: PURPLE[200],
                fontSize: 14,
                padding: "6px 0",
                fontFamily: "'Tajawal', monospace",
                animation: "fadeUp 0.4s ease",
                borderBottom: `1px solid ${PURPLE[900]}`,
              }}
            >
              {t}
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{
              height: 4,
              background: PURPLE[900],
              borderRadius: 4,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: `linear-gradient(90deg, ${PURPLE[500]}, #db2777)`,
                borderRadius: 4,
                animation: "loading 2s ease infinite",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {showResult && (
        <div style={{ marginTop: 32, animation: "fadeUp 0.5s ease" }}>
          {/* Error State */}
          {generateError && (
            <div style={{
              background: T.errorBg,
              borderRadius: 20,
              padding: 32,
              textAlign: "center",
              border: `1px solid ${T.errorBorder}`,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: T.errorText,
                marginBottom: 8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                حدث خطأ
              </h3>
              <p style={{
                fontSize: 14,
                color: T.textSecondary,
                marginBottom: 20,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                {generateError}
              </p>
              <button
                onClick={() => { setShowResult(false); setGenerateError(null); setLastGenerationContext(null); }}
                style={{
                  background: `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`,
                  color: "white",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                حاول مرة ثانية
              </button>
            </div>
          )}

          {/* Generated Content */}
          {generatedContent && !generateError && (
            <>
              {/* Generated Image from Nano Banana 2 */}
              {generatedImage && (
                <div style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  border: `1px solid ${PURPLE[700]}`,
                  marginBottom: 0,
                  position: "relative",
                }}>
                  <img
                    src={generatedImage}
                    alt={generatedContent.title}
                    style={{
                      width: "100%",
                      display: "block",
                      borderRadius: 24,
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    fontSize: 11,
                    color: "white",
                    fontFamily: "monospace",
                    background: "rgba(0,0,0,0.5)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    backdropFilter: "blur(8px)",
                  }}>
                    Nano Banana 2 — Hajwalah Agent v{agentLevel}.{agentMemory.totalInteractions}
                  </div>
                </div>
              )}

              {/* Text Overlay Editor */}
              {generatedImage && textOverlayEnabled && !feedbackGiven && (
                <div style={{
                  marginTop: 12,
                  background: T.softBg,
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 16,
                  padding: 14,
                  direction: "rtl",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, fontFamily: "'Tajawal', sans-serif", minWidth: 55 }}>العنوان</label>
                    <input
                      value={overlayTitle}
                      onChange={(e) => setOverlayTitle(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${T.cardBorder}`,
                        background: T.inputBg,
                        color: T.text,
                        fontSize: 14,
                        fontFamily: "'Tajawal', sans-serif",
                        direction: "rtl",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, fontFamily: "'Tajawal', sans-serif", minWidth: 55 }}>نص الدعوة</label>
                    <input
                      value={overlayCta}
                      onChange={(e) => setOverlayCta(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${T.cardBorder}`,
                        background: T.inputBg,
                        color: T.text,
                        fontSize: 14,
                        fontFamily: "'Tajawal', sans-serif",
                        direction: "rtl",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, fontFamily: "'Tajawal', sans-serif", minWidth: 55 }}>حجم النص</label>
                    <span style={{ fontSize: 14 }}>🔡</span>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={10}
                      value={overlayFontSize}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOverlayFontSize(val);
                        if (rawImageRef.current) {
                          if (fontSizeDebounceRef.current) clearTimeout(fontSizeDebounceRef.current);
                          fontSizeDebounceRef.current = setTimeout(async () => {
                            try {
                              const updated = await overlayTextOnImage(rawImageRef.current, overlayTitle, overlayCta, val / 100);
                              setGeneratedImage(updated);
                            } catch {}
                          }, 200);
                        }
                      }}
                      style={{ flex: 1, accentColor: PURPLE[500] }}
                    />
                    <span style={{ fontSize: 14 }}>🔤</span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.tagText,
                      fontFamily: "'Tajawal', sans-serif",
                      minWidth: 35,
                      textAlign: "center",
                    }}>{overlayFontSize}%</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!rawImageRef.current) return;
                      try {
                        const updated = await overlayTextOnImage(rawImageRef.current, overlayTitle, overlayCta, overlayFontSize / 100);
                        setGeneratedImage(updated);
                      } catch (err) {
                        console.warn("[TextOverlay] update error:", err);
                      }
                    }}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[500]})`,
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'Tajawal', sans-serif",
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    تحديث النص على الصورة
                  </button>
                </div>
              )}

              {/* Image Refinement Controls */}
              {generatedImage && !feedbackGiven && (
                <div style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  direction: "rtl",
                }}>
                  {/* Refinement Buttons */}
                  {!imageRefinementMode && !isRegeneratingImage && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => setImageRefinementMode("replace")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: 12,
                          border: `1px solid ${PURPLE[600]}`,
                          background: T.softBg,
                          color: T.text,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'Tajawal', sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        استبدال الصورة
                      </button>
                      <button
                        onClick={() => setImageRefinementMode("edit")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: 12,
                          border: `1px solid ${PURPLE[600]}`,
                          background: T.softBg,
                          color: T.text,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'Tajawal', sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        تعديل الصورة
                      </button>
                    </div>
                  )}

                  {/* Comment Input when mode selected */}
                  {imageRefinementMode && !isRegeneratingImage && (
                    <div style={{
                      background: T.softBg,
                      border: `1px solid ${PURPLE[600]}`,
                      borderRadius: 16,
                      padding: 16,
                    }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.tagText,
                        marginBottom: 8,
                        fontFamily: "'Tajawal', sans-serif",
                      }}>
                        {imageRefinementMode === "edit" ? "وش تبي تعدل؟" : "وش المطلوب في الصورة الجديدة؟"}
                      </div>
                      <textarea
                        value={imageRefinementComment}
                        onChange={(e) => setImageRefinementComment(e.target.value)}
                        placeholder={imageRefinementMode === "edit"
                          ? "مثال: خلّ الدخان أقل والسيارة أوضح..."
                          : "مثال: أبي صورة من زاوية ثانية بإضاءة أقوى..."
                        }
                        style={{
                          width: "100%",
                          minHeight: 60,
                          padding: 12,
                          borderRadius: 10,
                          border: `1px solid ${T.cardBorder}`,
                          background: T.inputBg,
                          color: T.text,
                          fontSize: 14,
                          fontFamily: "'Tajawal', sans-serif",
                          resize: "vertical",
                          direction: "rtl",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={handleRegenerateImage}
                          disabled={!imageRefinementComment.trim()}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: imageRefinementComment.trim()
                              ? `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[500]})`
                              : T.cardBorder,
                            color: imageRefinementComment.trim() ? "white" : T.textMuted,
                            fontSize: 14,
                            fontWeight: 700,
                            fontFamily: "'Tajawal', sans-serif",
                            cursor: imageRefinementComment.trim() ? "pointer" : "not-allowed",
                          }}
                        >
                          {imageRefinementMode === "edit" ? "عدّل الصورة" : "ولّد صورة جديدة"}
                        </button>
                        <button
                          onClick={() => { setImageRefinementMode(null); setImageRefinementComment(""); }}
                          style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: `1px solid ${T.cardBorder}`,
                            background: "transparent",
                            color: T.textSecondary,
                            fontSize: 14,
                            fontFamily: "'Tajawal', sans-serif",
                            cursor: "pointer",
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Regenerating spinner */}
                  {isRegeneratingImage && (
                    <div style={{
                      textAlign: "center",
                      padding: 20,
                      background: T.softBg,
                      borderRadius: 16,
                      border: `1px solid ${T.cardBorder}`,
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8, animation: "spin 2s linear infinite" }}>🔄</div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: T.text,
                        fontFamily: "'Tajawal', sans-serif",
                      }}>
                        {imageRefinementMode === "edit" ? "جاري تعديل الصورة..." : "جاري توليد صورة جديدة..."}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Generation Error */}
              {!generatedImage && imageError && (
                <div style={{
                  background: T.errorBg,
                  border: `1px solid ${T.errorBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  textAlign: "center",
                  direction: "rtl",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️❌</div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#991b1b",
                    marginBottom: 6,
                    fontFamily: "'Tajawal', sans-serif",
                  }}>
                    فشل توليد الصورة من Nano Banana 2
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: "#dc2626",
                    fontFamily: "monospace",
                    direction: "ltr",
                    background: "#fff5f5",
                    padding: "8px 12px",
                    borderRadius: 8,
                    wordBreak: "break-word",
                  }}>
                    {imageError}
                  </div>
                </div>
              )}

              {/* Text Content Card */}
              <div style={{
                background: `linear-gradient(135deg, #1a0a2e, #2d1b4e, #1a1a2e)`,
                borderRadius: 24,
                padding: 36,
                marginTop: generatedImage ? 16 : 0,
                position: "relative",
                overflow: "hidden",
                border: `1px solid ${PURPLE[700]}`,
              }}>
                <div style={{
                  position: "absolute",
                  top: "20%",
                  left: "10%",
                  width: 200,
                  height: 200,
                  background: `radial-gradient(circle, ${PURPLE[500]}30, transparent)`,
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }} />

                <div style={{
                  color: "white",
                  fontSize: 24,
                  fontWeight: 900,
                  textAlign: "center",
                  fontFamily: "'Tajawal', sans-serif",
                  textShadow: `0 0 40px ${PURPLE[500]}`,
                  marginBottom: 16,
                  lineHeight: 1.6,
                  position: "relative",
                }}>
                  {generatedContent.title}
                </div>
                <div style={{
                  color: PURPLE[200],
                  fontSize: 17,
                  fontFamily: "'Tajawal', sans-serif",
                  textAlign: "center",
                  lineHeight: 2,
                  maxWidth: 550,
                  margin: "0 auto",
                  whiteSpace: "pre-line",
                  position: "relative",
                }}>
                  {generatedContent.body}
                </div>

                {generatedContent.hashtags && (
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "center",
                    marginTop: 20,
                    position: "relative",
                  }}>
                    {generatedContent.hashtags.map((tag, i) => (
                      <span key={i} style={{
                        background: "rgba(147,51,234,0.3)",
                        color: PURPLE[200],
                        padding: "4px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "monospace",
                      }}>
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {!generatedImage && (
                  <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    fontSize: 11,
                    color: PURPLE[400],
                    fontFamily: "monospace",
                  }}>
                    Hajwalah Agent v{agentLevel}.{agentMemory.totalInteractions} — Claude AI
                  </div>
                )}
              </div>

              {/* Image Prompt Card */}
              {(lastGenerationContext?.finalImagePrompt || generatedContent.imagePrompt) && (
                <div style={{
                  marginTop: 16,
                  background: T.softBg,
                  borderRadius: 16,
                  padding: 20,
                  border: `1px solid ${T.cardBorder}`,
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.tagText,
                    marginBottom: 8,
                    fontFamily: "'Tajawal', sans-serif",
                  }}>
                    🎨 البرومبت النهائي المُرسل لنموذج الصورة:
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: T.textSecondary,
                    lineHeight: 1.8,
                    fontFamily: "monospace",
                    direction: "ltr",
                    textAlign: "left",
                    background: T.inputBg,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${T.cardBorder}`,
                  }}>
                    {lastGenerationContext?.finalImagePrompt || generatedContent.imagePrompt}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Feedback Section */}
          {generatedContent && !generateError && !feedbackGiven ? (
            <div style={{ marginTop: 24 }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: T.text,
                marginBottom: 16,
                textAlign: "center",
                fontFamily: "'Tajawal', sans-serif",
              }}>
                🤔 وش رايك بالنتيجة؟
              </h3>

              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <button
                  onClick={() => handleFeedback(true)}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "white",
                    border: "none",
                    padding: "16px 24px",
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Tajawal', sans-serif",
                    boxShadow: "0 4px 20px rgba(5,150,105,0.3)",
                  }}
                >
                  ✅ ممتاز! اعتمد
                </button>
                <button
                  onClick={() => handleFeedback(false, "general")}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #dc2626, #ef4444)",
                    color: "white",
                    border: "none",
                    padding: "16px 24px",
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Tajawal', sans-serif",
                    boxShadow: "0 4px 20px rgba(220,38,38,0.3)",
                  }}
                >
                  ❌ مو حلو
                </button>
              </div>

              <p style={{
                textAlign: "center",
                fontSize: 14,
                color: T.textMuted,
                marginBottom: 16,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                إذا مو حلو، وش السبب؟ (عشان الوكيل يتعلم)
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {rejectionReasons.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleFeedback(false, r.id)}
                    style={{
                      background: T.errorBg,
                      color: T.errorText,
                      border: `1px solid ${T.errorBorder}`,
                      padding: "8px 16px",
                      borderRadius: 12,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Tajawal', sans-serif",
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => e.target.style.background = darkMode ? "rgba(220,38,38,0.25)" : "#fecaca"}
                    onMouseOut={(e) => e.target.style.background = darkMode ? T.errorBg : T.errorBg}
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
            </div>
          ) : generatedContent && feedbackGiven ? (
            <div style={{
              marginTop: 24,
              background: T.softBg,
              borderRadius: 20,
              padding: 24,
              textAlign: "center",
              border: `1px solid ${T.cardBorder}`,
              animation: "fadeUp 0.4s ease",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧠✨</div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: T.text,
                marginBottom: 8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                الوكيل تعلّم من ردك!
              </h3>
              <p style={{
                fontSize: 14,
                color: T.textSecondary,
                marginBottom: 20,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                مستوى الثقة: {Math.round(agentMemory.styleProfile.confidence * 100)}% — تفاعلات: {agentMemory.totalInteractions}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={() => {
                    setShowResult(false);
                    setSelectedPostType(null);
                    setFeedbackGiven(false);
                    setAgentThinking([]);
                    setGeneratedContent(null);
                    setGeneratedImage(null);
                    setGenerateError(null);
                    setLastGenerationContext(null);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`,
                    color: "white",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  🔄 ولّد بوست ثاني
                </button>
                <button
                  onClick={() => setCurrentPage("memory")}
                  style={{
                    background: T.cardBg,
                    color: T.tagText,
                    border: `2px solid ${T.softBorder}`,
                    padding: "12px 28px",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  🧠 شوف ذاكرة الوكيل
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  const renderMemory = () => {
    const scoring = normalizeScoringEngine(agentMemory.scoringEngine);
    const topComposition = getTopScoreEntries(scoring.compositionScores, 1)[0];
    const topFont = getTopScoreEntries(scoring.arabicFontScores, 1)[0];
    const topTextPlacement = getTopScoreEntries(scoring.textPlacementScores, 1)[0];
    const topColors = getTopScoreEntries(scoring.colorScores, 3);
    const totalFeedback = scoring.totalFeedback || 0;
    const acceptanceRate = Math.round((scoring.acceptanceRate || 0) * 100);

    return (
    <div style={{ animation: "fadeUp 0.6s ease", maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <button
        onClick={() => setCurrentPage("home")}
        style={{
          background: "none",
          border: "none",
          color: T.tagText,
          fontSize: 15,
          cursor: "pointer",
          marginBottom: 24,
          fontFamily: "'Tajawal', sans-serif",
          fontWeight: 600,
        }}
      >
        → العودة للرئيسية
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <Icon3D type="memory" size={48} />
        <div>
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            color: T.text,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ذاكرة الوكيل
          </h2>
          <p style={{
            color: T.textSecondary,
            fontSize: 14,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            كل شي تعلمه الوكيل من تفاعلاتك
          </p>
        </div>
      </div>

      {/* Hard Rules */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${darkMode ? "#92400e" : "#fed7aa"}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(234,88,12,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 700,
            color: T.text,
            fontFamily: "'Tajawal', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: 0,
          }}>
            <span>🔒</span> القواعد الصارمة الدائمة
          </h3>
          <span title="هذه القواعد مدمجة في كل طلب توليد صورة تلقائياً" style={{ cursor: "help", fontSize: 16 }}>ℹ️</span>
        </div>
        {[
          "كل صورة يجب أن تحتوي على سيارة واضحة وبارزة في المقدمة",
          "جميع السيارات تسير في نفس الاتجاه نحو نقطة الأفق — ممنوع أي سيارة تكون معكوسة أو مواجهة للأخرى",
          "لا توجد مستطيلات أو صناديق داكنة أو أماكن محجوزة للنص",
          "الصورة خلفية نظيفة فقط — النص يُضاف برمجياً",
        ].map((rule, i) => (
          <div key={i} style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${darkMode ? "#92400e" : "#fdba74"}`,
            background: darkMode ? "rgba(146,64,14,0.12)" : "#fff7ed",
            marginBottom: 8,
            direction: "rtl",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                fontFamily: "'Tajawal', sans-serif",
              }}>{rule}</span>
            </div>
            <div style={{
              fontSize: 11,
              color: T.textMuted,
              fontFamily: "'Tajawal', sans-serif",
              marginTop: 4,
              marginRight: 22,
            }}>
              قاعدة نظام — غير قابلة للتعديل
            </div>
          </div>
        ))}
      </div>

      {/* Style Profile */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>🎨</span> ملف الستايل المتعلّم
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: T.softBg, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>الألوان المفضلة</div>
            <div style={{ display: "flex", gap: 6 }}>
              {agentMemory.styleProfile.preferredColors.map((c, i) => (
                <div key={i} style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: c,
                  border: "2px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }} />
              ))}
            </div>
          </div>
          <div style={{ background: T.softBg, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>التكوين</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {COMPOSITION_LABELS_AR[agentMemory.styleProfile.preferredComposition] || agentMemory.styleProfile.preferredComposition}
            </div>
          </div>
          <div style={{ background: T.softBg, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>موقع النص</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {PLACEMENT_LABELS_AR[agentMemory.styleProfile.textPlacement] || agentMemory.styleProfile.textPlacement}
            </div>
          </div>
          <div style={{ background: T.softBg, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>الخط العربي</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {FONT_LABELS_AR[agentMemory.styleProfile.arabicFont] || agentMemory.styleProfile.arabicFont}
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Engine Metrics */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 14,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>📈</span> Scoring Engine
        </h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{
            background: T.softBg,
            color: T.tagText,
            border: `1px solid ${T.cardBorder}`,
            padding: "6px 12px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            التقييمات: {totalFeedback}
          </span>
          <span style={{
            background: T.successBg,
            color: T.successText,
            border: `1px solid ${T.successBorder}`,
            padding: "6px 12px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            نسبة القبول: {acceptanceRate}%
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={{ background: T.softBg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>أفضل تكوين</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {COMPOSITION_LABELS_AR[topComposition?.[0]] || topComposition?.[0] || "—"}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
              {Math.round(((topComposition?.[1]?.score || 0) * 100))}%
            </div>
          </div>
          <div style={{ background: T.softBg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>أفضل خط</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {FONT_LABELS_AR[topFont?.[0]] || topFont?.[0] || "—"}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
              {Math.round(((topFont?.[1]?.score || 0) * 100))}%
            </div>
          </div>
          <div style={{ background: T.softBg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>أفضل موقع نص</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Tajawal', sans-serif" }}>
              {PLACEMENT_LABELS_AR[topTextPlacement?.[0]] || topTextPlacement?.[0] || "—"}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
              {Math.round(((topTextPlacement?.[1]?.score || 0) * 100))}%
            </div>
          </div>
        </div>

        <div style={{ background: T.softBg, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, fontFamily: "'Tajawal', sans-serif" }}>أفضل الألوان أداءً</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topColors.map(([color, stats]) => (
              <span key={color} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: T.tagBg,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 10,
                padding: "5px 9px",
                fontSize: 12,
                color: T.tagText,
                fontFamily: "monospace",
              }}>
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: color,
                  border: "1px solid rgba(0,0,0,0.15)",
                }} />
                {Math.round((stats.score || 0) * 100)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Learned Patterns */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>📚</span> الأنماط المتعلمة
        </h3>
        {agentMemory.learnedPatterns.map((p, i) => (
          <div key={p.id || i} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: i % 2 === 0 ? T.softBg : "transparent",
            borderRadius: 12,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 14, color: T.text, fontFamily: "'Tajawal', sans-serif", flex: 1 }}>
              {p.pattern}
              {p.source === "manual" && (
                <span style={{ fontSize: 10, color: T.textMuted, marginRight: 6, background: T.softBg, padding: "2px 6px", borderRadius: 4 }}>يدوي</span>
              )}
              {p.source === "image-analysis" && (
                <span style={{ fontSize: 10, color: "#f472b6", marginRight: 6, background: "#fdf2f8", padding: "2px 6px", borderRadius: 4 }}>من صورة</span>
              )}
            </span>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <div style={{
                width: 60,
                height: 6,
                background: darkMode ? PURPLE[900] : PURPLE[100],
                borderRadius: 3,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${p.weight * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${PURPLE[400]}, ${PURPLE[600]})`,
                  borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 12, color: T.textMuted, minWidth: 35 }}>
                {Math.round(p.weight * 100)}%
              </span>
              <button
                onClick={() => handleDeletePattern(p.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 6,
                  lineHeight: 1,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.target.style.background = T.errorBg}
                onMouseLeave={(e) => e.target.style.background = "none"}
                title="حذف النمط"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Add Pattern Form */}
        <div style={{
          marginTop: 16,
          padding: 16,
          background: T.softBg,
          borderRadius: 16,
          border: `1px dashed ${T.softBorder}`,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: T.tagText,
            marginBottom: 10,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ➕ أضف نمط جديد
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newPatternText}
              onChange={(e) => setNewPatternText(e.target.value)}
              placeholder="مثال: الصورة فيها تأثير سرعة..."
              onKeyDown={(e) => e.key === "Enter" && handleAddPattern()}
              style={{
                flex: 1,
                minWidth: 180,
                padding: "10px 14px",
                borderRadius: 12,
                border: `2px solid ${T.inputBorder}`,
                fontSize: 14,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                outline: "none",
                background: T.inputBg,
                color: T.text,
              }}
              onFocus={(e) => e.target.style.borderColor = PURPLE[400]}
              onBlur={(e) => e.target.style.borderColor = T.inputBorder}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: T.tagText, fontFamily: "'Tajawal', sans-serif", whiteSpace: "nowrap" }}>
                الوزن: {Math.round(newPatternWeight * 100)}%
              </span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={newPatternWeight}
                onChange={(e) => setNewPatternWeight(parseFloat(e.target.value))}
                style={{ width: 80, accentColor: PURPLE[600] }}
              />
            </div>
            <button
              onClick={handleAddPattern}
              disabled={!newPatternText.trim()}
              style={{
                background: newPatternText.trim()
                  ? `linear-gradient(135deg, ${PURPLE[500]}, ${PURPLE[700]})`
                  : "#e2e8f0",
                color: newPatternText.trim() ? "white" : "#94a3b8",
                border: "none",
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: newPatternText.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Tajawal', sans-serif",
                transition: "all 0.2s",
              }}
            >
              أضف
            </button>
          </div>
        </div>
      </div>

      {/* Image Style Analysis Card */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 8,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>📸</span> تعلّم من صورة مرجعية
        </h3>
        <p style={{
          fontSize: 13,
          color: T.textSecondary,
          fontFamily: "'Tajawal', sans-serif",
          marginBottom: 16,
        }}>
          ارفع صورة مرجعية والوكيل بيحلل الستايل ويضيف الأنماط المستخلصة تلقائي
        </p>

        {/* Upload Area */}
        <label style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: styleImagePreview ? 12 : 32,
          borderRadius: 16,
          border: `2px dashed ${T.softBorder}`,
          background: T.softBg,
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: 16,
        }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleStyleImageUpload}
            style={{ display: "none" }}
          />
          {styleImagePreview ? (
            <img
              src={styleImagePreview}
              alt="صورة مرجعية"
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                borderRadius: 12,
                objectFit: "contain",
              }}
            />
          ) : (
            <>
              <span style={{ fontSize: 40, marginBottom: 8 }}>🖼️</span>
              <span style={{
                fontSize: 14,
                color: T.tagText,
                fontWeight: 600,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                اضغط لرفع صورة مرجعية
              </span>
              <span style={{
                fontSize: 12,
                color: T.textMuted,
                fontFamily: "'Tajawal', sans-serif",
                marginTop: 4,
              }}>
                PNG, JPG, WEBP
              </span>
            </>
          )}
        </label>

        {/* Analyze Button */}
        {styleImageFile && (
          <button
            onClick={handleAnalyzeStyle}
            disabled={isAnalyzingStyle}
            style={{
              width: "100%",
              background: isAnalyzingStyle
                ? "#e2e8f0"
                : `linear-gradient(135deg, ${PURPLE[500]}, ${PURPLE[700]})`,
              color: isAnalyzingStyle ? "#94a3b8" : "white",
              border: "none",
              padding: "14px 24px",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: isAnalyzingStyle ? "not-allowed" : "pointer",
              fontFamily: "'Tajawal', sans-serif",
              transition: "all 0.3s",
              boxShadow: isAnalyzingStyle ? "none" : `0 4px 16px ${PURPLE[400]}30`,
              marginBottom: 16,
            }}
          >
            {isAnalyzingStyle ? "⏳ الوكيل يحلل الصورة..." : "🔍 حلل الستايل"}
          </button>
        )}

        {/* Analysis Results */}
        {styleAnalysisResult && !styleAnalysisResult.error && styleAnalysisResult.patterns && (
          <div style={{
            background: T.successBg,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${T.successBorder}`,
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.successText,
              marginBottom: 10,
              fontFamily: "'Tajawal', sans-serif",
            }}>
              ✅ تم استخلاص {styleAnalysisResult.patterns.length} أنماط وإضافتها للذاكرة:
            </div>
            {styleAnalysisResult.patterns.map((p, i) => (
              <div key={i} style={{
                fontSize: 13,
                color: "#065f46",
                padding: "4px 0",
                fontFamily: "'Tajawal', sans-serif",
              }}>
                • {p.text} ({Math.round((p.weight || 0.6) * 100)}%)
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {styleAnalysisResult?.error && (
          <div style={{
            background: T.errorBg,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${T.errorBorder}`,
            fontSize: 14,
            color: T.errorText,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ❌ {styleAnalysisResult.error}
          </div>
        )}
      </div>

      {/* Style Reference Library */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          marginBottom: 8,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>🎮</span> مكتبة صور اللعبة المرجعية
        </h3>
        <p style={{
          fontSize: 13,
          color: T.textSecondary,
          fontFamily: "'Tajawal', sans-serif",
          marginBottom: 16,
        }}>
          ارفع سكرينشوتات من اللعبة — الوكيل يستخدمها كمرجع ستايل لما يولّد الصور
        </p>

        {/* Counter Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: styleRefs.length > 0 ? T.successBg : T.softBg,
          color: styleRefs.length > 0 ? T.successText : T.tagText,
          padding: "6px 14px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Tajawal', sans-serif",
          marginBottom: 16,
          border: `1px solid ${styleRefs.length > 0 ? T.successBorder : T.cardBorder}`,
        }}>
          {styleRefsLoading
            ? "⏳ جاري التحميل..."
            : `📷 ${styleRefs.length} صورة مرجعية محفوظة`
          }
        </div>

        {/* Gallery Grid */}
        {styleRefs.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}>
            {styleRefs.map((ref) => (
              <div key={ref.id} style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                border: `2px solid ${T.cardBorder}`,
                aspectRatio: "1",
                background: T.softBg,
              }}>
                <img
                  src={ref.thumbnail}
                  alt="مرجع ستايل"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <button
                  onClick={() => handleDeleteStyleRef(ref.id)}
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: "rgba(220,38,38,0.85)",
                    color: "white",
                    border: "none",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    backdropFilter: "blur(4px)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(220,38,38,1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(220,38,38,0.85)"}
                  title="حذف الصورة"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <label style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          borderRadius: 16,
          border: `2px dashed ${T.softBorder}`,
          background: T.softBg,
          cursor: "pointer",
          transition: "all 0.2s",
        }}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddStyleRef}
            style={{ display: "none" }}
          />
          <span style={{ fontSize: 32, marginBottom: 6 }}>📤</span>
          <span style={{
            fontSize: 14,
            color: T.tagText,
            fontWeight: 600,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            اضغط لرفع سكرينشوتات من اللعبة
          </span>
          <span style={{
            fontSize: 12,
            color: T.textMuted,
            fontFamily: "'Tajawal', sans-serif",
            marginTop: 4,
          }}>
            PNG, JPG, WEBP — يمكنك رفع عدة صور دفعة واحدة
          </span>
        </label>

        {styleRefs.length > 0 && styleRefs.length < 3 && (
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: T.textMuted,
            fontFamily: "'Tajawal', sans-serif",
            textAlign: "center",
          }}>
            💡 ارفع {3 - styleRefs.length} صور إضافية — الوكيل يرسل أفضل ٣ مراجع مع كل توليد
          </div>
        )}
        {styleRefs.length >= 3 && (
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: "#059669",
            fontFamily: "'Tajawal', sans-serif",
            textAlign: "center",
          }}>
            ✅ جاهز — الوكيل بيرسل ٣ صور مرجعية مع كل توليد لمطابقة ستايل اللعبة
          </div>
        )}
      </div>

      {/* Rejection Memory */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${T.errorBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(220,38,38,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.errorText,
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>🚫</span> ذاكرة الرفض (النيقاتف برومبت)
        </h3>
        {agentMemory.rejectionReasons.length === 0 ? (
          <p style={{
            fontSize: 14,
            color: T.textMuted,
            fontFamily: "'Tajawal', sans-serif",
            textAlign: "center",
            padding: 20,
          }}>
            ما في رفض لحد الحين. كل ما رفضت صورة، الوكيل يتعلم وش يتجنب 🧠
          </p>
        ) : (
          agentMemory.rejectionReasons.map((r, i) => (
            <div key={r.id || i} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: T.errorBg,
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 18 }}>
                {rejectionReasons.find((rr) => rr.id === r.reason)?.emoji || "❌"}
              </span>
              <span style={{ fontSize: 14, color: T.errorText, fontFamily: "'Tajawal', sans-serif" }}>
                {rejectionReasons.find((rr) => rr.id === r.reason)?.label || r.reason}
              </span>
              <span style={{ fontSize: 12, color: T.textMuted, marginRight: "auto" }}>
                {r.type === "manual" ? "يدوي" : `بوست: ${postTypes.find((pt) => pt.id === r.type)?.label || r.type}`}
              </span>
              <button
                onClick={() => handleDeleteRejection(r.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 6,
                  lineHeight: 1,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.target.style.background = "#fee2e2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
                title="حذف السبب"
              >
                ✕
              </button>
            </div>
          ))
        )}

        {/* Add Rejection Form */}
        <div style={{
          marginTop: 16,
          padding: 16,
          background: T.errorBg,
          borderRadius: 16,
          border: `1px dashed ${T.errorBorder}`,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#dc2626",
            marginBottom: 10,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ➕ أضف سبب رفض يدوي
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              value={newRejectionText}
              onChange={(e) => setNewRejectionText(e.target.value)}
              placeholder="مثال: لا تستخدم ألوان فاتحة..."
              onKeyDown={(e) => e.key === "Enter" && handleAddRejection()}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: `2px solid ${T.errorBorder}`,
                fontSize: 14,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                outline: "none",
                background: T.inputBg,
                color: T.text,
              }}
              onFocus={(e) => e.target.style.borderColor = "#dc2626"}
              onBlur={(e) => e.target.style.borderColor = T.errorBorder}
            />
            <button
              onClick={handleAddRejection}
              disabled={!newRejectionText.trim()}
              style={{
                background: newRejectionText.trim()
                  ? "linear-gradient(135deg, #dc2626, #991b1b)"
                  : "#e2e8f0",
                color: newRejectionText.trim() ? "white" : "#94a3b8",
                border: "none",
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: newRejectionText.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Tajawal', sans-serif",
                transition: "all 0.2s",
              }}
            >
              أضف
            </button>
          </div>
        </div>
      </div>

      {/* Success Memory */}
      <div style={{
        background: T.cardBg,
        borderRadius: 24,
        padding: 28,
        border: `1px solid ${T.successBorder}`,
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(5,150,105,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.successText,
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>✅</span> البوستات المعتمدة
        </h3>
        {agentMemory.successfulPrompts.length === 0 ? (
          <p style={{
            fontSize: 14,
            color: T.textMuted,
            fontFamily: "'Tajawal', sans-serif",
            textAlign: "center",
            padding: 20,
          }}>
            ما في بوستات معتمدة لحد الحين. اعتمد بوست والوكيل يتعلم الستايل الناجح! ✨
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {agentMemory.successfulPrompts.map((s, i) => (
              <span key={i} style={{
                background: T.successBg,
                color: T.successText,
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Tajawal', sans-serif",
                border: `1px solid ${T.successBorder}`,
              }}>
                ✅ {postTypes.find((pt) => pt.id === s.type)?.label || s.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  };

  // Architecture Modal
  const renderArchitectureModal = () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeUp 0.3s ease",
      }}
      onClick={() => setShowArchitecture(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cardBg,
          borderRadius: 28,
          padding: 36,
          maxWidth: 700,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 800,
            color: T.text,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            🏗️ هندسة نظام الوكيل
          </h2>
          <button
            onClick={() => setShowArchitecture(false)}
            style={{
              background: T.softBg,
              border: "none",
              width: 36,
              height: 36,
              borderRadius: 12,
              fontSize: 18,
              cursor: "pointer",
              color: T.tagText,
            }}
          >
            ✕
          </button>
        </div>

        {/* Architecture Layers */}
        {[
          {
            num: "١",
            title: "طبقة الذاكرة (Memory Layer)",
            color: PURPLE[600],
            icon: "🧠",
            items: [
              "ذاكرة قصيرة — تفضيلات الجلسة الحالية",
              "ذاكرة طويلة — ملف الستايل الدائم (DB)",
              "ذاكرة حلقية — آخر ١٠ تفاعلات بالتفصيل",
              "تخزين كل صورة + برومبتها + التقييم",
            ],
          },
          {
            num: "٢",
            title: "محرك التعلم (Learning Engine)",
            color: "#dc2626",
            icon: "⚡",
            items: [
              "RLHF مبسط — يعزز الأنماط الناجحة",
              "تحليل الرفض — يستخرج السبب ويضيفه للنيقاتف",
              "Pattern Mining — يكتشف أنماط مشتركة بالصور المقبولة",
              "تسجيل نقاط لكل attribute (لون، تكوين، خط، إلخ)",
            ],
          },
          {
            num: "٣",
            title: "مُنشئ البرومبت (Prompt Composer)",
            color: "#059669",
            icon: "📝",
            items: [
              "قاعدة معرفية ثابتة عن هجولة كورسا ٢",
              "مُعدّلات ديناميكية من الذاكرة المتعلمة",
              "نيقاتف برومبت تلقائي من الصور المرفوضة",
              "Meta-prompting — يحلل البرومبتات الناجحة ويتعلم منها",
            ],
          },
          {
            num: "٤",
            title: "نظام التقييم الذاتي (Self-Assessment)",
            color: "#2563eb",
            icon: "🎯",
            items: [
              "درجة ثقة متغيرة حسب نسبة القبول/الرفض",
              "يطلب توجيه أكثر لما ثقته منخفضة",
              "يشتغل بشكل مستقل لما ثقته عالية",
              "تتبع معدل التحسن عبر الزمن",
            ],
          },
          {
            num: "٥",
            title: "حلقة التغذية الراجعة (Feedback Loop)",
            color: "#ea580c",
            icon: "🔄",
            items: [
              "قبول → تعزيز كل parameters البرومبت",
              "رفض + سبب → تعديل محدد + إضافة للنيقاتف",
              "رفض بدون سبب → تقليل وزن آخر تعديلات",
              "تحليل دوري كل ١٠ تفاعلات لإعادة معايرة الأوزان",
            ],
          },
        ].map((layer, i) => (
          <div key={i} style={{
            marginBottom: 20,
            background: T.softBg,
            borderRadius: 20,
            padding: 24,
            borderRight: `4px solid ${layer.color}`,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 24 }}>{layer.icon}</span>
              <div>
                <span style={{
                  color: layer.color,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                }}>
                  الطبقة {layer.num}
                </span>
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: T.text,
                  fontFamily: "'Tajawal', sans-serif",
                }}>
                  {layer.title}
                </h3>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {layer.items.map((item, j) => (
                <div key={j} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: "#475569",
                  fontFamily: "'Tajawal', sans-serif",
                }}>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: layer.color,
                    flexShrink: 0,
                  }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Data Flow */}
        <div style={{
          background: "#0f0a1a",
          borderRadius: 20,
          padding: 24,
          marginTop: 8,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: PURPLE[300],
            marginBottom: 16,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            🔀 مسار البيانات
          </h3>
          <div style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: PURPLE[200],
            lineHeight: 2,
            direction: "ltr",
            textAlign: "left",
          }}>
            <div><span style={{ color: "#34d399" }}>USER</span> → selects post type + optional prompt</div>
            <div><span style={{ color: "#fbbf24" }}>AGENT</span> → loads memory + builds dynamic prompt</div>
            <div><span style={{ color: "#f472b6" }}>MODEL</span> → generates image from composed prompt</div>
            <div><span style={{ color: "#34d399" }}>USER</span> → accepts / rejects (+ reason)</div>
            <div><span style={{ color: "#fbbf24" }}>AGENT</span> → updates memory + adjusts weights</div>
            <div><span style={{ color: "#60a5fa" }}>LOOP</span> → repeat → agent gets smarter each time</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (supabaseLoading) {
    return (
      <div dir="rtl" style={{
        minHeight: "100vh",
        background: T.pageBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
        color: T.text,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1.5s linear infinite" }}>🤖</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Tajawal', sans-serif" }}>
          جاري تحميل بيانات الوكيل...
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: T.pageBg,
        fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
        position: "relative",
        color: T.text,
        transition: "background 0.4s ease, color 0.4s ease",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 3px; }
      `}</style>

      <ParticleField />

      {/* Nav */}
      <nav style={{
        position: "sticky",
        top: 0,
        background: T.navBg,
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.navBorder}`,
        zIndex: 100,
        padding: "12px 24px",
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => setCurrentPage("home")}
          >
            <span style={{ fontSize: 28 }}>🏎️</span>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.logoText,
              fontFamily: "'Tajawal', sans-serif",
            }}>
              وكيل هجولة
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[
              { id: "home", label: "الرئيسية", emoji: "🏠" },
              { id: "generate", label: "ولّد", emoji: "✨" },
              { id: "memory", label: "الذاكرة", emoji: "🧠" },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setCurrentPage(nav.id)}
                style={{
                  background: currentPage === nav.id ? T.navBtnBg : "transparent",
                  color: currentPage === nav.id ? T.navBtnText : T.navBtnInactive,
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Tajawal', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {nav.emoji} {nav.label}
              </button>
            ))}
            <button
              onClick={toggleDarkMode}
              style={{
                background: darkMode ? PURPLE[800] : PURPLE[50],
                border: `1px solid ${darkMode ? PURPLE[600] : PURPLE[200]}`,
                borderRadius: 12,
                padding: "7px 12px",
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
                transition: "all 0.3s ease",
              }}
              title={darkMode ? "الوضع الفاتح" : "الوضع الداكن"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          {/* Agent Level Badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`,
            color: "white",
            padding: "6px 16px",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            <span>⚡</span>
            <span>Lv.{agentLevel}</span>
            <div style={{
              width: 40,
              height: 4,
              background: "rgba(255,255,255,0.3)",
              borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${agentXP}%`,
                height: "100%",
                background: "white",
                borderRadius: 2,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {currentPage === "home" && renderHome()}
        {currentPage === "generate" && renderGenerate()}
        {currentPage === "memory" && renderMemory()}
      </div>

      {/* Architecture Modal */}
      {showArchitecture && renderArchitectureModal()}
    </div>
  );
}
