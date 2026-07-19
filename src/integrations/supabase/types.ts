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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      founder_scores: {
        Row: {
          computed_at: string
          confidence: number
          founder_id: string
          id: string
          rationale: string | null
          score: number
          subscores: Json
          trend: string
        }
        Insert: {
          computed_at?: string
          confidence?: number
          founder_id: string
          id?: string
          rationale?: string | null
          score: number
          subscores?: Json
          trend?: string
        }
        Update: {
          computed_at?: string
          confidence?: number
          founder_id?: string
          id?: string
          rationale?: string | null
          score?: number
          subscores?: Json
          trend?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_scores_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_signals: {
        Row: {
          evidence_url: string | null
          founder_id: string
          id: string
          observed_at: string
          payload: Json
          signal_type: string
          source: string
          weight: number
        }
        Insert: {
          evidence_url?: string | null
          founder_id: string
          id?: string
          observed_at?: string
          payload?: Json
          signal_type: string
          source: string
          weight?: number
        }
        Update: {
          evidence_url?: string | null
          founder_id?: string
          id?: string
          observed_at?: string
          payload?: Json
          signal_type?: string
          source?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "founder_signals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          bio: string | null
          created_at: string
          github_handle: string | null
          id: string
          linkedin_url: string | null
          name: string
          normalized_name: string
          personal_site: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          github_handle?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          normalized_name: string
          personal_site?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          github_handle?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          normalized_name?: string
          personal_site?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      screening_scores: {
        Row: {
          company: string
          created_at: string
          disagreement: string | null
          founder_id: string | null
          founder_rationale: string | null
          founder_score: number
          founder_trend: string
          id: string
          idea_rationale: string | null
          idea_score: number
          idea_survives_as_is: boolean
          idea_trend: string
          market_rationale: string | null
          market_score: number
          market_stance: string
          market_trend: string
          payload: Json
          recommendation: string
          vc_name: string
        }
        Insert: {
          company: string
          created_at?: string
          disagreement?: string | null
          founder_id?: string | null
          founder_rationale?: string | null
          founder_score: number
          founder_trend?: string
          id?: string
          idea_rationale?: string | null
          idea_score: number
          idea_survives_as_is?: boolean
          idea_trend?: string
          market_rationale?: string | null
          market_score: number
          market_stance?: string
          market_trend?: string
          payload?: Json
          recommendation?: string
          vc_name: string
        }
        Update: {
          company?: string
          created_at?: string
          disagreement?: string | null
          founder_id?: string | null
          founder_rationale?: string | null
          founder_score?: number
          founder_trend?: string
          id?: string
          idea_rationale?: string | null
          idea_score?: number
          idea_survives_as_is?: boolean
          idea_trend?: string
          market_rationale?: string | null
          market_score?: number
          market_stance?: string
          market_trend?: string
          payload?: Json
          recommendation?: string
          vc_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_scores_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      vc_memory: {
        Row: {
          created_at: string
          evidence_urls: string[]
          id: string
          summary: string
          topic: string
          updated_at: string
          vc_name: string
        }
        Insert: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          summary: string
          topic: string
          updated_at?: string
          vc_name: string
        }
        Update: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          summary?: string
          topic?: string
          updated_at?: string
          vc_name?: string
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
