-- Combined Schema for FocusFlow Application
-- Includes base tables, analytics tables, and task sharing tables

-- =============================================
-- BASE TABLES
-- =============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  dark_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('work', 'study', 'chores', 'health', 'social', 'other')) DEFAULT 'other',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0,
  steps_finalized BOOLEAN DEFAULT false,
  notification_settings JSONB DEFAULT '{
    "custom_reminder": false,
    "reminder_time": 24,
    "reminder_sent": false,
    "notifications_enabled": true
  }'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moods table
CREATE TABLE IF NOT EXISTS moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  recommended_task TEXT NOT NULL,
  reasoning TEXT,
  suggestion TEXT,
  mood_tip TEXT,
  mood TEXT,
  priority_level TEXT,
  estimated_time TEXT,
  steps JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_chats table for task-specific chat
CREATE TABLE IF NOT EXISTS task_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_user BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_steps table to store individual steps for each task
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_resources table to store resources for each task
CREATE TABLE IF NOT EXISTS task_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('video', 'article', 'blog', 'other')) NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ANALYTICS TABLES
-- =============================================

-- Create analytics_daily table to store daily task statistics
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  most_productive_hour INTEGER,
  most_common_category TEXT,
  most_common_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create analytics_mood table to store mood-productivity correlations
CREATE TABLE IF NOT EXISTS analytics_mood (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood_name TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mood_name, date)
);

-- Create analytics_category table to store category statistics
CREATE TABLE IF NOT EXISTS analytics_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, date)
);

-- Create analytics_weekly table to store weekly aggregated statistics
CREATE TABLE IF NOT EXISTS analytics_weekly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  most_productive_day TEXT,
  most_common_category TEXT,
  most_common_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- =============================================
-- TASK SHARING TABLES
-- =============================================

-- Create task_shares table to track shared tasks
CREATE TABLE IF NOT EXISTS task_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, shared_with_id)
);

-- Create task_share_activities table to track activities on shared tasks
CREATE TABLE IF NOT EXISTS task_share_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('create', 'update', 'delete', 'share', 'unshare', 'status_change', 'comment')),
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create explicit views for task sharing with profile information
CREATE OR REPLACE VIEW task_shares_with_profiles AS
SELECT
  ts.id,
  ts.task_id,
  ts.owner_id,
  ts.shared_with_id,
  ts.permission_level,
  ts.status,
  ts.created_at,
  ts.updated_at,
  owner.email AS owner_email,
  owner.name AS owner_name,
  shared.email AS shared_with_email,
  shared.name AS shared_with_name,
  t.title AS task_title,
  t.description AS task_description,
  t.status AS task_status,
  t.priority AS task_priority,
  t.category AS task_category
FROM
  task_shares ts
LEFT JOIN
  profiles owner ON ts.owner_id = owner.id
LEFT JOIN
  profiles shared ON ts.shared_with_id = shared.id
LEFT JOIN
  tasks t ON ts.task_id = t.id;

-- Create index on profiles.email to speed up email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON profiles(LOWER(email));

-- Create view for task share activities with profile information
CREATE OR REPLACE VIEW task_share_activities_with_profiles AS
SELECT
  tsa.id,
  tsa.task_id,
  tsa.user_id,
  tsa.activity_type,
  tsa.activity_data,
  tsa.created_at,
  p.email AS user_email,
  p.name AS user_name
FROM
  task_share_activities tsa
LEFT JOIN
  profiles p ON tsa.user_id = p.id;

-- =============================================
-- INDEXES
-- =============================================

