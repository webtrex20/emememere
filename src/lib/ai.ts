// Google Gemini integration. Calls the public REST API so we don't need
// the @google/generative-ai SDK. Falls back to a deterministic template
// generator when no API key is configured, so the app stays usable.

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIResult {
  message: string;
  html: string;
  source: "gemini" | "fallback";
}

const SYSTEM_PROMPT = `You are Emergent AI, an expert full-stack web designer that builds complete, beautiful, production-ready single-file websites.

RULES:
1. ALWAYS return a single valid JSON object — NO markdown, NO code fences, NO commentary outside JSON.
2. JSON shape: {"message": "<short friendly explanation, 1-3 sentences>", "html": "<COMPLETE self-contained HTML document>"}
3. The "html" field MUST be a full HTML5 document starting with <!DOCTYPE html>, including <html>, <head>, <body>.
4. Use TailwindCSS via the CDN: <script src="https://cdn.tailwindcss.com"></script>
5. Use Google Fonts for typography and include relevant icons (lucide via CDN or emojis are fine).
6. Make sites visually stunning: gradients, generous whitespace, smooth transitions, responsive layout.
7. Include working interactivity using vanilla JS inside <script> tags when relevant (tabs, modals, forms, counters, etc.).
8. If the user asks a QUESTION instead of asking to build something, still return JSON: put the answer in "message" and keep the previous HTML unchanged — return the same HTML you most recently produced (or a friendly welcome page if none).
9. When the user asks to modify the site, return the FULL updated HTML, not a diff.
10. Never include external images that require API keys. Use https://images.unsplash.com/photo-* URLs or https://picsum.photos/ or inline SVG.

Respond ONLY with the JSON object.`;

function extractJson(text: string): { message: string; html: string } | null {
  // Try direct parse first
  const tryParse = (s: string) => {
    try {
      const obj = JSON.parse(s);
      if (typeof obj?.message === "string" && typeof obj?.html === "string") {
        return { message: obj.message, html: obj.html };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const direct = tryParse(text.trim());
  if (direct) return direct;

  // Strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed) return parsed;
  }

  // Find first {...} block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const parsed = tryParse(text.slice(start, end + 1));
    if (parsed) return parsed;
  }
  return null;
}

function fallbackResponse(prompt: string, previousHtml: string): AIResult {
  const isQuestion = /\?$/.test(prompt.trim()) || /^(what|who|why|how|when|where|is|are|can|do|does)/i.test(prompt.trim());

  if (isQuestion) {
    return {
      message:
        "I'm running in offline demo mode (no GEMINI_API_KEY configured). Add a Google Gemini API key to enable live answers and dynamic website generation. Meanwhile, try asking me to build something like 'a landing page for a coffee shop'.",
      html: previousHtml || welcomeHtml(),
      source: "fallback",
    };
  }

  const title = prompt.slice(0, 60).replace(/[<>]/g, "");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>body{font-family:'Inter',sans-serif}</style>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
<header class="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
  <div class="flex items-center gap-2 font-bold text-xl">
    <span class="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600"></span>
    Brand
  </div>
  <nav class="hidden md:flex gap-8 text-slate-700"><a>Home</a><a>Features</a><a>About</a><a>Contact</a></nav>
  <button class="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold">Get Started</button>
</header>
<main class="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
  <span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">DEMO MODE</span>
  <h1 class="mt-6 text-5xl md:text-7xl font-extrabold bg-gradient-to-br from-slate-900 to-indigo-700 bg-clip-text text-transparent">${title}</h1>
  <p class="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">This is a placeholder website. Configure <code class="px-2 py-1 bg-slate-100 rounded">GEMINI_API_KEY</code> to let Emergent AI generate real, custom designs from your prompt.</p>
  <div class="mt-10 flex justify-center gap-4">
    <button class="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg">Primary action</button>
    <button class="px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">Learn more</button>
  </div>
</main>
</body>
</html>`;

  return {
    message: `Generated a starter design based on "${prompt}". (Demo fallback — add a GEMINI_API_KEY to get fully AI-designed sites.)`,
    html,
    source: "fallback",
  };
}

export function welcomeHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Welcome</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white">
<div class="text-center px-6">
  <div class="text-6xl mb-6">✨</div>
  <h1 class="text-4xl font-bold">Your website will appear here</h1>
  <p class="mt-4 text-slate-300">Send a prompt on the left to start building.</p>
</div></body></html>`;
}

export async function generateWebsite(params: {
  userPrompt: string;
  history: ChatTurn[];
  previousHtml: string;
}): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return fallbackResponse(params.userPrompt, params.previousHtml);
  }

  const contextNote = params.previousHtml
    ? `\n\nCURRENT WEBSITE HTML (modify this when the user requests changes):\n${params.previousHtml.slice(0, 12000)}`
    : "";

  const contents = [
    ...params.history.map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    })),
    {
      role: "user" as const,
      parts: [{ text: params.userPrompt + contextNote }],
    },
  ];

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  try {
    const resp = await fetch(`${GEMINI_URL(GEMINI_MODEL)}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API error:", resp.status, errText);
      return {
        ...fallbackResponse(params.userPrompt, params.previousHtml),
        message: `Gemini API error (${resp.status}). Falling back to demo response. Check your GEMINI_API_KEY.`,
      };
    }

    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    const parsed = extractJson(text);

    if (!parsed) {
      // Treat the whole text as a chat answer; keep previous HTML.
      return {
        message: text || "I couldn't generate a valid response. Please try again.",
        html: params.previousHtml || welcomeHtml(),
        source: "gemini",
      };
    }

    return { message: parsed.message, html: parsed.html, source: "gemini" };
  } catch (err) {
    console.error("Gemini call failed", err);
    return fallbackResponse(params.userPrompt, params.previousHtml);
  }
}