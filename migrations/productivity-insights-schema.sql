-- Productivity Insights Schema for FocusFlow
-- Run this in the Supabase SQL Editor

-- Create productivity_insights table to store AI-generated insights
CREATE TABLE IF NOT EXISTS productivity_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insights JSONB NOT NULL, -- Array of insight objects with text and type
  time_range TEXT NOT NULL, -- '7days', '30days', '90days', 'all'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, time_range)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS productivity_insights_user_id_idx ON productivity_insights(user_id);
CREATE INDEX IF NOT EXISTS productivity_insights_time_range_idx ON productivity_insights(time_range);
CREATE INDEX IF NOT EXISTS productivity_insights_created_at_idx ON productivity_insights(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE productivity_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own productivity insights"
ON productivity_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own productivity insights"
ON productivity_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productivity insights"
ON productivity_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own productivity insights"
ON productivity_insights FOR DELETE
USING (auth.uid() = user_id);
