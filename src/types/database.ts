export interface Database {
  public: {
    Tables: {
      chains: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          trigger: string;
          duration: number;
          description: string;
          current_streak: number;
          auxiliary_streak: number;
          total_completions: number;
          total_failures: number;
          auxiliary_failures: number;
          exceptions: string[];
          auxiliary_exceptions: string[];
          auxiliary_signal: string;
          auxiliary_duration: number;
          auxiliary_completion_trigger: string;
          created_at: string;
          updated_at: string;
          last_completed_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          trigger: string;
          duration: number;
          description: string;
          current_streak?: number;
          auxiliary_streak?: number;
          total_completions?: number;
          total_failures?: number;
          auxiliary_failures?: number;
          exceptions?: string[];
          auxiliary_exceptions?: string[];
          auxiliary_signal: string;
          auxiliary_duration: number;
          auxiliary_completion_trigger: string;
          created_at?: string;
          updated_at?: string;
          last_completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          trigger?: string;
          duration?: number;
          description?: string;
          current_streak?: number;
          auxiliary_streak?: number;
          total_completions?: number;
          total_failures?: number;
          auxiliary_failures?: number;
          exceptions?: string[];
          auxiliary_exceptions?: string[];
          auxiliary_signal?: string;
          auxiliary_duration?: number;
          auxiliary_completion_trigger?: string;
          created_at?: string;
          updated_at?: string;
          last_completed_at?: string;
        };
      };
      completion_history: {
        Row: {
          id: string;
          user_id: string;
          chain_id: string;
          completed_at: string;
          duration: number;
          was_successful: boolean;
          reason_for_failure?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chain_id: string;
          completed_at: string;
          duration: number;
          was_successful: boolean;
          reason_for_failure?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chain_id?: string;
          completed_at?: string;
          duration?: number;
          was_successful?: boolean;
          reason_for_failure?: string;
          created_at?: string;
        };
      };
      scheduled_sessions: {
        Row: {
          id: string;
          user_id: string;
          chain_id: string;
          scheduled_at: string;
          expires_at: string;
          auxiliary_signal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chain_id: string;
          scheduled_at: string;
          expires_at: string;
          auxiliary_signal: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chain_id?: string;
          scheduled_at?: string;
          expires_at?: string;
          auxiliary_signal?: string;
          created_at?: string;
        };
      };
      active_sessions: {
        Row: {
          id: string;
          user_id: string;
          chain_id: string;
          started_at: string;
          duration: number;
          is_paused: boolean;
          paused_at?: string;
          total_paused_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chain_id: string;
          started_at: string;
          duration: number;
          is_paused?: boolean;
          paused_at?: string;
          total_paused_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chain_id?: string;
          started_at?: string;
          duration?: number;
          is_paused?: boolean;
          paused_at?: string;
          total_paused_time?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}