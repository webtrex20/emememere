import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ 
      ok: true,
      apiKeyConfigured: !!process.env.GEMINI_API_KEY 
    });
  } catch {
    return Response.json({ 
      ok: false,
      apiKeyConfigured: !!process.env.GEMINI_API_KEY 
    }, { status: 500 });
  }
}