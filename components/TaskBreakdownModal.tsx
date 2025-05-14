import { useState, useEffect, useContext } from 'react';
import { Task, TaskStep } from '../types/task';
import { supabase } from '../services/supabase';
import AuthContext from './AuthContext';
import { getTaskStepSuggestions, getTaskSpecificQuestions } from '../services/gemini';
import TouchFriendlyButton from './TouchFriendlyButton';

interface TaskBreakdownModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const TaskBreakdownModal = ({ task, onClose, onUpdate }: TaskBreakdownModalProps) => {
  const { user } = useContext(AuthContext);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [tempSteps, setTempSteps] = useState<{
    title: string;
    description: string;
    is_completed: boolean;
    order_index: number;
    id?: string; // For existing steps
    isNew?: boolean; // Flag for newly added steps
  }[]>([]);
  const [modifiedStepIds, setModifiedStepIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        console.log('Fetching steps for task:', task.id);

        // Check if task already has steps from the parent component
        if (task.task_steps && Array.isArray(task.task_steps) && task.task_steps.length > 0) {
          console.log('Using steps from task object:', task.task_steps);
          setSteps(task.task_steps);

          // Initialize tempSteps with the steps from task object
          const initialTempSteps = task.task_steps.map(step => ({
            id: step.id,
            title: step.title,
            description: step.description || '',
            is_completed: step.is_completed,
            order_index: step.order_index,
            isNew: false
          }));

          setTempSteps(initialTempSteps);
          setHasUnsavedChanges(false);
          setModifiedStepIds(new Set());
          setLoading(false);
          return;
        }

        // Otherwise fetch steps from the database
        const { data, error } = await supabase
          .from('task_steps')
          .select('*')
          .eq('task_id', task.id)
          .order('order_index', { ascending: true });

        if (error) throw error;

        console.log('Fetched steps from database:', data);

        setSteps(data || []);

        // Initialize tempSteps with the fetched steps
        const initialTempSteps = (data || []).map(step => ({
          id: step.id,
          title: step.title,
          description: step.description || '',
          is_completed: step.is_completed,
          order_index: step.order_index,
          isNew: false
        }));

        setTempSteps(initialTempSteps);
        setHasUnsavedChanges(false);
        setModifiedStepIds(new Set());
      } catch (err: any) {
        console.error('Error fetching task steps:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [task.id, user, task.task_steps]);

  // Handle adding a new step manually (to temporary state only)
  const handleAddStep = () => {
    if (!newStepTitle.trim()) {
      setError('Step title cannot be empty');
      return;
    }

    if (!user) {
      setError('User not authenticated. Please sign in to use this feature.');
      return;
    }

    // Create a new temporary step
    const newTempStep = {
      title: newStepTitle.trim(),
      description: newStepDescription.trim(),
      is_completed: false,
      order_index: tempSteps.length,
      isNew: true
    };

    // Add to temporary steps
    setTempSteps([...tempSteps, newTempStep]);

    // Clear input fields
    setNewStepTitle('');
    setNewStepDescription('');

    // Set flag for unsaved changes
    setHasUnsavedChanges(true);

    // Show success message
    setSuccessMessage('Step added. Remember to save your changes.');

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Handle toggling step completion (in temporary state only)
  const handleToggleStep = (stepId: string, isCompleted: boolean) => {
    // Update tempSteps
    setTempSteps(tempSteps.map(step =>
      step.id === stepId ? { ...step, is_completed: !isCompleted } : step
    ));

    // Add to modified steps set
    const newModifiedStepIds = new Set(modifiedStepIds);
    newModifiedStepIds.add(stepId);
    setModifiedStepIds(newModifiedStepIds);

    // Set flag for unsaved changes
    setHasUnsavedChanges(true);
  };

  // Handle deleting a step (from temporary state only)
  const handleDeleteStep = (stepId: string) => {
    // Remove from tempSteps
    setTempSteps(tempSteps.filter(step => step.id !== stepId));

    // If it's an existing step (not a new one), add to modified steps
    const stepToDelete = tempSteps.find(step => step.id === stepId);
    if (stepToDelete && !stepToDelete.isNew) {
      // We'll handle actual deletion when saving changes
      const newModifiedStepIds = new Set(modifiedStepIds);
      newModifiedStepIds.add(stepId);
      setModifiedStepIds(newModifiedStepIds);
    }

    // Set flag for unsaved changes
    setHasUnsavedChanges(true);

    // Show success message
    setSuccessMessage('Step removed. Remember to save your changes.');

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Start AI step generation process
  const startAIGeneration = async () => {
    setShowAIForm(true);
    setIsGeneratingAI(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the user's most recent mood
      const { data: moodData, error: moodError } = await supabase
        .from('moods')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (moodError) throw moodError;

      const currentMood = moodData && moodData.length > 0 ? moodData[0].name : 'neutral';

      // Generate task-specific questions
      const result = await getTaskSpecificQuestions(task, currentMood);

      setAiQuestions(result.questions);
      setAiAnswers(Array(result.questions.length).fill(''));
    } catch (err: any) {
      console.error('Error generating task-specific questions:', err);
      // Fallback to default questions
      setAiQuestions([
        "What's the main goal you want to achieve with this task?",
        "How much time do you have to complete this task?",
        "What resources or skills do you need for this task?",
        "Are there any specific challenges you anticipate?"
      ]);
      setAiAnswers(Array(4).fill(''));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generate steps using AI
  const generateAISteps = async () => {
    if (!user) {
      setError('User not authenticated. Please sign in to use this feature.');
      return;
    }

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
    if (!user) {
      setError('User not authenticated. Please sign in to use this feature.');
      return;
    }

    if (aiGeneratedSteps.length === 0) {
      setError('No steps to save. Please generate steps first.');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting to save AI-generated steps...');

      // Create new steps directly in the database first
      const newStepsData = aiGeneratedSteps.map((step, index) => ({
        task_id: task.id,
        user_id: user.id,
        title: step.title,
        description: step.description || '',
        is_completed: false,
        order_index: tempSteps.length + index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      console.log('Inserting new steps directly:', newStepsData);

      // Insert the steps into the database
      const { data: insertedSteps, error: insertError } = await supabase
        .from('task_steps')
        .insert(newStepsData)
        .select();

      if (insertError) {
        throw new Error(`Error inserting AI steps: ${insertError.message}`);
      }

      console.log('Successfully inserted steps:', insertedSteps);

      // Update tempSteps with the newly inserted steps
      const newTempSteps = [
        ...tempSteps,
        ...(insertedSteps || []).map(step => ({
          id: step.id,
          title: step.title,
          description: step.description || '',
          is_completed: step.is_completed,
          order_index: step.order_index,
          isNew: false // Not new anymore since they're in the database
        }))
      ];

      setTempSteps(newTempSteps);
      setSteps([...steps, ...(insertedSteps || [])]);
      setShowAIResults(false);
      setHasUnsavedChanges(false); // Already saved to database

      // Mark steps as finalized
      const { error: finalizeError } = await supabase
        .from('tasks')
        .update({
          steps_finalized: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (finalizeError) {
        console.error('Error finalizing steps:', finalizeError);
        setError('Error finalizing steps: ' + finalizeError.message);
      } else {
        // Update the local task state
        task.steps_finalized = true;

        // Update task.task_steps with the new steps
        if (!task.task_steps) {
          task.task_steps = [];
        }

        task.task_steps = [...task.task_steps, ...(insertedSteps || [])];
        console.log('Updated task with new steps:', task);

        // Show success message
        setSuccessMessage('AI-generated steps saved and finalized successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }

      // Refresh task progress
      const { error: refreshError } = await supabase
        .rpc('refresh_task_progress', { task_id_param: task.id });

      if (refreshError) {
        console.error('Error refreshing task progress:', refreshError);
      }

      // Notify parent component to update the UI
      console.log('Calling onUpdate to refresh the task in parent component');
      onUpdate();
    } catch (err: any) {
      console.error('Error saving AI steps:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Discard AI-generated steps
  const discardAISteps = () => {
    setAiGeneratedSteps([]);
    setShowAIResults(false);
  };

  // Save all changes to the database
  const saveChanges = async () => {
    if (!user) {
      setError('User not authenticated. Please sign in to use this feature.');
      return;
    }

    if (!hasUnsavedChanges) {
      return; // Nothing to save
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Add new steps
      const newSteps = tempSteps.filter(step => step.isNew).map(step => ({
        task_id: task.id,
        user_id: user.id,
        title: step.title,
        description: step.description,
        is_completed: step.is_completed,
        order_index: step.order_index
      }));

      if (newSteps.length > 0) {
        console.log(`Inserting ${newSteps.length} new steps:`, newSteps);
        const { data: insertedData, error: insertError } = await supabase
          .from('task_steps')
          .insert(newSteps)
          .select();

        if (insertError) throw insertError;

        console.log('Steps inserted successfully:', insertedData);
      }

      // 2. Update modified steps
      // Convert Set to Array before iterating
      const modifiedStepIdsArray = Array.from(modifiedStepIds);

      for (const stepId of modifiedStepIdsArray) {
        // Check if the step still exists in tempSteps
        const stepToUpdate = tempSteps.find(step => step.id === stepId);

        if (stepToUpdate) {
          // Update the step
          const { error: updateError } = await supabase
            .from('task_steps')
            .update({
              title: stepToUpdate.title,
              description: stepToUpdate.description,
              is_completed: stepToUpdate.is_completed,
              updated_at: new Date().toISOString()
            })
            .eq('id', stepId);

          if (updateError) throw updateError;
        } else {
          // Step was deleted
          const { error: deleteError } = await supabase
            .from('task_steps')
            .delete()
            .eq('id', stepId);

          if (deleteError) throw deleteError;
        }
      }

      // 3. Refresh task progress
      const { error: refreshError } = await supabase
        .rpc('refresh_task_progress', { task_id_param: task.id });

      if (refreshError) {
        console.error('Error refreshing task progress:', refreshError);
      }

      // 4. Fetch updated steps
      console.log('Fetching updated steps for task:', task.id);
      const { data: updatedSteps, error: fetchError } = await supabase
        .from('task_steps')
        .select('*')
        .eq('task_id', task.id)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      console.log('Fetched updated steps:', updatedSteps);

      // 5. Update local state
      setSteps(updatedSteps || []);

      // Initialize tempSteps with the fetched steps
      const initialTempSteps = (updatedSteps || []).map(step => ({
        id: step.id,
        title: step.title,
        description: step.description || '',
        is_completed: step.is_completed,
        order_index: step.order_index,
        isNew: false
      }));

      setTempSteps(initialTempSteps);
      setHasUnsavedChanges(false);
      setModifiedStepIds(new Set());

      // 6. Notify parent component
      onUpdate();

      // 7. Show success message
      setSuccessMessage('Changes saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize steps for this task
  const finalizeSteps = async () => {
    if (!user) {
      setError('User not authenticated. Please sign in to use this feature.');
      return;
    }

    // First save any unsaved changes
    if (hasUnsavedChanges) {
      await saveChanges();
    }

    try {
      // Update the task to mark steps as finalized
      const { error } = await supabase
        .from('tasks')
        .update({
          steps_finalized: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      // Update the local task state
      task.steps_finalized = true;

      // Notify parent component
      onUpdate();

      // Show success message
      setSuccessMessage('Steps finalized successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error finalizing steps:', err);
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">Task Breakdown: {task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
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

          {successMessage && (
            <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-3 rounded-md mb-4">
              {successMessage}
            </div>
          )}

          {hasUnsavedChanges && (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 p-3 rounded-md mb-4 flex items-center justify-between">
              <span>You have unsaved changes</span>
              <TouchFriendlyButton
                onClick={saveChanges}
                disabled={isSaving}
                className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
              >
                {isSaving ? 'Saving...' : 'Save Progress'}
              </TouchFriendlyButton>
            </div>
          )}

          {/* Task Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Progress</h3>
              <span className="text-sm font-medium bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                {task.progress || 0}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
                  (task.progress || 0) < 30 ? 'from-danger-400 to-danger-600' :
                  (task.progress || 0) < 70 ? 'from-warning-400 to-warning-600' :
                  'from-success-400 to-success-600'
                }`}
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
            ) : tempSteps.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No steps yet. Add steps below or generate with AI.
              </div>
            ) : (
              <ul className="space-y-2">
                {tempSteps.map((step, index) => (
                  <li key={step.id || `new-${index}`} className={`border rounded-md p-3 ${step.isNew ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={step.is_completed}
                        onChange={() => step.id ? handleToggleStep(step.id, step.is_completed) : null}
                        className="mt-1 h-4 w-4 text-primary-600 rounded"
                      />
                      <div className="flex-grow">
                        <h4 className={`font-medium ${step.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                          {step.title}
                          {step.isNew && <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">(New)</span>}
                        </h4>
                        {step.description && (
                          <p className={`text-sm mt-1 ${step.is_completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {step.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => step.id ? handleDeleteStep(step.id) : handleDeleteStep(`new-${index}`)}
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
                Please answer these task-specific questions to help the AI generate better steps for your task:
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

          {/* Steps Finalized Message */}
          {task.steps_finalized && !showAIForm && !showAIResults && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-green-500 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Steps Finalized</h3>
                  <div className="mt-1 text-sm text-green-700 dark:text-green-400">
                    <p>The steps for this task have been finalized. You can no longer add or modify steps.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Step Addition */}
          {!showAIForm && !showAIResults && !task.steps_finalized && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Add New Step</h3>

              <div className="mb-4">
                <label htmlFor="stepTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Step Title
                </label>
                <input
                  type="text"
                  id="stepTitle"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  placeholder="Enter step title"
                />
              </div>

              <div className="mb-5">
                <label htmlFor="stepDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="stepDescription"
                  value={newStepDescription}
                  onChange={(e) => setNewStepDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  rows={3}
                  placeholder="Enter step description"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <TouchFriendlyButton
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim() || isSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-md hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 transition-all duration-300 active:shadow-inner active:scale-95"
                >
                  Add Step
                </TouchFriendlyButton>
                {tempSteps.length > 0 && (
                  <>
                    <TouchFriendlyButton
                      onClick={saveChanges}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-md hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 transition-all duration-300 active:shadow-inner active:scale-95"
                    >
                      {isSaving ? 'Saving...' : 'Save Progress'}
                    </TouchFriendlyButton>
                    <TouchFriendlyButton
                      onClick={finalizeSteps}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:shadow-md hover:from-success-600 hover:to-success-700 disabled:opacity-50 transition-all duration-300 active:shadow-inner active:scale-95"
                    >
                      Done
                    </TouchFriendlyButton>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <TouchFriendlyButton
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-sm active:shadow-inner active:scale-95"
          >
            Close
          </TouchFriendlyButton>

          {!showAIForm && !showAIResults && !task.steps_finalized && (
            <TouchFriendlyButton
              onClick={startAIGeneration}
              disabled={isGeneratingAI}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-md hover:from-primary-600 hover:to-primary-700 flex items-center disabled:opacity-50 transition-all duration-300 active:shadow-inner active:scale-95"
            >
              {isGeneratingAI ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing...
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Generate with AI
                </>
              )}
            </TouchFriendlyButton>
          )}
          {!showAIForm && !showAIResults && task.steps_finalized && (
            <div className="text-gray-500 dark:text-gray-400 flex items-center bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Steps are finalized</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskBreakdownModal;
