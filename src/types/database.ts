export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      container_presets: {
        Row: {
          id: string
          name: string
          type: string
          length: number
          width: number
          height: number
          max_weight: number
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          length: number
          width: number
          height: number
          max_weight?: number
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          length?: number
          width?: number
          height?: number
          max_weight?: number
          is_default?: boolean
          created_at?: string
        }
      }
      user_containers: {
        Row: {
          id: string
          user_id: string | null
          name: string
          length: number
          width: number
          height: number
          max_weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          length: number
          width: number
          height: number
          max_weight?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          length?: number
          width?: number
          height?: number
          max_weight?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
