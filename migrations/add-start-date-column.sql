-- Add start_date column to tasks table
-- Run this in the Supabase SQL Editor

-- Add start_date column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Create an index on start_date for better query performance
CREATE INDEX IF NOT EXISTS tasks_start_date_idx ON tasks (start_date);

-- Update the combined schema version
COMMENT ON TABLE tasks IS 'Tasks table with start_date field added';