-- Base table indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at);
CREATE INDEX IF NOT EXISTS tasks_start_date_idx ON tasks (start_date);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_progress_idx ON tasks (progress);
CREATE INDEX IF NOT EXISTS tasks_steps_finalized_idx ON tasks (steps_finalized);
CREATE INDEX IF NOT EXISTS moods_user_id_idx ON moods (user_id);
CREATE INDEX IF NOT EXISTS moods_timestamp_idx ON moods (timestamp);
CREATE INDEX IF NOT EXISTS recommendations_user_id_idx ON recommendations (user_id);
CREATE INDEX IF NOT EXISTS recommendations_task_id_idx ON recommendations (task_id);
CREATE INDEX IF NOT EXISTS recommendations_created_at_idx ON recommendations (created_at);
CREATE INDEX IF NOT EXISTS task_steps_task_id_idx ON task_steps (task_id);
CREATE INDEX IF NOT EXISTS task_steps_user_id_idx ON task_steps (user_id);
CREATE INDEX IF NOT EXISTS task_steps_order_index_idx ON task_steps (order_index);
CREATE INDEX IF NOT EXISTS task_steps_is_completed_idx ON task_steps (is_completed);

-- Indexes for task_resources
CREATE INDEX IF NOT EXISTS task_resources_task_id_idx ON task_resources (task_id);
CREATE INDEX IF NOT EXISTS task_resources_user_id_idx ON task_resources (user_id);
CREATE INDEX IF NOT EXISTS task_resources_type_idx ON task_resources (type);

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS analytics_daily_user_id_idx ON analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS analytics_daily_date_idx ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS analytics_mood_user_id_idx ON analytics_mood(user_id);
CREATE INDEX IF NOT EXISTS analytics_mood_date_idx ON analytics_mood(date);
CREATE INDEX IF NOT EXISTS analytics_category_user_id_idx ON analytics_category(user_id);
CREATE INDEX IF NOT EXISTS analytics_category_date_idx ON analytics_category(date);
CREATE INDEX IF NOT EXISTS analytics_weekly_user_id_idx ON analytics_weekly(user_id);
CREATE INDEX IF NOT EXISTS analytics_weekly_week_start_idx ON analytics_weekly(week_start);

