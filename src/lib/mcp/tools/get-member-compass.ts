import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_member_compass",
  title: "Get member profile and compass",
  description:
    "Get one member's record plus their Member Compass insights (baking stage, struggles, goals, next best action).",
  inputSchema: {
    member_id: z.string().uuid().optional().describe("Member id."),
    email: z.string().trim().optional().describe("Member email."),
    username: z.string().trim().optional().describe("Skool username."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ member_id, email, username }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!member_id && !email && !username) {
      throw new ToolError("Provide member_id, email, or username.");
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("members").select("*").limit(1);
    if (member_id) query = query.eq("id", member_id);
    else if (email) query = query.ilike("email", email);
    else if (username) query = query.ilike("skool_username", username!);

    const { data, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) throw new ToolError("No member matched that lookup.");

    const { data: compass } = await supabase
      .from("member_compass_profiles")
      .select(
        "baking_stage, struggles, learning_goals, bread_interests, why_they_bake, personal_hooks, next_best_action, recommended_resource_title, recommended_resource_url, insight_confidence, last_analyzed_at",
      )
      .eq("member_id", data.id)
      .maybeSingle();

    const member = {
      id: String(data.id),
      name: data.skool_name ?? null,
      username: data.skool_username ?? null,
      email: data.email ?? null,
      join_date: data.join_date ?? null,
      last_active: data.last_active ?? null,
      engagement_status: data.engagement_status ?? null,
      intent_tier: data.intent_tier ?? null,
      nurture_status: data.nurture_status ?? null,
      notes: data.notes ?? null,
      communities: Array.isArray(data.communities) ? data.communities.map(String) : [],
      segments: Array.isArray(data.segments) ? data.segments.map(String) : [],
    };

    const compassJson = compass
      ? {
          baking_stage: compass.baking_stage ?? null,
          struggles: Array.isArray(compass.struggles) ? compass.struggles.map(String) : [],
          learning_goals: Array.isArray(compass.learning_goals) ? compass.learning_goals.map(String) : [],
          bread_interests: Array.isArray(compass.bread_interests) ? compass.bread_interests.map(String) : [],
          why_they_bake: compass.why_they_bake ?? null,
          personal_hooks: Array.isArray(compass.personal_hooks) ? compass.personal_hooks.map(String) : [],
          next_best_action: compass.next_best_action ?? null,
          recommended_resource_title: compass.recommended_resource_title ?? null,
          recommended_resource_url: compass.recommended_resource_url ?? null,
          insight_confidence: compass.insight_confidence ?? null,
          last_analyzed_at: compass.last_analyzed_at ?? null,
        }
      : null;

    return {
      content: [{ type: "text", text: JSON.stringify({ member, compass: compassJson }, null, 2) }],
      structuredContent: { member, compass: compassJson },
    };
  },
});
