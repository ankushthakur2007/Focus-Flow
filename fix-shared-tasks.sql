-- Check current task_shares permissions
SELECT 
  ts.id, 
  ts.task_id, 
  ts.owner_id, 
  ts.shared_with_id, 
  ts.permission_level, 
  ts.status,
  t.title as task_title,
  p_owner.email as owner_email,
  p_shared.email as shared_with_email
FROM 
  task_shares ts
JOIN
  tasks t ON ts.task_id = t.id
JOIN
  profiles p_owner ON ts.owner_id = p_owner.id
JOIN
  profiles p_shared ON ts.shared_with_id = p_shared.id;

-- Fix permissions for all shared tasks to ensure they have admin access
UPDATE task_shares
SET permission_level = 'admin'
WHERE status = 'accepted';

-- Check if task_chats table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS task_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_user BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on task_chats
ALTER TABLE task_chats ENABLE ROW LEVEL SECURITY;

-- Update recommendations policy to allow viewing shared task recommendations
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

-- Add policies for task_chats
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

-- Verify the changes
SELECT 
  ts.id, 
  ts.task_id, 
  ts.owner_id, 
  ts.shared_with_id, 
  ts.permission_level, 
  ts.status,
  t.title as task_title,
  p_owner.email as owner_email,
  p_shared.email as shared_with_email
FROM 
  task_shares ts
JOIN
  tasks t ON ts.task_id = t.id
JOIN
  profiles p_owner ON ts.owner_id = p_owner.id
JOIN
  profiles p_shared ON ts.shared_with_id = p_shared.id;
