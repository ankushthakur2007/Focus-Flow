// API keys configuration
// For production, use environment variables by creating a .env.local file

// Use environment variable if available, otherwise use the hardcoded value
export const GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyAZ9EwR1eEpj4CyS4OrjpY8MMQ93C2iiQw';
