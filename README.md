# 🤖 BoTesh – AI-Powered Chatbot

BoTesh is a modern, full-stack AI chatbot with a beautiful chat UI, markdown/code support, copy-to-clipboard, typing indicator, and real-time web search integration (Brave API). Built with React (frontend) and Node.js/Express (backend), powered by Llama 3 (Groq) and optional Hugging Face image captioning.

## 🌟 Features

- **Modern Chat UI**: Responsive, animated, and accessible chat interface
- **Markdown & Code Support**: Bot replies render markdown, code blocks, and lists
- **Copy-to-Clipboard**: Instantly copy bot replies
- **Typing Indicator**: Animated "BoTesh is typing..." bubble
- **Auto-Scroll & Auto-Focus**: Always see the latest message, input always ready
- **Web Search Integration**: Uses Brave Search API for up-to-date, research-backed answers
- **Image Upload & Captioning**: (Optional) Upload/take a photo and get an AI-generated caption (Hugging Face BLIP)
- **Ctrl+Enter to Send**: Send messages with keyboard shortcut
- **Responsive & Accessible**: Works great on desktop and mobile, with ARIA labels and keyboard navigation

## 🚀 Tech Stack

- **Frontend**: React + Vite + TypeScript + react-markdown
- **Backend**: Node.js (Express, TypeScript)
- **AI**: Groq (Llama 3), Hugging Face BLIP (image captioning)
- **Web Search**: Brave Search API (free tier)

## 🛠️ Setup

### Prerequisites

- Node.js (v18 or higher)
- npm
- (Optional) [Brave Search API key](https://search.brave.com/api) for web search
- (Optional) Hugging Face API key for higher image captioning limits

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/botesh-ai.git
   cd botesh-ai
   ```

2. **Install dependencies:**
   ```sh
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in `backend/`:
     ```env
     GROQ_API_KEY=your_groq_api_key
     BRAVE_SEARCH_API_KEY=your_brave_api_key   # (optional, for web search)
     HUGGINGFACE_API_KEY=your_hf_key           # (optional, for image captioning)
     SUPABASE_URL=your_supabase_url            # (if using Supabase)
     SUPABASE_SERVICE_KEY=your_supabase_key    # (if using Supabase)
     ```

4. **Start the development servers:**
   ```sh
   # In one terminal (backend)
   cd backend
   npm run dev
   # In another terminal (frontend)
   cd frontend
   npm run dev
   ```

5. **Open the app:**
   - Visit [http://localhost:5173](http://localhost:5173) in your browser.

## 🌐 Web Search Integration
- The bot uses Brave Search API for up-to-date answers on news, sports, and current events.
- Get a free API key at [Brave Search API](https://search.brave.com/api) and add it to your backend `.env`.

## 🖼️ Image Upload & Captioning (Optional)
- Upload or take a photo and get an AI-generated caption (uses Hugging Face BLIP).
- Requires no key for small usage, but you can add your Hugging Face API key for higher limits.

## 🧑‍💻 Contributing & PR Workflow
1. **Fork the repo and create a feature branch:**
   ```sh
   git checkout -b feature/your-feature
   ```
2. **Make your changes and commit:**
   ```sh
   git add .
   git commit -m "Describe your feature"
   ```
3. **Push to your fork and open a Pull Request on GitHub.**
4. **After review, merge your PR!**

## 📦 Deployment
- Deploy frontend to Vercel, Netlify, or your favorite static host.
- Deploy backend to Render, Railway, or any Node.js host.

## 📄 License
MIT 