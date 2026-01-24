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
      classroom_resources: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          skill_level: string | null
          title: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          skill_level?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          skill_level?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
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
          notes: string | null
          outreach_responded: boolean | null
          outreach_sent: boolean | null
          outreach_sent_at: string | null
          post_count: number | null
          skool_name: string
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
          notes?: string | null
          outreach_responded?: boolean | null
          outreach_sent?: boolean | null
          outreach_sent_at?: string | null
          post_count?: number | null
          skool_name: string
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
          notes?: string | null
          outreach_responded?: boolean | null
          outreach_sent?: boolean | null
          outreach_sent_at?: string | null
          post_count?: number | null
          skool_name?: string
          updated_at?: string | null
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
          title: string
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
          title: string
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
          title?: string
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
          skill_level: string | null
          title: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          skill_level?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          skill_level?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_type: string | null
          posted_at: string | null
          scheduled_date: string
          status: string | null
          time_slot: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_type?: string | null
          posted_at?: string | null
          scheduled_date: string
          status?: string | null
          time_slot?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_type?: string | null
          posted_at?: string | null
          scheduled_date?: string
          status?: string | null
          time_slot?: string | null
          title?: string
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
