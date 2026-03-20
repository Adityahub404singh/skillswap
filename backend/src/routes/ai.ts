import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { usersTable } from "../schema/users.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Simple AI chat - rule based + smart responses
router.post("/chat", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    const msg = message.toLowerCase();
    let reply = "";

    if (msg.includes("python")) {
      reply = "🐍 Python is great for beginners! Start with basics → OOP → libraries like NumPy/Pandas → projects. I can find you a Python mentor on SkillSwap!";
    } else if (msg.includes("dsa") || msg.includes("data structure")) {
      reply = "📊 For DSA: Arrays → LinkedList → Stack/Queue → Trees → Graphs → DP. Practice on LeetCode daily. Want me to find a DSA mentor?";
    } else if (msg.includes("web") || msg.includes("react") || msg.includes("frontend")) {
      reply = "🌐 Web Dev path: HTML/CSS → JavaScript → React → Node.js → Databases. SkillSwap has great web dev mentors!";
    } else if (msg.includes("ai") || msg.includes("ml") || msg.includes("machine learning")) {
      reply = "🤖 AI/ML path: Python → Math (Linear Algebra, Stats) → Sklearn → TensorFlow/PyTorch → Projects. This is a high-demand skill!";
    } else if (msg.includes("credit") || msg.includes("price") || msg.includes("cost")) {
      reply = "💰 1 Credit = ₹1. Basic skills: 10-40 cr, Medium: 30-100 cr, Advanced (DSA/AI): 80-220 cr per session. You get 200 credits on signup!";
    } else if (msg.includes("mentor") || msg.includes("find") || msg.includes("recommend")) {
      reply = "🎯 Go to Explore page to find mentors! They're ranked by rating, trust score, and experience. You can negotiate prices too!";
    } else if (msg.includes("session") || msg.includes("book")) {
      reply = "📅 To book: Explore → Find Mentor → Book Session → Set price & time → Mentor accepts → Join meeting link via email!";
    } else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      reply = "👋 Hello! I'm SkillAI, your personal learning assistant. Ask me about skills, learning paths, mentors, or pricing!";
    } else if (msg.includes("refund") || msg.includes("cancel")) {
      reply = "💸 Refund policy: Cancel anytime for full refund. Session < 10 min = full refund. 10-30 min = 50% refund. >30 min = full payment to mentor.";
    } else if (msg.includes("trust") || msg.includes("score") || msg.includes("rating")) {
      reply = "⭐ Trust Score = Rating × 10 + Sessions × 2. Higher score = more reliable mentor. Rate your mentors after sessions to help the community!";
    } else {
      reply = `🤔 Interesting question about "${message}"! I suggest exploring SkillSwap mentors who specialize in this area. Go to Explore and search for relevant skills!`;
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// AI Recommendations based on user profile
router.get("/recommend", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const learnSkills = user.skillsLearn || [];
    const teachSkills = user.skillsTeach || [];

    const allSkills = ["Python", "JavaScript", "React", "DSA", "Web Dev", "AI/ML", "Design", "English", "Maths", "Coding"];

    // Recommend skills not already in user's list
    const recommendations = allSkills.filter(s =>
      !learnSkills.includes(s) && !teachSkills.includes(s)
    ).slice(0, 5);

    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Learning Path Generator
router.post("/learning-path", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill } = req.body;

    const paths: Record<string, any> = {
      "Python": {
        skill: "Python", totalWeeks: 4,
        path: [
          { week: 1, topic: "Python Basics", description: "Variables, loops, functions, data types" },
          { week: 2, topic: "OOP & Modules", description: "Classes, objects, imports, file handling" },
          { week: 3, topic: "Libraries", description: "NumPy, Pandas, Matplotlib basics" },
          { week: 4, topic: "Project", description: "Build a real project: data analysis or automation" },
        ]
      },
      "React": {
        skill: "React", totalWeeks: 4,
        path: [
          { week: 1, topic: "HTML/CSS/JS Basics", description: "DOM manipulation, ES6 features" },
          { week: 2, topic: "React Fundamentals", description: "Components, props, state, hooks" },
          { week: 3, topic: "Advanced React", description: "Context, routing, API calls" },
          { week: 4, topic: "Project", description: "Build a full React app with backend API" },
        ]
      },
      "DSA": {
        skill: "DSA", totalWeeks: 6,
        path: [
          { week: 1, topic: "Arrays & Strings", description: "Basic operations, two pointers, sliding window" },
          { week: 2, topic: "LinkedList & Stack", description: "Singly/Doubly linked list, stack/queue" },
          { week: 3, topic: "Trees", description: "Binary trees, BST, traversals" },
          { week: 4, topic: "Graphs", description: "BFS, DFS, shortest path" },
          { week: 5, topic: "Dynamic Programming", description: "Memoization, tabulation, common patterns" },
          { week: 6, topic: "Practice", description: "50 LeetCode problems, mock interviews" },
        ]
      },
      "AI/ML": {
        skill: "AI/ML", totalWeeks: 6,
        path: [
          { week: 1, topic: "Python + Math", description: "NumPy, Pandas, Linear Algebra, Statistics" },
          { week: 2, topic: "ML Basics", description: "Supervised/Unsupervised learning, Sklearn" },
          { week: 3, topic: "Deep Learning", description: "Neural networks, TensorFlow/PyTorch" },
          { week: 4, topic: "NLP Basics", description: "Text processing, transformers intro" },
          { week: 5, topic: "Computer Vision", description: "CNN, image classification" },
          { week: 6, topic: "Project", description: "End-to-end ML project deployment" },
        ]
      },
      "Web Dev": {
        skill: "Web Dev", totalWeeks: 5,
        path: [
          { week: 1, topic: "HTML & CSS", description: "Semantic HTML, Flexbox, Grid, responsive design" },
          { week: 2, topic: "JavaScript", description: "ES6+, DOM, async/await, fetch API" },
          { week: 3, topic: "React", description: "Components, hooks, state management" },
          { week: 4, topic: "Backend", description: "Node.js, Express, REST APIs" },
          { week: 5, topic: "Database & Deploy", description: "PostgreSQL, hosting on Vercel/Render" },
        ]
      },
    };

    const path = paths[skill] || {
      skill,
      totalWeeks: 4,
      path: [
        { week: 1, topic: "Fundamentals", description: `Learn the basics of ${skill}` },
        { week: 2, topic: "Core Concepts", description: `Deep dive into ${skill} concepts` },
        { week: 3, topic: "Practice", description: `Build projects using ${skill}` },
        { week: 4, topic: "Advanced", description: `Master advanced ${skill} techniques` },
      ]
    };

    res.json(path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;