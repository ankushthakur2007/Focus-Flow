import { Task } from '../types/task';
import { Recommendation } from '../types/recommendation';

interface RecommendationResponse {
  recommended_task: string;
  reasoning: string;
  suggestion: string;
  mood_tip: string;
}

export const getRecommendation = async (
  tasks: Task[],
  currentMood: string
): Promise<RecommendationResponse> => {
  try {
    // Create a prompt for the AI
    const prompt = createPrompt(tasks, currentMood);

    // Make the API request
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1:1.5b',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Ollama API response:', data);
    const aiResponse = data.response as string;

    // Parse the JSON response from the AI
    try {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = aiResponse.substring(jsonStart, jsonEnd);
        const recommendation = JSON.parse(jsonString) as RecommendationResponse;
        return recommendation;
      }
    } catch (e) {
      console.error('Error parsing AI response as JSON:', e);
    }

    // Fallback if JSON parsing fails
    return {
      recommended_task: 'Could not determine a specific task',
      reasoning: 'The AI response could not be parsed correctly.',
      suggestion: 'Please try again later or contact support.',
      mood_tip: 'Take a short break and try again.',
    };
  } catch (error) {
    console.error('Error getting recommendation:', error);

    // Return a fallback recommendation instead of throwing
    return {
      recommended_task: 'Unable to connect to AI service',
      reasoning: 'The AI service is currently unavailable. This could be because Ollama is not running or there was a network issue.',
      suggestion: 'Please make sure Ollama is running and try again. You can also try restarting the Ollama application.',
      mood_tip: 'In the meantime, consider picking a task that aligns with your energy level right now.',
    };
  }
};

const createPrompt = (tasks: Task[], currentMood: string): string => {
  // Convert tasks to a string representation
  const tasksString = tasks.map((task) => {
    return `
Task: ${task.title}
Priority: ${task.priority}
Category: ${task.category}
Status: ${task.status}
`;
  }).join('\n');

  // Create the prompt
  return `
You are an AI assistant for a productivity app called FocusFlow. Based on the user's current mood and pending tasks, recommend which task they should tackle next.

Current Mood: ${currentMood}

Pending Tasks:
${tasksString}

Please provide a recommendation in the following JSON format:
{
  "recommended_task": "The title of the recommended task",
  "reasoning": "A brief explanation of why this task is recommended",
  "suggestion": "A helpful suggestion for how to approach the task",
  "mood_tip": "A tip to help the user maintain or improve their mood while working"
}

If there are no tasks, suggest creating a new task based on the user's mood.
`;
};

export const getTaskRecommendation = async (
  task: Task,
  currentMood: string
): Promise<RecommendationResponse> => {
  try {
    // Create a prompt for the AI
    const prompt = createTaskPrompt(task, currentMood);

    // Make the API request
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1:1.5b',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Ollama API task response:', data);
    const aiResponse = data.response as string;

    // Parse the JSON response from the AI
    try {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = aiResponse.substring(jsonStart, jsonEnd);
        const recommendation = JSON.parse(jsonString) as RecommendationResponse;
        return recommendation;
      }
    } catch (e) {
      console.error('Error parsing AI task response as JSON:', e);
    }

    // Fallback if JSON parsing fails
    return {
      recommended_task: task.title,
      reasoning: 'The AI response could not be parsed correctly.',
      suggestion: 'Approach this task step by step and break it down into smaller parts.',
      mood_tip: 'Take short breaks if needed to maintain focus.',
    };
  } catch (error) {
    console.error('Error getting task recommendation:', error);

    // Return a fallback recommendation instead of throwing
    return {
      recommended_task: task.title,
      reasoning: 'The AI service is currently unavailable.',
      suggestion: 'Break down this task into smaller, manageable steps.',
      mood_tip: 'Remember to take breaks and stay hydrated while working on this task.',
    };
  }
};

const createTaskPrompt = (task: Task, currentMood: string): string => {
  // Create the prompt
  return `
You are an AI assistant for a productivity app called FocusFlow. Based on the user's current mood and the details of a specific task, provide personalized recommendations for how to approach this task.

Current Mood: ${currentMood}

Task Details:
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}
Category: ${task.category}
Status: ${task.status}

Please provide a recommendation in the following JSON format:
{
  "recommended_task": "${task.title}",
  "reasoning": "A brief explanation of why this task is important and how it relates to the user's current mood",
  "suggestion": "A detailed, step-by-step approach for how to tackle this specific task efficiently",
  "mood_tip": "A personalized tip to help the user maintain or improve their mood while working on this specific task"
}

Make your suggestions specific to the task description and the user's current mood. Be practical, actionable, and motivating.
`;
};
