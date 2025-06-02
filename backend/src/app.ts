import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { handleChat as originalHandleChat } from './controllers/chatController.js';
import multer from 'multer';
import { Request } from 'express';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Multer setup for image upload
const upload = multer({ storage: multer.memoryStorage() });

// --- Brave Search API integration ---
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

async function searchWeb(query: string): Promise<string[]> {
  if (!BRAVE_SEARCH_API_KEY) return [];
  const resp = await fetch(BRAVE_SEARCH_URL + '?q=' + encodeURIComponent(query) + '&count=5', {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_SEARCH_API_KEY },
  });
  if (!resp.ok) return [];
  const data = await resp.json() as { web?: { results?: Array<{ title: string; description: string }> } };
  if (!data.web || !Array.isArray(data.web.results)) return [];
  return data.web.results.map((r) => `${r.title}: ${r.description}`);
}

// Routes
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  // Heuristic: if the query looks like it needs web search
  const needsWeb = /\b(who|latest|news|today|202[4-9]|current|winner|score|result|update|breaking|live)\b/i.test(message);
  let webResults: string[] = [];
  if (needsWeb && BRAVE_SEARCH_API_KEY) {
    webResults = await searchWeb(message);
  }
  // Compose system prompt
  let systemPrompt = `You are BoTesh 🤖, a highly knowledgeable, research-driven AI assistant. Always provide detailed, specific, and up-to-date answers. If web search results are provided, use them to inform your answer and cite them if relevant. Only use emojis when appropriate. Sign off as BoTesh. If the user greets you with 'hello', 'hi', 'hey', or similar, reply very briefly (e.g., 'Hello! How can I help you?').`;
  if (webResults.length > 0) {
    systemPrompt += `\n\nWeb search results (use these for your answer):\n` + webResults.map((r, i) => `[${i+1}] ${r}`).join('\n');
  }
  // Call LLM (Groq)
  try {
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const MODEL = 'llama3-70b-8192';
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 700,
      })
    });
    if (!groqResponse.ok) {
      const errorData: any = await groqResponse.json();
      console.error('Groq API error:', errorData);
      return res.status(500).json({ error: errorData.error?.message || 'Failed to process chat request' });
    }
    const data: any = await groqResponse.json();
    const response = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
    res.json({ response });
  } catch (error) {
    console.error('Error in chat controller:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Image upload endpoint
app.post('/upload-image', upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // Send to Hugging Face BLIP image captioning
    const hfRes = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        // 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` // Uncomment if you have a key
      },
      body: req.file.buffer,
    });
    if (!hfRes.ok) {
      return res.status(500).json({ error: 'Failed to analyze image' });
    }
    const hfData = await hfRes.json();
    // BLIP returns [{ generated_text: ... }]
    const caption = Array.isArray(hfData) && hfData[0]?.generated_text
      ? hfData[0].generated_text
      : 'I could not generate a caption for this image.';
    res.json({ response: caption });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 