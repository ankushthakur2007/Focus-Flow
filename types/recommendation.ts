export interface Recommendation {
  id?: string;
  user_id?: string;
  task_id?: string;
  recommended_task: string;
  reasoning: string;
  suggestion: string;
  mood_tip: string;
  mood: string;
  priority_level?: string;
  estimated_time?: string;
  steps?: string[] | {title: string, description: string}[];
  created_at?: string;
}
