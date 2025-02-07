export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          announcement_type: string | null
          announcers: string | null
          category: string | null
          created_at: string
          id: string
          micro_enterprises: boolean | null
          name: string
          price_range: string | null
          search: string | null
          tender_type: string | null
          user_id: string
          wilaya: string | null
        }
        Insert: {
          announcement_type?: string | null
          announcers?: string | null
          category?: string | null
          created_at?: string
          id?: string
          micro_enterprises?: boolean | null
          name: string
          price_range?: string | null
          search?: string | null
          tender_type?: string | null
          user_id: string
          wilaya?: string | null
        }
        Update: {
          announcement_type?: string | null
          announcers?: string | null
          category?: string | null
          created_at?: string
          id?: string
          micro_enterprises?: boolean | null
          name?: string
          price_range?: string | null
          search?: string | null
          tender_type?: string | null
          user_id?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone_number: string
          preferred_categories: string[] | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone_number: string
          preferred_categories?: string[] | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string
          preferred_categories?: string[] | null
        }
        Relationships: []
      }
      subscription_categories: {
        Row: {
          categories: string[]
          created_at: string
          id: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          id?: string
          subscription_id: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          id?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_categories_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tender_notifications: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          processed_at: string | null
          tender_id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          tender_id: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_notifications_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          category: string | null
          deadline: string | null
          id: string
          image_url: string | null
          link: string | null
          organization_address: string | null
          organization_name: string | null
          original_image_url: string | null
          processed_at: string | null
          project_description: string | null
          publication_date: string | null
          qualification_details: string | null
          qualification_required: string | null
          region: string | null
          specifications_price: string | null
          tender_id: string | null
          tender_number: string | null
          tender_status: string | null
          title: string
          type: string | null
          watermarked_image_url: string | null
          wilaya: string
          withdrawal_address: string | null
        }
        Insert: {
          category?: string | null
          deadline?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          organization_address?: string | null
          organization_name?: string | null
          original_image_url?: string | null
          processed_at?: string | null
          project_description?: string | null
          publication_date?: string | null
          qualification_details?: string | null
          qualification_required?: string | null
          region?: string | null
          specifications_price?: string | null
          tender_id?: string | null
          tender_number?: string | null
          tender_status?: string | null
          title: string
          type?: string | null
          watermarked_image_url?: string | null
          wilaya: string
          withdrawal_address?: string | null
        }
        Update: {
          category?: string | null
          deadline?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          organization_address?: string | null
          organization_name?: string | null
          original_image_url?: string | null
          processed_at?: string | null
          project_description?: string | null
          publication_date?: string | null
          qualification_details?: string | null
          qualification_required?: string | null
          region?: string | null
          specifications_price?: string | null
          tender_id?: string | null
          tender_number?: string | null
          tender_status?: string | null
          title?: string
          type?: string | null
          watermarked_image_url?: string | null
          wilaya?: string
          withdrawal_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_metrics: {
        Row: {
          active_users: number | null
          churn_rate: number | null
          total_revenue: number | null
          total_users: number | null
        }
        Relationships: []
      }
      wilaya_distribution: {
        Row: {
          user_count: number | null
          wilaya: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_tender_matches_alert: {
        Args: {
          tender_record: unknown
          alert_record: unknown
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      tender_type: {
        id: string | null
        title: string | null
        wilaya: string | null
        category: string | null
        publication_date: string | null
        deadline: string | null
        link: string | null
        tender_id: string | null
        type: string | null
        region: string | null
        specifications_price: string | null
        withdrawal_address: string | null
        image_url: string | null
        png_image_url: string | null
        tender_number: string | null
        qualification_required: string | null
        qualification_details: string | null
        project_description: string | null
        organization_name: string | null
        organization_address: string | null
        tender_status: string | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
