import { Router, type IRouter } from "express"; 
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; 
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { usersTable } from "../schema/index.js";

const router: IRouter = Router(); 

// 🛡️ DYNAMIC FALLBACK (Agar internet/API key na ho toh loop todne ke liye)
const VARIATIONS: Record<string, string[]> = {
  wallet: [
    "💰 Hey {name}, tumhare wallet ka balance 100% secure hai. 1 Credit = ₹1. 500 earned credits par withdrawal milta hai (7 days hold ke baad).",
    "💸 Credits check karne hain {name}? Teach karke jo credits kamaye hain wo direct bank me aayenge. 15% platform fee lagti hai, baaki sab tumhara!",
  ],
  tech: [
    "🚀 {name}, coding seekhni hai toh theory nahi, project banao! SkillSwap par experts hain, session book karo aur unke sath screen share karke code karo.",
    "🧠 {name}, DSA ho ya Web Dev, consistency zaroori hai. Stuck ho jao toh Flash Doubts use karo, koi na koi mentor turant help kar dega!",
  ],
  greeting: [
    "👋 Yo {name}! Main SkillAI hu. Batao aaj kya seekhna hai?",
    "🔥 Namaste {name}! Kaisi chal rahi hai learning? Platform ka roadmap chahiye ya features samajhne hain?",
  ]
};

const getLocalDynamicReply = (message: string, userName: string): string => {
  const msg = message.toLowerCase();
  let category = "default";
  
  if (/credit|rupee|withdraw|money|earn|fee|paisa|commission|cash|bank|balance|buy/.test(msg)) category = "wallet";
  else if (/python|react|javascript|js|node|dsa|algorithm|leetcode|dev|ml|ai|design/.test(msg)) category = "tech";
  else if (/hello|hi|hey|namaste|sup/.test(msg)) category = "greeting";

  if (category === "default") {
    return `🤖 {name}, main context samajh raha hu. Ask me about features (Wallet, Doubts, Referrals) or a specific tech roadmap!`;
  }

  const options = VARIATIONS[category];
  return options[Math.floor(Math.random() * options.length)].replace(/{name}/g, userName);
};

router.post("/chat", requireAuth, async (req: AuthRequest, res) => { 
    try { 
        const { message, history } = req.body; 
        if (!message) return res.status(400).json({ error: "Message required" }); 
        
        // Fetch User's Real Name
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        const userName = user?.name ? user.name.split(" ")[0] : "Buddy";

        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey && apiKey !== "YOUR_GEMINI_KEY" && apiKey.length > 10) {
            // 🧠 REAL AI MODE (GEMINI API)
            const formattedHistory = (history || []).map((msg: any) => ({
                role: msg.role === "ai" ? "model" : "user",
                parts: [{ text: msg.text }]
            }));

            // Make sure the last message matches
            if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].parts[0].text !== message) {
                formattedHistory.push({ role: "user", parts: [{ text: message }] });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: formattedHistory,
                    systemInstruction: {
                        parts: [{
                            text: `You are SkillAI, the passionate and super intelligent co-founder AI of SkillSwap. 
                            You are talking to ${userName}. Use a friendly Hinglish tone. Be concise, scannable, and engaging. Never repeat yourself. 
                            Platform rules: 1 credit = 1 rupee, 15% platform fee on payouts, 7 days withdrawal maturity, 6-digit OTP needed for sessions.`
                        }]
                    }
                })
            });

            const aiData = await response.json();
            const reply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || getLocalDynamicReply(message, userName);
            return res.json({ reply });
        } else {
            // 🛡️ DYNAMIC FALLBACK MODE
            setTimeout(() => { res.json({ reply: getLocalDynamicReply(message, userName) }); }, 800);
        }
    } catch (err) { 
        res.status(500).json({ reply: "My circuits are overwhelmed! Try again." }); 
    } 
}); 

export default router;
