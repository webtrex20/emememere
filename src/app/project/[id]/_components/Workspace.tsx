"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Props {
  projectId: number;
  initialMessages: ChatMessage[];
  initialHtml: string;
  autoPrompt: string | null;
}

type Tab = "preview" | "code";

export function Workspace({ projectId, initialMessages, initialHtml, autoPrompt }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [html, setHtml] = useState(initialHtml);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  // Auto-scroll chat
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;
    setSending(true);

    const optimisticUser: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);
    setInput("");

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        userMessage: { id: number; createdAt: string };
        assistantMessage: { id: number; content: string; html: string; createdAt: string };
      };

      setMessages((m) => [
        ...m.filter((x) => x.id !== optimisticUser.id),
        {
          id: data.userMessage.id,
          role: "user",
          content: trimmed,
          createdAt: data.userMessage.createdAt,
        },
        {
          id: data.assistantMessage.id,
          role: "assistant",
          content: data.assistantMessage.content,
          createdAt: data.assistantMessage.createdAt,
        },
      ]);
      setHtml(data.assistantMessage.html);
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "⚠️ Something went wrong generating that. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // Auto-send the initial prompt that came from the landing page
  useEffect(() => {
    if (autoSentRef.current) return;
    if (autoPrompt && messages.length === 0) {
      autoSentRef.current = true;
      // Clean the prompt from the URL so a refresh doesn't resend
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
      void send(autoPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergent-project-${projectId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[400px_1fr]">
      {/* Chat column */}
      <aside className="flex h-full min-h-0 flex-col border-r border-white/10 bg-slate-950">
        <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.length === 0 && !sending && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
              <p className="font-medium text-slate-200">👋 Tell me what to build</p>
              <p className="mt-2">
                Describe a website, request a tweak, or ask any question. I&apos;ll respond and
                update the live preview on the right.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <span className="flex gap-1">
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </span>
              Generating your website…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-white/10 bg-slate-950 p-3"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-fuchsia-400/40">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder="Ask a question or request a change…"
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="self-stretch rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 px-4 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↑
            </button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-slate-500">
            Enter to send · Shift+Enter for newline
          </p>
        </form>
      </aside>

      {/* Preview / Code column */}
      <section className="flex h-full min-h-0 flex-col bg-slate-900">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-2">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 text-xs">
            <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
              Preview
            </TabButton>
            <TabButton active={tab === "code"} onClick={() => setTab("code")}>
              Code
            </TabButton>
          </div>
          <div className="flex items-center gap-2">
            {tab === "preview" && (
              <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 text-xs">
                <TabButton active={device === "desktop"} onClick={() => setDevice("desktop")}>
                  🖥 Desktop
                </TabButton>
                <TabButton active={device === "mobile"} onClick={() => setDevice("mobile")}>
                  📱 Mobile
                </TabButton>
              </div>
            )}
            <button
              onClick={downloadHtml}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              ↓ Download HTML
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:24px_24px] p-4">
          {tab === "preview" ? (
            <div
              className={`mx-auto h-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl ${
                device === "mobile" ? "max-w-[390px]" : "max-w-none"
              }`}
            >
              <iframe
                key={html.length}
                title="Live preview"
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-same-origin"
                className="h-full w-full"
              />
            </div>
          ) : (
            <pre className="h-full overflow-auto rounded-xl border border-white/10 bg-slate-950/90 p-4 text-xs leading-relaxed text-slate-200">
              <code>{html}</code>
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isUser
            ? "bg-slate-700 text-slate-200"
            : "bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-white"
        }`}
      >
        {isUser ? "You" : "✦"}
      </div>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-500/20 text-indigo-50"
            : "border border-white/10 bg-white/[0.04] text-slate-200"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 transition ${
        active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