-- Task sharing indexes
CREATE INDEX IF NOT EXISTS task_shares_task_id_idx ON task_shares(task_id);
CREATE INDEX IF NOT EXISTS task_shares_owner_id_idx ON task_shares(owner_id);
CREATE INDEX IF NOT EXISTS task_shares_shared_with_id_idx ON task_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS task_shares_status_idx ON task_shares(status);
CREATE INDEX IF NOT EXISTS task_share_activities_task_id_idx ON task_share_activities(task_id);
CREATE INDEX IF NOT EXISTS task_share_activities_user_id_idx ON task_share_activities(user_id);
CREATE INDEX IF NOT EXISTS task_share_activities_created_at_idx ON task_share_activities(created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_mood ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_share_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_resources ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to handle new user creation
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update analytics when tasks change
DROP FUNCTION IF EXISTS update_analytics_on_task_change() CASCADE;
CREATE OR REPLACE FUNCTION update_analytics_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be triggered on task insert, update, or delete
  -- We'll implement a simple flag to indicate that analytics need to be recalculated

  -- For inserts and updates, use the NEW record
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Insert or update a record in a helper table to indicate analytics need updating
    INSERT INTO analytics_daily (user_id, date, updated_at)
    VALUES (NEW.user_id, DATE(NEW.created_at), NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET updated_at = NOW();

    RETURN NEW;

  -- For deletes, use the OLD record
  ELSIF (TG_OP = 'DELETE') THEN
    -- Insert or update a record in a helper table to indicate analytics need updating
    INSERT INTO analytics_daily (user_id, date, updated_at)
    VALUES (OLD.user_id, DATE(OLD.created_at), NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET updated_at = NOW();

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate task progress based on steps
DROP FUNCTION IF EXISTS calculate_task_progress() CASCADE;
CREATE OR REPLACE FUNCTION calculate_task_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total steps for the task
  SELECT COUNT(*) INTO total_steps
  FROM task_steps
  WHERE task_id = NEW.task_id;

  -- Count completed steps for the task
  SELECT COUNT(*) INTO completed_steps
  FROM task_steps
  WHERE task_id = NEW.task_id AND is_completed = true;

  -- Calculate progress percentage
  IF total_steps > 0 THEN
    progress_percentage := (completed_steps * 100) / total_steps;
  ELSE
    progress_percentage := 0;
  END IF;

  -- Update the task's progress
  UPDATE tasks
  SET
    progress = progress_percentage,
    -- If all steps are completed and there are steps, mark the task as completed
    status = CASE
      WHEN progress_percentage = 100 AND total_steps > 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task changes to update analytics
DROP TRIGGER IF EXISTS trigger_update_analytics_on_task_change ON tasks;
CREATE TRIGGER trigger_update_analytics_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_analytics_on_task_change();

-- Function to log task sharing activities
DROP FUNCTION IF EXISTS log_task_activity() CASCADE;
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_share_activities (task_id, user_id, activity_type, activity_data)
    VALUES (NEW.task_id, NEW.owner_id, 'share', jsonb_build_object('shared_with', NEW.shared_with_id, 'permission_level', NEW.permission_level));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO task_share_activities (task_id, user_id, activity_type, activity_data)
      VALUES (NEW.task_id, NEW.shared_with_id, 'status_change', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_share_activities (task_id, user_id, activity_type, activity_data)
    VALUES (OLD.task_id, OLD.owner_id, 'unshare', jsonb_build_object('shared_with', OLD.shared_with_id));
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for task sharing
DROP TRIGGER IF EXISTS task_share_insert_trigger ON task_shares;
CREATE TRIGGER task_share_insert_trigger
AFTER INSERT ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

DROP TRIGGER IF EXISTS task_share_update_trigger ON task_shares;
CREATE TRIGGER task_share_update_trigger
AFTER UPDATE ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

DROP TRIGGER IF EXISTS task_share_delete_trigger ON task_shares;
CREATE TRIGGER task_share_delete_trigger
AFTER DELETE ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

-- Triggers for task steps to update task progress
DROP TRIGGER IF EXISTS update_task_progress_on_step_insert ON task_steps;
CREATE TRIGGER update_task_progress_on_step_insert
AFTER INSERT ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

DROP TRIGGER IF EXISTS update_task_progress_on_step_update ON task_steps;
CREATE TRIGGER update_task_progress_on_step_update
AFTER UPDATE OF is_completed ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

DROP TRIGGER IF EXISTS update_task_progress_on_step_delete ON task_steps;
CREATE TRIGGER update_task_progress_on_step_delete
AFTER DELETE ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

-- =============================================
-- POLICIES
-- =============================================

-- Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policies for tasks (with sharing support)
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own and shared tasks" ON tasks;
CREATE POLICY "Users can view their own and shared tasks"
  ON tasks FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own and shared tasks with edit permission" ON tasks;
CREATE POLICY "Users can update their own and shared tasks with edit permission"
  ON tasks FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
      AND task_shares.permission_level IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for moods
DROP POLICY IF EXISTS "Users can view their own moods" ON moods;
CREATE POLICY "Users can view their own moods"
  ON moods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own moods" ON moods;
CREATE POLICY "Users can insert their own moods"
  ON moods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own moods" ON moods;
CREATE POLICY "Users can update their own moods"
  ON moods FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own moods" ON moods;
CREATE POLICY "Users can delete their own moods"
  ON moods FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can view their own and shared task recommendations" ON recommendations;
CREATE POLICY "Users can view their own and shared task recommendations"
  ON recommendations FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = recommendations.task_id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON recommendations;
CREATE POLICY "Users can insert their own recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON recommendations;
CREATE POLICY "Users can update their own recommendations"
  ON recommendations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recommendations" ON recommendations;
CREATE POLICY "Users can delete their own recommendations"
  ON recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for analytics tables
DROP POLICY IF EXISTS "Users can view their own analytics_daily" ON analytics_daily;
CREATE POLICY "Users can view their own analytics_daily"
ON analytics_daily FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics_daily" ON analytics_daily;
CREATE POLICY "Users can insert their own analytics_daily"
ON analytics_daily FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics_daily" ON analytics_daily;
CREATE POLICY "Users can update their own analytics_daily"
ON analytics_daily FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own analytics_mood" ON analytics_mood;
CREATE POLICY "Users can view their own analytics_mood"
ON analytics_mood FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics_mood" ON analytics_mood;
CREATE POLICY "Users can insert their own analytics_mood"
ON analytics_mood FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics_mood" ON analytics_mood;
CREATE POLICY "Users can update their own analytics_mood"
ON analytics_mood FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own analytics_category" ON analytics_category;
CREATE POLICY "Users can view their own analytics_category"
ON analytics_category FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics_category" ON analytics_category;
CREATE POLICY "Users can insert their own analytics_category"
ON analytics_category FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics_category" ON analytics_category;
CREATE POLICY "Users can update their own analytics_category"
ON analytics_category FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own analytics_weekly" ON analytics_weekly;
CREATE POLICY "Users can view their own analytics_weekly"
ON analytics_weekly FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics_weekly" ON analytics_weekly;
CREATE POLICY "Users can insert their own analytics_weekly"
ON analytics_weekly FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics_weekly" ON analytics_weekly;
CREATE POLICY "Users can update their own analytics_weekly"
ON analytics_weekly FOR UPDATE
USING (auth.uid() = user_id);

-- Policies for task sharing
DROP POLICY IF EXISTS "Users can view tasks shared with them" ON task_shares;
CREATE POLICY "Users can view tasks shared with them"
ON task_shares FOR SELECT
USING (auth.uid() = shared_with_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can share their own tasks" ON task_shares;
CREATE POLICY "Users can share their own tasks"
ON task_shares FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own shares" ON task_shares;
DROP POLICY IF EXISTS "Users can update shares they own or received" ON task_shares;
CREATE POLICY "Users can update shares they own or received"
ON task_shares FOR UPDATE
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

DROP POLICY IF EXISTS "Users can delete their own shares" ON task_shares;
CREATE POLICY "Users can delete their own shares"
ON task_shares FOR DELETE
USING (auth.uid() = owner_id);

-- Policies for task share activities
DROP POLICY IF EXISTS "Users can view activities for tasks shared with them" ON task_share_activities;
CREATE POLICY "Users can view activities for tasks shared with them"
ON task_share_activities FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_share_activities.task_id
    AND (task_shares.shared_with_id = auth.uid() OR task_shares.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can add activities for tasks they have access to" ON task_share_activities;
CREATE POLICY "Users can add activities for tasks they have access to"
ON task_share_activities FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_share_activities.task_id
      AND tasks.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = task_share_activities.task_id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
    )
  )
);

-- Policies for task_chats
DROP POLICY IF EXISTS "Users can view their own task chats" ON task_chats;
DROP POLICY IF EXISTS "Users can view their own and shared task chats" ON task_chats;
CREATE POLICY "Users can view their own and shared task chats"
ON task_chats FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_chats.task_id
    AND task_shares.shared_with_id = auth.uid()
    AND task_shares.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_chats.task_id
    AND tasks.user_id = auth.uid()
  )
);

-- Policies for task_steps
DROP POLICY IF EXISTS "Users can view their own task steps" ON task_steps;
DROP POLICY IF EXISTS "Users can view their own and shared task steps" ON task_steps;
CREATE POLICY "Users can view their own and shared task steps"
ON task_steps FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_steps.task_id
    AND task_shares.shared_with_id = auth.uid()
    AND task_shares.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_steps.task_id
    AND tasks.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own task chats" ON task_chats;
DROP POLICY IF EXISTS "Users can insert chats for tasks they have access to" ON task_chats;
CREATE POLICY "Users can insert chats for tasks they have access to"
ON task_chats FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_chats.task_id
      AND tasks.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = task_chats.task_id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own task chats" ON task_chats;
CREATE POLICY "Users can delete their own task chats"
ON task_chats FOR DELETE
USING (auth.uid() = user_id);

-- Policies for task steps
DROP POLICY IF EXISTS "Users can insert their own task steps" ON task_steps;
DROP POLICY IF EXISTS "Users can insert steps for tasks they have access to" ON task_steps;
CREATE POLICY "Users can insert steps for tasks they have access to"
ON task_steps FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_steps.task_id
      AND tasks.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = task_steps.task_id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
      AND task_shares.permission_level IN ('edit', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own task steps" ON task_steps;
DROP POLICY IF EXISTS "Users can update steps for tasks they have access to" ON task_steps;
CREATE POLICY "Users can update steps for tasks they have access to"
ON task_steps FOR UPDATE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_steps.task_id
    AND task_shares.shared_with_id = auth.uid()
    AND task_shares.status = 'accepted'
    AND task_shares.permission_level IN ('edit', 'admin')
  )
);

