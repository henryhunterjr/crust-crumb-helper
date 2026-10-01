import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_members",
  title: "Search members",
  description: "Search members by name, Skool username, or email.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Text to match against name, username, or email."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const safe = query.replace(/[%,]/g, " ").trim();
    const { data, error } = await supabase
      .from("members")
      .select("id, skool_name, skool_username, email, engagement_status, communities")
      .or(`skool_name.ilike.%${safe}%,skool_username.ilike.%${safe}%,email.ilike.%${safe}%`)
      .limit(limit ?? 10);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const results = (data ?? []).map((m) => ({
      id: String(m.id),
      name: m.skool_name ?? null,
      username: m.skool_username ?? null,
      email: m.email ?? null,
      engagement_status: m.engagement_status ?? null,
      communities: Array.isArray(m.communities) ? m.communities.map(String) : [],
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results, count: results.length },
    };
  },
});
