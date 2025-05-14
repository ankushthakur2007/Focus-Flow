-- Update recommendations table to add new fields
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS priority_level TEXT,
ADD COLUMN IF NOT EXISTS estimated_time TEXT,
ADD COLUMN IF NOT EXISTS steps JSONB;

-- Convert existing string array steps to JSONB format
DO $$
DECLARE
  rec RECORD;
  steps_array TEXT[];
  steps_jsonb JSONB;
  i INTEGER;
BEGIN
  -- First, alter the column type if it's TEXT[] to JSONB
  BEGIN
    ALTER TABLE recommendations ALTER COLUMN steps TYPE JSONB USING COALESCE(steps::JSONB, '[]'::JSONB);
  EXCEPTION WHEN OTHERS THEN
    -- If the column is already JSONB or doesn't exist, continue
    NULL;
  END;

  -- Then process any existing data
  FOR rec IN SELECT id, steps FROM recommendations WHERE steps IS NOT NULL LOOP
    -- Check if steps is stored as a text array or string
    BEGIN
      -- Try to parse as array
      IF jsonb_typeof(rec.steps) = 'array' THEN
        -- Check if the array contains strings
        IF jsonb_array_length(rec.steps) > 0 AND jsonb_typeof(rec.steps->0) = 'string' THEN
          -- Convert array of strings to array of objects
          steps_jsonb := '[]'::JSONB;
          FOR i IN 0..jsonb_array_length(rec.steps)-1 LOOP
            steps_jsonb := steps_jsonb || jsonb_build_object('title', rec.steps->i, 'description', '');
          END LOOP;

          -- Update the record with the new JSONB format
          UPDATE recommendations SET steps = steps_jsonb WHERE id = rec.id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If there's an error, skip this record
      CONTINUE;
    END;
  END LOOP;
END $$;
