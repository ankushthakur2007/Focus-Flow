import { useState } from 'react';

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-gemini');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error testing API:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Gemini API Test</h1>
      
      <button 
        onClick={testApi}
        disabled={loading}
        className="btn btn-primary mb-4"
      >
        {loading ? 'Testing...' : 'Test Gemini API'}
      </button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">API Response:</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
            <p className="font-bold">{result.message}</p>
            {result.response && result.response.candidates && result.response.candidates[0] && (
              <div className="mt-2 p-3 bg-white dark:bg-gray-700 rounded">
                <p>{result.response.candidates[0].content.parts[0].text}</p>
              </div>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer">View full response</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
