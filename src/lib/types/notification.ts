export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'task_due' | 'task_reminder' | 'task_completed' | 'system' | 'other';
  related_task_id?: string;
  is_read: boolean;
  created_at: string;
}
