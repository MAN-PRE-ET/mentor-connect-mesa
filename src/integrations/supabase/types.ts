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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          booking_id: string
          done: boolean
          id: string
          task: string
          timeframe: string | null
        }
        Insert: {
          booking_id: string
          done?: boolean
          id?: string
          task: string
          timeframe?: string | null
        }
        Update: {
          booking_id?: string
          done?: boolean
          id?: string
          task?: string
          timeframe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "call_notes"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      bookings: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          mentor_id: string
          note: string
          problem_summary: string
          slot_id: string
          status: string
          student_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          mentor_id: string
          note?: string
          problem_summary: string
          slot_id: string
          status?: string
          student_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          mentor_id?: string
          note?: string
          problem_summary?: string
          slot_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      call_notes: {
        Row: {
          booking_id: string
          created_at: string
          notes: string
          owner_hash: string
          summary: Json | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          notes?: string
          owner_hash: string
          summary?: Json | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          notes?: string
          owner_hash?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          student_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          student_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          student_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          activities_participated: number | null
          ai_experience: boolean | null
          ai_native: boolean | null
          ai_sub_domain: string | null
          ai_tools: string[]
          analytics_tools: string[]
          built_ai_product: boolean | null
          city: string | null
          company: string | null
          data_completeness: string
          domains: string[]
          id: string
          master_sector: string | null
          name: string
          quality_of_mentorship: string | null
          roles: string[]
          sectors: string[]
          seniority: string | null
        }
        Insert: {
          activities_participated?: number | null
          ai_experience?: boolean | null
          ai_native?: boolean | null
          ai_sub_domain?: string | null
          ai_tools?: string[]
          analytics_tools?: string[]
          built_ai_product?: boolean | null
          city?: string | null
          company?: string | null
          data_completeness?: string
          domains?: string[]
          id: string
          master_sector?: string | null
          name: string
          quality_of_mentorship?: string | null
          roles?: string[]
          sectors?: string[]
          seniority?: string | null
        }
        Update: {
          activities_participated?: number | null
          ai_experience?: boolean | null
          ai_native?: boolean | null
          ai_sub_domain?: string | null
          ai_tools?: string[]
          analytics_tools?: string[]
          built_ai_product?: boolean | null
          city?: string | null
          company?: string | null
          data_completeness?: string
          domains?: string[]
          id?: string
          master_sector?: string | null
          name?: string
          quality_of_mentorship?: string | null
          roles?: string[]
          sectors?: string[]
          seniority?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          recommendations: Json
          recommended_mentor_ids: string[] | null
          response_type: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          recommendations?: Json
          recommended_mentor_ids?: string[] | null
          response_type?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          recommendations?: Json
          recommended_mentor_ids?: string[] | null
          response_type?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          booked: boolean
          id: string
          mentor_id: string
          start_time: string
        }
        Insert: {
          booked?: boolean
          id?: string
          mentor_id: string
          start_time: string
        }
        Update: {
          booked?: boolean
          id?: string
          mentor_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          first_name: string
          id: string
          private_key_hash: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          private_key_hash?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          private_key_hash?: string | null
        }
        Relationships: []
      }
      unmatched_queries: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          query: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          query: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          query?: string
        }
        Relationships: [
          {
            foreignKeyName: "unmatched_queries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_demo_call: {
        Args: {
          p_conversation_id: string
          p_note: string
          p_slot_id: string
          p_student_id: string
        }
        Returns: string
      }
      booking_goal: {
        Args: { p_conversation_id: string; p_mentor_id: string }
        Returns: string
      }
      complete_demo_call: {
        Args: { p_booking_id: string; p_student_id: string }
        Returns: boolean
      }
      create_private_student: { Args: { p_first_name: string }; Returns: Json }
      ensure_demo_availability: { Args: never; Returns: number }
      list_demo_calls: { Args: { p_student_id: string }; Returns: Json }
      owns_booking: { Args: { p_booking_id: string }; Returns: boolean }
      owns_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      owns_student: { Args: { p_student_id: string }; Returns: boolean }
      request_student_key_hash: { Args: never; Returns: string }
      save_call_writeup: {
        Args: {
          p_booking_id: string
          p_notes: string
          p_owner_key: string
          p_student_id: string
          p_summary: Json
        }
        Returns: boolean
      }
      set_writeup_action: {
        Args: {
          p_action_id: string
          p_done: boolean
          p_owner_key: string
          p_student_id: string
        }
        Returns: boolean
      }
      writeup_context: {
        Args: {
          p_booking_id: string
          p_owner_key: string
          p_student_id: string
        }
        Returns: Json
      }
      writeup_progress: {
        Args: { p_owner_key: string; p_student_id: string }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
