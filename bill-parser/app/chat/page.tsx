"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  User, 
  Paperclip,
  MapPin,
  FileText,
  Calendar,
  RotateCcw
} from "lucide-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const suggestedQuestions = [
  { icon: FileText, text: "What's my remaining deductible for 2024?" },
  { icon: MapPin, text: "Find in-network urgent care near me" },
  { icon: Calendar, text: "When am I due for a colonoscopy?" },
  { icon: Sparkles, text: "Explain my recent hospital bill" },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Hi Alex! 👋 I'm your CareMap assistant. I can help you understand your insurance coverage, analyze medical bills, find in-network providers, and answer health questions—all personalized to your plan.\n\nWhat would you like help with today?",
    timestamp: new Date(),
  },
];

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: getSimulatedResponse(input.trim()),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getSimulatedResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("deductible")) {
      return "Based on your Blue Cross Blue Shield PPO Gold plan:\n\n**2024 Deductible Status:**\n- Individual Deductible: $2,500\n- Amount Met: $850\n- **Remaining: $1,650**\n\nYour recent hospital visit on Jan 15th applied $200 to your deductible. Once you meet your deductible, you'll pay 20% coinsurance for most services until you hit your out-of-pocket maximum of $6,500.";
    }
    
    if (lowerQuery.includes("urgent care") || lowerQuery.includes("find")) {
      return "I found 3 in-network urgent care centers near you:\n\n**1. CityMD Urgent Care** ⭐ 4.8\n   📍 0.4 miles away • Open until 10 PM\n   💰 $75 copay (your plan)\n\n**2. MedExpress Urgent Care** ⭐ 4.5\n   📍 0.8 miles away • Open until 9 PM\n   💰 $75 copay (your plan)\n\n**3. AFC Urgent Care** ⭐ 4.6\n   📍 1.2 miles away • 24 hours\n   💰 $75 copay (your plan)\n\nWould you like me to show these on a map or help you understand what's covered at an urgent care visit?";
    }
    
    if (lowerQuery.includes("colonoscopy") || lowerQuery.includes("preventive")) {
      return "Based on your age (42) and medical history, here are your preventive care recommendations:\n\n**Due Now:**\n- ✅ Annual wellness visit (covered 100%)\n- ✅ Flu shot (covered 100%)\n\n**Coming Up:**\n- 📅 Colonoscopy: Recommended at age 45\n- 📅 Skin cancer screening: Consider scheduling\n\n**Completed This Year:**\n- ✓ Blood pressure check (Jan 2024)\n- ✓ Cholesterol screening (Jan 2024)\n\nWould you like me to help find an in-network provider for any of these?";
    }
    
    return "I'd be happy to help you with that! To give you the most accurate information based on your insurance plan, could you tell me a bit more about what you're looking for?\n\nI can help with:\n- Understanding your coverage and costs\n- Explaining medical bills\n- Finding in-network providers\n- Answering health questions\n- Preparing for appointments";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl lg:text-2xl text-foreground">
            Chat Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Insurance-aware answers personalized to your plan
          </p>
        </div>
        <button 
          onClick={() => setMessages(initialMessages)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md shadow-card"
              }`}
            >
              <div className={`text-sm whitespace-pre-wrap ${message.role === "assistant" ? "text-foreground" : ""}`}>
                {message.content}
              </div>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-card">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-4 lg:px-6 pb-4">
          <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuestion(q.text)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:bg-muted text-sm text-foreground transition-colors shadow-sm"
              >
                <q.icon className="w-4 h-4 text-secondary" />
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 lg:p-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors text-muted-foreground">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your insurance, bills, or health..."
              className="w-full min-h-[48px] max-h-32 resize-none pr-12 px-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          CareMap provides general guidance. Always consult healthcare professionals for medical advice.
        </p>
      </div>
    </div>
  );
}
