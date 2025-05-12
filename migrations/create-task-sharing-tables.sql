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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS task_shares_task_id_idx ON task_shares(task_id);
CREATE INDEX IF NOT EXISTS task_shares_owner_id_idx ON task_shares(owner_id);
CREATE INDEX IF NOT EXISTS task_shares_shared_with_id_idx ON task_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS task_shares_status_idx ON task_shares(status);
CREATE INDEX IF NOT EXISTS task_share_activities_task_id_idx ON task_share_activities(task_id);
CREATE INDEX IF NOT EXISTS task_share_activities_user_id_idx ON task_share_activities(user_id);
CREATE INDEX IF NOT EXISTS task_share_activities_created_at_idx ON task_share_activities(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE task_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_share_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_shares
-- Policy for viewing shared tasks: Users can see tasks shared with them or owned by them
CREATE POLICY "Users can view tasks shared with them"
ON task_shares FOR SELECT
USING (auth.uid() = shared_with_id OR auth.uid() = owner_id);

-- Policy for inserting shared tasks: Users can only share tasks they own
CREATE POLICY "Users can share their own tasks"
ON task_shares FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Policy for updating shared tasks: Users can update shares they own
CREATE POLICY "Users can update their own shares"
ON task_shares FOR UPDATE
USING (auth.uid() = owner_id);

-- Policy for deleting shared tasks: Users can delete shares they own
CREATE POLICY "Users can delete their own shares"
ON task_shares FOR DELETE
USING (auth.uid() = owner_id);

-- Create RLS policies for task_share_activities
-- Policy for viewing task activities: Users can see activities for tasks shared with them or owned by them
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

-- Policy for inserting task activities: Users can add activities for tasks they have access to
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

-- Modify the tasks table RLS policies to allow access to shared tasks
-- First, drop the existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;

-- Create new policies that include shared tasks
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

-- Create a function to log task activities
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

-- Create triggers for task_shares
CREATE TRIGGER task_share_insert_trigger
AFTER INSERT ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

CREATE TRIGGER task_share_update_trigger
AFTER UPDATE ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

CREATE TRIGGER task_share_delete_trigger
AFTER DELETE ON task_shares
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();
