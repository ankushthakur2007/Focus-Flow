-- Task Steps Schema for FocusFlow
-- Run this in the Supabase SQL Editor

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

-- Create indexes for task_steps
CREATE INDEX IF NOT EXISTS task_steps_task_id_idx ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS task_steps_user_id_idx ON task_steps(user_id);
CREATE INDEX IF NOT EXISTS task_steps_order_index_idx ON task_steps(order_index);
CREATE INDEX IF NOT EXISTS task_steps_is_completed_idx ON task_steps(is_completed);

-- Enable Row Level Security
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_steps
CREATE POLICY "Users can view their own task steps"
ON task_steps
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task steps"
ON task_steps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task steps"
ON task_steps
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task steps"
ON task_steps
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to calculate task progress based on steps
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
    -- If all steps are completed, mark the task as completed
    status = CASE 
      WHEN progress_percentage = 100 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add progress column to tasks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'progress'
  ) THEN
    ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create triggers to update task progress when steps are added, updated, or deleted
CREATE TRIGGER update_task_progress_on_step_insert
AFTER INSERT ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

CREATE TRIGGER update_task_progress_on_step_update
AFTER UPDATE OF is_completed ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

CREATE TRIGGER update_task_progress_on_step_delete
AFTER DELETE ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();
