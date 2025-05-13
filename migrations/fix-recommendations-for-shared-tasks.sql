-- Fix recommendations table permissions for shared tasks

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

-- Ensure the recommendations table has all the required columns
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS priority_level TEXT,
ADD COLUMN IF NOT EXISTS estimated_time TEXT,
ADD COLUMN IF NOT EXISTS steps TEXT[];

-- Verify the policy has been applied
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM 
  pg_policies 
WHERE 
  tablename = 'recommendations';

-- Verify task_shares permissions
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM 
  pg_policies 
WHERE 
  tablename = 'task_shares';

-- Check if there are any shared tasks with recommendations
SELECT 
  r.id as recommendation_id,
  r.task_id,
  r.user_id as recommendation_owner_id,
  ts.shared_with_id,
  ts.permission_level,
  ts.status as share_status
FROM 
  recommendations r
JOIN 
  task_shares ts ON r.task_id = ts.task_id
WHERE 
  ts.status = 'accepted';
