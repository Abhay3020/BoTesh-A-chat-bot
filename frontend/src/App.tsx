import { useState, useRef, useEffect } from 'react'
import { FaRobot, FaUser } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import { useRef as useReactRef } from 'react'

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Star = {
  x: number;
  y: number;
  r: number;
  color: string;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const inputRef = useReactRef<HTMLTextAreaElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    inputRef.current?.focus()
  }, [messages])

  // Realistic galaxy and stars animation
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Galaxy center
    const cx = width / 2;
    const cy = height / 2;
    const galaxyRadius = Math.min(width, height) * 0.32;

    // --- Nebula clouds (blurred ellipses) ---
    const nebulae = [
      { x: cx + galaxyRadius * 0.3, y: cy - galaxyRadius * 0.2, rx: 180, ry: 60, color: 'rgba(168,85,247,0.10)' },
      { x: cx - galaxyRadius * 0.2, y: cy + galaxyRadius * 0.2, rx: 120, ry: 40, color: 'rgba(59,130,246,0.10)' },
      { x: cx + galaxyRadius * 0.1, y: cy + galaxyRadius * 0.3, rx: 90, ry: 30, color: 'rgba(236,72,153,0.08)' },
      { x: cx - galaxyRadius * 0.3, y: cy - galaxyRadius * 0.1, rx: 60, ry: 24, color: 'rgba(236,72,153,0.06)' },
    ];

    // --- Spiral arms with stars ---
    const ARM_COUNT = 4;
    const STARS_PER_ARM = 90;
    const SPIRAL_TURNS = 2.2;
    const stars: Star[] = [];
    for (let arm = 0; arm < ARM_COUNT; arm++) {
      const armAngle = (2 * Math.PI * arm) / ARM_COUNT;
      for (let i = 0; i < STARS_PER_ARM; i++) {
        const t = i / STARS_PER_ARM;
        const angle = armAngle + t * SPIRAL_TURNS * 2 * Math.PI + Math.sin(t * 8) * 0.12;
        const radius = t * galaxyRadius * (0.7 + 0.3 * Math.random());
        const x = cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 18;
        const y = cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 18;
        // Star color: mostly white, some blue/yellow/red
        const colorRand = Math.random();
        let color = '#fff';
        if (colorRand < 0.12) color = '#fbbf24'; // yellow
        else if (colorRand < 0.22) color = '#60a5fa'; // blue
        else if (colorRand < 0.27) color = '#f472b6'; // pinkish
        else if (colorRand < 0.30) color = '#f87171'; // red
        const r = 0.7 + Math.random() * 1.7;
        const baseAlpha = 0.7 + Math.random() * 0.3;
        const twinkleSpeed = 0.5 + Math.random() * 1.5;
        const twinklePhase = Math.random() * Math.PI * 2;
        stars.push({ x, y, r, color, baseAlpha, twinkleSpeed, twinklePhase });
      }
    }
    // Add some random background stars
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const colorRand = Math.random();
      let color = '#fff';
      if (colorRand < 0.10) color = '#fbbf24';
      else if (colorRand < 0.18) color = '#60a5fa';
      else if (colorRand < 0.22) color = '#f472b6';
      else if (colorRand < 0.25) color = '#f87171';
      const r = 0.5 + Math.random() * 1.2;
      const baseAlpha = 0.4 + Math.random() * 0.5;
      const twinkleSpeed = 0.5 + Math.random() * 1.5;
      const twinklePhase = Math.random() * Math.PI * 2;
      stars.push({ x, y, r, color, baseAlpha, twinkleSpeed, twinklePhase });
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      // Draw nebula clouds
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < nebulae.length; i++) {
        const e = nebulae[i];
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.beginPath();
        ctx.ellipse(0, 0, e.rx, e.ry, 0, 0, 2 * Math.PI);
        ctx.fillStyle = e.color;
        ctx.filter = 'blur(24px)';
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
      }
      ctx.restore();
      // Draw galaxy core (radial gradient)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, galaxyRadius * 0.45);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.2, 'rgba(255,255,224,0.25)');
      grad.addColorStop(0.5, 'rgba(168,85,247,0.10)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, galaxyRadius * 0.45, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.filter = 'blur(2px)';
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
      // Draw stars
      for (const s of stars) {
        const twinkle = Math.sin(performance.now() * 0.001 * s.twinkleSpeed + s.twinklePhase) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = s.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(animate);
    }
    animate();

    // Handle resize
    function handleResize() {
      if (!ctx || !canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ChatGPT-like UI styles
  useEffect(() => {
    if (!document.getElementById('botesh-style')) {
      const style = document.createElement('style')
      style.id = 'botesh-style'
      style.innerHTML = `
        body {
          margin: 0;
          padding: 0;
          background: #22272b;
          font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          overflow: hidden;
        }
        .botesh-root {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #22272b;
          overflow: hidden;
          position: relative;
        }
        .botesh-bg-techno {
          position: absolute;
          top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .botesh-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          min-height: 0;
          background: transparent;
          width: 100vw;
          z-index: 1;
        }
        .botesh-chat-container {
          width: 100%;
          max-width: 700px;
          max-height: 80vh;
          min-height: 500px;
          flex: 0 1 auto;
          display: flex;
          flex-direction: column;
          background: #23242b;
          margin: 0 auto;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          padding: 0;
          overflow: hidden;
        }
        .botesh-header {
          width: 100%;
          background: #23242b;
          color: #e0e7ef;
          padding: 1.2rem 2rem 1.1rem 2rem;
          display: flex;
          align-items: center;
          font-weight: 800;
          font-size: 25px;
          letter-spacing: 0.5px;
          z-index: 2;
        }
        .botesh-messages-area {
          flex: 1 1 0%;
          overflow-y: auto;
          padding: 32px 32px 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #23242b;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: #35363e #23242b;
        }
        .botesh-messages-area:empty {
          overflow-y: hidden;
        }
        .botesh-message {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          animation: botesh-fadein-msg 0.3s cubic-bezier(.4,0,.2,1);
        }
        .botesh-message.bot {
          flex-direction: row;
          justify-content: flex-start;
        }
        .botesh-message.user {
          flex-direction: row-reverse;
          justify-content: flex-end;
        }
        .botesh-bubble {
          max-width: 70vw;
          padding: 13px 18px;
          border-radius: 16px;
          font-size: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10);
          background: #23242b;
          color: #e0e7ef;
          transition: background 0.3s;
          word-break: break-word;
        }
        .botesh-message.user .botesh-bubble {
          background: #6366f1;
          color: #fff;
          border-radius: 16px;
        }
        .botesh-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #23242b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #6366f1;
        }
        .botesh-message.user .botesh-avatar {
          background: #6366f1;
          color: #fff;
        }
        @keyframes botesh-fadein-msg {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .botesh-input-area {
          width: 100%;
          max-width: 700px;
          display: flex;
          gap: 10px;
          align-items: center;
          background: #23242b;
          box-shadow: 0 -1px 4px rgba(0,0,0,0.10);
          padding: 18px 32px 18px 32px;
          position: static;
          z-index: 2;
        }
        .botesh-input {
          width: 100%;
          font-family: inherit;
          font-size: 16px;
          border-radius: 16px;
          border: 1px solid #35363e;
          background: #181a20;
          color: #e0e7ef;
          padding: 13px 18px;
          outline: none;
          transition: border 0.2s;
          min-width: 0;
          resize: none;
          max-height: 120px;
          min-height: 44px;
          overflow-y: auto;
        }
        .botesh-button {
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 0 26px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10);
          transition: background 0.2s, box-shadow 0.2s;
          min-width: 90px;
          height: 44px;
        }
        .botesh-button:hover:not(:disabled) {
          background: #818cf8;
          box-shadow: 0 2px 8px rgba(128,90,213,0.10);
        }
        .botesh-button:disabled {
          background: #35363e;
          color: #aaa;
          cursor: not-allowed;
        }
        @media (max-width: 900px) {
          .botesh-chat-container, .botesh-input-area { max-width: 100vw !important; padding-left: 8px !important; padding-right: 8px !important; border-radius: 0 !important; box-shadow: none !important; }
        }
        @media (max-width: 600px) {
          .botesh-chat-container, .botesh-input-area { padding-left: 2px !important; padding-right: 2px !important; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      alert('Failed to get response from the server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Copy to clipboard for bot replies
  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  return (
    <div className="botesh-root">
      {/* Particle network animated background */}
      <canvas ref={bgCanvasRef} className="botesh-bg-techno" />
      {/* Main Chat Area Centered */}
      <main className="botesh-main">
        <div className="botesh-chat-container">
          {/* Header (minimal) */}
          <header className="botesh-header">
            <span className="icon" style={{ fontSize: 28, marginRight: 14 }}><FaRobot /></span>
            BoTesh <span role="img" aria-label="bot">🤖</span>
          </header>
          {/* Chat Area */}
          <div className="botesh-messages-area">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`botesh-message ${message.role} botesh-animate`}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                {message.role === 'assistant' && (
                  <span className="botesh-avatar">
                    <FaRobot />
                  </span>
                )}
                <span className="botesh-bubble" style={{ whiteSpace: 'pre-line', position: message.role === 'assistant' ? 'relative' : undefined }}>
                  {message.role === 'assistant' ? (
                    <>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                      <button
                        className="botesh-copy-btn"
                        onClick={() => handleCopy(message.content, index)}
                        title="Copy"
                        aria-label="Copy bot reply"
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'none',
                          border: 'none',
                          color: '#a5b4fc',
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                      >
                        {copiedIndex === index ? '✓' : '⧉'}
                      </button>
                    </>
                  ) : (
                    message.content
                  )}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="botesh-message assistant botesh-animate">
                <span className="botesh-avatar"><FaRobot /></span>
                <span className="botesh-bubble">
                  <span className="botesh-typing">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                  <span style={{ marginLeft: 8, color: '#a5b4fc', fontWeight: 500 }}>BoTesh is typing…</span>
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        {/* Input Area */}
        <div className="botesh-input-area">
          <textarea
            className="botesh-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            disabled={isLoading}
            ref={inputRef}
            autoFocus
            rows={1}
            style={{ resize: 'none', maxHeight: 120, minHeight: 44, overflowY: 'auto', width: '100%' }}
            aria-label="Type your message"
          />
          <button
            className="botesh-button"
            onClick={handleSend}
            disabled={isLoading}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </main>
      {/* Animations and styles for chat experience */}
      <style>{`
        .botesh-animate {
          animation: botesh-fadein-msg 0.38s cubic-bezier(.4,0,.2,1);
        }
        .botesh-typing {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .botesh-typing .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #a5b4fc;
          margin: 0 1.5px;
          opacity: 0.7;
          animation: botesh-dot-bounce 1.2s infinite both;
        }
        .botesh-typing .dot:nth-child(2) { animation-delay: 0.18s; }
        .botesh-typing .dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes botesh-dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.7; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .botesh-copy-btn {
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .botesh-copy-btn:hover, .botesh-copy-btn:focus {
          opacity: 1;
          outline: 2px solid #a5b4fc;
        }
        /* Markdown code block styling */
        .botesh-bubble pre {
          background: #181a20;
          color: #a5b4fc;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 15px;
          overflow-x: auto;
        }
        .botesh-bubble code {
          background: #23242b;
          color: #a5b4fc;
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 15px;
        }
        @media (max-width: 900px) {
          .botesh-chat-container, .botesh-input-area { max-width: 100vw !important; padding-left: 8px !important; padding-right: 8px !important; border-radius: 0 !important; box-shadow: none !important; }
        }
        @media (max-width: 600px) {
          .botesh-chat-container, .botesh-input-area { padding-left: 2px !important; padding-right: 2px !important; }
          .botesh-header { font-size: 18px !important; }
          .botesh-bubble { font-size: 15px !important; }
        }
      `}</style>
    </div>
  )
}

export default App
