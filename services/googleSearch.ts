import { Task } from '../types/task';

// Google Custom Search API key
const API_KEY = 'AIzaSyDeXI0lnEqzEtx6bG4BztgFUzlwInCt1pY';
// Custom Search Engine ID (you might need to create one in Google Custom Search Console)
const SEARCH_ENGINE_ID = ''; // This will need to be filled with your actual Search Engine ID

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
  };
}

interface SearchResponse {
  items?: SearchResult[];
}

/**
 * Generate search queries based on task details
 */
export const generateSearchQueries = (task: Task): { videoQuery: string; articleQuery: string } => {
  const { title, description, category } = task;
  
  // Base query from title
  let baseQuery = title;
  
  // Add category context
  if (category) {
    baseQuery += ` ${category}`;
  }
  
  // Add description keywords if available
  if (description) {
    // Extract key phrases from description (simple approach)
    const words = description.split(' ');
    const keyWords = words.filter(word => 
      word.length > 4 && 
      !['about', 'these', 'those', 'their', 'there', 'where', 'which', 'would', 'should', 'could'].includes(word.toLowerCase())
    ).slice(0, 3);
    
    if (keyWords.length > 0) {
      baseQuery += ` ${keyWords.join(' ')}`;
    }
  }
  
  // Create specific queries for videos and articles
  const videoQuery = `${baseQuery} tutorial how to`;
  const articleQuery = `${baseQuery} guide tips`;
  
  return { videoQuery, articleQuery };
};

/**
 * Search for videos using Google Custom Search API
 */
export const searchVideos = async (query: string, maxResults: number = 3): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${maxResults}&searchType=video`
    );
    
    if (!response.ok) {
      throw new Error(`Google API returned status: ${response.status}`);
    }
    
    const data: SearchResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error searching for videos:', error);
    return [];
  }
};

/**
 * Search for articles using Google Custom Search API
 */
export const searchArticles = async (query: string, maxResults: number = 3): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${maxResults}`
    );
    
    if (!response.ok) {
      throw new Error(`Google API returned status: ${response.status}`);
    }
    
    const data: SearchResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error searching for articles:', error);
    return [];
  }
};

/**
 * Find resources for a task
 */
export const findTaskResources = async (task: Task) => {
  const { videoQuery, articleQuery } = generateSearchQueries(task);
  
  // Search for videos and articles in parallel
  const [videos, articles] = await Promise.all([
    searchVideos(videoQuery),
    searchArticles(articleQuery)
  ]);
  
  // Format video results
  const videoResources = videos.map(video => ({
    title: video.title,
    url: video.link,
    description: video.snippet,
    type: 'video' as const,
    thumbnail_url: video.pagemap?.cse_thumbnail?.[0]?.src || 
                  video.pagemap?.cse_image?.[0]?.src || null
  }));
  
  // Format article results
  const articleResources = articles.map(article => ({
    title: article.title,
    url: article.link,
    description: article.snippet,
    type: 'article' as const,
    thumbnail_url: article.pagemap?.cse_thumbnail?.[0]?.src || 
                  article.pagemap?.cse_image?.[0]?.src || null
  }));
  
  return {
    videos: videoResources,
    articles: articleResources
  };
};
