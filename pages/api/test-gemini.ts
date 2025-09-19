import type { NextApiRequest, NextApiResponse } from 'next';
import { GEMINI_API_KEY } from '../../src/lib/config/api-keys';

type ResponseData = {
  message: string;
  response?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    // Make a simple request to the Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Say 'Hello from Gemini API!' and nothing else." }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 100,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    res.status(200).json({ 
      message: 'API test successful',
      response: data
    });
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    res.status(500).json({ 
      message: 'API test failed', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
