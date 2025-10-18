// src/app/agent/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  SendHorizonal,
  Home,
  UserCircle2,
  Sun,
  Moon,
  Sparkles,
  Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import TokenChartEmbed from "@/components/TokenChartEmbed";
import ProfileModal from "@/components/ProfileModal";
import AgentLoader from "@/components/AgentLoader";

interface AgentMessage {
  role: "user" | "agent";
  content: string;
  tokenSlug?: string | null;
  tokenAddress?: string | null;
}

export default function AgentPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showProfile, setShowProfile] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  /* ---------------- 🧩 Session Check ---------------- */
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/home");
      else setUserId(data.user.id);
      setSessionLoading(false);
    };
    checkUser();
  }, [router]);

  /* ---------------- 💾 Load messages ---------------- */
  useEffect(() => {
    const stored = localStorage.getItem("714_agent_messages");
    if (stored) setMessages(JSON.parse(stored));
  }, []);

  /* ---------------- 💾 Persist messages ---------------- */
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("714_agent_messages", JSON.stringify(messages));
    }
  }, [messages]);

  /* ---------------- 🔽 Auto-scroll ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------------- 🚀 Send message ---------------- */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: AgentMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await res.json();

      const botMessage: AgentMessage = {
        role: "agent",
        content: data.reply || "No response received.",
        tokenSlug: data.slug ?? null,
        tokenAddress: data.contractAddress ?? null,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "⚠️ Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ⌨️ Enter Key ---------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---------------- 🌗 Theme Toggle ---------------- */
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const bgColor =
    theme === "dark"
      ? "bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100"
      : "bg-gradient-to-b from-gray-50 to-white text-gray-900";
  const bubbleUser =
    theme === "dark"
      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
      : "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md";
  const bubbleAgent =
    theme === "dark"
      ? "bg-gradient-to-r from-gray-800 to-gray-700 text-gray-100 shadow-md"
      : "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-900 shadow-sm";
  const inputBg =
    theme === "dark"
      ? "bg-gray-900/60 border-gray-700/70 backdrop-blur-md"
      : "bg-white/60 border-gray-300/50 backdrop-blur-md";
  const borderColor =
    theme === "dark" ? "border-gray-800" : "border-gray-300";

  if (sessionLoading)
    return <AgentLoader label="Initializing Agent 714 Environment..." />;

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-500 ${bgColor}`}
    >
      {/* Header */}
      <header
        className={`p-4 border-b ${borderColor} flex items-center justify-between backdrop-blur-md`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 hover:text-blue-500 transition"
          >
            <Home size={22} />
            <span className="font-semibold hidden sm:block">Home</span>
          </button>
        </div>

        <h1 className="font-bold text-lg text-center flex items-center gap-2">
          <Brain className="text-blue-500" size={22} />
          Agent 714
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-blue-500/20 transition"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="p-2 rounded-full hover:bg-blue-500/20 transition"
          >
            <UserCircle2 size={22} />
          </button>
        </div>
      </header>

      {/* Intro */}
      <div className="p-3 border-b text-xs sm:text-sm text-center opacity-80">
        <Sparkles className="inline-block text-blue-400 mr-1" size={14} />
        Hi! I’m <b>Agent 714</b> — your crypto intelligence buddy 💬  
        Ask about any token, project, or paste a contract address for live data!
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] break-words whitespace-pre-wrap ${msg.role === "user" ? bubbleUser : bubbleAgent}`}
              >
                {msg.content}

                {/* Chart Embed */}
                {msg.role === "agent" &&
                  (msg.tokenSlug || msg.tokenAddress) && (
                    <div className="mt-3 border-t border-gray-600/40 pt-2">
                      <TokenChartEmbed
                        slug={msg.tokenSlug || undefined}
                        address={msg.tokenAddress || undefined}
                      />
                    </div>
                  )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className={`rounded-2xl px-4 py-2 ${bubbleAgent} text-gray-400 flex gap-1 items-center`}
              >
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input */}
      <footer
        className={`p-4 border-t ${borderColor} flex items-center gap-2 backdrop-blur-md sticky bottom-0 ${inputBg}`}
      >
        <input
          type="text"
          placeholder="Ask about any token or paste a contract address..."
          className={`flex-1 rounded-xl px-4 py-2 outline-none border transition ${inputBg} focus:border-blue-500`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={loading}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-lg"
        >
          <SendHorizonal size={20} />
        </motion.button>
      </footer>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <ProfileModal userId={userId} onClose={() => setShowProfile(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
