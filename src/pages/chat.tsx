import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Send } from "lucide-react";

export default function Chat() {
  const params = useParams();
  const otherUserId = params.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = 1; // Testing ke liye 1 rakha hai, baad me auth se aayega

  const fetchMessages = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/chat/${otherUserId}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Simple polling for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: Number(otherUserId), content: inputText }),
      });
      setInputText("");
      fetchMessages(); // Turant naya message fetch karo
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x border-slate-200 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/matches">
          <ArrowLeft className="w-6 h-6 text-slate-600 cursor-pointer" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            👤
          </div>
          <h2 className="font-bold text-lg">Chat with Match</h2>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: any) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe ? "bg-blue-500 text-white rounded-br-sm" : "bg-white border text-slate-800 rounded-bl-sm shadow-sm"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t flex gap-2 items-center">
        <input 
          type="text" 
          placeholder="Type a message..." 
          className="flex-1 bg-slate-100 rounded-full px-4 py-3 outline-none"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition">
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
}