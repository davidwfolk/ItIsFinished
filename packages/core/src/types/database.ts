/**
 * AUTO-GENERATED DATABASE TYPES FROM SUPABASE POSTGRESQL
 */

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          project_id: string | null;
          task_id: string | null;
          action: string;
          details: Record<string, unknown> | Array<unknown> | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          action: string;
          details?: Record<string, unknown> | Array<unknown> | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          action?: string;
          details?: Record<string, unknown> | Array<unknown> | null;
          created_at?: string | null;
        };
      };
      comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          log_date: string;
          count: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          log_date: string;
          count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          habit_id?: string;
          log_date?: string;
          count?: number | null;
          created_at?: string | null;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          icon: string | null;
          color: string | null;
          frequency_type: string | null;
          target_count: number | null;
          is_archived: boolean | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          icon?: string | null;
          color?: string | null;
          frequency_type?: string | null;
          target_count?: number | null;
          is_archived?: boolean | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          icon?: string | null;
          color?: string | null;
          frequency_type?: string | null;
          target_count?: number | null;
          is_archived?: boolean | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          color: string | null;
          icon: string | null;
          view_mode: string | null;
          is_archived: boolean | null;
          order_index: string;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          color?: string | null;
          icon?: string | null;
          view_mode?: string | null;
          is_archived?: boolean | null;
          order_index?: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          color?: string | null;
          icon?: string | null;
          view_mode?: string | null;
          is_archived?: boolean | null;
          order_index?: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      sections: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          order_index: string;
          is_collapsed: boolean | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          order_index?: string;
          is_collapsed?: boolean | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          order_index?: string;
          is_collapsed?: boolean | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
          created_at: string | null;
        };
        Insert: {
          task_id: string;
          tag_id: string;
          created_at?: string | null;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
          created_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          section_id: string | null;
          parent_id: string | null;
          created_by: string | null;
          assigned_to: string | null;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'done' | 'canceled' | null;
          priority: 1 | 2 | 3 | 4 | null;
          due_date: string | null;
          due_time: string | null;
          timezone: string | null;
          estimated_minutes: number | null;
          recurrence_rule: string | null;
          recurrence_parent_id: string | null;
          order_index: string;
          completed_at: string | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          section_id?: string | null;
          parent_id?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          title: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'canceled' | null;
          priority?: 1 | 2 | 3 | 4 | null;
          due_date?: string | null;
          due_time?: string | null;
          timezone?: string | null;
          estimated_minutes?: number | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          order_index?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          section_id?: string | null;
          parent_id?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'canceled' | null;
          priority?: 1 | 2 | 3 | 4 | null;
          due_date?: string | null;
          due_time?: string | null;
          timezone?: string | null;
          estimated_minutes?: number | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          order_index?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          duration_minutes: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          duration_minutes: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          duration_minutes?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
      };
      saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          query_rules: Record<string, unknown>;
          order_index: string;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          query_rules?: Record<string, unknown>;
          order_index?: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          query_rules?: Record<string, unknown>;
          order_index?: string;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}

export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type CommentRow = Database['public']['Tables']['comments']['Row'];
export type FocusSessionRow = Database['public']['Tables']['focus_sessions']['Row'];
export type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProjectMemberRow = Database['public']['Tables']['project_members']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type SavedFilterRow = Database['public']['Tables']['saved_filters']['Row'];
export type SectionRow = Database['public']['Tables']['sections']['Row'];
export type TagRow = Database['public']['Tables']['tags']['Row'];
export type TaskTagRow = Database['public']['Tables']['task_tags']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
