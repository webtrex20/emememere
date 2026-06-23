import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { NewProjectForm } from "./_components/NewProjectForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recent = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(12);
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-600/30 via-fuchsia-500/20 to-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-purple-700/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-lg shadow-lg shadow-fuchsia-500/30">
            ✦
          </span>
          <span className="text-lg tracking-tight">Emergent AI</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
              hasKey
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-emerald-400" : "bg-amber-400"}`} />
            {hasKey ? "Synced with Google Gemini" : "Demo mode — set GEMINI_API_KEY"}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Powered by Google Gemini
        </span>
        <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          Build a website by{" "}
          <span className="bg-gradient-to-br from-indigo-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            telling AI what you want
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-slate-300">
          Emergent AI is your full-stack designer. Describe an idea, ask a question, request changes
          — it ships a complete, live website in seconds.
        </p>

        <div className="mt-10">
          <NewProjectForm />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span>Try:</span>
          {[
            "A pricing page for a SaaS",
            "Portfolio for a wedding photographer",
            "Landing page for a coffee shop",
            "What is the capital of France?",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-slate-200">Recent projects</h2>
          <span className="text-sm text-slate-400">{recent.length} total</span>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-slate-400">
            No projects yet. Describe something above to start your first build.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/project/${p.id}`}
                  className="group block h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 transition hover:border-fuchsia-400/40 hover:shadow-lg hover:shadow-fuchsia-500/10"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>#{p.id}</span>
                    <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-100 group-hover:text-white">
                    {p.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {p.description || "Open to keep building →"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        Emergent AI clone · Next.js · PostgreSQL · Google Gemini
      </footer>
    </main>
  );
}