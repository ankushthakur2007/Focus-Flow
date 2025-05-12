-- Add new columns to the recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS priority_level TEXT,
ADD COLUMN IF NOT EXISTS estimated_time TEXT,
ADD COLUMN IF NOT EXISTS steps TEXT[];
