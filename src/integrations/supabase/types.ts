export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          member_id: string | null
          metadata: Json | null
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json | null
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personality_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_posts: {
        Row: {
          campaign_id: string
          content: string | null
          created_at: string
          day_number: number
          id: string
          post_type: string
          scheduled_date: string | null
          status: string
          theme: string | null
          time_slot: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content?: string | null
          created_at?: string
          day_number: number
          id?: string
          post_type: string
          scheduled_date?: string | null
          status?: string
          theme?: string | null
          time_slot: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content?: string | null
          created_at?: string
          day_number?: number
          id?: string
          post_type?: string
          scheduled_date?: string | null
          status?: string
          theme?: string | null
          time_slot?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "content_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_resources: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          last_checked_at: string | null
          last_synced_at: string | null
          parent_course_url: string | null
          skill_level: string | null
          title: string
          url: string | null
          url_verified: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          last_checked_at?: string | null
          last_synced_at?: string | null
          parent_course_url?: string | null
          skill_level?: string | null
          title: string
          url?: string | null
          url_verified?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          last_checked_at?: string | null
          last_synced_at?: string | null
          parent_course_url?: string | null
          skill_level?: string | null
          title?: string
          url?: string | null
          url_verified?: boolean | null
        }
        Relationships: []
      }
      content_campaigns: {
        Row: {
          bread_name: string | null
          created_at: string
          event_date: string | null
          event_type: string
          id: string
          promotion_days: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bread_name?: string | null
          created_at?: string
          event_date?: string | null
          event_type?: string
          id?: string
          promotion_days?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          bread_name?: string | null
          created_at?: string
          event_date?: string | null
          event_type?: string
          id?: string
          promotion_days?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          resource_id: string
          sort_order: number
          title: string
          topics: string[] | null
          updated_at: string
          url: string | null
          url_verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          resource_id: string
          sort_order?: number
          title: string
          topics?: string[] | null
          updated_at?: string
          url?: string | null
          url_verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          resource_id?: string
          sort_order?: number
          title?: string
          topics?: string[] | null
          updated_at?: string
          url?: string | null
          url_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "classroom_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_templates: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          last_used_at: string | null
          name: string
          outreach_type: string
          updated_at: string
          use_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          outreach_type?: string
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          outreach_type?: string
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string
          created_at: string
          email_count: number
          id: string
          sent_at: string | null
          status: string
          target_segment: string
          updated_at: string
        }
        Insert: {
          campaign_name: string
          campaign_type?: string
          created_at?: string
          email_count?: number
          id?: string
          sent_at?: string | null
          status?: string
          target_segment?: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          created_at?: string
          email_count?: number
          id?: string
          sent_at?: string | null
          status?: string
          target_segment?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          body_text: string
          campaign_id: string
          created_at: string
          id: string
          member_id: string | null
          personalization_data: Json | null
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string
          subscriber_id: string | null
          updated_at: string
        }
        Insert: {
          body_text: string
          campaign_id: string
          created_at?: string
          id?: string
          member_id?: string | null
          personalization_data?: Json | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
          subject: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Update: {
          body_text?: string
          campaign_id?: string
          created_at?: string
          id?: string
          member_id?: string | null
          personalization_data?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          confirmation_time: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_skool_member: boolean
          last_name: string | null
          list_name: string | null
          matched_member_id: string | null
          source: string | null
          status: string
          subscription_time: string | null
          updated_at: string
        }
        Insert: {
          confirmation_time?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_skool_member?: boolean
          last_name?: string | null
          list_name?: string | null
          matched_member_id?: string | null
          source?: string | null
          status?: string
          subscription_time?: string | null
          updated_at?: string
        }
        Update: {
          confirmation_time?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_skool_member?: boolean
          last_name?: string | null
          list_name?: string | null
          matched_member_id?: string | null
          source?: string | null
          status?: string
          subscription_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_matched_member_id_fkey"
            columns: ["matched_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_mappings: {
        Row: {
          book_link: string | null
          created_at: string
          id: string
          keywords: string[]
          quick_win: string | null
          recommended_course: string | null
          recommended_recipe: string | null
          updated_at: string
        }
        Insert: {
          book_link?: string | null
          created_at?: string
          id?: string
          keywords?: string[]
          quick_win?: string | null
          recommended_course?: string | null
          recommended_recipe?: string | null
          updated_at?: string
        }
        Update: {
          book_link?: string | null
          created_at?: string
          id?: string
          keywords?: string[]
          quick_win?: string | null
          recommended_course?: string | null
          recommended_recipe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      member_tags: {
        Row: {
          created_at: string
          id: string
          member_id: string
          source: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          source?: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          source?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          application_answer: string | null
          comment_count: number | null
          created_at: string | null
          email: string | null
          engagement_status: string | null
          id: string
          join_date: string | null
          last_active: string | null
          message_status: string
          notes: string | null
          outreach_responded: boolean | null
          outreach_sent: boolean | null
          outreach_sent_at: string | null
          post_count: number | null
          priority_level: string | null
          priority_score: number | null
          skool_name: string
          skool_username: string | null
          updated_at: string | null
        }
        Insert: {
          application_answer?: string | null
          comment_count?: number | null
          created_at?: string | null
          email?: string | null
          engagement_status?: string | null
          id?: string
          join_date?: string | null
          last_active?: string | null
          message_status?: string
          notes?: string | null
          outreach_responded?: boolean | null
          outreach_sent?: boolean | null
          outreach_sent_at?: string | null
          post_count?: number | null
          priority_level?: string | null
          priority_score?: number | null
          skool_name: string
          skool_username?: string | null
          updated_at?: string | null
        }
        Update: {
          application_answer?: string | null
          comment_count?: number | null
          created_at?: string | null
          email?: string | null
          engagement_status?: string | null
          id?: string
          join_date?: string | null
          last_active?: string | null
          message_status?: string
          notes?: string | null
          outreach_responded?: boolean | null
          outreach_sent?: boolean | null
          outreach_sent_at?: string | null
          post_count?: number | null
          priority_level?: string | null
          priority_score?: number | null
          skool_name?: string
          skool_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outreach_messages: {
        Row: {
          created_at: string
          custom_topic: string | null
          id: string
          member_id: string
          member_name: string
          message_text: string
          message_type: string
          priority: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          custom_topic?: string | null
          id?: string
          member_id: string
          member_name: string
          message_text: string
          message_type?: string
          priority?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          custom_topic?: string | null
          id?: string
          member_id?: string
          member_name?: string
          message_text?: string
          message_type?: string
          priority?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_rules: {
        Row: {
          action_type: string
          action_value: string | null
          condition_field: string
          condition_operator: string
          condition_value: number
          created_at: string
          id: string
          is_active: boolean
          rule_name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          action_type: string
          action_value?: string | null
          condition_field: string
          condition_operator?: string
          condition_value: number
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_value?: string | null
          condition_field?: string
          condition_operator?: string
          condition_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_ideas: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_used: boolean | null
          post_type: string | null
          target_audience: string | null
          title: string
          topic: string | null
          used_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          post_type?: string | null
          target_audience?: string | null
          title: string
          topic?: string | null
          used_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          post_type?: string | null
          target_audience?: string | null
          title?: string
          topic?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      quick_responses: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          last_used_at: string | null
          related_course_ids: string[] | null
          related_recipe_ids: string[] | null
          search_hit_count: number | null
          title: string
          topic_tags: string[] | null
          trigger_phrases: string[] | null
          updated_at: string
          use_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          related_course_ids?: string[] | null
          related_recipe_ids?: string[] | null
          search_hit_count?: number | null
          title: string
          topic_tags?: string[] | null
          trigger_phrases?: string[] | null
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          related_course_ids?: string[] | null
          related_recipe_ids?: string[] | null
          search_hit_count?: number | null
          title?: string
          topic_tags?: string[] | null
          trigger_phrases?: string[] | null
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          last_checked_at: string | null
          related_course: string | null
          share_url: string | null
          skill_level: string | null
          skool_url: string | null
          tags: string[] | null
          title: string
          url: string | null
          url_verified: boolean | null
          uses_discard: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          last_checked_at?: string | null
          related_course?: string | null
          share_url?: string | null
          skill_level?: string | null
          skool_url?: string | null
          tags?: string[] | null
          title: string
          url?: string | null
          url_verified?: boolean | null
          uses_discard?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          last_checked_at?: string | null
          related_course?: string | null
          share_url?: string | null
          skill_level?: string | null
          skool_url?: string | null
          tags?: string[] | null
          title?: string
          url?: string | null
          url_verified?: boolean | null
          uses_discard?: boolean | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string | null
          day_theme: string | null
          id: string
          post_type: string | null
          posted_at: string | null
          scheduled_date: string
          status: string | null
          time_slot: string | null
          title: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          created_at?: string | null
          day_theme?: string | null
          id?: string
          post_type?: string | null
          posted_at?: string | null
          scheduled_date: string
          status?: string | null
          time_slot?: string | null
          title: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string | null
          day_theme?: string | null
          id?: string
          post_type?: string | null
          posted_at?: string | null
          scheduled_date?: string
          status?: string | null
          time_slot?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "content_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      url_health_checks: {
        Row: {
          created_at: string
          error_message: string | null
          fallback_url: string | null
          id: string
          is_healthy: boolean
          last_checked_at: string | null
          source_id: string | null
          source_type: string
          status_code: number | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          fallback_url?: string | null
          id?: string
          is_healthy?: boolean
          last_checked_at?: string | null
          source_id?: string | null
          source_type: string
          status_code?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          fallback_url?: string | null
          id?: string
          is_healthy?: boolean
          last_checked_at?: string | null
          source_id?: string | null
          source_type?: string
          status_code?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          created_at: string
          current_count: number
          goal_label: string
          goal_type: string
          id: string
          target_count: number
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          goal_label: string
          goal_type: string
          id?: string
          target_count?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          current_count?: number
          goal_label?: string
          goal_type?: string
          id?: string
          target_count?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
