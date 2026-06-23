import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { projects, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Workspace } from "@/app/_components/Workspace";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prompt?: string }>;
}) {
  const { id } = await params;
  const { prompt } = await searchParams;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) notFound();

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/5"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-xs">
              ✦
            </span>
            <span className="font-semibold">Emergent AI</span>
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="max-w-[40ch] truncate text-sm font-medium text-slate-200">
            {project.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${
              hasKey
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${hasKey ? "bg-emerald-400" : "bg-amber-400"}`} />
            {hasKey ? "Gemini synced" : "Demo mode"}
          </span>
        </div>
      </header>

      <Workspace
        projectId={project.id}
        initialMessages={msgs.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
        initialHtml={project.currentHtml}
        autoPrompt={prompt ?? null}
      />
    </div>
  );
}