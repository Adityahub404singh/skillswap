import { Router, type IRouter } from "express"; 
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; 

const router: IRouter = Router(); 

// 🧠 SKILL-AI SUPER-BRAIN ENGINE (Massive Regex Knowledge Base, 0 API Cost)
const analyzeIntentAndReply = (message: string): string => {
    const msg = message.toLowerCase();

    // ==========================================
    // 1. FINANCIAL, WALLET & PLATFORM ECONOMY
    // ==========================================
    if (/credit|rupee|withdraw|money|earn|fee|paisa|commission|cash|bank|balance/.test(msg)) {
        return "💰 **SkillSwap Economy 101:**\n• **Value:** 1 Credit = ₹1.\n• **Signup Bonus:** 200 Credits (Strictly for learning, non-withdrawable).\n• **Earning:** Teach skills to earn withdrawable credits.\n• **Withdrawal:** Min 500 earned credits. Takes 7 days to mature for security.\n• **Platform Fee:** 20% commission on withdrawals (e.g., withdraw 500 cr = get ₹400 in UPI).";
    }
    if (/buy|purchase|add credit|payment|razorpay/.test(msg)) {
        return "💳 **Need more credits?**\nGo to the 'Wallet' tab and click '+ Buy Credits'. We offer packages starting from ₹99. All payments are 100% securely processed via Razorpay (UPI, Cards, NetBanking).";
    }

    // ==========================================
    // 2. DISPUTE, SAFETY & FRAUD GUARD
    // ==========================================
    if (/fraud|scam|dispute|fake|refund|cancel|cheat|report/.test(msg)) {
        return "🛡️ **Your Credits are Secure in Escrow!**\nIf a mentor doesn't show up or a class fails, hit 'Dispute' and explain the issue (min 20 chars). Our Admin team reviews it within 24-48 hrs and processes refunds.\n*Note: 'Mark Done' only works after 80% of class time is completed.*";
    }

    // ==========================================
    // 3. BOOKING, OTP & SESSIONS
    // ==========================================
    if (/book|mentor|otp|start class|how to join|meet|session|class/.test(msg)) {
        return "📅 **How to take a Session:**\n1. Find a Mentor in the 'Explore' tab & book.\n2. Go to 'Sessions'.\n3. **Student:** Give the 6-digit OTP to your mentor.\n4. **Mentor:** Enter OTP to start the official timer.\n5. Click the Jitsi Meet link to join the video call!";
    }
    if (/flash|doubt|quick help|stuck/.test(msg)) {
        return "⚡ **Stuck on a bug? Use Flash Doubts!**\nGo to 'Live Doubts', post your error, and set a credit bounty. Any available expert will claim it instantly and solve it in a 15-min quick session!";
    }

    // ==========================================
    // 4. GAMIFICATION & REFERRALS
    // ==========================================
    if (/refer|invite|friend|share|bonus/.test(msg)) {
        return "🎁 **Refer & Earn!**\nGo to your Wallet or Profile, copy your unique Referral Link, and share it. When your friend signs up and completes their first session, YOU get a 50 Credits bonus!";
    }
    if (/leaderboard|rank|score|trust|streak/.test(msg)) {
        return "🏆 **Climb the Leaderboard!**\nYour rank increases by:\n1. Taking & teaching sessions (Maintain your Streak 🔥)\n2. Getting 5-star ratings from students.\n3. Keeping a high Trust Score (No disputes/cancellations).";
    }

    // ==========================================
    // 5. TECH ROADMAPS & SKILL GUIDES
    // ==========================================
    if (/python|django|fastapi/.test(msg)) {
        return "🐍 **Python Mastery Path:**\n1. Syntax & Data Structures (Lists, Dicts, Tuples)\n2. OOP Concepts (Classes, Inheritance)\n3. Libraries (NumPy, Pandas for Data; Requests for Web)\n4. Frameworks (Django or FastAPI).\n💡 *Tip: Book a Python mentor to review your first web scraper!*";
    }
    if (/web|react|javascript|js|node|html|css|frontend|backend|mern/.test(msg)) {
        return "🌐 **Full-Stack Web Dev (MERN) Path:**\n1. Frontend: HTML/CSS -> JS (ES6+) -> React.js.\n2. Backend: Node.js/Express -> MongoDB/PostgreSQL.\n3. Extras: Git, TailwindCSS, APIs.\n💡 *Tip: Build a Weather App or To-Do list. Need code reviews? Book a Mentor!*";
    }
    if (/dsa|algorithm|data structure|leetcode|competitive/.test(msg)) {
        return "🧠 **DSA & Interview Prep:**\n1. Arrays, Strings & Hashing.\n2. Two-Pointers, Sliding Window.\n3. LinkedLists, Stacks, Queues.\n4. Trees, Graphs & Dynamic Programming (DP).\n💡 *Tip: Do 2 LeetCode problems daily. Stuck? Post a Flash Doubt!*";
    }
    if (/java|spring|boot/.test(msg)) {
        return "☕ **Java Enterprise Path:**\n1. Core Java & OOPs.\n2. Collections Framework & Multithreading.\n3. JDBC & Hibernate.\n4. Spring Boot & Microservices.\n💡 *Java is massive in corporate. Find a senior mentor on SkillSwap to guide you!*";
    }
    if (/c\+\+|cpp|c language/.test(msg)) {
        return "⚙️ **C/C++ Systems Path:**\n1. Pointers & Memory Management.\n2. Object-Oriented Programming.\n3. Standard Template Library (STL).\n4. Advanced algorithms.\n💡 *Perfect for Game Dev and Competitive Programming!*";
    }
    if (/mobile|android|ios|flutter|react native|kotlin|swift/.test(msg)) {
        return "📱 **Mobile App Dev Path:**\n1. Choose a path: Flutter (Dart), React Native (JS), or Native (Kotlin/Swift).\n2. Master UI Layouts & Navigation.\n3. State Management (Redux/Provider).\n4. API Integration & Firebase.\n💡 *Ready to build your first app? Connect with an App Dev mentor!*";
    }
    if (/ml|ai|data science|machine learning|artificial intelligence/.test(msg)) {
        return "🤖 **AI / Data Science Path:**\n1. Math Foundations (Linear Algebra, Stats).\n2. Python (Pandas, NumPy, Matplotlib).\n3. Machine Learning (Scikit-Learn, Regression, Classification).\n4. Deep Learning (TensorFlow/PyTorch).\n💡 *This is a tough journey, definitely book a Data Science mentor to clear your doubts!*";
    }
    if (/design|ui|ux|figma|adobe/.test(msg)) {
        return "🎨 **UI/UX Design Path:**\n1. Master Figma basics.\n2. Understand Color Theory, Typography, and Whitespace.\n3. Auto-Layout & Prototyping.\n4. User Research & Wireframing.\n💡 *Design is all about feedback. Search 'Design' to get your portfolio reviewed!*";
    }

    // ==========================================
    // 6. CAREER & SOFT SKILLS
    // ==========================================
    if (/resume|cv|portfolio|profile/.test(msg)) {
        return "📄 **Resume / Portfolio Tips:**\n1. Keep it 1 page. Use action verbs (Built, Designed, Optimized).\n2. Add numbers (e.g., 'Improved speed by 20%').\n3. Highlight 3 strong projects with GitHub/Live links.\n💡 *Book a mentor for a 'Micro-Session' to do a live Resume Review!*";
    }
    if (/interview|job|internship|hiring/.test(msg)) {
        return "👔 **Interview Prep Tips:**\n1. Master your introduction ('Tell me about yourself').\n2. Prepare STAR method answers (Situation, Task, Action, Result).\n3. Know your projects inside out.\n💡 *Want practice? Find a mentor and ask them to conduct a Mock Interview!*";
    }

    // ==========================================
    // 7. PERSONALITY & SMALL TALK
    // ==========================================
    if (/who are you|your name|what are you/.test(msg)) {
        return "🤖 I am **SkillAI**, the official intelligence engine of SkillSwap! I was built by the amazing founder of this platform to help you navigate skills, understand rules, and find the perfect mentors.";
    }
    if (/joke|laugh|funny/.test(msg)) {
        return "😄 Why do programmers prefer dark mode?\n...Because light attracts bugs! 🐛\n\nNow, back to learning! What skill do you want to master today?";
    }
    if (/thank|thanks|awesome|great|good boy/.test(msg)) {
        return "💙 You're very welcome! I'm always here 24/7. Keep grinding, keep learning, and don't hesitate to book a mentor if you get stuck!";
    }
    if (/hello|hi|hey|namaste|sup|morning|evening/.test(msg)) {
        return "👋 Hi there! Welcome to SkillSwap.\nYou can ask me about:\n• Tech Roadmaps (MERN, Flutter, AI, Java)\n• Platform Rules (Credits, Fees, Withdrawals)\n• Features (Flash Doubts, Leaderboard, Referrals)\n\nHow can I help you level up today?";
    }

    // ==========================================
    // 8. DEFAULT FALLBACK
    // ==========================================
    return "🤖 Hmm, I didn't quite catch that.\nI'm the SkillSwap Expert! Ask me about specific skills (e.g., 'How to learn App Dev' or 'Resume tips'), platform rules (e.g., 'Withdrawal policy'), or how to use features like 'Flash Doubts'.";
};

router.post("/chat", requireAuth, async (req: AuthRequest, res) => { 
    try { 
        const { message } = req.body; 
        if (!message) { 
            return res.status(400).json({ error: "Message required" }); 
        } 
        
        const reply = analyzeIntentAndReply(message);
        
        // 800ms delay to simulate "AI Typing..." realism
        setTimeout(() => {
            res.json({ reply }); 
        }, 800);

    } catch (err) { 
        res.status(500).json({ reply: "My circuits are overwhelmed! Please try again." }); 
    } 
}); 

export default router;
