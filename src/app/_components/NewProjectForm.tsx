"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewProjectForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prompt.slice(0, 60),
          description: prompt,
        }),
      });
      const data = (await res.json()) as { project: { id: number } };
      router.push(`/project/${data.project.id}?prompt=${encodeURIComponent(prompt)}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex max-w-2xl items-stretch gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-fuchsia-900/10 backdrop-blur focus-within:border-fuchsia-400/40"
    >
      <input
        autoFocus
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe a website, or ask a question…"
        className="flex-1 bg-transparent px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 px-5 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Spinner /> Creating…
          </>
        ) : (
          <>
            Build it <span aria-hidden>→</span>
          </>
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}