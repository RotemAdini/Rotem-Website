/**
 * Types for the Supabase schema.
 *
 * Generated from the live project — regenerate after any migration with:
 *
 *   npx supabase gen types typescript --linked > lib/supabase/database.types.ts
 *
 * and re-add the hand-written aliases at the bottom of the file. Keeping these
 * typed means a query that names a column wrongly — or writes a slug into
 * content_id — fails at build rather than at runtime.
 */

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
      checkout_sessions: {
        Row: {
          amount_minor: number
          completed_at: string | null
          created_at: string
          currency: string
          expires_at: string
          granted_game_content_ids: string[]
          id: string
          product_content_id: string
          product_title: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          granted_game_content_ids: string[]
          id?: string
          product_content_id: string
          product_title?: string | null
          provider?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          granted_game_content_ids?: string[]
          id?: string
          product_content_id?: string
          product_title?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          game_content_id: string
          granted_at: string
          id: string
          purchase_id: string | null
          revoked_at: string | null
          revoked_reason: string | null
          source: string
          user_id: string
        }
        Insert: {
          game_content_id: string
          granted_at?: string
          id?: string
          purchase_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          source?: string
          user_id: string
        }
        Update: {
          game_content_id?: string
          granted_at?: string
          id?: string
          purchase_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          attempts: number
          error: string | null
          event_id: string
          id: string
          locked_at: string | null
          payload: Json | null
          payload_purged_at: string | null
          processed_at: string | null
          provider: string
          received_at: string
          status: string
        }
        Insert: {
          attempts?: number
          error?: string | null
          event_id: string
          id?: string
          locked_at?: string | null
          payload?: Json | null
          payload_purged_at?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Update: {
          attempts?: number
          error?: string | null
          event_id?: string
          id?: string
          locked_at?: string | null
          payload?: Json | null
          payload_purged_at?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_minor: number
          checkout_session_id: string | null
          created_at: string
          currency: string
          event_id: string | null
          granted_game_content_ids: string[]
          id: string
          product_content_id: string
          provider: string
          provider_payment_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_minor: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          granted_game_content_ids: string[]
          id?: string
          product_content_id: string
          provider?: string
          provider_payment_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_minor?: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          granted_game_content_ids?: string[]
          id?: string
          product_content_id?: string
          provider?: string
          provider_payment_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_payment_event: {
        Args: {
          p_event_id: string
          p_payload: Json
          p_provider: string
          p_stale_after?: string
        }
        Returns: {
          attempt: number
          claimed: boolean
          current_status: string
          event_uuid: string
        }[]
      }
      complete_payment_event: {
        Args: { p_event_uuid: string }
        Returns: undefined
      }
      fail_payment_event: {
        Args: { p_error: string; p_event_uuid: string }
        Returns: undefined
      }
      grant_purchase_from_checkout: {
        Args: {
          p_checkout_session_id: string
          p_event_uuid: string
          p_provider: string
          p_provider_payment_id: string
          p_reported_amount_minor: number
          p_reported_currency: string
        }
        Returns: string
      }
      purge_payment_event_payloads: {
        Args: { p_older_than?: string }
        Returns: number
      }
      revoke_purchase: {
        Args: {
          p_provider: string
          p_provider_payment_id: string
          p_reason?: string
          p_status?: string
        }
        Returns: number
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

/* ------------------------------------------------------------------------ */
/* Hand-written narrowings. Postgres check constraints do not survive type    */
/* generation, so these columns come back as bare strings; this restores the  */
/* values the constraints actually allow.                                     */
/* ------------------------------------------------------------------------ */

/** The content kinds that can currently be favourited. Games are deliberately
 * absent: they are not favouritable on the site today, and the table's
 * favorites_content_type_check enforces the same list in the database. */
export type FavoriteContentType = "recipe" | "dateIdea";

/** How a purchase currently stands. Only 'paid' grants access. */
export type PurchaseStatus = "paid" | "refunded" | "chargeback";

/** Where an entitlement came from. 'bundle' and 'purchase' both follow a
 * payment; 'manual' is a deliberate support grant. */
export type EntitlementSource = "purchase" | "bundle" | "manual";

/** Processing state of a webhook delivery. Only 'processed' refuses a retry. */
export type PaymentEventStatus = "pending" | "processing" | "processed" | "failed";

export type FavoriteRow = Database["public"]["Tables"]["favorites"]["Row"];
export type PurchaseRow = Database["public"]["Tables"]["purchases"]["Row"];
export type EntitlementRow = Database["public"]["Tables"]["entitlements"]["Row"];
export type CheckoutSessionRow = Database["public"]["Tables"]["checkout_sessions"]["Row"];
