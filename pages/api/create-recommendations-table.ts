import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/services/supabase';

type ResponseData = {
  message: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Create the recommendations table if it doesn't exist
    const { error } = await supabase.rpc('create_recommendations_table');
    
    if (error) {
      // Try direct SQL if RPC fails
      const { error: sqlError } = await supabase.from('recommendations').select('count(*)');
      
      if (sqlError && sqlError.message.includes('does not exist')) {
        // Table doesn't exist, create it
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS recommendations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
            recommended_task TEXT NOT NULL,
            reasoning TEXT,
            suggestion TEXT,
            mood_tip TEXT,
            mood TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS recommendations_user_id_idx ON recommendations (user_id);
          CREATE INDEX IF NOT EXISTS recommendations_task_id_idx ON recommendations (task_id);
          CREATE INDEX IF NOT EXISTS recommendations_created_at_idx ON recommendations (created_at);
          
          -- Enable RLS
          ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
          
          -- Create RLS policies
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'recommendations' AND policyname = 'Users can view their own recommendations'
            ) THEN
              CREATE POLICY "Users can view their own recommendations" 
              ON recommendations FOR SELECT 
              USING (auth.uid() = user_id);
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'recommendations' AND policyname = 'Users can insert their own recommendations'
            ) THEN
              CREATE POLICY "Users can insert their own recommendations" 
              ON recommendations FOR INSERT 
              WITH CHECK (auth.uid() = user_id);
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'recommendations' AND policyname = 'Users can update their own recommendations'
            ) THEN
              CREATE POLICY "Users can update their own recommendations" 
              ON recommendations FOR UPDATE 
              USING (auth.uid() = user_id);
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'recommendations' AND policyname = 'Users can delete their own recommendations'
            ) THEN
              CREATE POLICY "Users can delete their own recommendations" 
              ON recommendations FOR DELETE 
              USING (auth.uid() = user_id);
            END IF;
          END $$;
        `;
        
        // We can't execute this directly with the client, so we'll return instructions
        return res.status(200).json({
          message: 'Recommendations table needs to be created. Please run the SQL in the Supabase SQL Editor.'
        });
      }
      
      return res.status(500).json({
        message: 'Failed to check or create recommendations table',
        error: sqlError ? sqlError.message : error.message
      });
    }
    
    res.status(200).json({ 
      message: 'Recommendations table created or already exists'
    });
  } catch (error) {
    console.error('Error creating recommendations table:', error);
    res.status(500).json({ 
      message: 'Error creating recommendations table', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
