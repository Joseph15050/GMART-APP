import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Robust embedding fetch with endpoint fallback
export async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured in Vercel environment variables.');
  }

  // Model endpoints to try sequentially
  const models = ['text-embedding-004', 'gemini-embedding-001'];
  
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: 768
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.embedding?.values) {
        return data.embedding.values;
      }
      
      console.warn(`Model ${model} failed, trying next fallback...`, data);
    } catch (err) {
      console.error(`Error requesting model ${model}:`, err);
    }
  }

  throw new Error('Unable to generate vector embeddings. Please verify your Gemini API key in Vercel.');
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
    match_threshold: 0.10,
    match_count: 10,
    searching_user_id: currentUserId,
  });

  if (error) throw error;
  return data || [];
}
