import { supabase } from './supabase';
import { ChatMessage } from '../types/chat';
import { Task } from '../types/task';
import { GEMINI_API_KEY } from '../config/api-keys';

// Define the Gemini API URL
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Fetch chat history for a specific task
export const getChatHistory = async (taskId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('task_chats')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
};

// Send a message and get AI response
export const sendMessage = async (
  message: string,
  taskId: string,
  userId: string,
  task: Task
): Promise<ChatMessage | null> => {
  try {
    console.log('Sending message for task:', taskId);

    // First, save the user's message
    const { data: userMessage, error: userMessageError } = await supabase
      .from('task_chats')
      .insert([{
        task_id: taskId,
        user_id: userId,
        message,
        is_user: true,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      throw userMessageError;
    }

    console.log('User message saved, getting AI response...');

    // Get AI response
    let aiResponse;
    try {
      aiResponse = await getAIResponse(message, task);
      console.log('AI response received:', aiResponse.substring(0, 50) + '...');
    } catch (aiError) {
      console.error('Error getting AI response:', aiError);
      aiResponse = 'Sorry, I encountered an error while generating a response. Please try again later. ' +
                  (aiError instanceof Error ? '(Error: ' + aiError.message + ')' : '');
    }

    // Save AI response
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('task_chats')
      .insert([{
        task_id: taskId,
        user_id: userId,
        message: aiResponse,
        is_user: false,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (aiMessageError) {
      console.error('Error saving AI response:', aiMessageError);
      throw aiMessageError;
    }

    return aiMessage ? aiMessage[0] : null;
  } catch (error) {
    console.error('Error in sendMessage function:', error);
    // Instead of returning null, throw the error so it can be handled by the caller
    throw error;
  }
};

// Get AI response using Gemini API
const getAIResponse = async (message: string, task: Task): Promise<string> => {
  try {
    // Create a prompt for the AI that includes task context
    const prompt = `
You are a helpful AI assistant for the task: "${task.title}".
Task description: ${task.description || 'No description provided'}
Task priority: ${task.priority}
Task category: ${task.category}

You should provide helpful, specific advice related to this task.
Be concise but thorough in your responses.
If the user asks something unrelated to the task, gently guide them back to the task.

User message: ${message}

Respond directly without any preamble like "As an AI assistant" or "I'd be happy to help".
`;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.error('Gemini API key not configured');
      return 'The AI service is not properly configured. Please add your Gemini API key in the config/api-keys.ts file.';
    }

    // For debugging - log the API URL and key (masked)
    console.log('Using Gemini API URL:', GEMINI_API_URL);
    console.log('API Key configured:', GEMINI_API_KEY ? 'Yes (masked for security)' : 'No');

    // Make the API request
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });

    // Check for non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      const errorText = await response.text();
      console.error('Non-JSON response received:', errorText.substring(0, 200) + '...');
      throw new Error(`Received HTML instead of JSON. Status: ${response.status}. This usually indicates an authentication issue or incorrect API endpoint.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Safely parse JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      const responseText = await response.text();
      console.error('Raw response:', responseText.substring(0, 200) + '...');
      throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }

    // Extract the text from the response
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      return aiResponse;
    } else {
      console.error('Unexpected API response structure:', data);
      throw new Error('Unexpected API response structure');
    }
  } catch (error) {
    console.error('Error getting AI response:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again later. (Error: ' + (error instanceof Error ? error.message : 'Unknown error') + ')';
  }
};

// Clear chat history for a task
export const clearChatHistory = async (taskId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('task_chats')
      .delete()
      .eq('task_id', taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
};
