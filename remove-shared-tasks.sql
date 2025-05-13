-- SQL Script to remove shared tasks functionality from Supabase
-- Run this in the Supabase SQL Editor

-- First, disable RLS (Row Level Security) temporarily to allow operations
BEGIN;

-- 1. Drop any views that depend on task_shares
DROP VIEW IF EXISTS task_shares_with_profiles;

-- 2. Drop any functions related to task sharing
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

-- 3. Remove any foreign key constraints that might prevent deletion
ALTER TABLE IF EXISTS task_shares 
  DROP CONSTRAINT IF EXISTS task_shares_task_id_fkey,
  DROP CONSTRAINT IF EXISTS task_shares_owner_id_fkey,
  DROP CONSTRAINT IF EXISTS task_shares_shared_with_id_fkey;

-- 4. Drop the task_shares table
DROP TABLE IF EXISTS task_shares;

-- 5. Remove shared task properties from the tasks table
-- First, check if these columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_shared') THEN
    ALTER TABLE tasks DROP COLUMN is_shared;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'shared_by') THEN
    ALTER TABLE tasks DROP COLUMN shared_by;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'shared_with') THEN
    ALTER TABLE tasks DROP COLUMN shared_with;
  END IF;
END $$;

-- 6. Remove any RLS policies related to shared tasks
DROP POLICY IF EXISTS "Users can view their own and shared task recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can view shared tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update shared tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete shared tasks" ON tasks;

-- 7. Create new RLS policies for tasks that don't include sharing
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Create new RLS policies for recommendations that don't include sharing
CREATE POLICY "Users can view their own recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
  ON recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Clean up any orphaned recommendations (recommendations for tasks that no longer exist)
DELETE FROM recommendations
WHERE task_id NOT IN (SELECT id FROM tasks);

-- 10. Verify the changes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'task_shares';

-- If the above query returns no rows, the task_shares table has been successfully dropped

COMMIT;

-- Final message
DO $$
BEGIN
  RAISE NOTICE 'Shared tasks functionality has been successfully removed from the database.';
END $$;
