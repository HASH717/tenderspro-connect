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
          wilaya?: string
          withdrawal_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_metrics: {
        Row: {
          total_users: number
          active_users: number
          total_revenue: number
          churn_rate: number
        }
      }
      wilaya_distribution: {
        Row: {
          wilaya: string
          user_count: number
        }
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
      [_ in never]: never
    }
  }
}
