import { ChatMessage as ChatMessageType } from '../types/chat';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.is_user;
  const formattedTime = message.created_at
    ? format(parseISO(message.created_at), 'h:mm a')
    : '';

  // Add a fade-in animation effect
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger the animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Process message text to handle line breaks and links
  const formatMessageText = (text: string) => {
    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const withLinks = text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-blue-400 hover:text-blue-300">${url}</a>`;
    });

    // Replace line breaks with <br> tags
    return withLinks.replace(/\n/g, '<br>');
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 transition-opacity duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white mr-2 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
        isUser
          ? 'bg-primary-500 text-white rounded-br-none'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
      }`}>
        <div
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: formatMessageText(message.message) }}
        />
        <div className={`text-xs mt-1 ${
          isUser
            ? 'text-primary-100'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {formattedTime}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 ml-2 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
