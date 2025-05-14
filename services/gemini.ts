import { Task } from '../types/task';
import { Recommendation } from '../types/recommendation';
import { GEMINI_API_KEY } from '../config/api-keys';
import { supabase } from './supabase';

interface RecommendationResponse {
  recommended_task: string;
  reasoning: string;
  suggestion: string;
  mood_tip: string;
  priority_level?: string;
  estimated_time?: string;
  steps?: string[] | {title: string, description: string}[];
}

interface TaskStepSuggestionResponse {
  steps: {title: string, description: string}[];
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const getRecommendation = async (
  tasks: Task[],
  currentMood: string
): Promise<RecommendationResponse> => {
  try {
    // Create a prompt for the AI
    const prompt = await createPrompt(tasks, currentMood);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);

    // Extract the text from the response
    const aiResponse = data.candidates[0].content.parts[0].text;

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
      reasoning: 'The AI service is currently unavailable.',
      suggestion: 'Please try again later. You can also check your API key configuration.',
      mood_tip: 'In the meantime, consider picking a task that aligns with your energy level right now.',
    };
  }
};

export const getTaskStepSuggestions = async (
  task: Task,
  currentMood: string,
  questions: string[],
  answers: string[]
): Promise<TaskStepSuggestionResponse> => {
  try {
    // Create a prompt for the AI
    const prompt = createTaskStepsPrompt(task, currentMood, questions, answers);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API task steps response:', data);

    // Extract the text from the response
    const aiResponse = data.candidates[0].content.parts[0].text;

    // Parse the JSON response from the AI
    try {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = aiResponse.substring(jsonStart, jsonEnd);
        const result = JSON.parse(jsonString) as TaskStepSuggestionResponse;
        return result;
      }
    } catch (e) {
      console.error('Error parsing AI task steps response as JSON:', e);
    }

    // Fallback if JSON parsing fails
    return {
      steps: [
        {
          title: "Break down the task",
          description: "Divide the task into smaller, manageable parts"
        },
        {
          title: "Set a timeline",
          description: "Establish deadlines for each part of the task"
        },
        {
          title: "Start with the easiest part",
          description: "Build momentum by completing simpler components first"
        }
      ]
    };
  } catch (error) {
    console.error('Error getting task step suggestions:', error);

    // Return fallback steps instead of throwing
    return {
      steps: [
        {
          title: "Break down the task",
          description: "Divide the task into smaller, manageable parts"
        },
        {
          title: "Set a timeline",
          description: "Establish deadlines for each part of the task"
        },
        {
          title: "Start with the easiest part",
          description: "Build momentum by completing simpler components first"
        }
      ]
    };
  }
};

