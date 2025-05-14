import { Task } from '../types/task';

// Google Custom Search API key
const API_KEY = 'AIzaSyDeXI0lnEqzEtx6bG4BztgFUzlwInCt1pY';
// Custom Search Engine ID for resource finder
const SEARCH_ENGINE_ID = '42d848a80c20a4fb2'; // Properly configured Search Engine ID

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
  const { title, description, category, mood } = task;

  // Clean and normalize the title
  const cleanTitle = title.trim().replace(/[^\w\s]/gi, '');

  // Base query from title
  let baseQuery = cleanTitle;

  // Add category context if available
  if (category) {
    baseQuery += ` ${category}`;
  }

  // Add mood context if available (can help find resources matching the user's current state)
  if (mood?.mood_type) {
    // Only use positive/productive moods to avoid negative search results
    if (['focused', 'motivated', 'productive', 'energetic', 'creative'].includes(mood.mood_type.toLowerCase())) {
      baseQuery += ` ${mood.mood_type}`;
    }
  }

  // Add description keywords if available
  if (description) {
    // Extract key phrases from description (improved approach)
    const words = description.split(/\s+/);

    // Filter out common stop words and short words
    const stopWords = ['about', 'these', 'those', 'their', 'there', 'where', 'which', 'would',
                      'should', 'could', 'have', 'this', 'that', 'with', 'from', 'your', 'will',
                      'been', 'when', 'what', 'want', 'need', 'like', 'just'];

    const keyWords = words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      return cleanWord.length > 4 && !stopWords.includes(cleanWord);
    }).slice(0, 5); // Take up to 5 keywords

    if (keyWords.length > 0) {
      baseQuery += ` ${keyWords.join(' ')}`;
    }
  }

  // Create specific queries for videos and articles with better search terms
  const videoQuery = `${baseQuery} tutorial how to learn resources`;
  const articleQuery = `${baseQuery} guide tips best practices resources`;

  return { videoQuery, articleQuery };
};

/**
 * Search for videos using Google Custom Search API
 */
export const searchVideos = async (query: string, maxResults: number = 3): Promise<SearchResult[]> => {
  try {
    // Add video-specific terms to the query instead of using searchType
    const videoQuery = `${query} youtube video tutorial`;

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(videoQuery)}&num=${maxResults}`;
    console.log('Fetching videos from URL:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error (${response.status}):`, errorText);
      throw new Error(`Google API returned status: ${response.status}. Details: ${errorText}`);
    }

    const data: SearchResponse = await response.json();
    console.log('Video search results:', data);

    // Filter results to prioritize YouTube links
    const filteredResults = data.items?.filter(item =>
      item.link.includes('youtube.com') ||
      item.link.includes('youtu.be') ||
      (item.pagemap?.cse_image && item.title.toLowerCase().includes('video'))
    ) || [];

    // If we have enough YouTube results, return them, otherwise return all results
    return filteredResults.length >= 2 ? filteredResults.slice(0, maxResults) : (data.items || []);
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
    // Add article-specific terms to the query
    const articleQuery = `${query} article blog guide`;

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(articleQuery)}&num=${maxResults + 2}`; // Request extra results for filtering
    console.log('Fetching articles from URL:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error (${response.status}):`, errorText);
      throw new Error(`Google API returned status: ${response.status}. Details: ${errorText}`);
    }

    const data: SearchResponse = await response.json();
    console.log('Article search results:', data);

    // Filter out YouTube and video results to avoid duplicates with video search
    const filteredResults = data.items?.filter(item =>
      !item.link.includes('youtube.com') &&
      !item.link.includes('youtu.be') &&
      !item.title.toLowerCase().includes('video tutorial')
    ) || [];

    return filteredResults.slice(0, maxResults);
  } catch (error) {
    console.error('Error searching for articles:', error);
    return [];
  }
};

/**
 * Find resources for a task
 */
export const findTaskResources = async (task: Task) => {
  try {
    console.log('Finding resources for task:', task.title);
    const { videoQuery, articleQuery } = generateSearchQueries(task);
    console.log('Generated search queries:', { videoQuery, articleQuery });

    // Search for videos and articles in parallel
    const [videos, articles] = await Promise.all([
      searchVideos(videoQuery),
      searchArticles(articleQuery)
    ]);

    console.log('Search results:', {
      videosCount: videos.length,
      articlesCount: articles.length
    });

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

    const result = {
      videos: videoResources,
      articles: articleResources
    };

    console.log('Formatted resources:', {
      videosCount: videoResources.length,
      articlesCount: articleResources.length
    });

    return result;
  } catch (error) {
    console.error('Error finding task resources:', error);
    // Return empty arrays to prevent breaking the UI
    return {
      videos: [],
      articles: []
    };
  }
};
