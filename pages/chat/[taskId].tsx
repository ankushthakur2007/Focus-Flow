import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../services/supabase';
import { getChatHistory, sendMessage } from '../../services/chat';
import { Task } from '../../types/task';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import ChatMessage from '../../components/ChatMessage';
import ChatInput from '../../components/ChatInput';
import AuthContext from '../../components/AuthContext';

const ChatPage = () => {
  const router = useRouter();
  const { taskId } = router.query;
  const { user, loading: authLoading } = useContext(AuthContext);
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch task details and chat history
  useEffect(() => {
    if (!taskId || !user) return;

    const fetchTaskAndChat = async () => {
      setLoading(true);
      try {
        // Fetch task details
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (taskError) throw taskError;
        setTask(taskData);

        // Fetch chat history
        const chatHistory = await getChatHistory(taskId as string);
        setMessages(chatHistory);
      } catch (error) {
        console.error('Error fetching task or chat history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskAndChat();

    // Set up realtime subscription for new messages
    const subscription = supabase
      .channel('public:task_chats')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_chats',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessageType;

          // Check if this message is already in our state to prevent duplicates
          // We use created_at as part of the check since messages might not have IDs yet
          setMessages(prev => {
            // Check if we already have this message
            const isDuplicate = prev.some(msg =>
              (msg.id && msg.id === newMessage.id) ||
              (msg.created_at === newMessage.created_at &&
               msg.message === newMessage.message &&
               msg.is_user === newMessage.is_user)
            );

            // Only add if it's not a duplicate
            return isDuplicate ? prev : [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (message: string) => {
    if (!task || !user || !taskId) return;

    // Don't add the user message to UI immediately anymore
    // The message will be added via the realtime subscription
    // This prevents duplicate messages

    setSending(true);

    try {
      // The sendMessage function now throws errors instead of returning null
      await sendMessage(message, taskId as string, user.id, task);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);

      // Add detailed error message if the AI response fails
      const errorMessage: ChatMessageType = {
        task_id: taskId as string,
        message: `Sorry, I encountered an error while processing your request. Please try again later. ${
          error instanceof Error
            ? `\n\nError details: ${error.message}`
            : ''
        }`,
        is_user: false,
        created_at: new Date().toISOString()
      };

      // Add the error message to the UI
      // Check for duplicates first
      setMessages(prev => {
        const isDuplicate = prev.some(msg =>
          msg.message === errorMessage.message &&
          msg.is_user === errorMessage.is_user
        );
        return isDuplicate ? prev : [...prev, errorMessage];
      });

      // Also save the error message to the database for consistency
      try {
        await supabase
          .from('task_chats')
          .insert([{
            task_id: taskId,
            user_id: user.id,
            message: errorMessage.message,
            is_user: false,
            created_at: new Date().toISOString(),
          }]);
      } catch (dbError) {
        console.error('Failed to save error message to database:', dbError);
      }
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Task not found or you don't have permission to view it.</p>
          <Link href="/tasks" className="btn btn-primary">
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-4 max-w-4xl h-[100vh] sm:h-auto">
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-md overflow-hidden flex flex-col chat-container h-full">
        {/* Chat Header */}
        <div className="bg-primary-500 text-white p-4 flex items-center sticky top-0 z-10 shadow-sm">
          <Link href="/tasks" className="mr-3 hover:bg-primary-600 p-2 rounded-full transition-colors" aria-label="Back to tasks">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-grow overflow-hidden">
            <h1 className="text-xl font-bold truncate">{task.title}</h1>
            <div className="flex items-center text-sm text-primary-100 flex-wrap">
              <span className="mr-2">{task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-200"></span>
              <span className="ml-2">{task.priority.toUpperCase()}</span>
            </div>
          </div>
          {task.description && (
            <div className="relative group">
              <button
                className="p-2 hover:bg-primary-600 rounded-full transition-colors"
                aria-label="View task description"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-3 text-gray-800 dark:text-gray-200 text-sm z-20 hidden group-hover:block">
                <strong className="block mb-1">Description:</strong>
                {task.description}
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 chat-messages">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="text-center font-medium mb-2">
                No messages yet
              </p>
              <p className="text-center text-sm max-w-md">
                Start the conversation by sending a message about your task. The AI assistant has context about this task and can provide specific guidance.
              </p>
            </div>
          ) : (
            <>
              {/* Welcome message */}
              {messages.length > 0 && messages[0].is_user && (
                <div className="mb-6 text-center">
                  <div className="inline-block bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                    Welcome to task-specific chat! Ask questions related to "{task.title}" for personalized assistance.
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage key={message.id || `${message.task_id}-${message.created_at}`} message={message} />
              ))}

              {/* Typing indicator when sending */}
              {sending && (
                <div className="flex justify-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white mr-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 max-w-[75%] rounded-bl-none">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse animation-delay-200"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse animation-delay-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={sending} />
      </div>
    </div>
  );
};

export default ChatPage;
