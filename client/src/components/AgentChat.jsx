import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const AgentChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    { role: 'model', parts: [{ text: "Hi! I'm CineBot, your VIP booking assistant. How can I help you find a movie today?" }] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { getToken } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setMessage('');
    
    // Add user message to UI immediately
    const newHistory = [...history, { role: 'user', parts: [{ text: userMsg }] }];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Send entire history except the very first greeting so the AI has context
      const { data } = await axios.post('/api/agent/chat', {
        message: userMsg,
        conversationHistory: history.filter((_, i) => i !== 0) 
      }, { headers });

      let replyText = data.reply;
      
      // The AI sometimes forgets to format the URL as a markdown link. 
      // If it's a raw URL, wrap it in markdown so it becomes clickable!
      if (replyText.includes('https://checkout.stripe.com') && !replyText.includes('](https://checkout.stripe.com')) {
          replyText = replyText.replace(/(https:\/\/checkout\.stripe\.com[^\s]+)/g, '[Click here to pay]($1)');
      }

      setHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: replyText }] }
      ]);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || "";
      
      let friendlyError = "Sorry, I'm having trouble connecting to my brain right now!";
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        friendlyError = "Whoa, slow down! I'm receiving too many requests. Please wait a few seconds and try again.";
      } else if (errorMsg.includes('Agent Error')) {
        friendlyError = "I encountered an internal error while thinking. Please try again.";
      }

      setHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: friendlyError }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 hover:scale-105 transition-all z-50 ${isOpen ? 'hidden' : ''}`}
      >
        <MessageCircle size={28} />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 w-96 h-[500px] bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col z-50 transition-all transform duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-red-500">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">CineBot</h3>
              <p className="text-xs text-zinc-400">AI Concierge</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`inline-block p-3 rounded-lg max-w-[90%] ${
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-br-none' 
                      : 'bg-gray-800 text-gray-200 rounded-bl-none'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 font-semibold underline hover:text-blue-300 break-all" 
                        />
                      ),
                      p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                      strong: ({node, ...props}) => <strong {...props} className="font-bold text-white" />
                    }}
                  >
                    {msg.parts[0].text}
                  </ReactMarkdown>
                </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-sm p-4 flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 bg-zinc-900 rounded-b-2xl">
          <div className="relative flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full bg-zinc-800 border-none text-sm text-white rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="absolute right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AgentChat;
