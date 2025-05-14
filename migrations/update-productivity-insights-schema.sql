-- Update Productivity Insights Schema for FocusFlow
-- Run this in the Supabase SQL Editor

-- Ensure the productivity_insights table has the necessary columns
ALTER TABLE IF EXISTS productivity_insights
ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to set last_generated_at to updated_at if it's null
UPDATE productivity_insights
SET last_generated_at = updated_at
WHERE last_generated_at IS NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS productivity_insights_last_generated_at_idx ON productivity_insights(last_generated_at);

-- Add a comment to the table for documentation
COMMENT ON TABLE productivity_insights IS 'Stores AI-generated productivity insights with caching mechanism';
COMMENT ON COLUMN productivity_insights.last_generated_at IS 'Timestamp when insights were last generated';