DROP POLICY IF EXISTS "Users can delete their own task steps" ON task_steps;
CREATE POLICY "Users can delete their own task steps"
ON task_steps FOR DELETE
USING (auth.uid() = user_id);

-- Grant permissions for the views
GRANT SELECT ON task_shares_with_profiles TO authenticated;
GRANT SELECT ON task_share_activities_with_profiles TO authenticated;

-- Create a function to find a user by email (case insensitive)
DROP FUNCTION IF EXISTS find_user_by_email(text);
CREATE OR REPLACE FUNCTION find_user_by_email(search_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.name
  FROM profiles p
  WHERE LOWER(p.email) = LOWER(search_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use the function
GRANT EXECUTE ON FUNCTION find_user_by_email(text) TO authenticated;

-- Add a function to force refresh task progress
DROP FUNCTION IF EXISTS refresh_task_progress(UUID);
CREATE OR REPLACE FUNCTION refresh_task_progress(task_id_param UUID)
RETURNS VOID AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total steps for the task
  SELECT COUNT(*) INTO total_steps
  FROM task_steps
  WHERE task_id = task_id_param;

  -- Count completed steps for the task
  SELECT COUNT(*) INTO completed_steps
  FROM task_steps
  WHERE task_id = task_id_param AND is_completed = true;

  -- Calculate progress percentage
  IF total_steps > 0 THEN
    progress_percentage := (completed_steps * 100) / total_steps;
  ELSE
    progress_percentage := 0;
  END IF;

  -- Update the task's progress
  UPDATE tasks
  SET
    progress = progress_percentage,
    -- If all steps are completed and there are steps, mark the task as completed
    status = CASE
      WHEN progress_percentage = 100 AND total_steps > 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = task_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permission to use the function
GRANT EXECUTE ON FUNCTION refresh_task_progress(UUID) TO authenticated;

-- Policies for task_resources
DROP POLICY IF EXISTS "Users can view their own task resources" ON task_resources;
DROP POLICY IF EXISTS "Users can view resources for tasks they have access to" ON task_resources;
CREATE POLICY "Users can view resources for tasks they have access to"
ON task_resources FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_resources.task_id
    AND tasks.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_resources.task_id
    AND task_shares.shared_with_id = auth.uid()
    AND task_shares.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can insert their own task resources" ON task_resources;
DROP POLICY IF EXISTS "Users can insert resources for tasks they have access to" ON task_resources;
CREATE POLICY "Users can insert resources for tasks they have access to"
ON task_resources FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
      AND tasks.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_shares.task_id = task_resources.task_id
      AND task_shares.shared_with_id = auth.uid()
      AND task_shares.status = 'accepted'
      AND task_shares.permission_level IN ('edit', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own task resources" ON task_resources;
DROP POLICY IF EXISTS "Users can update resources for tasks they have access to" ON task_resources;
CREATE POLICY "Users can update resources for tasks they have access to"
ON task_resources FOR UPDATE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM task_shares
    WHERE task_shares.task_id = task_resources.task_id
    AND task_shares.shared_with_id = auth.uid()
    AND task_shares.status = 'accepted'
    AND task_shares.permission_level IN ('edit', 'admin')
  )
);

DROP POLICY IF EXISTS "Users can delete their own task resources" ON task_resources;
CREATE POLICY "Users can delete their own task resources"
ON task_resources FOR DELETE
USING (auth.uid() = user_id);
