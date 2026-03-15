# 🚀 SkillSwap — AI-Powered Peer-to-Peer Skill Exchange Platform

> **Teach what you know. Learn what you need. No money involved.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-skillswap--fawn--mu.vercel.app-6d28d9?style=for-the-badge&logo=vercel)](https://skillswap-fawn-mu.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://skillswap-b59w.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Adityahub404singh-181717?style=for-the-badge&logo=github)](https://github.com/Adityahub404singh/skillswap)

---

## 🌟 What is SkillSwap?

SkillSwap is a **credit-based peer-to-peer learning platform** where users teach skills to earn credits, and spend credits to learn from others. No real money involved — just knowledge exchange!

---

## ✨ Features

- 🎓 **Teach to Earn** — Conduct sessions and earn 10 credits/hour
- 📚 **Learn from Experts** — Book sessions using earned credits
- 🤖 **SkillAI** — AI-powered learning assistant (Anthropic Claude)
- 💳 **Credit Economy** — 1 Credit = ₹1, platform takes 10% commission
- 🎁 **200 Free Credits** on signup
- 👥 **Referral System** — Earn 50 credits for first referral, 25 for subsequent
- 🛡️ **Admin Panel** — Full platform management
- 📊 **Analytics Dashboard** — Track sessions, credits, users
- 🌙 **Dark/Light Mode**
- 📱 **Fully Responsive** — Works on mobile too

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| UI Components | Shadcn/UI, Radix UI, Framer Motion |
| State Management | Zustand, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Authentication | JWT |
| AI | Anthropic Claude API |
| Deployment | Vercel (Frontend) + Render (Backend) |

---

## 🔗 Live Links

| Service | URL |
|---------|-----|
| 🌐 Frontend | [skillswap-fawn-mu.vercel.app](https://skillswap-fawn-mu.vercel.app) |
| ⚙️ Backend API | [skillswap-b59w.onrender.com](https://skillswap-b59w.onrender.com) |
| 🛡️ Admin Panel | [skillswap-fawn-mu.vercel.app/admin](https://skillswap-fawn-mu.vercel.app/admin) |

---

## 📁 Project Structure
```
skillswap/
├── src/                    # Frontend source
│   ├── components/         # UI components
│   ├── pages/              # App pages
│   ├── store/              # Zustand state
│   ├── lib/                # API client
│   └── hooks/              # Custom hooks
├── backend/                # Backend source
│   └── src/
│       ├── routes/         # API routes
│       ├── middlewares/    # Auth middleware
│       └── utils/          # JWT utils
├── database/               # DB schema
│   └── src/schema/
├── lib/                    # Shared libraries
└── public/                 # Static assets
```

---

## 💰 Credit Economy

| Action | Credits |
|--------|---------|
| Signup Bonus | +200 |
| First Referral | +50 |
| Next Referrals | +25 each |
| Beginner Session (30 min) | 15 credits |
| Intermediate Session (45 min) | 30 credits |
| Advanced Session (60 min) | 50 credits |
| Micro Help (15 min) | 10 credits |
| Minimum Withdrawal | 500 credits = ₹500 |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- pnpm

### Frontend Setup
```bash
pnpm install
pnpm dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_API_URL=https://skillswap-b59w.onrender.com
```

**Backend** (`.env`):
```
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## 🛡️ Admin Panel

Access at `/admin` with admin credentials.

Features:
- 📊 Platform statistics
- 👥 User management (add/remove credits, delete users)
- 📅 Session monitoring & cancellation
- 💳 Transaction history

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use this project!

---

<div align="center">
  <strong>Built with ❤️ for Hackathon 2026</strong><br/><br/>
  <a href="https://skillswap-fawn-mu.vercel.app">🌐 Live Demo</a> •
  <a href="https://skillswap-b59w.onrender.com">⚙️ Backend API</a> •
  <a href="https://github.com/Adityahub404singh/skillswap">⭐ Star on GitHub</a>
</div>
