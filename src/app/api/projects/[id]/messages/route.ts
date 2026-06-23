import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateWebsite, type ChatTurn } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Save the user message immediately
  const [userMsg] = await db
    .insert(messages)
    .values({ projectId, role: "user", content: prompt })
    .returning();

  // Pull chat history (excluding the just-inserted prompt) for context
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  const turns: ChatTurn[] = history
    .filter((m) => m.id !== userMsg.id)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const result = await generateWebsite({
    userPrompt: prompt,
    history: turns,
    previousHtml: project.currentHtml,
  });

  const [assistantMsg] = await db
    .insert(messages)
    .values({
      projectId,
      role: "assistant",
      content: result.message,
      html: result.html,
    })
    .returning();

  // Update project's current HTML + bump timestamp + auto-title if still default
  const autoTitle =
    project.title === "Untitled project" && prompt.length > 0
      ? prompt.slice(0, 60)
      : project.title;

  await db
    .update(projects)
    .set({
      currentHtml: result.html,
      title: autoTitle,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return NextResponse.json({
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    source: result.source,
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ project, messages: msgs });
}