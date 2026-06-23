import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { welcomeHtml } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { title?: string; description?: string };
  const title = (body.title || "Untitled project").slice(0, 120);
  const description = (body.description || "").slice(0, 500);

  const [row] = await db
    .insert(projects)
    .values({ title, description, currentHtml: welcomeHtml() })
    .returning();

  return NextResponse.json({ project: row });
}