import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not defined in environment variables.');
  }

  // Use text-embedding-004 which natively supports output_dimensionality
  const url = `https://googleapis.com{GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text: text }]
      },
      output_dimensionality: 768 // Supported by text-embedding-004
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini API Error details:', data);
    throw new Error(data.error?.message || `API error ${response.status}`);
  }

  // Gemini returns the array inside data.embedding.values
  if (data.embedding?.values) {
    return data.embedding.values;
  }

  throw new Error('No embedding vector returned from Gemini API.');
}

export async function logUserInterest(userId, logText) {
  const embedding = await getEmbedding(logText);

  const { data, error } = await supabase.from('user_logs').insert([
    {
      user_id: userId,
      log_text: logText,
      // If Supabase throws a database error here, wrap it: JSON.stringify(embedding)
      embedding: embedding, 
    },
  ]);

  if (error) throw error;
  return data;
}

export async function searchLikeminds(queryText, currentUserId) {
  const queryEmbedding = await getEmbedding(queryText);

  const { data, error } = await supabase.rpc('match_user_logs', {
    // Ensure this matches the argument data type expected by your Postgres function (usually vector)
    query_embedding: queryEmbedding, 
    match_threshold: 0.10,
    match_count: 10,
    searching_user_id: currentUserId,
  });

  if (error) throw error;
  return data || [];
}
