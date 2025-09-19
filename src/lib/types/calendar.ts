export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color?: string;
  related_task_id?: string;
  created_at: string;
  updated_at: string;
}
