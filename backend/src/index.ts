import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { CohereClient } from 'cohere-ai';
import { getLiveNews, formatNews } from './newsResolver';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const cohere = new CohereClient({ token: COHERE_API_KEY! });

// Supabase setup
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// List available Gemini models for this API key using REST API
(async () => {
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1/models?key=' + GEMINI_API_KEY
    );
    const data: any = await res.json();
    console.log('Available Gemini models for your API key:');
    if (data.models) {
      for (const m of data.models) {
        console.log('-', m.name);
      }
    } else {
      console.log('No models found or invalid API key.');
    }
  } catch (err) {
    console.error('Error listing Gemini models:', err);
  }
})();

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY!,
      },
    });
    if (!response.ok) {
      throw new Error('Brave Search API request failed');
    }
    const data = await response.json() as any;
    return data.web?.results?.map((result: any) => ({
      title: result.title,
      description: result.description,
      url: result.url,
    })) || [];
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
}

// Wikipedia Search
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(query)}&srlimit=3`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Wikipedia API request failed');
    const data = await response.json() as any;
    return (data.query?.search || []).map((item: any) => ({
      title: item.title,
      description: item.snippet.replace(/<[^>]+>/g, ''),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    }));
  } catch (error) {
    console.error('Error searching Wikipedia:', error);
    return [];
  }
}

// Multi-Source Search Aggregator
async function multiSourceSearch(query: string): Promise<SearchResult[]> {
  const [brave, wiki] = await Promise.all([
    searchWeb(query),
    searchWikipedia(query)
  ]);
  // Merge and deduplicate by URL
  const all = [...brave, ...wiki];
  const seen = new Set();
  const deduped = all.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  return deduped;
}

// Query Understanding: Rephrase user query using Gemini
async function rephraseQuery(userQuery: string): Promise<string> {
  try {
    const prompt = `You are a search assistant. Rephrase the following user query to make it clear and optimized for web or AI search.\nInput: ${userQuery}\nRephrased:`;
    const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-pro-002' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract the rephrased query (after 'Rephrased:')
    const match = text.match(/Rephrased:(.*)/i);
    return match ? match[1].trim() : text.trim();
  } catch (error) {
    console.error('Error rephrasing query:', error);
    return userQuery;
  }
}

// Helper: Chunk and trim search results for context
function getTopSources(searchResults: SearchResult[], maxSources = 5, maxChars = 1200): string {
  // Take top N sources, trim total length
  let total = 0;
  const chunks: string[] = [];
  for (const r of searchResults.slice(0, maxSources)) {
    const chunk = `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`;
    if (total + chunk.length > maxChars) break;
    chunks.push(chunk);
    total += chunk.length;
  }
  return chunks.join('\n\n');
}

// Context Memory: Store last N turns (single-user, in-memory for MVP)
const CONTEXT_WINDOW = 5;

// Helper: Get last N turns from Supabase for a session
async function getConversationHistory(sessionId: string, n: number): Promise<{ user: string; bot: string }[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('user_message, bot_response')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(n);
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return (data || []).reverse().map((row: any) => ({ user: row.user_message, bot: row.bot_response }));
}

// Helper: Store a turn in Supabase
async function storeConversationTurn(sessionId: string, user: string, bot: string) {
  const { error } = await supabase
    .from('conversations')
    .insert([{ session_id: sessionId, user_message: user, bot_response: bot }]);
  if (error) {
    console.error('Supabase insert error:', error);
  }
}

// Helper: Auto-link URLs in markdown
function autoLinkUrls(text: string): string {
  // Replace plain URLs with markdown links
  return text.replace(/(https?:\/\/\S+)/g, '[$1]($1)');
}

// Helper: Generate follow-up suggestions
function getFollowUpSuggestions(query: string): string[] {
  if (/cricket|ipl/i.test(query)) {
    return [
      'Show latest IPL news',
      'List top IPL teams',
      'Who is the current Orange Cap holder?'
    ];
  }
  if (/js|javascript|web/i.test(query)) {
    return [
      'Show top JavaScript frameworks',
      'How to optimize web performance?',
      'What is the best way to learn JavaScript?'
    ];
  }
  // Add more topic-based suggestions as needed
  return ['Ask a follow-up question', 'Request more details'];
}

app.post('/chat', async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !session_id) {
      return res.status(400).json({ error: 'Message and session_id are required' });
    }
    // Chit-chat intent detection
    const chitChatRegex = /^(hi|hello|hey|good morning|good evening|good night|how are you|what's up|yo|sup)/i;
    if (chitChatRegex.test(message.trim())) {
      const prompt = `You are BoTesh, a friendly AI assistant. Respond to the user's greeting in a warm, conversational way.`;
      let response = null;
      // Try Gemini
      try {
        let model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-pro-002' });
        const result = await model.generateContent(prompt);
        response = result.response.text();
      } catch (err) {
        // Try Cohere
        try {
          const result = await cohere.chat({
            model: 'command-r',
            message: prompt,
            temperature: 0.7,
            maxTokens: 256,
          });
          response = result.text;
        } catch (err2) {
          response = "Limit reached. Please try again later after some time.";
        }
      }
      response = autoLinkUrls(response || "Hello!");
      await storeConversationTurn(session_id, message, response);
      res.json({ response });
      return;
    }
    // News intent detection
    const newsRegex = /(latest|breaking) news|headlines|top stories/i;
    if (newsRegex.test(message.trim())) {
      const articles = await getLiveNews(message);
      if (articles.length > 0) {
        const newsResponse = formatNews(articles);
        await storeConversationTurn(session_id, message, newsResponse);
        res.json({ response: newsResponse });
        return;
      } else {
        const fallbackMsg = 'Sorry, I could not fetch the latest news at this time.';
        await storeConversationTurn(session_id, message, fallbackMsg);
        res.json({ response: fallbackMsg });
        return;
      }
    }
    // Step 1: Query Understanding
    const rewrittenQuery = await rephraseQuery(message);
    console.log('Rephrased Query:', rewrittenQuery);
    // Step 2: Multi-Source Search (Brave + Wikipedia)
    const searchResults = await multiSourceSearch(rewrittenQuery);
    console.log('Aggregated Search Results:', searchResults);
    // Step 3: LLM Synthesis (with persistent context)
    const contextTurns = await getConversationHistory(session_id, CONTEXT_WINDOW);
    const context = getTopSources(searchResults, 5, 1200);
    const historyBlock = contextTurns.map((turn, i) => `User: ${turn.user}\nBot: ${turn.bot}`).join('\n');
    const prompt = `You are BoTesh, a helpful AI assistant.\n\n<<Conversation History>>\n${historyBlock}\n\n<<User Query>>\n${message}\n\n<<Rewritten Query>>\n${rewrittenQuery || message}\n\n<<Top 5 Sources>>\n${context}\n\nInstructions: Use ONLY the web search results to answer the user's question. If the search results are not relevant, say you don't know. Quote or summarize the search results directly, and cite sources inline.`;
    let response = null;
    // Try Gemini
    try {
      let model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-pro-002' });
      const result = await model.generateContent(prompt);
      response = result.response.text();
    } catch (err) {
      // Try Cohere
      try {
        const result = await cohere.chat({
          model: 'command-r',
          message: prompt,
          temperature: 0.7,
          maxTokens: 1024,
        });
        response = result.text;
      } catch (err2) {
        response = "Limit reached. Please try again later after some time.";
      }
    }
    // Step 4: Response Formatting
    response = autoLinkUrls(response || "I apologize, but I couldn't generate a response.");
    // Store turn in Supabase
    await storeConversationTurn(session_id, message, response);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 