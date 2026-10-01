import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

const COMMUNITIES = ["crust-crumb-academy", "from-oven-to-market"] as const;

export default defineTool({
  name: "community_overview",
  title: "Community overview",
  description:
    "Summary counts of the member base: total members, members per community, and how many still need outreach.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const head = { count: "exact" as const, head: true };
    const [total, needsOutreach, compassAnalyzed, ...perCommunity] = await Promise.all([
      supabase.from("members").select("id", head),
      supabase.from("members").select("id", head).eq("outreach_sent", false),
      supabase.from("member_compass_profiles").select("id", head),
      ...COMMUNITIES.map((slug) =>
        supabase.from("members").select("id", head).contains("communities", [slug]),
      ),
    ]);

    const firstError = [total, needsOutreach, compassAnalyzed, ...perCommunity].find((r) => r.error);
    if (firstError?.error) {
      return { content: [{ type: "text", text: firstError.error.message }], isError: true };
    }

    const overview = {
      total_members: total.count ?? 0,
      needs_outreach: needsOutreach.count ?? 0,
      compass_profiles: compassAnalyzed.count ?? 0,
      communities: COMMUNITIES.map((slug, i) => ({ slug, members: perCommunity[i].count ?? 0 })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      structuredContent: { overview },
    };
  },
});