export const getTaskRecommendation = async (
  task: Task,
  currentMood: string
): Promise<RecommendationResponse> => {
  try {
    // Create a prompt for the AI
    const prompt = await createTaskPrompt(task, currentMood);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API task response:', data);

    // Extract the text from the response
    const aiResponse = data.candidates[0].content.parts[0].text;

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

const createPrompt = async (tasks: Task[], currentMood: string): Promise<string> => {
  // Get user's task history and mood patterns
  let userTaskHistory = '';
  let userMoodHistory = '';

  if (tasks.length > 0 && tasks[0].user_id) {
    // Get recently completed tasks
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', tasks[0].user_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (completedTasks && completedTasks.length > 0) {
      userTaskHistory = 'Recently completed tasks:\n' +
        completedTasks.map((task: Task) =>
          `- ${task.title} (Priority: ${task.priority}, Category: ${task.category})`
        ).join('\n');
    }

    // Get recent mood entries
    const { data: moodEntries } = await supabase
      .from('moods')
      .select('*')
      .eq('user_id', tasks[0].user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (moodEntries && moodEntries.length > 0) {
      userMoodHistory = 'Recent mood patterns:\n' +
        moodEntries.map((entry: any) =>
          `- ${entry.mood} (${new Date(entry.created_at).toLocaleDateString()})`
        ).join('\n');
    }
  }

  // Convert tasks to a string representation
  const tasksString = tasks.map((task) => {
    return `
Task: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority}
Category: ${task.category}
Status: ${task.status}
`;
  }).join('\n');

  // Create the prompt
  return `
You are an AI assistant for a productivity app called FocusFlow. Based on the user's current mood, pending tasks, and historical patterns, recommend which task they should tackle next and how to prioritize their work.

Current Mood: ${currentMood}

Pending Tasks:
${tasksString}

${userTaskHistory ? userTaskHistory + '\n\n' : ''}
${userMoodHistory ? userMoodHistory + '\n\n' : ''}

Please analyze the tasks and provide a recommendation in the following JSON format:
{
  "recommended_task": "The title of the recommended task",
  "reasoning": "A detailed explanation of why this task is recommended based on priority, mood, and user patterns",
  "suggestion": "A helpful, actionable suggestion for how to approach the task",
  "mood_tip": "A personalized tip to help the user maintain or improve their mood while working",
  "priority_level": "A suggested priority level (High/Medium/Low)",
  "estimated_time": "An estimated time to complete this task (e.g., '30 minutes', '1-2 hours')",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}

Consider the following in your recommendation:
1. The user's current mood and how it might affect their energy and focus
2. Task priority and urgency
3. Balance between important and urgent tasks
4. The user's recent productivity patterns
5. Time of day and potential energy levels

If there are no tasks, suggest creating a new task based on the user's mood and historical patterns.
`;
};

const createTaskStepsPrompt = (
  task: Task,
  currentMood: string,
  questions: string[],
  answers: string[]
): string => {
  // Combine questions and answers
  const userInput = questions.map((question, index) => {
    return `Q: ${question}\nA: ${answers[index] || 'No answer provided'}`;
  }).join('\n\n');

  // Create the prompt
  return `
You are an AI assistant for a productivity app called FocusFlow. Based on the user's task details, current mood, and their answers to specific questions, generate a detailed breakdown of steps to complete this task.

Task Details:
Title: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority}
Category: ${task.category}
Status: ${task.status}

Current Mood: ${currentMood}

User's Input:
${userInput}

Please generate a detailed, step-by-step breakdown for completing this task. Each step should be clear, actionable, and tailored to the specific task and user's current situation.

Return your response in the following JSON format:
{
  "steps": [
    {
      "title": "Step 1 title",
      "description": "Detailed description of what to do in this step"
    },
    {
      "title": "Step 2 title",
      "description": "Detailed description of what to do in this step"
    },
    ...
  ]
}

Guidelines:
1. Provide 3-7 steps, depending on the complexity of the task
2. Make each step specific and actionable
3. Consider the user's current mood and energy level
4. Include any preparation or planning steps needed
5. Break down complex parts into smaller, manageable tasks
6. Include a final verification or completion step
7. Tailor the steps to the specific task category (work, study, etc.)

Make your steps practical, clear, and helpful for the user to make progress on their task.
`;
};

const createTaskPrompt = async (task: Task, currentMood: string): Promise<string> => {
  // Get user's mood patterns and similar tasks
  let userMoodHistory = '';
  let similarTasksHistory = '';

  if (task.user_id) {
    // Get recently completed tasks in the same category
    const { data: similarTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', task.user_id)
      .eq('category', task.category)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(3);

    if (similarTasks && similarTasks.length > 0) {
      similarTasksHistory = 'Similar completed tasks in this category:\n' +
        similarTasks.map((t: Task) =>
          `- ${t.title} (Priority: ${t.priority})`
        ).join('\n');
    }

    // Get recent mood entries
    const { data: moodEntries } = await supabase
      .from('moods')
      .select('*')
      .eq('user_id', task.user_id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (moodEntries && moodEntries.length > 0) {
      userMoodHistory = 'Recent mood patterns:\n' +
        moodEntries.map((entry: any) =>
          `- ${entry.mood} (${new Date(entry.created_at).toLocaleDateString()})`
        ).join('\n');
    }
  }

  // Create the prompt
  return `
You are an AI assistant for a productivity app called FocusFlow. Based on the user's current mood, task details, and historical patterns, provide personalized recommendations for how to approach this specific task.

Current Mood: ${currentMood}

Task Details:
Title: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority}
Category: ${task.category}
Status: ${task.status}

${similarTasksHistory ? similarTasksHistory + '\n\n' : ''}
${userMoodHistory ? userMoodHistory + '\n\n' : ''}

Please provide a detailed recommendation in the following JSON format:
{
  "recommended_task": "${task.title}",
  "reasoning": "A detailed explanation of why this task is important and how it relates to the user's current mood",
  "suggestion": "A comprehensive, step-by-step approach for how to tackle this specific task efficiently",
  "mood_tip": "A personalized tip to help the user maintain or improve their mood while working on this specific task",
  "priority_level": "A suggested priority level (High/Medium/Low) based on the task's importance and urgency",
  "estimated_time": "An estimated time to complete this task (e.g., '30 minutes', '1-2 hours')",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}

Make your suggestions specific to the task description and the user's current mood. Consider:
1. Breaking down complex tasks into manageable steps
2. Suggesting specific techniques relevant to the task category
3. Accounting for the user's current emotional state
4. Providing actionable, practical advice
5. Suggesting ways to make the task more engaging or enjoyable

Be practical, actionable, and motivating. Focus on helping the user complete this task successfully while maintaining their well-being.
`;
};
