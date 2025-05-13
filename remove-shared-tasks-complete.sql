-- SQL Script to remove shared tasks functionality from Supabase
-- Run this in the Supabase SQL Editor

-- First, disable RLS (Row Level Security) temporarily to allow operations
BEGIN;

-- 1. Drop all policies that depend on task_shares table
-- Tasks table policies
DROP POLICY IF EXISTS "Users can view their own and shared tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own and shared tasks with edit permissio" ON tasks;

-- Task share activities policies
DROP POLICY IF EXISTS "Users can view activities for tasks shared with them" ON task_share_activities;
DROP POLICY IF EXISTS "Users can add activities for tasks they have access to" ON task_share_activities;

-- Task chats policies
DROP POLICY IF EXISTS "Users can view their own and shared task chats" ON task_chats;
DROP POLICY IF EXISTS "Users can insert chats for tasks they have access to" ON task_chats;

-- Recommendations policies
DROP POLICY IF EXISTS "Users can view their own and shared task recommendations" ON recommendations;

-- 2. Drop any views that depend on task_shares or task_share_activities
DROP VIEW IF EXISTS task_shares_with_profiles;
DROP VIEW IF EXISTS task_share_activities_with_profiles;

-- 3. Drop any functions related to task sharing
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

-- 4. Now we can safely drop the task_share_activities table
DROP TABLE IF EXISTS task_share_activities CASCADE;

-- 5. Now we can safely drop the task_shares table
DROP TABLE IF EXISTS task_shares CASCADE;

-- 6. Remove shared task properties from the tasks table
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

-- 7. Create new RLS policies for tasks that don't include sharing (only if they don't exist)
DO $$
BEGIN
  -- Check if "Users can view their own tasks" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users can view their own tasks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can insert their own tasks" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users can insert their own tasks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can update their own tasks" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users can update their own tasks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can delete their own tasks" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users can delete their own tasks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 8. Create new RLS policies for recommendations that don't include sharing (only if they don't exist)
DO $$
BEGIN
  -- Check if "Users can view their own recommendations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendations' 
    AND policyname = 'Users can view their own recommendations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can insert their own recommendations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendations' 
    AND policyname = 'Users can insert their own recommendations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can update their own recommendations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendations' 
    AND policyname = 'Users can update their own recommendations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own recommendations" ON recommendations FOR UPDATE USING (auth.uid() = user_id)';
  END IF;

  -- Check if "Users can delete their own recommendations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendations' 
    AND policyname = 'Users can delete their own recommendations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own recommendations" ON recommendations FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 9. Create new RLS policies for task_chats if the table exists (only if they don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_chats') THEN
    -- Check if "Users can view their own task chats" policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'task_chats' 
      AND policyname = 'Users can view their own task chats'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view their own task chats" ON task_chats FOR SELECT USING (auth.uid() IN (SELECT user_id FROM tasks WHERE id = task_id))';
    END IF;

    -- Check if "Users can insert chats for their own tasks" policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'task_chats' 
      AND policyname = 'Users can insert chats for their own tasks'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can insert chats for their own tasks" ON task_chats FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM tasks WHERE id = task_id))';
    END IF;
  END IF;
END $$;

-- 10. Clean up any orphaned recommendations (recommendations for tasks that no longer exist)
DELETE FROM recommendations
WHERE task_id NOT IN (SELECT id FROM tasks);

-- 11. Verify the changes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('task_shares', 'task_share_activities');

-- If the above query returns no rows, the tables have been successfully dropped

COMMIT;

-- Final message
DO $$
BEGIN
  RAISE NOTICE 'Shared tasks functionality has been successfully removed from the database.';
END $$;
