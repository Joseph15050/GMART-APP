import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Generate 768-dim Vector Embedding using gemini-embedding-001
export async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured in Vercel environment variables.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768 // Keep 768 dimensions for your Supabase pgvector column
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini API Error Detail:', data);
    throw new Error(data.error?.message || `Gemini API returned status ${response.status}`);
  }

  if (data.embedding?.values) {
    return data.embedding.values;
  }

  throw new Error('No embedding vector returned from Gemini API.');
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
    match_threshold: 0.25,
    match_count: 10,
    searching_user_id: currentUserId,
  });

  if (error) throw error;
  return data || [];
}
