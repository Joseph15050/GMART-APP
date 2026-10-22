import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Helper to generate 768-dim Vector Embedding using Gemini REST API
export async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured in Vercel environment variables.');
  }

  // Model endpoints to attempt in order
  const modelsToTry = ['text-embedding-004', 'embedding-001'];

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${modelName}`,
            content: { parts: [{ text }] },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.embedding && data.embedding.values) {
        return data.embedding.values; // Array of 768 float values
      }
    } catch (err) {
      console.warn(`Failed with model ${modelName}, trying next...`, err);
    }
  }

  throw new Error('Unable to generate vector embeddings. Please verify your Gemini API key.');
}

// Log user entry to Supabase user_logs
export async function logUserInterest(userId, logText) {
  const embedding = await getEmbedding(logText);

  const { data, error } = await supabase.from('user_logs').insert([
    {
      user_id: userId,
      log_text: logText,
      embedding: embedding,
    },
  ]);

  if (error) throw error;
  return data;
}

// Search for matching likeminds using Supabase pgvector cosine similarity
export async function searchLikeminds(queryText, currentUserId) {
  const queryEmbedding = await getEmbedding(queryText);

  const { data, error } = await supabase.rpc('match_user_logs', {
    query_embedding: queryEmbedding,
    match_threshold: 0.25, // Similarity threshold
    match_count: 10,       // Max results
    searching_user_id: currentUserId,
  });

  if (error) throw error;
  return data || [];
}
