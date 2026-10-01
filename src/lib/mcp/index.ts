import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMembersTool from "./tools/list-members";
import searchMembersTool from "./tools/search-members";
import getMemberCompassTool from "./tools/get-member-compass";
import listOutreachTemplatesTool from "./tools/list-outreach-templates";
import communityOverviewTool from "./tools/community-overview";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "crust-crumb-companion",
  title: "Crust & Crumb Companion",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Crust & Crumb Companion community console. Use community_overview for headline counts, list_members and search_members to find people, get_member_compass for one member's profile and coaching insights, and list_outreach_templates for saved DM and email copy. Nothing here sends messages.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    communityOverviewTool,
    listMembersTool,
    searchMembersTool,
    getMemberCompassTool,
    listOutreachTemplatesTool,
  ],
});
