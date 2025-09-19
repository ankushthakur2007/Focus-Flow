export interface ChatMessage {
  id?: string;
  user_id?: string;
  task_id: string;
  message: string;
  is_user: boolean;
  created_at?: string;
}
