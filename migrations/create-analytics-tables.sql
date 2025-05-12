-- Create analytics_daily table to store daily task statistics
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  most_productive_hour INTEGER,
  most_common_category TEXT,
  most_common_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create analytics_mood table to store mood-productivity correlations
CREATE TABLE IF NOT EXISTS analytics_mood (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood_name TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mood_name, date)
);

-- Create analytics_category table to store category statistics
CREATE TABLE IF NOT EXISTS analytics_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, date)
);

-- Create analytics_weekly table to store weekly aggregated statistics
CREATE TABLE IF NOT EXISTS analytics_weekly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  most_productive_day TEXT,
  most_common_category TEXT,
  most_common_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS analytics_daily_user_id_idx ON analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS analytics_daily_date_idx ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS analytics_mood_user_id_idx ON analytics_mood(user_id);
CREATE INDEX IF NOT EXISTS analytics_mood_date_idx ON analytics_mood(date);
CREATE INDEX IF NOT EXISTS analytics_category_user_id_idx ON analytics_category(user_id);
CREATE INDEX IF NOT EXISTS analytics_category_date_idx ON analytics_category(date);
CREATE INDEX IF NOT EXISTS analytics_weekly_user_id_idx ON analytics_weekly(user_id);
CREATE INDEX IF NOT EXISTS analytics_weekly_week_start_idx ON analytics_weekly(week_start);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_mood ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_weekly ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analytics_daily"
ON analytics_daily FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics_daily"
ON analytics_daily FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics_daily"
ON analytics_daily FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics_mood"
ON analytics_mood FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics_mood"
ON analytics_mood FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics_mood"
ON analytics_mood FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics_category"
ON analytics_category FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics_category"
ON analytics_category FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics_category"
ON analytics_category FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics_weekly"
ON analytics_weekly FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics_weekly"
ON analytics_weekly FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics_weekly"
ON analytics_weekly FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to update analytics tables when tasks are modified
CREATE OR REPLACE FUNCTION update_analytics_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be triggered on task insert, update, or delete
  -- We'll implement a simple flag to indicate that analytics need to be recalculated
  
  -- For inserts and updates, use the NEW record
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Insert or update a record in a helper table to indicate analytics need updating
    INSERT INTO analytics_daily (user_id, date, updated_at)
    VALUES (NEW.user_id, DATE(NEW.created_at), NOW())
    ON CONFLICT (user_id, date) 
    DO UPDATE SET updated_at = NOW();
    
    RETURN NEW;
  
  -- For deletes, use the OLD record
  ELSIF (TG_OP = 'DELETE') THEN
    -- Insert or update a record in a helper table to indicate analytics need updating
    INSERT INTO analytics_daily (user_id, date, updated_at)
    VALUES (OLD.user_id, DATE(OLD.created_at), NOW())
    ON CONFLICT (user_id, date) 
    DO UPDATE SET updated_at = NOW();
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_update_analytics_on_task_change ON tasks;
CREATE TRIGGER trigger_update_analytics_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_analytics_on_task_change();
