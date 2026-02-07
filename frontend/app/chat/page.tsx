"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  User,
  Paperclip,
  MapPin,
  FileText,
  Calendar,
  RotateCcw,
  StickyNote,
  Check,
  X,
} from "lucide-react";

const NOTES_STORAGE_KEY = "caremap-dashboard-notes";
const NOTE_OFFER_PHRASE = "Would you like me to save this as a note on your dashboard?";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_CAREMAP_BACKEND_URL ||
  "http://localhost:8000";

/** Demo user for chat when TEST_BYPASS_AUTH=true (no login required) */
const DEMO_USER = "demo_user";

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
  { icon: StickyNote, text: "I've been having headaches and fatigue lately" },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hi! 👋 I'm your CareMap assistant. I can help you understand your insurance coverage, analyze medical bills, find in-network providers, and answer health questions—all personalized to your plan.\n\nWhat would you like help with today?",
    timestamp: new Date(),
  },
];

/** Fallback when backend is unreachable or auth fails */
function getFallbackResponse(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("deductible")) {
    return "Based on your plan, deductible details vary. I'd be happy to help—make sure the backend is running and you have TEST_BYPASS_AUTH=true in .env for demo mode, or sign in for real plan data.";
  }
  if (lower.includes("urgent care") || lower.includes("find")) {
    return "Try the **Find Care** page (/care-map) for an interactive map of nearby providers. Or share your location to get personalized results.";
  }
  if (lower.includes("colonoscopy") || lower.includes("preventive")) {
    return "Preventive care recommendations typically include annual wellness visits, screenings, and immunizations. Check your plan's summary of benefits for details.";
  }
  return "I'd be happy to help! For the best experience, ensure the backend is running at " +
    BACKEND_URL +
    ". I can help with coverage, bills, finding providers, and health questions.";
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [savedNoteForMessageIds, setSavedNoteForMessageIds] = useState<Set<number>>(new Set());
  const [savingNoteForId, setSavingNoteForId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextIdRef = useRef(2);

  const handleSaveAsNote = useCallback((userContent: string, assistantMessageId: number) => {
    setSavingNoteForId(assistantMessageId);
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      const notes: Array<{ id: string; subject: string; description: string; createdAt: string }> = stored ? JSON.parse(stored) : [];
      const subject = userContent.length > 50 ? userContent.slice(0, 50) + "…" : userContent;
      const note = {
        id: `note_${Date.now()}`,
        subject: subject || "Symptoms note",
        description: userContent,
        createdAt: new Date().toISOString(),
      };
      notes.unshift(note);
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
      setSavedNoteForMessageIds((prev) => new Set(prev).add(assistantMessageId));
      window.dispatchEvent(new CustomEvent("caremap-notes-updated"));
    } finally {
      setSavingNoteForId(null);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createSession = useCallback(async (): Promise<string | null> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Test-User": DEMO_USER,
    };
    const res = await fetch(`${BACKEND_URL}/v1/chat/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session_id ?? null;
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<string | null> => {
      let sid = sessionId;
      if (!sid) {
        sid = await createSession();
        if (sid) setSessionId(sid);
      }
      if (!sid) return null;

      let notes: Array<{ subject: string; description: string; createdAt: string }> = [];
      try {
        const stored = localStorage.getItem(NOTES_STORAGE_KEY);
        if (stored) notes = JSON.parse(stored);
      } catch {
        /* ignore */
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Test-User": DEMO_USER,
      };
      const body: Record<string, unknown> = { content, role: "user" };
      if (notes.length > 0) body.notes = notes;
      const res = await fetch(`${BACKEND_URL}/v1/chat/sessions/${sid}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.assistant?.text ?? null;
    },
    [sessionId, createSession]
  );

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: nextIdRef.current++,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setChatError(null);

    try {
      const assistantText = await sendMessage(userMessage.content);
      const aiResponse: Message = {
        id: nextIdRef.current++,
        role: "assistant",
        content: assistantText ?? getFallbackResponse(userMessage.content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      if (!assistantText) {
        setChatError(
          "Chat backend unreachable or auth required. Using fallback. Set TEST_BYPASS_AUTH=true in .env for demo mode."
        );
      }
    } catch {
      const aiResponse: Message = {
        id: nextIdRef.current++,
        role: "assistant",
        content: getFallbackResponse(userMessage.content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setChatError("Chat backend unreachable. Using fallback.");
    } finally {
      setIsTyping(false);
    }
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
          onClick={() => {
            setMessages(initialMessages);
            setSessionId(null);
            setChatError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const offersNote = message.role === "assistant" && message.content.includes(NOTE_OFFER_PHRASE) && prevMessage?.role === "user";
          const showSaveButtons = offersNote && !savedNoteForMessageIds.has(message.id);

          return (
            <div key={message.id} className="space-y-2">
              <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
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
              {showSaveButtons && prevMessage && (
                <div className="flex gap-2 pl-11">
                  <button
                    onClick={() => handleSaveAsNote(prevMessage.content, message.id)}
                    disabled={savingNoteForId === message.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {savingNoteForId === message.id ? (
                      "Saving…"
                    ) : (
                      <>
                        <StickyNote className="w-3.5 h-3.5" />
                        Save as note
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSavedNoteForMessageIds((prev) => new Set(prev).add(message.id))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground text-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                    No thanks
                  </button>
                </div>
              )}
              {offersNote && savedNoteForMessageIds.has(message.id) && (
                <div className="flex gap-2 pl-11 text-sm text-success">
                  <Check className="w-4 h-4" />
                  Saved to dashboard notes
                </div>
              )}
            </div>
          );
        })}

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
        {chatError && (
          <p className="text-center text-xs text-amber-600 mt-2">{chatError}</p>
        )}
        <p className="text-center text-xs text-muted-foreground mt-3">
          CareMap provides general guidance. Always consult healthcare professionals for medical advice.
        </p>
      </div>
    </div>
  );
}
