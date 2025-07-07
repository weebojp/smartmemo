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
      memos: {
        Row: {
          id: string
          user_id: string
          content: string
          content_markdown: string
          embedding: number[] | null
          created_at: string
          updated_at: string
          source: 'manual' | 'web' | 'api'
          source_url: string | null
          source_title: string | null
          tags: string[]
          category: string | null
          summary: string | null
          keywords: string[]
          processed_at: string | null
          view_count: number
          related_click_count: number
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          content_markdown: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
          source?: 'manual' | 'web' | 'api'
          source_url?: string | null
          source_title?: string | null
          tags?: string[]
          category?: string | null
          summary?: string | null
          keywords?: string[]
          processed_at?: string | null
          view_count?: number
          related_click_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          content_markdown?: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
          source?: 'manual' | 'web' | 'api'
          source_url?: string | null
          source_title?: string | null
          tags?: string[]
          category?: string | null
          summary?: string | null
          keywords?: string[]
          processed_at?: string | null
          view_count?: number
          related_click_count?: number
        }
      }
      memo_relations: {
        Row: {
          id: string
          memo_id: string
          related_memo_id: string
          type: 'semantic' | 'reference' | 'temporal'
          strength: number
          created_at: string
        }
        Insert: {
          id?: string
          memo_id: string
          related_memo_id: string
          type?: 'semantic' | 'reference' | 'temporal'
          strength: number
          created_at?: string
        }
        Update: {
          id?: string
          memo_id?: string
          related_memo_id?: string
          type?: 'semantic' | 'reference' | 'temporal'
          strength?: number
          created_at?: string
        }
      }
    }
  }
}