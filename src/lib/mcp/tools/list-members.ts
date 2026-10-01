import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const toMemberJson = (m: Record<string, unknown>) => ({
  id: String(m.id ?? ""),
  name: (m.skool_name as string | null) ?? null,
  username: (m.skool_username as string | null) ?? null,
  email: (m.email as string | null) ?? null,
  join_date: (m.join_date as string | null) ?? null,
  last_active: (m.last_active as string | null) ?? null,
  engagement_status: (m.engagement_status as string | null) ?? null,
  intent_tier: (m.intent_tier as string | null) ?? null,
  communities: Array.isArray(m.communities) ? (m.communities as unknown[]).map(String) : [],
  segments: Array.isArray(m.segments) ? (m.segments as unknown[]).map(String) : [],
  outreach_sent: Boolean(m.outreach_sent),
});

export default defineTool({
  name: "list_members",
  title: "List members",
  description:
    "List community members with optional filters for community slug, engagement status, intent tier, or whether outreach was already sent.",
  inputSchema: {
    community: z
      .string()
      .optional()
      .describe("Community slug, e.g. crust-crumb-academy or from-oven-to-market."),
    engagement_status: z.string().optional().describe("Engagement status filter, e.g. active, inactive."),
    intent_tier: z.string().optional().describe("Intent tier filter, e.g. prospect."),
    outreach_sent: z.boolean().optional().describe("Filter on whether outreach has already been sent."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ community, engagement_status, intent_tier, outreach_sent, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("members")
      .select(
        "id, skool_name, skool_username, email, join_date, last_active, engagement_status, intent_tier, communities, segments, outreach_sent",
      )
      .order("join_date", { ascending: false })
      .limit(limit ?? 25);

    if (community) query = query.contains("communities", [community]);
    if (engagement_status) query = query.eq("engagement_status", engagement_status);
    if (intent_tier) query = query.eq("intent_tier", intent_tier);
    if (outreach_sent !== undefined) query = query.eq("outreach_sent", outreach_sent);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const members = (data ?? []).map(toMemberJson);
    return {
      content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
      structuredContent: { members, count: members.length },
    };
  },
});
