-- Task Notification Toggle Schema for FocusFlow
-- Run this in the Supabase SQL Editor

-- Add notification_settings column to tasks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE tasks ADD COLUMN notification_settings JSONB DEFAULT '{
      "custom_reminder": false,
      "reminder_time": 24,
      "reminder_sent": false,
      "notifications_enabled": true
    }'::JSONB;
  ELSE
    -- Update existing notification_settings to include notifications_enabled if not present
    UPDATE tasks
    SET notification_settings = notification_settings || '{"notifications_enabled": true}'::JSONB
    WHERE notification_settings->>'notifications_enabled' IS NULL;
  END IF;
END $$;

-- Update the existing task due notification function to respect notification settings
CREATE OR REPLACE FUNCTION create_task_due_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- If a task has a due date and it's a new task or the due date has changed
  IF NEW.due_date IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    -- Only create notification if notifications are enabled for this task
    IF NEW.notification_settings IS NULL OR (NEW.notification_settings->>'notifications_enabled')::boolean = true THEN
      -- Insert a notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_task_id
      ) VALUES (
        NEW.user_id,
        'Task Due Soon',
        'Your task "' || NEW.title || '" is due soon.',
        'task_due',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the task status change notification function to respect notification settings
CREATE OR REPLACE FUNCTION create_task_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- If task status has changed to completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Only create notification if notifications are enabled for this task
    IF NEW.notification_settings IS NULL OR (NEW.notification_settings->>'notifications_enabled')::boolean = true THEN
      -- Insert a notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_task_id
      ) VALUES (
        NEW.user_id,
        'Task Completed',
        'You completed the task "' || NEW.title || '"!',
        'task_completed',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the triggers are created
DROP TRIGGER IF EXISTS task_due_notification_trigger ON tasks;
CREATE TRIGGER task_due_notification_trigger
  AFTER INSERT OR UPDATE OF due_date ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_due_notification();

DROP TRIGGER IF EXISTS task_status_notification_trigger ON tasks;
CREATE TRIGGER task_status_notification_trigger
  AFTER INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_status_notification();
