# FocusFlow Notification System Implementation

This document provides a comprehensive guide for implementing an automated notification system in FocusFlow.

## Database Schema

### 1. User Notification Preferences Table

```sql
-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Email notification preferences
  email_notifications_enabled BOOLEAN DEFAULT true,
  email_task_due_reminder BOOLEAN DEFAULT true,
  email_task_due_reminder_time INTEGER DEFAULT 24, -- Hours before due date
  email_weekly_summary BOOLEAN DEFAULT true,
  
  -- In-app notification preferences
  in_app_notifications_enabled BOOLEAN DEFAULT true,
  in_app_task_due_reminder BOOLEAN DEFAULT true,
  in_app_task_due_reminder_time INTEGER DEFAULT 24, -- Hours before due date
  in_app_task_status_change BOOLEAN DEFAULT true,
  
  -- Push notification preferences (for future mobile app)
  push_notifications_enabled BOOLEAN DEFAULT false,
  push_task_due_reminder BOOLEAN DEFAULT true,
  push_task_due_reminder_time INTEGER DEFAULT 24, -- Hours before due date
  push_task_status_change BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preference record per user
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_notification_preferences_user_id_idx ON user_notification_preferences(user_id);

-- Enable RLS on the table
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences"
ON user_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON user_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON user_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to initialize default notification preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize notification preferences when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_notification_preferences();

-- Add notification_settings column to tasks table for per-task notification settings
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "custom_reminder": false,
  "reminder_time": 24,
  "reminder_sent": false
}'::JSONB;
```

### 2. Scheduled Notification Functions

```sql
-- Create a function to process task due notifications
CREATE OR REPLACE FUNCTION process_task_due_notifications()
RETURNS void AS $$
DECLARE
  task_record RECORD;
  user_pref RECORD;
  reminder_time INTEGER;
  due_date TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  notification_window_start TIMESTAMP WITH TIME ZONE;
  notification_window_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Loop through all pending and in-progress tasks with due dates
  FOR task_record IN 
    SELECT t.*, p.email 
    FROM tasks t
    JOIN auth.users u ON t.user_id = u.id
    JOIN profiles p ON t.user_id = p.id
    WHERE 
      t.status IN ('pending', 'in_progress') 
      AND t.due_date IS NOT NULL
      AND (t.notification_settings->>'reminder_sent')::boolean = false
  LOOP
    -- Get user notification preferences
    SELECT * INTO user_pref 
    FROM user_notification_preferences 
    WHERE user_id = task_record.user_id;
    
    -- Determine reminder time (use task-specific if set, otherwise user preference)
    IF (task_record.notification_settings->>'custom_reminder')::boolean = true THEN
      reminder_time := (task_record.notification_settings->>'reminder_time')::integer;
    ELSE
      reminder_time := user_pref.in_app_task_due_reminder_time;
    END IF;
    
    -- Parse due date
    due_date := task_record.due_date::TIMESTAMP WITH TIME ZONE;
    
    -- Calculate notification window
    notification_window_start := due_date - (reminder_time || ' hours')::interval;
    notification_window_end := notification_window_start + '1 hour'::interval;
    
    -- Check if current time is within notification window
    IF current_time >= notification_window_start AND current_time <= notification_window_end THEN
      -- Create in-app notification if enabled
      IF user_pref.in_app_notifications_enabled AND user_pref.in_app_task_due_reminder THEN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          related_task_id
        ) VALUES (
          task_record.user_id,
          'Task Due Reminder',
          'Your task "' || task_record.title || '" is due in ' || reminder_time || ' hours.',
          'task_reminder',
          task_record.id
        );
      END IF;
      
      -- Mark reminder as sent
      UPDATE tasks
      SET notification_settings = jsonb_set(
        notification_settings,
        '{reminder_sent}',
        'true'
      )
      WHERE id = task_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to send weekly summary notifications
CREATE OR REPLACE FUNCTION send_weekly_summary_notifications()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  completed_count INTEGER;
  pending_count INTEGER;
  upcoming_tasks TEXT;
  task_record RECORD;
BEGIN
  -- Process each user who has weekly summaries enabled
  FOR user_record IN 
    SELECT p.*, np.email_notifications_enabled, np.email_weekly_summary
    FROM profiles p
    JOIN user_notification_preferences np ON p.id = np.user_id
    WHERE np.email_weekly_summary = true
  LOOP
    -- Count completed tasks in the last week
    SELECT COUNT(*) INTO completed_count
    FROM tasks
    WHERE 
      user_id = user_record.id 
      AND status = 'completed'
      AND updated_at >= NOW() - '1 week'::interval;
    
    -- Count pending tasks
    SELECT COUNT(*) INTO pending_count
    FROM tasks
    WHERE 
      user_id = user_record.id 
      AND status IN ('pending', 'in_progress');
    
    -- Create in-app notification with weekly summary
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      user_record.id,
      'Weekly Progress Summary',
      'You completed ' || completed_count || ' tasks this week. You have ' || 
      pending_count || ' tasks pending.',
      'system'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Setup Instructions

1. **Apply the Database Schema**:
   - Run the SQL scripts in the Supabase SQL Editor to set up the notification tables and functions.

2. **Set Up Scheduled Jobs**:
   - Create cron jobs in Supabase to run the notification functions automatically:
     - `hourly_notification_check`: Runs `process_task_due_notifications()` every hour
     - `weekly_summary_notifications`: Runs `send_weekly_summary_notifications()` every Monday at 9 AM

3. **Implement Frontend Components**:
   - Add notification settings to the profile page
   - Add task notification settings to the task detail view
   - Update the task form to include notification settings

4. **Test the System**:
   - Create a task with a due date
   - Verify that notifications are generated at the appropriate time
   - Check that user preferences are respected

## Conclusion

This notification system provides a comprehensive solution for keeping users informed about their tasks and deadlines. By implementing this system, FocusFlow will enhance user engagement and productivity by ensuring that users never miss important deadlines.
