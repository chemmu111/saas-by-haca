import { useState } from 'react';

export const useAIHashtags = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Mock AI hashtag generation (replace with actual AI API call)
  const generateHashtags = async (caption, existingHashtags = [], category = '') => {
    setLoading(true);
    setError('');

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Analyze caption for keywords
      const words = caption.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);

      // Remove existing hashtags
      const existingTags = new Set(existingHashtags.map(tag => tag.toLowerCase()));

      // Trending hashtags database (mock data)
      const trendingHashtags = {
        business: ['business', 'entrepreneur', 'startup', 'marketing', 'success'],
        food: ['foodie', 'delicious', 'yum', 'cooking', 'recipe'],
        travel: ['travel', 'wanderlust', 'adventure', 'vacation', 'explore'],
        fitness: ['fitness', 'workout', 'health', 'gym', 'motivation'],
        fashion: ['fashion', 'style', 'outfit', 'beauty', 'model'],
        tech: ['technology', 'innovation', 'coding', 'programming', 'ai'],
        nature: ['nature', 'photography', 'landscape', 'outdoor', 'beautiful'],
        lifestyle: ['lifestyle', 'life', 'happiness', 'inspiration', 'motivation']
      };

      // Determine category from caption
      let detectedCategory = category;
      if (!detectedCategory) {
        const categoryKeywords = {
          business: ['business', 'work', 'office', 'company', 'meeting', 'professional'],
          food: ['food', 'eat', 'drink', 'restaurant', 'cooking', 'recipe', 'delicious'],
          travel: ['travel', 'trip', 'vacation', 'destination', 'explore', 'adventure'],
          fitness: ['fitness', 'workout', 'gym', 'exercise', 'health', 'training'],
          fashion: ['fashion', 'style', 'outfit', 'dress', 'beauty', 'model'],
          tech: ['tech', 'coding', 'programming', 'software', 'computer', 'digital'],
          nature: ['nature', 'outdoor', 'landscape', 'mountain', 'beach', 'park'],
          lifestyle: ['life', 'happiness', 'inspiration', 'motivation', 'success']
        };

        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(keyword => words.includes(keyword))) {
            detectedCategory = cat;
            break;
          }
        }
      }

      // Generate hashtag suggestions
      const generatedTags = [];

      // Add trending hashtags for detected category
      if (detectedCategory && trendingHashtags[detectedCategory]) {
        generatedTags.push(...trendingHashtags[detectedCategory]);
      }

      // Add caption-based hashtags
      const captionTags = words
        .filter(word => word.length >= 3 && word.length <= 15)
        .slice(0, 5) // Limit to 5 caption-based tags
        .map(word => word.charAt(0).toUpperCase() + word.slice(1));

      generatedTags.push(...captionTags);

      // Add general popular hashtags
      const generalTags = ['love', 'instagood', 'photooftheday', 'beautiful', 'happy', 'cute', 'tbt', 'followme'];
      generatedTags.push(...generalTags);

      // Remove duplicates and existing hashtags
      const uniqueTags = [...new Set(generatedTags)]
        .filter(tag => !existingTags.has(tag.toLowerCase()))
        .slice(0, 20); // Limit to 20 suggestions

      // Add metadata for each suggestion
      const suggestionsWithMeta = uniqueTags.map(tag => ({
        tag,
        category: detectedCategory || 'general',
        popularity: Math.floor(Math.random() * 100) + 1, // Mock popularity score
        relevance: Math.floor(Math.random() * 100) + 1 // Mock relevance score
      }));

      // Sort by relevance
      suggestionsWithMeta.sort((a, b) => b.relevance - a.relevance);

      setSuggestions(suggestionsWithMeta);

    } catch (err) {
      console.error('Error generating hashtags:', err);
      setError('Failed to generate hashtag suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setError('');
  };

  return {
    suggestions,
    loading,
    error,
    generateHashtags,
    clearSuggestions
  };
};
