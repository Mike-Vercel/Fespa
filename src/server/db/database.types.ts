/**
 * Tipi del database nello stesso formato di `supabase gen types typescript`.
 * Rispecchiano supabase/migrations: se cambi lo schema, aggiorna questo file
 * (oppure rigeneralo con la CLI: vedi README, sezione "Tipi del database").
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: Database["public"]["Enums"]["app_role"];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          status: Database["public"]["Enums"]["client_status"];
          goal: string | null;
          started_on: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          email: string | null;
          approval_status: Database["public"]["Enums"]["client_approval_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          phone: string | null;
          birth_date: string | null;
          experience_level: Database["public"]["Enums"]["experience_level"] | null;
          weekly_availability: number | null;
          preferred_contact: Database["public"]["Enums"]["contact_channel"] | null;
          notes_for_coach: string | null;
          privacy_consent_at: string | null;
          onboarding_completed_at: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          status?: Database["public"]["Enums"]["client_status"];
          goal?: string | null;
          started_on?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          email?: string | null;
          approval_status?: Database["public"]["Enums"]["client_approval_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          experience_level?: Database["public"]["Enums"]["experience_level"] | null;
          weekly_availability?: number | null;
          preferred_contact?: Database["public"]["Enums"]["contact_channel"] | null;
          notes_for_coach?: string | null;
          privacy_consent_at?: string | null;
          onboarding_completed_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          status?: Database["public"]["Enums"]["client_status"];
          goal?: string | null;
          started_on?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          email?: string | null;
          approval_status?: Database["public"]["Enums"]["client_approval_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          experience_level?: Database["public"]["Enums"]["experience_level"] | null;
          weekly_availability?: number | null;
          preferred_contact?: Database["public"]["Enums"]["contact_channel"] | null;
          notes_for_coach?: string | null;
          privacy_consent_at?: string | null;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
      client_health_profiles: {
        Row: {
          client_id: string;
          has_injuries: boolean;
          description: string | null;
          followup: Json;
          questions_source: string | null;
          consent_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          has_injuries: boolean;
          description?: string | null;
          followup?: Json;
          questions_source?: string | null;
          consent_at: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          has_injuries?: boolean;
          description?: string | null;
          followup?: Json;
          questions_source?: string | null;
          consent_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_health_profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_clients: {
        Row: {
          coach_id: string;
          client_id: string;
          assigned_at: string;
        };
        Insert: {
          coach_id: string;
          client_id: string;
          assigned_at?: string;
        };
        Update: {
          coach_id?: string;
          client_id?: string;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_clients_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coach_clients_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      checkins: {
        Row: {
          id: string;
          client_id: string;
          submitted_at: string;
          answers: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          coach_reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          submitted_at: string;
          answers: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          coach_reply?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          submitted_at?: string;
          answers?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          coach_reply?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_notes: {
        Row: {
          id: string;
          client_id: string;
          coach_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          coach_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          coach_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coach_notes_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      followups: {
        Row: {
          id: string;
          client_id: string;
          coach_id: string;
          title: string;
          description: string | null;
          due_on: string;
          status: Database["public"]["Enums"]["followup_status"];
          completed_at: string | null;
          source: Database["public"]["Enums"]["followup_source"];
          ai_analysis_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          coach_id: string;
          title: string;
          description?: string | null;
          due_on: string;
          status?: Database["public"]["Enums"]["followup_status"];
          completed_at?: string | null;
          source?: Database["public"]["Enums"]["followup_source"];
          ai_analysis_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          coach_id?: string;
          title?: string;
          description?: string | null;
          due_on?: string;
          status?: Database["public"]["Enums"]["followup_status"];
          completed_at?: string | null;
          source?: Database["public"]["Enums"]["followup_source"];
          ai_analysis_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "followups_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_ai_analysis_id_client_id_fkey";
            columns: ["ai_analysis_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "ai_analyses";
            referencedColumns: ["id", "client_id"];
          },
        ];
      };
      ai_analyses: {
        Row: {
          id: string;
          client_id: string;
          checkin_id: string;
          coach_id: string;
          summary: string;
          topics: string[];
          follow_up_needed: boolean;
          followup_suggestion: Json | null;
          followup_decision: Database["public"]["Enums"]["ai_followup_decision"] | null;
          followup_decided_at: string | null;
          suggested_questions: string[];
          confidence: Database["public"]["Enums"]["ai_confidence"];
          sensitive_content_note: string | null;
          provider: string;
          model: string;
          prompt_version: string;
          is_mock: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          checkin_id: string;
          coach_id: string;
          summary: string;
          topics?: string[];
          follow_up_needed: boolean;
          followup_suggestion?: Json | null;
          followup_decision?: Database["public"]["Enums"]["ai_followup_decision"] | null;
          followup_decided_at?: string | null;
          suggested_questions?: string[];
          confidence: Database["public"]["Enums"]["ai_confidence"];
          sensitive_content_note?: string | null;
          provider: string;
          model: string;
          prompt_version: string;
          is_mock?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          checkin_id?: string;
          coach_id?: string;
          summary?: string;
          topics?: string[];
          follow_up_needed?: boolean;
          followup_suggestion?: Json | null;
          followup_decision?: Database["public"]["Enums"]["ai_followup_decision"] | null;
          followup_decided_at?: string | null;
          suggested_questions?: string[];
          confidence?: Database["public"]["Enums"]["ai_confidence"];
          sensitive_content_note?: string | null;
          provider?: string;
          model?: string;
          prompt_version?: string;
          is_mock?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analyses_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_analyses_checkin_id_client_id_fkey";
            columns: ["checkin_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id", "client_id"];
          },
          {
            foreignKeyName: "ai_analyses_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_interactions: {
        Row: {
          id: string;
          coach_id: string | null;
          client_id: string | null;
          request_type: Database["public"]["Enums"]["ai_request_type"];
          status: Database["public"]["Enums"]["ai_interaction_status"];
          provider: string | null;
          model: string | null;
          is_mock: boolean;
          input_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number | null;
          error_code: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          coach_id?: string | null;
          client_id?: string | null;
          request_type: Database["public"]["Enums"]["ai_request_type"];
          status?: Database["public"]["Enums"]["ai_interaction_status"];
          provider?: string | null;
          model?: string | null;
          is_mock?: boolean;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          error_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          coach_id?: string | null;
          client_id?: string | null;
          request_type?: Database["public"]["Enums"]["ai_request_type"];
          status?: Database["public"]["Enums"]["ai_interaction_status"];
          provider?: string | null;
          model?: string | null;
          is_mock?: boolean;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          error_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_interactions_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_interactions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      client_overview: {
        Row: {
          id: string | null;
          full_name: string | null;
          status: Database["public"]["Enums"]["client_status"] | null;
          goal: string | null;
          started_on: string | null;
          last_checkin_at: string | null;
          pending_review_count: number | null;
          oldest_pending_review_at: string | null;
          next_followup_on: string | null;
          pending_followup_count: number | null;
          pending_ai_suggestion_count: number | null;
          approval_status: Database["public"]["Enums"]["client_approval_status"] | null;
          email: string | null;
          has_account: boolean | null;
          onboarding_completed_at: string | null;
          coach_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_list_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          last_sign_in_at: string | null;
          email_confirmed: boolean;
          client_id: string | null;
          approval_status: Database["public"]["Enums"]["client_approval_status"] | null;
          onboarding_completed_at: string | null;
          assigned_client_count: number;
        }[];
      };
      set_user_role: {
        Args: { p_user_id: string; p_role: Database["public"]["Enums"]["app_role"] };
        Returns: undefined;
      };
      set_client_coaches: {
        Args: { p_client_id: string; p_coach_ids: string[] };
        Returns: undefined;
      };
      create_client_by_staff: {
        Args: { p_full_name: string; p_email: string; p_goal: string; p_started_on: string };
        Returns: string;
      };
      complete_client_onboarding: {
        Args: { p_profile: Json; p_health: Json };
        Returns: Database["public"]["Enums"]["client_approval_status"];
      };
      submit_client_checkin: {
        Args: { p_answers: Json };
        Returns: string;
      };
      review_client_registration: {
        Args: {
          p_client_id: string;
          p_decision: Database["public"]["Enums"]["client_approval_status"];
          p_coach_id: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "client" | "coach" | "admin" | "super_admin";
      client_approval_status: "pending" | "approved" | "rejected";
      experience_level: "beginner" | "intermediate" | "advanced";
      contact_channel: "whatsapp" | "email" | "phone";
      client_status: "onboarding" | "active" | "paused" | "completed";
      followup_status: "pending" | "completed" | "cancelled";
      followup_source: "manual" | "ai_suggestion";
      ai_confidence: "low" | "medium" | "high";
      ai_followup_decision: "pending" | "accepted" | "dismissed";
      ai_request_type: "checkin_analysis" | "copilot_question" | "reply_draft" | "onboarding_questions";
      ai_interaction_status: "started" | "succeeded" | "failed" | "rate_limited";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type TableRow<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Row"];
export type ViewRow<ViewName extends keyof PublicSchema["Views"]> = PublicSchema["Views"][ViewName]["Row"];
export type DbEnum<EnumName extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][EnumName];
