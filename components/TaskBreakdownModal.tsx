import { useState, useEffect, useContext } from 'react';
import { Task, TaskStep } from '../types/task';
import { supabase } from '../services/supabase';
import AuthContext from './AuthContext';
import { getTaskStepSuggestions } from '../services/gemini';
import TouchFriendlyButton from './TouchFriendlyButton';

interface TaskBreakdownModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const TaskBreakdownModal = ({ task, onClose, onUpdate }: TaskBreakdownModalProps) => {
  const { user } = useContext(AuthContext);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [showAIForm, setShowAIForm] = useState(false);
  const [aiGeneratedSteps, setAiGeneratedSteps] = useState<{title: string, description: string}[]>([]);
  const [showAIResults, setShowAIResults] = useState(false);

  // Fetch existing steps for this task
  useEffect(() => {
    const fetchSteps = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('task_steps')
          .select('*')
          .eq('task_id', task.id)
          .order('order_index', { ascending: true });

        if (error) throw error;

        setSteps(data || []);
      } catch (err: any) {
        console.error('Error fetching task steps:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [task.id, user]);

  // Handle adding a new step manually
  const handleAddStep = async () => {
    if (!user || !newStepTitle.trim()) return;

    try {
      const newStep = {
        task_id: task.id,
        user_id: user.id,
        title: newStepTitle.trim(),
        description: newStepDescription.trim(),
        is_completed: false,
        order_index: steps.length
      };

      const { data, error } = await supabase
        .from('task_steps')
        .insert([newStep])
        .select();

      if (error) throw error;

      setSteps([...steps, data[0]]);
      setNewStepTitle('');
      setNewStepDescription('');
      onUpdate();
    } catch (err: any) {
      console.error('Error adding step:', err);
      setError(err.message);
    }
  };

  // Handle toggling step completion
  const handleToggleStep = async (stepId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('task_steps')
        .update({ is_completed: !isCompleted, updated_at: new Date().toISOString() })
        .eq('id', stepId);

      if (error) throw error;

      // Update local state
      setSteps(steps.map(step =>
        step.id === stepId ? { ...step, is_completed: !isCompleted } : step
      ));

      // Force refresh task progress
      const { error: refreshError } = await supabase
        .rpc('refresh_task_progress', { task_id_param: task.id });

      if (refreshError) {
        console.error('Error refreshing task progress:', refreshError);
      }

      // Notify parent component
      onUpdate();
    } catch (err: any) {
      console.error('Error toggling step completion:', err);
      setError(err.message);
    }
  };

  // Handle deleting a step
  const handleDeleteStep = async (stepId: string) => {
    try {
      const { error } = await supabase
        .from('task_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      // Update local state
      setSteps(steps.filter(step => step.id !== stepId));

      // Force refresh task progress
      const { error: refreshError } = await supabase
        .rpc('refresh_task_progress', { task_id_param: task.id });

      if (refreshError) {
        console.error('Error refreshing task progress:', refreshError);
      }

      // Notify parent component
      onUpdate();
    } catch (err: any) {
      console.error('Error deleting step:', err);
      setError(err.message);
    }
  };

  // Start AI step generation process
  const startAIGeneration = () => {
    setShowAIForm(true);
    setAiQuestions([
      "What's the main goal you want to achieve with this task?",
      "How much time do you have to complete this task?",
      "What resources or skills do you need for this task?",
      "Are there any specific challenges you anticipate?"
    ]);
    setAiAnswers(Array(4).fill(''));
  };

  // Generate steps using AI
  const generateAISteps = async () => {
    if (!user) return;

    try {
      setIsGeneratingAI(true);

      // Get the user's most recent mood
      const { data: moodData, error: moodError } = await supabase
        .from('moods')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (moodError) throw moodError;

      const currentMood = moodData && moodData.length > 0 ? moodData[0].name : 'neutral';

      // Generate steps using AI
      const result = await getTaskStepSuggestions(
        task,
        currentMood,
        aiQuestions,
        aiAnswers
      );

      setAiGeneratedSteps(result.steps || []);
      setShowAIResults(true);
      setShowAIForm(false);
    } catch (err: any) {
      console.error('Error generating AI steps:', err);
      setError(err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Save AI-generated steps
  const saveAISteps = async () => {
    if (!user || aiGeneratedSteps.length === 0) return;

    try {
      const newSteps = aiGeneratedSteps.map((step, index) => ({
        task_id: task.id,
        user_id: user.id,
        title: step.title,
        description: step.description || '',
        is_completed: false,
        order_index: steps.length + index
      }));

      const { data, error } = await supabase
        .from('task_steps')
        .insert(newSteps)
        .select();

      if (error) throw error;

      // Update local state
      setSteps([...steps, ...data]);
      setShowAIResults(false);

      // Force refresh task progress
      const { error: refreshError } = await supabase
        .rpc('refresh_task_progress', { task_id_param: task.id });

      if (refreshError) {
        console.error('Error refreshing task progress:', refreshError);
      }

      // Notify parent component
      onUpdate();
    } catch (err: any) {
      console.error('Error saving AI steps:', err);
      setError(err.message);
    }
  };

  // Discard AI-generated steps
  const discardAISteps = () => {
    setAiGeneratedSteps([]);
    setShowAIResults(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Task Breakdown: {task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Task Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Progress</h3>
              <span className="text-sm font-medium">
                {task.progress || 0}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-primary-600 h-2.5 rounded-full"
                style={{ width: `${task.progress || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Steps List */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Steps</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No steps yet. Add steps below or generate with AI.
              </div>
            ) : (
              <ul className="space-y-2">
                {steps.map((step) => (
                  <li key={step.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={step.is_completed}
                        onChange={() => handleToggleStep(step.id, step.is_completed)}
                        className="mt-1 h-4 w-4 text-primary-600 rounded"
                      />
                      <div className="flex-grow">
                        <h4 className={`font-medium ${step.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                          {step.title}
                        </h4>
                        {step.description && (
                          <p className={`text-sm mt-1 ${step.is_completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {step.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        aria-label="Delete step"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Generation Form */}
          {showAIForm && (
            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-md p-4">
              <h3 className="font-medium mb-3">Generate Steps with AI</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Please answer these questions to help the AI generate better steps for your task:
              </p>

              {aiQuestions.map((question, index) => (
                <div key={index} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {question}
                  </label>
                  <textarea
                    value={aiAnswers[index]}
                    onChange={(e) => {
                      const newAnswers = [...aiAnswers];
                      newAnswers[index] = e.target.value;
                      setAiAnswers(newAnswers);
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 mt-4">
                <TouchFriendlyButton
                  onClick={() => setShowAIForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </TouchFriendlyButton>
                <TouchFriendlyButton
                  onClick={generateAISteps}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Generate Steps'
                  )}
                </TouchFriendlyButton>
              </div>
            </div>
          )}

          {/* AI Generated Results */}
          {showAIResults && (
            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-md p-4">
              <h3 className="font-medium mb-3">AI-Generated Steps</h3>

              <ul className="space-y-2 mb-4">
                {aiGeneratedSteps.map((step, index) => (
                  <li key={index} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                    <h4 className="font-medium">{step.title}</h4>
                    {step.description && (
                      <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex justify-end gap-2 mt-4">
                <TouchFriendlyButton
                  onClick={discardAISteps}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Discard
                </TouchFriendlyButton>
                <TouchFriendlyButton
                  onClick={saveAISteps}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Save Steps
                </TouchFriendlyButton>
              </div>
            </div>
          )}

          {/* Manual Step Addition */}
          {!showAIForm && !showAIResults && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
              <h3 className="font-medium mb-3">Add New Step</h3>

              <div className="mb-4">
                <label htmlFor="stepTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Step Title
                </label>
                <input
                  type="text"
                  id="stepTitle"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="Enter step title"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="stepDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="stepDescription"
                  value={newStepDescription}
                  onChange={(e) => setNewStepDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  rows={2}
                  placeholder="Enter step description"
                />
              </div>

              <div className="flex justify-end">
                <TouchFriendlyButton
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Add Step
                </TouchFriendlyButton>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <TouchFriendlyButton
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Close
          </TouchFriendlyButton>

          {!showAIForm && !showAIResults && (
            <TouchFriendlyButton
              onClick={startAIGeneration}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Generate with AI
            </TouchFriendlyButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskBreakdownModal;
