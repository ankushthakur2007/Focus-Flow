-- Add steps_finalized field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS steps_finalized BOOLEAN DEFAULT false;

-- Create index for the new field
CREATE INDEX IF NOT EXISTS tasks_steps_finalized_idx ON tasks (steps_finalized);

-- Update the combined-schema.sql file to include this field
-- Note: This is just a comment, you need to manually update the combined-schema.sql file
