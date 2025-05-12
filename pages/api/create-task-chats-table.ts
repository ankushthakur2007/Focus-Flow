import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabase';

type ResponseData = {
  message: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Check if the table exists
    const { error: sqlError } = await supabase.rpc('check_table_exists', {
      table_name: 'task_chats',
    });
    
    if (sqlError && sqlError.message.includes('does not exist')) {
      // Table doesn't exist, create it
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS task_chats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
          message TEXT NOT NULL,
          is_user BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS task_chats_user_id_idx ON task_chats (user_id);
        CREATE INDEX IF NOT EXISTS task_chats_task_id_idx ON task_chats (task_id);
        CREATE INDEX IF NOT EXISTS task_chats_created_at_idx ON task_chats (created_at);
        
        -- Enable RLS
        ALTER TABLE task_chats ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own task chats" 
          ON task_chats FOR SELECT 
          USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own task chats" 
          ON task_chats FOR INSERT 
          WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own task chats" 
          ON task_chats FOR UPDATE 
          USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own task chats" 
          ON task_chats FOR DELETE 
          USING (auth.uid() = user_id);
      `;
      
      const { error: createError } = await supabase.rpc('run_sql', {
        sql: createTableQuery,
      });
      
      if (createError) {
        return res.status(500).json({
          message: 'Error creating task_chats table',
          error: createError.message,
        });
      }
      
      return res.status(200).json({
        message: 'task_chats table created successfully',
      });
    } else if (sqlError) {
      return res.status(500).json({
        message: 'Error checking if task_chats table exists',
        error: sqlError.message,
      });
    }
    
    return res.status(200).json({
      message: 'task_chats table already exists',
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
}
