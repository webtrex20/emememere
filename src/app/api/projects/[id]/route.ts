import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return new NextResponse("Invalid id", { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(project.currentHtml || "<!doctype html><body>Empty</body>", {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(projects).where(eq(projects.id, projectId));
  return NextResponse.json({ ok: true });
}