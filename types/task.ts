export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'work' | 'study' | 'chores' | 'health' | 'social' | 'other';
  status: 'pending' | 'in_progress' | 'completed';
  start_date?: string; // Optional start date for tasks
  due_date?: string; // Optional due date for tasks
  progress?: number; // Progress percentage based on completed steps
  created_at: string;
  updated_at?: string;
  is_shared?: boolean;
  shared_by?: string;
  notification_settings?: {
    custom_reminder: boolean;
    reminder_time: number;
    reminder_sent: boolean;
    notifications_enabled: boolean;
  };
  steps?: TaskStep[]; // Optional array of steps
}

export interface TaskShare {
  id: string;
  task_id: string;
  owner_id: string;
  shared_with_id: string;
  permission_level: 'view' | 'edit' | 'admin';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  tasks?: {
    id?: string;
    title?: string;
    description?: string;
  };
  profiles?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export interface TaskShareActivity {
  id: string;
  task_id: string;
  user_id: string;
  activity_type: 'create' | 'update' | 'delete' | 'share' | 'unshare' | 'status_change' | 'comment';
  activity_data?: any;
  created_at: string;
  profiles?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export interface SharedUser {
  id: string;
  email: string;
  name?: string;
  permission_level: 'view' | 'edit' | 'admin';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface TaskStep {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
  updated_at?: string;
}
