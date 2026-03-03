import { useState, useEffect, useRef } from "react";

// ============================================================
// HAJWALAH CORSA 2 — AI MARKETING AGENT
// وكيل التسويق الذكي — هجولة كورسا ٢
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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

// Animated background particles
const ParticleField = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    color: [PURPLE[200], PURPLE[300], PURPLE[400], "#f9a8d4", "#fbbf24", "#34d399"][Math.floor(Math.random() * 6)],
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map((p) => (
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
// IndexedDB — Style Reference Image Storage
// ============================================================
const STYLE_REF_DB_NAME = "hajwalah-style-refs";
const STYLE_REF_DB_VERSION = 1;
const STYLE_REF_STORE = "images";

const openStyleRefDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(STYLE_REF_DB_NAME, STYLE_REF_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STYLE_REF_STORE)) {
        db.createObjectStore(STYLE_REF_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbPut = async (record) => {
  const db = await openStyleRefDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STYLE_REF_STORE, "readwrite");
    tx.objectStore(STYLE_REF_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (id) => {
  const db = await openStyleRefDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STYLE_REF_STORE, "readwrite");
    tx.objectStore(STYLE_REF_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbGetAll = async () => {
  const db = await openStyleRefDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STYLE_REF_STORE, "readonly");
    const req = tx.objectStore(STYLE_REF_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
// MAIN APP
// ============================================================
// localStorage helpers
const STORAGE_KEY = "hajwalah-agent-state";

const loadPersistedState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load persisted state:", e);
  }
  return null;
};

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
};

export default function HajwalahAgent() {
  const saved = useRef(loadPersistedState()).current;

  const [currentPage, setCurrentPage] = useState("home");
  const [agentLevel, setAgentLevel] = useState(saved?.agentLevel ?? 1);
  const [agentXP, setAgentXP] = useState(saved?.agentXP ?? 0);
  const [totalGenerated, setTotalGenerated] = useState(saved?.totalGenerated ?? 0);
  const [acceptedCount, setAcceptedCount] = useState(saved?.acceptedCount ?? 0);
  const [rejectedCount, setRejectedCount] = useState(saved?.rejectedCount ?? 0);
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

  // Agent Memory System — persisted via localStorage
  const [agentMemory, setAgentMemory] = useState(saved?.agentMemory ?? DEFAULT_MEMORY);

  // Persist agent state to localStorage on every relevant change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        agentLevel,
        agentXP,
        totalGenerated,
        acceptedCount,
        rejectedCount,
        agentMemory,
      }));
    } catch (e) {
      console.warn("Failed to persist state:", e);
    }
  }, [agentLevel, agentXP, totalGenerated, acceptedCount, rejectedCount, agentMemory]);

  // Load style reference images from IndexedDB on mount
  useEffect(() => {
    idbGetAll()
      .then((records) => setStyleRefs(records.sort((a, b) => a.addedAt - b.addedAt)))
      .catch((err) => console.warn("Failed to load style refs:", err))
      .finally(() => setStyleRefsLoading(false));
  }, []);

  const buildAgentPrompt = () => {
    const postType = postTypes.find((p) => p.id === selectedPostType);
    const patterns = agentMemory.learnedPatterns.map((p) => {
      const sourceTag = p.source === "image-analysis" ? " [من صورة]" : p.source === "manual" ? " [يدوي]" : "";
      return `- ${p.pattern} (وزن: ${Math.round(p.weight * 100)}%)${sourceTag}`;
    }).join("\n");
    const rejections = agentMemory.rejectionReasons.length > 0
      ? agentMemory.rejectionReasons.map((r) => `- ${r.reason}`).join("\n")
      : "لا يوجد رفض سابق";
    const confidence = Math.round(agentMemory.styleProfile.confidence * 100);

    return `أنت وكيل تسويق ذكي متخصص في لعبة "هجولة كورسا ٢" — لعبة تفحيط وسيارات عربية سعودية.

نوع البوست المطلوب: ${postType?.label || "عام"} — ${postType?.desc || ""}
${promptInput ? `توجيه إضافي من المستخدم: ${promptInput}` : ""}

الأنماط المتعلمة من تفاعلات المستخدم:
${patterns}

أسباب الرفض السابقة (تجنبها):
${rejections}

مستوى ثقة الوكيل: ${confidence}%
عدد التفاعلات السابقة: ${agentMemory.totalInteractions}

اكتب بوست تسويقي بالعامية السعودية للعبة هجولة كورسا ٢ يتضمن:
1. عنوان جذاب (سطر واحد)
2. نص البوست (2-3 أسطر بالعامية السعودية، يكون حماسي وجذاب)
3. وصف تفصيلي للصورة المقترحة بالإنجليزي (image prompt)
4. هاشتاقات مناسبة (3-5)

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"title": "...", "body": "...", "imagePrompt": "...", "hashtags": ["..."]}`;
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

    const addThought = (t) => setAgentThinking((prev) => [...prev, t]);

    try {
      // Step 1: Build prompt & get text content from Gemini Flash
      addThought("🔍 تحليل نوع البوست المطلوب...");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🧠 تحميل الذاكرة وأنماط النجاح السابقة...");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🎨 بناء البرومبت بناءً على الأنماط المتعلمة...");

      const prompt = buildAgentPrompt();
      const textResponse = await fetch(TEXT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!textResponse.ok) {
        throw new Error(`Text API Error: ${textResponse.status}`);
      }

      const textData = await textResponse.json();
      const rawText = textData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("لم يتم استلام رد من النموذج");
      }

      const content = extractJSON(rawText);
      if (!content) {
        throw new Error("تنسيق الرد غير صحيح");
      }

      setGeneratedContent(content);

      // Step 2: Generate image with Nano Banana 2
      addThought("⚡ تم إنشاء النص بنجاح!");
      await new Promise((r) => setTimeout(r, 300));
      addThought("🖼️ إرسال لنموذج Nano Banana 2 لتوليد الصورة...");

      const hasStyleRefs = styleRefs.length > 0;
      const baseImagePrompt = content.imagePrompt
        || `Hajwalah Corsa 2 racing game social media post, ${content.title}, dark background, neon purple lighting, drift smoke, Arabic gaming aesthetic, dramatic, high quality`;

      const imagePromptText = hasStyleRefs
        ? `${baseImagePrompt}

CRITICAL STYLE INSTRUCTION: I am providing ${Math.min(styleRefs.length, 3)} reference screenshots from the actual game "Hajwalah Corsa 2". You MUST analyze these reference images and replicate their exact visual style:
- Match the Unity 3D mid-fidelity rendering style visible in the references
- Replicate the same lighting quality, texture resolution, and material shading
- Use the same color grading and atmospheric effects shown in the reference screenshots
- Match the KSA (Saudi Arabia) environmental aesthetics: desert terrain, urban Saudi streets, drift arenas
- DO NOT generate photorealistic images. The output must look like it belongs in the same game as the reference screenshots
- Use visual inference from the provided images for 100% stylistic match
- Pay attention to: car models style, smoke/particle effects, road surfaces, sky rendering, UI overlay style`
        : baseImagePrompt;

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

      const imageController = new AbortController();
      const imageTimeout = setTimeout(() => imageController.abort(), 60000);

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
              setGeneratedImage(`data:${mimeType};base64,${data}`);
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
          try { detail = JSON.parse(errBody)?.error?.message || ""; } catch {}
          setImageError(`خطأ ${imageResponse.status}: ${detail || "فشل توليد الصورة"}`);
          addThought(`⚠️ خطأ في توليد الصورة (${imageResponse.status}) — سيتم عرض النص فقط`);
        }
      } catch (imgErr) {
        clearTimeout(imageTimeout);
        if (imgErr.name === "AbortError") {
          console.error("Image generation timed out after 60s");
          setImageError("انتهت مهلة توليد الصورة (60 ثانية)");
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
      setGenerateError(err.message || "حدث خطأ أثناء التوليد");
    } finally {
      setIsGenerating(false);
      setShowResult(true);
    }
  };

  const handleFeedback = (accepted, reason = "") => {
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
      setAgentMemory((prev) => ({
        ...prev,
        successfulPrompts: [...prev.successfulPrompts, { type: selectedPostType, time: Date.now() }],
        styleProfile: { ...prev.styleProfile, confidence: Math.min(prev.styleProfile.confidence + 0.05, 1) },
        totalInteractions: prev.totalInteractions + 1,
      }));
    } else {
      setRejectedCount((p) => p + 1);
      setAgentXP((p) => Math.min(p + 10, 99));
      setAgentMemory((prev) => ({
        ...prev,
        rejectionReasons: [...prev.rejectionReasons, { reason, type: selectedPostType, time: Date.now() }],
        totalInteractions: prev.totalInteractions + 1,
      }));
    }
  };

  // --- Manual memory management handlers ---

  const handleAddPattern = () => {
    const text = newPatternText.trim();
    if (!text) return;
    setAgentMemory((prev) => ({
      ...prev,
      learnedPatterns: [
        ...prev.learnedPatterns,
        { pattern: text, weight: newPatternWeight, source: "manual" },
      ],
    }));
    setNewPatternText("");
    setNewPatternWeight(0.7);
  };

  const handleDeletePattern = (index) => {
    setAgentMemory((prev) => ({
      ...prev,
      learnedPatterns: prev.learnedPatterns.filter((_, i) => i !== index),
    }));
  };

  const handleAddRejection = () => {
    const text = newRejectionText.trim();
    if (!text) return;
    setAgentMemory((prev) => ({
      ...prev,
      rejectionReasons: [
        ...prev.rejectionReasons,
        { reason: text, type: "manual", time: Date.now() },
      ],
    }));
    setNewRejectionText("");
  };

  const handleDeleteRejection = (index) => {
    setAgentMemory((prev) => ({
      ...prev,
      rejectionReasons: prev.rejectionReasons.filter((_, i) => i !== index),
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
        await idbPut(record);
        setStyleRefs((prev) => [...prev, record]);
      } catch (err) {
        console.warn("Failed to add style ref:", err);
      }
    }
    e.target.value = "";
  };

  const handleDeleteStyleRef = async (id) => {
    try {
      await idbDelete(id);
      setStyleRefs((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.warn("Failed to delete style ref:", err);
    }
  };

  // --- Image upload + Gemini style analysis ---

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

      const response = await fetch(TEXT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: `حلل الستايل البصري لهذه الصورة بالتفصيل. أبي تحلل:
1. الألوان الرئيسية والمزاج اللوني
2. التكوين والتخطيط البصري
3. أسلوب الإضاءة
4. الطابع العام (mood)
5. أي عناصر تصميمية مميزة

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"patterns": [{"text": "وصف قصير بالعربي", "weight": 0.0-1.0}, ...]}

اعطني 3-5 أنماط مستخلصة من الصورة. الوزن يعكس مدى وضوح النمط في الصورة.` },
            ],
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("لم يتم استلام رد من النموذج");

      const result = extractJSON(rawText);
      if (!result) throw new Error("تنسيق الرد غير صحيح");

      setStyleAnalysisResult(result);

      if (result.patterns && Array.isArray(result.patterns)) {
        setAgentMemory((prev) => ({
          ...prev,
          learnedPatterns: [
            ...prev.learnedPatterns,
            ...result.patterns.map((p) => ({
              pattern: p.text,
              weight: Math.max(0.1, Math.min(1, p.weight || 0.6)),
              source: "image-analysis",
            })),
          ],
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
          border: `1px solid ${PURPLE[200]}`,
        }}>
          <span>🤖</span>
          <span style={{ color: PURPLE[700], fontWeight: 600, fontSize: 14 }}>
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
          color: "#64748b",
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
              background: "white",
              color: PURPLE[700],
              border: `2px solid ${PURPLE[200]}`,
              padding: "16px 36px",
              borderRadius: 16,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "'Tajawal', sans-serif",
            }}
            onMouseOver={(e) => e.target.style.background = PURPLE[50]}
            onMouseOut={(e) => e.target.style.background = "white"}
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
            background: "white",
            borderRadius: 20,
            padding: "20px 16px",
            textAlign: "center",
            border: `1px solid ${PURPLE[100]}`,
            boxShadow: "0 4px 20px rgba(147,51,234,0.06)",
          }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: PURPLE[800], marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2, fontFamily: "'Tajawal', sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How Agent Works - Cards */}
      <div style={{ padding: "0 20px", maxWidth: 900, margin: "0 auto 48px" }}>
        <h2 style={{
          textAlign: "center",
          fontSize: 26,
          fontWeight: 800,
          color: PURPLE[900],
          marginBottom: 32,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          🧠 كيف يتعلم الوكيل؟
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            {
              icon: "memory",
              title: "الذاكرة المتطورة",
              desc: "يخزن كل تفاعل ويبني ملف ستايل كامل عن ذوقك في التصميم",
              color: PURPLE[600],
            },
            {
              icon: "loop",
              title: "حلقة التعلم",
              desc: "كل رفض = درس جديد. كل قبول = تأكيد. الوكيل يعدل برومبتاته تلقائياً",
              color: "#dc2626",
            },
            {
              icon: "brain",
              title: "تحليل الأنماط",
              desc: "يحلل ليش قبلت صورة وليش رفضت ثانية ويكتشف الأنماط المشتركة",
              color: PURPLE[400],
            },
            {
              icon: "rocket",
              title: "برومبت ديناميكي",
              desc: "يبني البرومبت من الصفر كل مره بناءً على كل شي تعلمه",
              color: "#ea580c",
            },
            {
              icon: "shield",
              title: "النيقاتف برومبت",
              desc: "يبني قائمة من الأشياء اللي ما تبيها ويضيفها تلقائياً",
              color: "#2563eb",
            },
            {
              icon: "chart",
              title: "تقييم الثقة",
              desc: "يعطي نفسه درجة ثقة ويقول لك متى يحتاج توجيه أكثر",
              color: "#059669",
            },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: 24,
                padding: 28,
                border: `1px solid ${PURPLE[100]}`,
                boxShadow: "0 4px 24px rgba(147,51,234,0.06)",
                transition: "all 0.3s",
                cursor: "default",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(147,51,234,0.12)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(147,51,234,0.06)";
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <Icon3D type={card.icon} size={52} />
              </div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: PURPLE[900],
                marginBottom: 8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                {card.title}
              </h3>
              <p style={{
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Confidence Meter */}
      <div style={{
        maxWidth: 700,
        margin: "0 auto 48px",
        padding: "0 20px",
      }}>
        <div style={{
          background: "white",
          borderRadius: 24,
          padding: 32,
          border: `1px solid ${PURPLE[100]}`,
          boxShadow: "0 4px 24px rgba(147,51,234,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <Icon3D type="star" size={40} />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: PURPLE[900], fontFamily: "'Tajawal', sans-serif" }}>
                مستوى ثقة الوكيل
              </h3>
              <p style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'Tajawal', sans-serif" }}>
                كل ما زادت التفاعلات، زادت الثقة
              </p>
            </div>
          </div>

          <div style={{
            background: PURPLE[50],
            borderRadius: 12,
            height: 24,
            overflow: "hidden",
            marginBottom: 12,
          }}>
            <div style={{
              background: `linear-gradient(90deg, ${PURPLE[400]}, ${PURPLE[600]})`,
              height: "100%",
              width: `${agentMemory.styleProfile.confidence * 100}%`,
              borderRadius: 12,
              transition: "width 0.8s ease",
            }} />
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#94a3b8",
            fontFamily: "'Tajawal', sans-serif",
          }}>
            <span>مبتدئ 🌱</span>
            <span>متوسط 📈</span>
            <span>متقدم 🎯</span>
            <span>خبير 🏆</span>
          </div>

          <div style={{
            marginTop: 20,
            padding: 16,
            background: PURPLE[50],
            borderRadius: 16,
            fontSize: 14,
            color: PURPLE[700],
            lineHeight: 1.8,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            <strong>💡 حالة الوكيل:</strong>{" "}
            {agentMemory.styleProfile.confidence < 0.3
              ? "الوكيل لسا يتعلم ستايلك. استمر بالتفاعل عشان يفهمك أكثر!"
              : agentMemory.styleProfile.confidence < 0.6
              ? "الوكيل بدأ يفهم ذوقك. النتائج بتتحسن قريب!"
              : agentMemory.styleProfile.confidence < 0.85
              ? "الوكيل صار يعرف ستايلك بشكل ممتاز. الصور بتعجبك أكثر!"
              : "الوكيل خبير بستايلك! يقدر يسوي بوستات بدون توجيه تقريباً 🔥"}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div style={{ animation: "fadeUp 0.6s ease", maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <button
        onClick={() => { setCurrentPage("home"); setShowResult(false); setSelectedPostType(null); setGeneratedContent(null); setGeneratedImage(null); setGenerateError(null); }}
        style={{
          background: "none",
          border: "none",
          color: PURPLE[600],
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
        color: PURPLE[900],
        marginBottom: 8,
        fontFamily: "'Tajawal', sans-serif",
      }}>
        ✨ مولّد البوستات الذكي
      </h2>
      <p style={{
        color: "#64748b",
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
              color: PURPLE[800],
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
                    background: selectedPostType === pt.id ? `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})` : "white",
                    color: selectedPostType === pt.id ? "white" : PURPLE[800],
                    border: `2px solid ${selectedPostType === pt.id ? PURPLE[600] : PURPLE[100]}`,
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
              color: PURPLE[800],
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
                border: `2px solid ${PURPLE[100]}`,
                padding: 16,
                fontSize: 15,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = PURPLE[400]}
              onBlur={(e) => e.target.style.borderColor = PURPLE[100]}
            />
          </div>

          {/* Agent Memory Preview */}
          <div style={{
            background: PURPLE[50],
            borderRadius: 20,
            padding: 24,
            marginBottom: 32,
            border: `1px solid ${PURPLE[100]}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <span style={{
                fontSize: 15,
                fontWeight: 700,
                color: PURPLE[800],
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
                    background: "white",
                    color: PURPLE[700],
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "'Tajawal', sans-serif",
                    border: `1px solid ${PURPLE[200]}`,
                  }}
                >
                  {p.pattern}
                  <span style={{
                    marginRight: 6,
                    color: PURPLE[400],
                    fontSize: 11,
                  }}>
                    ({Math.round(p.weight * 100)}%)
                  </span>
                </span>
              ))}
              {agentMemory.rejectionReasons.length > 0 && (
                <span style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontFamily: "'Tajawal', sans-serif",
                  border: "1px solid #fecaca",
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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedPostType || isGenerating}
            style={{
              width: "100%",
              background: selectedPostType
                ? `linear-gradient(135deg, ${PURPLE[600]}, ${PURPLE[800]})`
                : "#e2e8f0",
              color: selectedPostType ? "white" : "#94a3b8",
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
              background: "#fef2f2",
              borderRadius: 20,
              padding: 32,
              textAlign: "center",
              border: "1px solid #fecaca",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#dc2626",
                marginBottom: 8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                حدث خطأ
              </h3>
              <p style={{
                fontSize: 14,
                color: "#64748b",
                marginBottom: 20,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                {generateError}
              </p>
              <button
                onClick={() => { setShowResult(false); setGenerateError(null); }}
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

              {/* Image Generation Error */}
              {!generatedImage && imageError && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
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
                    Hajwalah Agent v{agentLevel}.{agentMemory.totalInteractions} — Gemini AI
                  </div>
                )}
              </div>

              {/* Image Prompt Card */}
              {generatedContent.imagePrompt && (
                <div style={{
                  marginTop: 16,
                  background: PURPLE[50],
                  borderRadius: 16,
                  padding: 20,
                  border: `1px solid ${PURPLE[100]}`,
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: PURPLE[700],
                    marginBottom: 8,
                    fontFamily: "'Tajawal', sans-serif",
                  }}>
                    🎨 البرومبت المستخدم للصورة (Nano Banana 2):
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.8,
                    fontFamily: "monospace",
                    direction: "ltr",
                    textAlign: "left",
                    background: "white",
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${PURPLE[100]}`,
                  }}>
                    {generatedContent.imagePrompt}
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
                color: PURPLE[900],
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
                color: "#94a3b8",
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
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      padding: "8px 16px",
                      borderRadius: 12,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Tajawal', sans-serif",
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => e.target.style.background = "#fecaca"}
                    onMouseOut={(e) => e.target.style.background = "#fef2f2"}
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
            </div>
          ) : generatedContent && feedbackGiven ? (
            <div style={{
              marginTop: 24,
              background: PURPLE[50],
              borderRadius: 20,
              padding: 24,
              textAlign: "center",
              border: `1px solid ${PURPLE[100]}`,
              animation: "fadeUp 0.4s ease",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧠✨</div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: PURPLE[800],
                marginBottom: 8,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                الوكيل تعلّم من ردك!
              </h3>
              <p style={{
                fontSize: 14,
                color: "#64748b",
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
                    background: "white",
                    color: PURPLE[700],
                    border: `2px solid ${PURPLE[200]}`,
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

  const renderMemory = () => (
    <div style={{ animation: "fadeUp 0.6s ease", maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <button
        onClick={() => setCurrentPage("home")}
        style={{
          background: "none",
          border: "none",
          color: PURPLE[600],
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
            color: PURPLE[900],
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ذاكرة الوكيل
          </h2>
          <p style={{
            color: "#64748b",
            fontSize: 14,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            كل شي تعلمه الوكيل من تفاعلاتك
          </p>
        </div>
      </div>

      {/* Style Profile */}
      <div style={{
        background: "white",
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${PURPLE[100]}`,
        boxShadow: "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: PURPLE[800],
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>🎨</span> ملف الستايل المتعلّم
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: PURPLE[50], borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>الألوان المفضلة</div>
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
          <div style={{ background: PURPLE[50], borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>التكوين</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: PURPLE[800], fontFamily: "'Tajawal', sans-serif" }}>
              قطري ديناميكي
            </div>
          </div>
          <div style={{ background: PURPLE[50], borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>موقع النص</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: PURPLE[800], fontFamily: "'Tajawal', sans-serif" }}>
              أسفل-يمين
            </div>
          </div>
          <div style={{ background: PURPLE[50], borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>الخط العربي</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: PURPLE[800], fontFamily: "'Tajawal', sans-serif" }}>
              كوفي عريض
            </div>
          </div>
        </div>
      </div>

      {/* Learned Patterns */}
      <div style={{
        background: "white",
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${PURPLE[100]}`,
        boxShadow: "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: PURPLE[800],
          marginBottom: 16,
          fontFamily: "'Tajawal', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>📚</span> الأنماط المتعلمة
        </h3>
        {agentMemory.learnedPatterns.map((p, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: i % 2 === 0 ? PURPLE[50] : "transparent",
            borderRadius: 12,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 14, color: PURPLE[800], fontFamily: "'Tajawal', sans-serif", flex: 1 }}>
              {p.pattern}
              {p.source === "manual" && (
                <span style={{ fontSize: 10, color: PURPLE[400], marginRight: 6, background: PURPLE[50], padding: "2px 6px", borderRadius: 4 }}>يدوي</span>
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
                background: PURPLE[100],
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
              <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 35 }}>
                {Math.round(p.weight * 100)}%
              </span>
              <button
                onClick={() => handleDeletePattern(i)}
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
                onMouseEnter={(e) => e.target.style.background = "#fef2f2"}
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
          background: PURPLE[50],
          borderRadius: 16,
          border: `1px dashed ${PURPLE[200]}`,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: PURPLE[700],
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
                border: `2px solid ${PURPLE[100]}`,
                fontSize: 14,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = PURPLE[400]}
              onBlur={(e) => e.target.style.borderColor = PURPLE[100]}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: PURPLE[600], fontFamily: "'Tajawal', sans-serif", whiteSpace: "nowrap" }}>
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
        background: "white",
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${PURPLE[100]}`,
        boxShadow: "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: PURPLE[800],
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
          color: "#64748b",
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
          border: `2px dashed ${PURPLE[200]}`,
          background: PURPLE[50],
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
                color: PURPLE[600],
                fontWeight: 600,
                fontFamily: "'Tajawal', sans-serif",
              }}>
                اضغط لرفع صورة مرجعية
              </span>
              <span style={{
                fontSize: 12,
                color: "#94a3b8",
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
            background: "#ecfdf5",
            borderRadius: 16,
            padding: 16,
            border: "1px solid #bbf7d0",
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#059669",
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
            background: "#fef2f2",
            borderRadius: 16,
            padding: 16,
            border: "1px solid #fecaca",
            fontSize: 14,
            color: "#dc2626",
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ❌ {styleAnalysisResult.error}
          </div>
        )}
      </div>

      {/* Style Reference Library */}
      <div style={{
        background: "white",
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: `1px solid ${PURPLE[100]}`,
        boxShadow: "0 4px 20px rgba(147,51,234,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: PURPLE[800],
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
          color: "#64748b",
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
          background: styleRefs.length > 0 ? "#ecfdf5" : PURPLE[50],
          color: styleRefs.length > 0 ? "#059669" : PURPLE[600],
          padding: "6px 14px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Tajawal', sans-serif",
          marginBottom: 16,
          border: `1px solid ${styleRefs.length > 0 ? "#bbf7d0" : PURPLE[100]}`,
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
                border: `2px solid ${PURPLE[100]}`,
                aspectRatio: "1",
                background: PURPLE[50],
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
          border: `2px dashed ${PURPLE[200]}`,
          background: PURPLE[50],
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
            color: PURPLE[600],
            fontWeight: 600,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            اضغط لرفع سكرينشوتات من اللعبة
          </span>
          <span style={{
            fontSize: 12,
            color: "#94a3b8",
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
            color: "#94a3b8",
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
        background: "white",
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        border: "1px solid #fecaca",
        boxShadow: "0 4px 20px rgba(220,38,38,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#dc2626",
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
            color: "#94a3b8",
            fontFamily: "'Tajawal', sans-serif",
            textAlign: "center",
            padding: 20,
          }}>
            ما في رفض لحد الحين. كل ما رفضت صورة، الوكيل يتعلم وش يتجنب 🧠
          </p>
        ) : (
          agentMemory.rejectionReasons.map((r, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: "#fef2f2",
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 18 }}>
                {rejectionReasons.find((rr) => rr.id === r.reason)?.emoji || "❌"}
              </span>
              <span style={{ fontSize: 14, color: "#dc2626", fontFamily: "'Tajawal', sans-serif" }}>
                {rejectionReasons.find((rr) => rr.id === r.reason)?.label || r.reason}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8", marginRight: "auto" }}>
                {r.type === "manual" ? "يدوي" : `بوست: ${postTypes.find((pt) => pt.id === r.type)?.label || r.type}`}
              </span>
              <button
                onClick={() => handleDeleteRejection(i)}
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
          background: "#fef2f2",
          borderRadius: 16,
          border: "1px dashed #fecaca",
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
                border: "2px solid #fecaca",
                fontSize: 14,
                fontFamily: "'Tajawal', sans-serif",
                direction: "rtl",
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#dc2626"}
              onBlur={(e) => e.target.style.borderColor = "#fecaca"}
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
        background: "white",
        borderRadius: 24,
        padding: 28,
        border: "1px solid #bbf7d0",
        boxShadow: "0 4px 20px rgba(5,150,105,0.06)",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#059669",
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
            color: "#94a3b8",
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
                background: "#ecfdf5",
                color: "#059669",
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Tajawal', sans-serif",
                border: "1px solid #bbf7d0",
              }}>
                ✅ {postTypes.find((pt) => pt.id === s.type)?.label || s.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
          background: "white",
          borderRadius: 28,
          padding: 36,
          maxWidth: 700,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 800,
            color: PURPLE[900],
            fontFamily: "'Tajawal', sans-serif",
          }}>
            🏗️ هندسة نظام الوكيل
          </h2>
          <button
            onClick={() => setShowArchitecture(false)}
            style={{
              background: PURPLE[50],
              border: "none",
              width: 36,
              height: 36,
              borderRadius: 12,
              fontSize: 18,
              cursor: "pointer",
              color: PURPLE[600],
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
            background: "#fafafa",
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
                  color: "#1e293b",
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

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #faf5ff 0%, #ffffff 30%, #faf5ff 100%)",
        fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
        position: "relative",
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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${PURPLE[200]}; border-radius: 3px; }
      `}</style>

      <ParticleField />

      {/* Nav */}
      <nav style={{
        position: "sticky",
        top: 0,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${PURPLE[100]}`,
        zIndex: 100,
        padding: "12px 24px",
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
              color: PURPLE[800],
              fontFamily: "'Tajawal', sans-serif",
            }}>
              وكيل هجولة
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "home", label: "الرئيسية", emoji: "🏠" },
              { id: "generate", label: "ولّد", emoji: "✨" },
              { id: "memory", label: "الذاكرة", emoji: "🧠" },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setCurrentPage(nav.id)}
                style={{
                  background: currentPage === nav.id ? PURPLE[100] : "transparent",
                  color: currentPage === nav.id ? PURPLE[800] : "#64748b",
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
