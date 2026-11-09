import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  User,
  Sparkles,
  BookOpen,
  Zap,
  Brain,
  Code2,
  Globe,
  Flame,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  time: string;
  status?: "error";
}

interface ChatResponse {
  reply?: unknown;
  message?: unknown;
  error?: unknown;
}

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const CHAT_ENDPOINT = `${API_BASE}/api/ai/chat`;
const MAX_MESSAGE_LENGTH = 2000;

const SUGGESTIONS = [
  { icon: Code2, text: "How to learn Python fast?", color: "text-blue-500" },
  { icon: Brain, text: "Best DSA resources for beginners", color: "text-purple-500" },
  { icon: Globe, text: "How to improve English speaking?", color: "text-green-500" },
  { icon: Zap, text: "How do credits work on SkillSwap?", color: "text-orange-500" },
  { icon: Flame, text: "How to earn more credits?", color: "text-red-500" },
  { icon: BookOpen, text: "Create a React learning roadmap", color: "text-cyan-500" },
];

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const createMessage = (
  role: Message["role"],
  text: string,
  status?: Message["status"],
): Message => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  text,
  time: getTime(),
  ...(status ? { status } : {}),
});

const INITIAL_MESSAGE = createMessage(
  "ai",
  "Hi! I'm SkillAI 🤖 Your personal learning assistant!\n\nI can help you:\n• Find the right mentors\n• Create learning roadmaps\n• Understand the credit system\n• Suggest skills to learn\n\nWhat would you like to learn today?",
);

function getErrorMessage(data: ChatResponse, fallback: string): string {
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

export default function AIChat() {
  const token = useAuthStore((state) => state.token);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (providedText?: string) => {
      const messageText = (providedText ?? input).trim();
      if (!messageText || loading) return;

      if (!token) {
        setMessages((previous) => [
          ...previous,
          createMessage("user", messageText),
          createMessage(
            "ai",
            "Please sign in again to use SkillAI. Your login session is missing.",
            "error",
          ),
        ]);
        setInput("");
        return;
      }

      if (messageText.length > MAX_MESSAGE_LENGTH) {
        setMessages((previous) => [
          ...previous,
          createMessage("ai", `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`, "error"),
        ]);
        return;
      }

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      setInput("");
      setLastFailedPrompt(null);
      setMessages((previous) => [...previous, createMessage("user", messageText)]);
      setLoading(true);

      try {
        const response = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ message: messageText }),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        let data: ChatResponse = {};
        if (contentType.includes("application/json")) {
          data = (await response.json()) as ChatResponse;
        } else {
          const rawText = await response.text();
          data = { message: rawText };
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Your login session may have expired. Please sign in again.");
          }
          throw new Error(
            getErrorMessage(data, `SkillAI request failed (${response.status}). Please try again.`),
          );
        }

        const reply =
          typeof data.reply === "string"
            ? data.reply.trim()
            : typeof data.message === "string"
              ? data.message.trim()
              : "";

        if (!reply) {
          throw new Error("SkillAI returned an empty response. Please try again.");
        }

        if (requestId === requestIdRef.current) {
          setMessages((previous) => [...previous, createMessage("ai", reply)]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestId === requestIdRef.current) {
          const errorText =
            error instanceof Error
              ? error.message
              : "AI service is temporarily unavailable. Please try again.";
          setLastFailedPrompt(messageText);
          setMessages((previous) => [...previous, createMessage("ai", errorText, "error")]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          abortRef.current = null;
        }
      }
    },
    [input, loading, token],
  );

  const clearChat = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setInput("");
    setLastFailedPrompt(null);
    setMessages([createMessage("ai", "Hi! I'm SkillAI 🤖 How can I help you today?")]);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-140px)] min-h-[480px] max-w-3xl flex-col gap-4 py-4 sm:py-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium flex items-center justify-between gap-3 p-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">SkillAI Assistant</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {loading ? "Thinking..." : "Ready to help"}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="shrink-0 gap-1 text-xs text-muted-foreground"
          disabled={messages.length === 1 && !loading && !input}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Clear
        </Button>
      </motion.header>

      {/* Messages */}
      <section
        aria-label="Chat messages"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth px-1 py-1"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  message.role === "ai"
                    ? "bg-gradient-to-br from-primary to-accent"
                    : "border border-border bg-muted"
                }`}
              >
                {message.role === "ai" ? (
                  <Bot className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div
                className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[78%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "ai"
                      ? message.status === "error"
                        ? "rounded-tl-sm border border-destructive/20 bg-destructive/5 text-foreground"
                        : "rounded-tl-sm bg-muted text-foreground"
                      : "rounded-tr-sm bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/20"
                  }`}
                >
                  {message.status === "error" && (
                    <AlertCircle className="mr-1.5 inline h-4 w-4 align-[-3px] text-destructive" />
                  )}
                  {message.text}
                </div>
                <span className="px-1 text-[10px] text-muted-foreground">{message.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              <div className="flex gap-1">
                {[0, 1, 2].map((item) => (
                  <motion.span
                    key={item}
                    className="h-2 w-2 rounded-full bg-primary/60"
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: item * 0.15 }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">SkillAI is thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3"
        >
          {SUGGESTIONS.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={suggestion.text}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void sendMessage(suggestion.text)}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-border/50 bg-muted/50 p-3 text-left text-xs font-medium transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
                disabled={loading}
              >
                <Icon className={`h-4 w-4 shrink-0 ${suggestion.color}`} />
                {suggestion.text}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Retry last failed prompt */}
      {lastFailedPrompt && !loading && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void sendMessage(lastFailedPrompt)}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry last message
          </Button>
        </div>
      )}

      {/* Input */}
      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="card-premium flex items-center gap-2 p-3"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={token ? "Ask SkillAI anything..." : "Sign in to chat with SkillAI"}
          aria-label="Message SkillAI"
          maxLength={MAX_MESSAGE_LENGTH}
          className="min-w-0 flex-1 rounded-xl border-border/50 focus:border-primary/50"
          disabled={loading || !token}
        />
        <span className="hidden text-[10px] text-muted-foreground sm:block">
          {input.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <Button
          type="submit"
          aria-label="Send message"
          disabled={loading || !input.trim() || !token}
          className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-accent px-4 shadow-lg shadow-primary/20"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </motion.form>
    </div>
  );
}
