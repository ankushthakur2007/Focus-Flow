export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'work' | 'study' | 'chores' | 'health' | 'social' | 'other';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at?: string;
}
