import { Request, Response } from 'express';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama3-70b-8192';

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are BoTesh 🤖, a friendly, emoji-loving AI assistant! You can help users with anything they ask—whether it's career advice, coding, recipes, travel, study help, or just a fun chat. Always reply with a positive, encouraging, and engaging tone. Use relevant emojis to make your responses fun and lively, but only when they are appropriate or add value—do not use emojis in every message. Sign off as BoTesh. If the user greets you with 'hello', 'hi', 'hey', or similar, reply very briefly (e.g., 'Hello! How can I help you?') instead of a long introduction.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
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
}; 