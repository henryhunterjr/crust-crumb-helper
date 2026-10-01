import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_outreach_templates",
  title: "List outreach templates",
  description: "List the saved DM and email outreach templates, with their body text and merge tags.",
  inputSchema: {
    channel: z.string().optional().describe("Filter by channel, e.g. dm or email."),
    active_only: z.boolean().optional().describe("Only return active templates (default true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ channel, active_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("outreach_templates")
      .select("id, key, name, description, channel, segment_key, subject, body, merge_tags, is_active")
      .order("name");
    if (channel) query = query.eq("channel", channel);
    if (active_only !== false) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const templates = (data ?? []).map((t) => ({
      id: String(t.id),
      key: t.key ?? null,
      name: t.name ?? null,
      description: t.description ?? null,
      channel: t.channel ?? null,
      segment_key: t.segment_key ?? null,
      subject: t.subject ?? null,
      body: t.body ?? null,
      merge_tags: Array.isArray(t.merge_tags) ? t.merge_tags.map(String) : [],
      is_active: Boolean(t.is_active),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(templates, null, 2) }],
      structuredContent: { templates, count: templates.length },
    };
  },
});
