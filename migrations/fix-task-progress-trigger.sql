-- Fix the calculate_task_progress function to properly update task status
DROP FUNCTION IF EXISTS calculate_task_progress() CASCADE;
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
    -- If all steps are completed and there are steps, mark the task as completed
    status = CASE
      WHEN progress_percentage = 100 AND total_steps > 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
DROP TRIGGER IF EXISTS update_task_progress_on_step_insert ON task_steps;
CREATE TRIGGER update_task_progress_on_step_insert
AFTER INSERT ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

DROP TRIGGER IF EXISTS update_task_progress_on_step_update ON task_steps;
CREATE TRIGGER update_task_progress_on_step_update
AFTER UPDATE OF is_completed ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

DROP TRIGGER IF EXISTS update_task_progress_on_step_delete ON task_steps;
CREATE TRIGGER update_task_progress_on_step_delete
AFTER DELETE ON task_steps
FOR EACH ROW
EXECUTE FUNCTION calculate_task_progress();

-- Add a function to force refresh task progress
CREATE OR REPLACE FUNCTION refresh_task_progress(task_id_param UUID)
RETURNS VOID AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total steps for the task
  SELECT COUNT(*) INTO total_steps
  FROM task_steps
  WHERE task_id = task_id_param;

  -- Count completed steps for the task
  SELECT COUNT(*) INTO completed_steps
  FROM task_steps
  WHERE task_id = task_id_param AND is_completed = true;

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
    -- If all steps are completed and there are steps, mark the task as completed
    status = CASE
      WHEN progress_percentage = 100 AND total_steps > 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = task_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permission to use the function
GRANT EXECUTE ON FUNCTION refresh_task_progress(UUID) TO authenticated;
